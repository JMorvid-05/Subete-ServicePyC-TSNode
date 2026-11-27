import { clienteCrud, clienteReservas } from '../../clients/index.js';
import type { CalificacionVista, PerfilVista } from '../../clients/crud.client.js';
import type { ReservaVista } from '../../clients/reservas.client.js';
import { pendiente } from '../../middleware/errores.js';
import type { Insignia } from './reputacion.js';

export interface PuntajePerfil {
  perfilId: string;
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
  _idPerfil: string,
  _dependencias: DependenciasPuntaje = dependenciasPuntaje(),
  _ahora: Date = new Date(),
): Promise<PuntajePerfil> {
  //verificar si el perfil primero existe
  if (false) {
    return pendiente('404 perfil no existe');
  }

  return pendiente('calcularPuntajePerfil');
}
