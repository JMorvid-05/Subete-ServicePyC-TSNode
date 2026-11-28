import { createHash } from 'node:crypto';
import { AppError } from '../middleware/errores.js';
import { config } from '../config/env.js';
import { enviar, type Respuesta } from './http.js';

export interface ResultadoModeracion {
  flagged: boolean;
  categorias: Record<string, boolean>;
  puntajes: Record<string, number>;
  degradado: boolean;
}

export interface ClienteModeracion {
  moderar(texto: string): Promise<ResultadoModeracion>;
}

export interface ConfigModeracion {
  url: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  maxReintentos: number;
  cacheTtlMs: number;
  planDegradacion: 'permitir' | '503';
  umbral: number;
  fetchFn?: typeof fetch;
}

function normalizarTexto(texto: string): string {
  return texto.trim().replace(/\s+/g, ' ').toLowerCase();
}

function aplicarDegradacion(plan: 'permitir' | '503'): ResultadoModeracion {
  if (plan === '503') {
    throw new AppError(503, 'moderacion_no_disponible', 'OpenAI Moderation no está disponible', {});
  }
  return { flagged: false, categorias: {}, puntajes: {}, degradado: true };
}

export function crearClienteModeracion(cfg: ConfigModeracion): ClienteModeracion {
  const cache = new Map<string, { valor: ResultadoModeracion; venceEn: number }>();

  return {
    async moderar(texto: string): Promise<ResultadoModeracion> {
      const normalizado = normalizarTexto(texto);
      const llave = createHash('sha256').update(normalizado).digest('hex');

      const guardado = cache.get(llave);
      if (guardado && Date.now() < guardado.venceEn) {
        return { ...guardado.valor };
      }

      if (cfg.apiKey === '' || cfg.url === '') {
        return aplicarDegradacion(cfg.planDegradacion);
      }

      try {
        const respuesta: Respuesta = await enviar({
          url: cfg.url,
          metodo: 'POST',
          cabeceras: { authorization: `Bearer ${cfg.apiKey}` },
          cuerpo: { model: cfg.model, input: texto },
          timeoutMs: cfg.timeoutMs,
          reintentos: cfg.maxReintentos,
          ...(cfg.fetchFn ? { fetchFn: cfg.fetchFn } : {}),
        });

        if (respuesta.status < 200 || respuesta.status >= 300) {
          throw new AppError(503, 'moderacion_no_disponible', 'OpenAI Moderation respondió con error', {
            status: respuesta.status,
          });
        }

        const cuerpo = respuesta.cuerpo as {
          results?: Array<{
            flagged?: boolean;
            categories?: Record<string, boolean>;
            category_scores?: Record<string, number>;
          }>;
        } | null;
        const resultado = cuerpo?.results?.[0];
        if (!resultado || typeof resultado.flagged !== 'boolean') {
          throw new AppError(503, 'moderacion_no_disponible', 'OpenAI Moderation devolvió un formato inesperado', {});
        }

        const valor: ResultadoModeracion = {
          flagged: resultado.flagged,
          categorias: resultado.categories ?? {},
          puntajes: resultado.category_scores ?? {},
          degradado: false,
        };

        if (cfg.umbral > 0) {
          const supera = Object.values(valor.puntajes).some((p) => p >= cfg.umbral);
          if (supera) valor.flagged = true;
        }

        cache.set(llave, { valor, venceEn: Date.now() + cfg.cacheTtlMs });
        return { ...valor };
      } catch (err) {
        if (cfg.planDegradacion === '503') {
          throw new AppError(503, 'moderacion_no_disponible', 'OpenAI Moderation no está disponible', {});
        }
        return { flagged: false, categorias: {}, puntajes: {}, degradado: true };
      }
    },
  };
}

export function opcionesModeracionDesdeConfig(): ConfigModeracion {
  return {
    url: config.moderacion.url,
    apiKey: config.moderacion.apiKey,
    model: config.moderacion.model,
    timeoutMs: config.moderacion.timeoutMs,
    maxReintentos: config.moderacion.maxReintentos,
    cacheTtlMs: config.moderacion.cacheTtlMs,
    planDegradacion: config.moderacion.planDegradacion,
    umbral: config.moderacion.umbral,
  };
}
