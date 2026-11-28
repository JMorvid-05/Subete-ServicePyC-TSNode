import { AppError } from '../middleware/errores.js';
import { enviar, type Respuesta } from './http.js';

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
 * Gestor de tokens Client Credentials:
 *   · pide el token al gateway con client_id y client_secret (POST /token),
 *   · lo cachea hasta poco antes de vencer (renovación proactiva),
 *   · si el gateway responde algo inesperado, traduce a 503 sin filtrar detalles.
 * El formato del body del token lo define el líder del gateway; este es el
 * formato OAuth2 clásico (`grant_type: client_credentials`). El alcance
 * (`reservas:leer`, etc.) lo valida el gateway sobre el client_id.
 */
export function crearGestorTokens(cfg: ConfigTokens): GestorTokens {
  let valor: string | null = null;
  let venceEnMs = 0;

  return {
    async obtener(forzar = false): Promise<string> {
      const ahora = Date.now();
      const vigente = valor !== null && ahora < venceEnMs - cfg.margenVencimientoS * 1000;
      if (!forzar && vigente) {
        return valor as string;
      }

      const base = cfg.url.replace(/\/+$/, '');
      const respuesta = await enviar({
        url: `${base}/token`,
        metodo: 'POST',
        cuerpo: {
          grant_type: 'client_credentials',
          client_id: cfg.clientId,
          client_secret: cfg.clientSecret,
        },
        timeoutMs: cfg.timeoutMs,
        reintentos: 1,
        ...(cfg.fetchFn ? { fetchFn: cfg.fetchFn } : {}),
      });

      const cuerpo = respuesta.cuerpo as { access_token?: unknown; expires_in?: unknown } | null;
      if (respuesta.status !== 200 || typeof cuerpo?.access_token !== 'string') {
        throw new AppError(503, 'token_no_disponible', 'El API Gateway no emitió un token', {
          origen: '/token',
          status: respuesta.status,
        });
      }

      const expiraEnS = typeof cuerpo.expires_in === 'number' ? cuerpo.expires_in : 300;
      valor = cuerpo.access_token;
      venceEnMs = Date.now() + expiraEnS * 1000;
      return valor;
    },
  };
}

/**
 * Ejecuta una operación con token aplicando la regla del clúster:
 * ante un 401, renueva el token y reintenta UNA sola vez;
 * si vuelve a fallar, se propaga como error traducido.
 */
export async function conToken(
  gestor: GestorTokens,
  operacion: (token: string) => Promise<Respuesta>,
): Promise<Respuesta> {
  const token = await gestor.obtener();
  let respuesta = await operacion(token);

  if (respuesta.status === 401) {
    const renovado = await gestor.obtener(true);
    respuesta = await operacion(renovado);
  }

  return respuesta;
}
