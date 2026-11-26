import { pendiente } from '../../middleware/errores.js';
import type { CalificacionEntrada, FiltroListadoCalificaciones } from './calificaciones.schemas.js';

export interface Calificacion {
  id: string;
  reserva_id: string;
  de_perfil_id: string;
  para_perfil_id: string;
  estrellas: number;
  comentario: string | null;
  creado_en: Date;
}

export interface ListadoCalificaciones {
  datos: Calificacion[];
  total: number;
  pagina: number;
  porPagina: number;
}

/** TODO: lista calificaciones con filtros `paraPerfilId` y `dePerfilId` + paginación. */
export async function listarCalificaciones(
  _filtros: FiltroListadoCalificaciones,
): Promise<ListadoCalificaciones> {
  return pendiente('listarCalificaciones');
}

/**
 * TODO (P-HU2): crea una calificación.
 *   - perfiles inexistentes → 400 `perfil_inexistente` (llave foránea)
 *   - misma reserva y mismo autor → 409 `calificacion_duplicada`
 *     (restricción UNIQUE (reserva_id, de_perfil_id))
 *   - restricción CHECK: de_perfil_id <> para_perfil_id
 */
export async function crearCalificacion(_entrada: CalificacionEntrada): Promise<Calificacion> {
  return pendiente('crearCalificacion');
}
