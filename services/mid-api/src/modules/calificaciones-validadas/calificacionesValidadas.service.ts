import { clienteCrud, clienteModeracion, clienteReservas } from '../../clients/index.js';
import type { CalificacionCreada, NuevaCalificacion } from '../../clients/crud.client.js';
import type { ResultadoModeracion } from '../../clients/openai.moderation.client.js';
import type { ReservaVista } from '../../clients/reservas.client.js';
import { AppError } from '../../middleware/errores.js';
import type { CalificacionValidadaEntrada } from '../comunes/validaciones.js';

/** Frontera que se inyecta en las pruebas (mocks de Reservas/CRUD/OpenAI). */
export interface DependenciasValidacion {
  reservas: { obtener(id: string): Promise<ReservaVista> };
  crud: { crearCalificacion(entrada: NuevaCalificacion): Promise<CalificacionCreada> };
  moderacion: { moderar(texto: string): Promise<ResultadoModeracion> };
}

/** Implementación real: todo a través del API Gateway / OpenAI. */
export function dependenciasValidacion(): DependenciasValidacion {
  return {
    reservas: { obtener: (id) => clienteReservas().obtener(id) },
    crud: { crearCalificacion: (entrada) => clienteCrud().crearCalificacion(entrada) },
    moderacion: { moderar: (texto) => clienteModeracion().moderar(texto) },
  };
}

/**
 * POST /calificaciones/validadas (P-HU4), en orden:
 *
 * 1. La reserva debe existir → si Reservas responde 404, responde 404
 *    `reserva_no_encontrada`.
 * 2. Debe estar `completada` → si no, 409 `reserva_no_completada`.
 * 3. Los dos perfiles deben ser los dos participantes (pasajero y conductor),
 *    en cualquier sentido → si no, 403 `no_participante`.
 * 4. Si hay comentario, se modera con OpenAI Moderation API:
 *    inapropiado → 400 `comentario_no_permitido`; si OpenAI falla, plan de
 *    degradación (`permitir` → continúa marcado como degradado; `503` → 503).
 * 5. Crea la calificación en el crud-api (estrellas, auto-calificación y
 *    duplicados se validan allí) y devuelve 201 con la calificación creada.
 *
 * (El análisis de comentarios con un API de tercero queda pendiente de
 * definir: se cableará cuando se elija el proveedor.)
 */
export async function calificarViajeValidada(
  entrada: CalificacionValidadaEntrada,
  dependencias: DependenciasValidacion = dependenciasValidacion(),
): Promise<CalificacionCreada> {
  const reserva = await dependencias.reservas.obtener(entrada.reservaId);

  if (reserva.estado !== 'completada') {
    throw new AppError(
      409,
      'reserva_no_completada',
      'Solo se puede calificar una reserva en estado completada',
      { reservaId: entrada.reservaId, estadoActual: reserva.estado },
    );
  }

  // Los dos participantes exactos (en cualquier sentido). Si Reservas no
  // informa conductor_id, no hay pareja completa → no_participante.
  const participantes = [reserva.pasajeroId, reserva.conductorId].filter(
    (valor): valor is string => typeof valor === 'string' && valor !== '',
  );
  const conjuntoEntrada = new Set([entrada.deId, entrada.paraId]);
  const coincide =
    participantes.length === 2 &&
    conjuntoEntrada.size === 2 &&
    participantes.every((participante) => conjuntoEntrada.has(participante));

  if (!coincide) {
    throw new AppError(403, 'no_participante', 'Los perfiles indicados no participaron en la reserva', {
      reservaId: entrada.reservaId,
      deId: entrada.deId,
      paraId: entrada.paraId,
    });
  }

  // Moderación del comentario con OpenAI (si hay texto). Rechaza si está
  // marcado como inapropiado; si OpenAI falla, aplica el plan de degradación.
  if (entrada.comentario !== undefined && entrada.comentario.trim() !== '') {
    const resultado = await dependencias.moderacion.moderar(entrada.comentario);
    if (resultado.flagged) {
      throw new AppError(400, 'comentario_no_permitido', 'El comentario no cumple las políticas de moderación', {
        reservaId: entrada.reservaId,
      });
    }
  }

  return dependencias.crud.crearCalificacion({
    reservaId: entrada.reservaId,
    dePerfilId: entrada.deId,
    paraPerfilId: entrada.paraId,
    estrellas: entrada.estrellas,
    ...(entrada.comentario !== undefined ? { comentario: entrada.comentario } : {}),
  });
}
