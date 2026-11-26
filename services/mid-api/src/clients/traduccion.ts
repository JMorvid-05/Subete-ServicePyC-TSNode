import { pendiente } from '../middleware/errores.js';
import type { Respuesta } from './http.js';

/**
 * TODO: traduce las respuestas de un vecino al contrato propio (sin filtrar
 * llaves ni mensajes internos):
 *
 * | Status del vecino | Nuestra respuesta |
 * | 2xx               | OK                |
 * | 401 (tras renovar y reintentar una vez) | 503 `fallo_autenticacion_gateway` |
 * | 403               | 503 `alcance_insuficiente` (no se reintenta) |
 * | 404 / 400 / 409   | se propagan como respuesta de negocio |
 * | 503 / timeout / red | 503 `<contexto>_no_disponible` |
 */
export function asegurarExito(_respuesta: Respuesta, _contexto: 'reservas' | 'crud'): void {
  return pendiente('asegurarExito');
}

/**
 * TODO: envuelve un consumo: traduce los errores de red/timeout/503 del
 * transporte al código de negocio `<contexto>_no_disponible` con el
 * formato común.
 */
export async function llamarConContexto(
  _contexto: 'reservas' | 'crud',
  _peticion: () => Promise<Respuesta>,
): Promise<Respuesta> {
  return pendiente('llamarConContexto');
}
