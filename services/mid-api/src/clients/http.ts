import { pendiente } from '../middleware/errores.js';

export interface OpcionesPeticion {
  url: string;
  metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  cabeceras?: Record<string, string>;
  cuerpo?: unknown;
  /** Tiempo máximo de espera por intento (ms). */
  timeoutMs?: number;
  /** Reintentos limitados: solo ante 503 o fallas de red. */
  reintentos?: number;
  /** Espera base del backoff exponencial entre intentos (ms). */
  esperaBaseMs?: number;
  /** Inyección para pruebas (mock del tercero o de los vecinos). */
  fetchFn?: typeof fetch;
}

export interface Respuesta {
  status: number;
  cuerpo: unknown;
}

/**
 * TODO: petición HTTP con las reglas de resiliencia acordadas:
 *   · tiempo máximo de espera (AbortController),
 *   · reintentos limitados con backoff exponencial (solo 503 y fallas de red),
 *   · sin reintentos ante 4xx (son respuestas de negocio o de permisos),
 *   · nunca filtra mensajes internos: traduce a AppError con formato común.
 */
export async function enviar(_opciones: OpcionesPeticion): Promise<Respuesta> {
  return pendiente('enviar');
}
