import { pendiente } from '../../middleware/errores.js';

export interface CalificacionEntrada {
  reservaId: string;
  dePerfilId: string;
  paraPerfilId: string;
  estrellas: number;
  comentario?: string;
}

export interface FiltroListadoCalificaciones {
  paraPerfilId?: string;
  dePerfilId?: string;
  pagina: number;
  porPagina: number;
}

/**
 * TODO (P-HU2): valida el cuerpo de POST /calificaciones.
 *   - ids con formato válido
 *   - estrellas: entero de 1 a 5 (si no, 400 `datos_invalidos`)
 *   - nadie se califica a sí mismo (si no, 400 `auto_calificacion`)
 *   - comentario opcional, máximo 500 caracteres
 */
export function parsearCalificacionEntrada(_cuerpo: unknown): CalificacionEntrada {
  return pendiente('parsearCalificacionEntrada');
}

/**
 * TODO: valida los query params de GET /calificaciones.
 *   - paraPerfilId y dePerfilId opcionales (formato de id)
 *   - pagina >= 1 (defecto 1), porPagina 1..100 (defecto 20)
 */
export function parsearFiltrosCalificaciones(
  _query: Record<string, unknown>,
): FiltroListadoCalificaciones {
  return pendiente('parsearFiltrosCalificaciones');
}
