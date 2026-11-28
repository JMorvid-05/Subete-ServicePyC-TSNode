import { AppError } from '../middleware/errores.js';

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
  /** Inyección para pruebas (mock de OpenAI Moderation o de los vecinos). */
  fetchFn?: typeof fetch;
}

export interface Respuesta {
  status: number;
  cuerpo: unknown;
}

function espera(ms: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

/** Devuelve solo el path de la URL para los mensajes (sin query ni secretos). */
function rutaSegura(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return 'desconocida';
  }
}

function parsearCuerpo(texto: string): unknown {
  if (texto === '') {
    return null;
  }
  try {
    return JSON.parse(texto);
  } catch {
    return texto;
  }
}

/**
 * Petición HTTP con las reglas de resiliencia acordadas:
 *   · tiempo máximo de espera (AbortController),
 *   · reintentos limitados con backoff exponencial (solo 503 y fallas de red),
 *   · sin reintentos ante 4xx (son respuestas de negocio o de permisos),
 *   · nunca filtra mensajes internos: traduce a AppError con formato común.
 */
export async function enviar(opciones: OpcionesPeticion): Promise<Respuesta> {
  const {
    url,
    metodo = 'GET',
    cabeceras = {},
    cuerpo,
    timeoutMs = 3000,
    reintentos = 2,
    esperaBaseMs = 200,
    fetchFn = fetch,
  } = opciones;

  let ultimoError: AppError | null = null;

  for (let intento = 0; intento <= reintentos; intento += 1) {
    const control = new AbortController();
    const temporizador = setTimeout(() => control.abort(), timeoutMs);

    try {
      const init: RequestInit = {
        method: metodo,
        headers: {
          accept: 'application/json',
          ...(cuerpo !== undefined ? { 'content-type': 'application/json' } : {}),
          ...cabeceras,
        },
        signal: control.signal,
      };
      if (cuerpo !== undefined) {
        init.body = JSON.stringify(cuerpo);
      }

      const respuesta = await fetchFn(url, init);

      const texto = await respuesta.text();
      const salida: Respuesta = { status: respuesta.status, cuerpo: parsearCuerpo(texto) };
      // Reintentos limitados ante 5xx (incluye 503) y fallas de red:
      // los 4xx son respuestas de negocio/permisos y no se reintentan.
      if (respuesta.status >= 500 && respuesta.status < 600 && intento < reintentos) {
        ultimoError = new AppError(503, 'upstream_no_disponible', 'El servicio upstream respondió con error', {
          origen: rutaSegura(url),
          status: respuesta.status,
        });
        await espera(esperaBaseMs * 2 ** intento);
        continue;
      }

      return salida;
    } catch (err) {
      const motivo =
        err instanceof Error && err.name === 'AbortError'
          ? 'tiempo_excedido'
          : 'red_no_disponible';
      ultimoError = new AppError(503, motivo, 'La petición excedió el tiempo máximo o falló la red', {
        origen: rutaSegura(url),
      });
      if (intento < reintentos) {
        await espera(esperaBaseMs * 2 ** intento);
      }
    } finally {
      clearTimeout(temporizador);
    }
  }

  throw ultimoError ?? new AppError(503, 'upstream_no_disponible', 'La petición no pudo completarse', {});
}
