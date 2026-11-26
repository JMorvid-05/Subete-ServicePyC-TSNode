import { pendiente } from '../middleware/errores.js';
import type { Respuesta } from './http.js';

export interface ConfigTokens {
  /** Base del gateway (por ejemplo http://localhost:8080). */
  url: string;
  clientId: string;
  clientSecret: string;
  /** Renueva el token cuando está a menos de N segundos de vencer. */
  margenVencimientoS: number;
  timeoutMs: number;
  fetchFn?: typeof fetch;
}

export interface GestorTokens {
  /** Devuelve un token válido; `forzar=true` lo renueva aunque no haya vencido. */
  obtener(forzar?: boolean): Promise<string>;
}

/**
 * TODO: gestor de tokens Client Credentials:
 *   · pide el token al gateway con client_id y client_secret (POST /token),
 *   · lo cachea hasta poco antes de vencer (renovación proactiva),
 *   · si el gateway responde algo inesperado, traduce a 503 sin filtrar detalles.
 * El formato del body lo define el líder del gateway; usar OAuth2 clásico
 * (`grant_type: client_credentials`) mientras no se acuerde otro.
 */
export function crearGestorTokens(_cfg: ConfigTokens): GestorTokens {
  return {
    async obtener(_forzar = false): Promise<string> {
      return pendiente('GestorTokens.obtener');
    },
  };
}

/**
 * TODO: ejecuta una operación con token aplicando la regla del clúster:
 * ante un 401, renueva el token y reintenta UNA sola vez;
 * si vuelve a fallar, se propaga como error traducido.
 */
export async function conToken(
  _gestor: GestorTokens,
  _operacion: (token: string) => Promise<Respuesta>,
): Promise<Respuesta> {
  return pendiente('conToken');
}
