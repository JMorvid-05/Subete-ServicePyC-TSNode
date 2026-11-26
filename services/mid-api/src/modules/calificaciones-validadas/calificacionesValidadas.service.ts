import { clienteCrud, clienteReservas, clienteTercero } from '../../clients/index.js';
import type {
  CalificacionCreada,
  NuevaCalificacion,
  PerfilVista,
} from '../../clients/crud.client.js';
import type { ReservaVista } from '../../clients/reservas.client.js';
import type { AnalisisComentario } from '../../clients/tercero.client.js';
import { pendiente } from '../../middleware/errores.js';
import type { CalificacionValidadaEntrada } from '../comunes/validaciones.js';

export interface ResultadoValidacion {
  calificacion: CalificacionCreada;
  /** Análisis del comentario; puede venir degradado (plan declarado). */
  analisisComentario: AnalisisComentario;
}

/** Frontera que se inyecta en las pruebas (mocks de Reservas/CRUD/tercero). */
export interface DependenciasValidacion {
  reservas: { obtener(id: string): Promise<ReservaVista> };
  crud: {
    obtenerPerfil(id: string): Promise<PerfilVista>;
    crearCalificacion(entrada: NuevaCalificacion): Promise<CalificacionCreada>;
  };
  tercero: { analizarTexto(texto: string): Promise<AnalisisComentario> };
}

/** Implementación real: todo a través del API Gateway. */
export function dependenciasValidacion(): DependenciasValidacion {
  return {
    reservas: { obtener: (id) => clienteReservas().obtener(id) },
    crud: {
      obtenerPerfil: (id) => clienteCrud().obtenerPerfil(id),
      crearCalificacion: (entrada) => clienteCrud().crearCalificacion(entrada),
    },
    tercero: { analizarTexto: (texto) => clienteTercero().analizarTexto(texto) },
  };
}

/**
 * POST /calificaciones/validadas (P-HU4), en orden:
 *
 * TODO: implementar:
 * 1. La reserva debe existir → si Reservas responde 404, responde 404
 *    `reserva_no_encontrada`.
 * 2. Debe estar `completada` → si no, 409 `reserva_no_completada`.
 * 3. Los dos perfiles deben ser participantes → si no, 403 `no_participante`.
 * 4. Analiza el comentario con el API de tercero (con plan de degradación).
 * 5. Crea la calificación en el crud-api (validaciones extra: estrellas,
 *    auto-calificación y duplicados viven allí) y devuelve 201.
 */
export async function calificarViajeValidada(
  _entrada: CalificacionValidadaEntrada,
  _dependencias: DependenciasValidacion = dependenciasValidacion(),
): Promise<ResultadoValidacion> {
  return pendiente('calificarViajeValidada');
}
