import { AppError } from '../middleware/errores.js';
import type { Respuesta } from './http.js';

/** Lee el formato común { codigo, mensaje } si el vecino lo envió. */
function cuerpoError(respuesta: Respuesta): { codigo: string; mensaje: string } {
  const cuerpo = respuesta.cuerpo;
  if (cuerpo !== null && typeof cuerpo === 'object') {
    const objeto = cuerpo as Record<string, unknown>;
    return {
      codigo: typeof objeto['codigo'] === 'string' ? objeto['codigo'] : 'error_upstream',
      mensaje:
        typeof objeto['mensaje'] === 'string'
          ? objeto['mensaje']
          : 'El servicio upstream devolvió un error',
    };
  }
  return {
    codigo: 'error_upstream',
    mensaje: 'El servicio upstream devolvió un error',
  };
}

/**
 * Traduce las respuestas de un vecino al contrato propio (sin filtrar
 * llaves ni mensajes internos):
 *
 * | Status del vecino | Nuestra respuesta |
 * | 2xx               | OK                |
 * | 401 (tras renovar y reintentar una vez) | 503 `fallo_autenticacion_gateway` |
 * | 403               | 503 `alcance_insuficiente` (no se reintenta) |
 * | 404 / 400 / 409   | se propagan como respuesta de negocio |
 * | 503 / timeout / red | 503 `<contexto>_no_disponible` |
 */
export function asegurarExito(respuesta: Respuesta, contexto: 'reservas' | 'crud'): void {
  if (respuesta.status >= 200 && respuesta.status < 300) {
    return;
  }

  const { codigo, mensaje } = cuerpoError(respuesta);

  if (respuesta.status === 401) {
    throw new AppError(
      503,
      'fallo_autenticacion_gateway',
      'El gateway rechazó el token incluso después de renovarlo',
      { contexto },
    );
  }
  if (respuesta.status === 403) {
    throw new AppError(503, 'alcance_insuficiente', 'Nuestro token no tiene el alcance requerido', {
      contexto,
    });
  }
  if (respuesta.status === 404 || respuesta.status === 400 || respuesta.status === 409) {
    throw new AppError(respuesta.status, codigo, mensaje, { contexto });
  }
  throw new AppError(503, `${contexto}_no_disponible`, `El servicio de ${contexto} no está disponible`, {
    contexto,
    origen: respuesta.status,
  });
}

/**
 * Envuelve un consumo: traduce los errores de red/timeout/503 del transporte
 * al código de negocio `<contexto>_no_disponible` con el formato común.
 */
export async function llamarConContexto(
  contexto: 'reservas' | 'crud',
  peticion: () => Promise<Respuesta>,
): Promise<Respuesta> {
  try {
    return await peticion();
  } catch (err) {
    if (err instanceof AppError && err.status === 503) {
      throw new AppError(503, `${contexto}_no_disponible`, `El servicio de ${contexto} no está disponible`, {
        contexto,
        causa: err.codigo,
      });
    }
    throw err;
  }
}
