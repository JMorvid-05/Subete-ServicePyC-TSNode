import { clienteCrud, clienteReservas } from '../../clients/index.js';
import type { CalificacionVista, PerfilVista } from '../../clients/crud.client.js';
import type { ReservaVista } from '../../clients/reservas.client.js';
import { AppError } from '../../middleware/errores.js';
import { asignarInsignia, calcularPuntaje, promedioPonderado, tasaCancelacion, type Insignia } from './reputacion.js';
import { } from 'date-fns';

export interface PuntajePerfil {
  // perfilId: string;
  puntaje: number;
  insignia: Insignia;
  viajesCompletados: number;
  tasaCancelacion: number;
  totalCalificaciones: number;
}

/** Frontera que necesita el servicio: se inyecta en las pruebas. */
export interface DependenciasPuntaje {
  perfiles: { obtener(id: string): Promise<PerfilVista> };
  calificaciones: { listarRecibidas(perfilId: string): Promise<CalificacionVista[]> };
  reservas: { listarPorUsuario(usuarioId: string): Promise<ReservaVista[]> };
}

/** Implementación real: todo a través del API Gateway. */
export function dependenciasPuntaje(): DependenciasPuntaje {
  return {
    perfiles: { obtener: (id) => clienteCrud().obtenerPerfil(id) },
    calificaciones: {
      listarRecibidas: (perfilId) => clienteCrud().listarCalificacionesRecibidas(perfilId),
    },
    reservas: { listarPorUsuario: (usuarioId) => clienteReservas().listarPorUsuario(usuarioId) },
  };
}

/**
 * GET /perfiles/{id}/puntaje
 *
 * TODO (P-HU3), en orden:
 * 1. Si el perfil no existe → 404 `perfil_no_encontrado`.
 * 2. Promedio ponderado de estrellas (últimos 30 días pesan el doble).
 * 3. Consulta a Reservas la tasa de cancelación y los viajes completados.
 * 4. puntaje = promedioPonderado - tasaCancelacion * 2 (entre 0 y 5).
 * 5. Asigna la insignia (ver reputacion.ts).
 * 6. Si Reservas no responde → 503 (no se calcula un puntaje incompleto).
 */
export async function calcularPuntajePerfil(
  idPerfil: string,
  dependencias: DependenciasPuntaje = dependenciasPuntaje(),
): Promise<PuntajePerfil> {

  const fecha_hoy: Date = new Date();

  //verificar si el perfil primero existe
  // revisar bien esta parte @@
  let perfil: PerfilVista;
  try {
    perfil = await dependencias.perfiles.obtener(idPerfil);

  } catch (error) {
    if (!(error instanceof AppError) || error.status !== 404) {
      throw error;
    }
    throw new AppError(
      404,
      'perfil_no_encontrado',
      'Fallo en verificación de existencia del perfil: ' + error);
  }
  const calificaciones: CalificacionVista[] = await dependencias.calificaciones.listarRecibidas(idPerfil);
  let reservas: ReservaVista[];
  let viajes_cancelados: number = 0, viajes_completados: number = 0, viajes_totales: number = 0,
    promedio: number = 0, tasa_cancelacion: number = 0, puntaje_tt: number = 0;
  let insignia: Insignia;
  try {
    reservas = await dependencias.reservas.listarPorUsuario(idPerfil);
    viajes_cancelados = reservas.filter(reserva => reserva.estado == 'cancelada').length;
    viajes_completados = reservas.filter(reserva => reserva.estado == 'completada').length;
    viajes_totales = reservas.length;
  } catch (error) {
    throw new AppError(
      503,
      'conexion_reservas',
      'Fallo en verificación de existencia de reservas: ' + error);
  }
  promedio = promedioPonderado(calificaciones, fecha_hoy);
  tasa_cancelacion = tasaCancelacion(viajes_cancelados, viajes_totales);
  puntaje_tt = calcularPuntaje(promedio, tasa_cancelacion);
  insignia = asignarInsignia(puntaje_tt, tasa_cancelacion, viajes_completados);

  const datos: PuntajePerfil = {
    puntaje: puntaje_tt,
    insignia: insignia,
    tasaCancelacion: tasa_cancelacion,
    viajesCompletados: viajes_completados,
    totalCalificaciones: calificaciones.length
  };
  return datos;
}
