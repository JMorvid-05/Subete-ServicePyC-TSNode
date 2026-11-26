import { pendiente } from '../../middleware/errores.js';

export interface CalificacionValidadaEntrada {
  reservaId: string;
  deId: string;
  paraId: string;
  estrellas: number;
  comentario?: string;
}

/**
 * TODO (P-HU4): valida el cuerpo de POST /calificaciones/validadas:
 *   { reservaId, deId, paraId, estrellas, comentario }
 *   - ids con formato válido
 *   - estrellas: entero de 1 a 5 (si no, 400 `datos_invalidos`)
 *   - comentario opcional, máximo 500 caracteres
 */
export function parsearCalificacionValidada(_cuerpo: unknown): CalificacionValidadaEntrada {
  return pendiente('parsearCalificacionValidada');
}

/** TODO: valida el {id} de la ruta (acepta `unknown` por la tipación de Express). */
export function parsearId(_valor: unknown): string {
  return pendiente('parsearId');
}
