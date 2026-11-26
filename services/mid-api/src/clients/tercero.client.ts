import { config } from '../config/env.js';
import { pendiente } from '../middleware/errores.js';

/** Resultado del análisis de texto del comentario. */
export interface AnalisisComentario {
  etiqueta: string;
  confianza: number;
  /** true cuando vino del plan de degradación (no del proveedor real). */
  degradado: boolean;
}

export interface ClienteTercero {
  analizarTexto(texto: string): Promise<AnalisisComentario>;
}

export interface ConfigTercero {
  /** Vacío = tercero sin configurar → se aplica el plan de degradación. */
  url: string;
  apiKey: string;
  timeoutMs: number;
  reintentos: number;
  cacheTtlMs: number;
  planDegradacion: 'valor_por_defecto' | '503';
  fetchFn?: typeof fetch;
}

/** Valor por defecto marcado como degradado (plan declarado en el OpenAPI). */
export const ANALISIS_DEGRADADO: AnalisisComentario = {
  etiqueta: 'desconocido',
  confianza: 0,
  degradado: true,
};

/**
 * TODO: cliente del API de tercero (análisis de texto de comentarios).
 * Reglas de consumo:
 *   · URL y credenciales solo por variables de entorno,
 *   · tiempo máximo de espera y reintentos limitados,
 *   · caché por texto analizado (TTL) para respetar los límites del proveedor,
 *   · errores traducidos al formato común (sin filtrar lo del proveedor),
 *   · plan de degradación: `valor_por_defecto` (marcado como degradado) o `503`,
 *   · en pruebas unitarias se inyecta un `fetchFn` mockeado (nunca sale a red),
 *   · nunca se registran mensajes, claves ni cuerpos del proveedor.
 */
export function crearClienteTercero(_cfg: ConfigTercero): ClienteTercero {
  return {
    async analizarTexto(_texto): Promise<AnalisisComentario> {
      return pendiente('ClienteTercero.analizarTexto');
    },
  };
}

/** Configuración por defecto leída del entorno. */
export function opcionesTerceroDesdeConfig(): ConfigTercero {
  return {
    url: config.tercero.url,
    apiKey: config.tercero.apiKey,
    timeoutMs: config.tercero.timeoutMs,
    reintentos: config.tercero.reintentos,
    cacheTtlMs: config.tercero.cacheTtlS * 1000,
    planDegradacion: config.tercero.planDegradacion,
  };
}
