import { AppError } from '../middleware/errores.js';
import { config } from '../config/env.js';
import { enviar } from './http.js';
import { conToken, type GestorTokens } from './tokens.js';
import { asegurarExito, llamarConContexto } from './traduccion.js';

/** Perfil tal como lo expone el crud-api */
export interface PerfilVista {
  id: string;
  nombre: string;
  correo: string;
  rol: string;
  activo: boolean;
}

/** Calificación mínima que necesita el MID (estrellas + fecha). */
export interface CalificacionVista {
  id: string;
  estrellas: number;
  /** ISO desde la red; `Date` se acepta para facilitar las pruebas. */
  creadoEn: string | Date;
}

export interface NuevaCalificacion {
  reservaId: string;
  dePerfilId: string;
  paraPerfilId: string;
  estrellas: number;
  comentario?: string;
}

export interface CalificacionCreada {
  id: string;
  reservaId: string;
  dePerfilId: string;
  paraPerfilId: string;
  estrellas: number;
  comentario?: string;
}

export interface ClienteCrud {
  /** GET /perfiles/{id} — 404 `perfil_no_encontrado` si no existe. */
  obtenerPerfil(id: string): Promise<PerfilVista>;
  /** GET /calificaciones?paraPerfilId=… — calificaciones recibidas. */
  listarCalificacionesRecibidas(perfilId: string): Promise<CalificacionVista[]>;
  /** POST /calificaciones — crea la calificación validada (propaga 400/409). */
  crearCalificacion(entrada: NuevaCalificacion): Promise<CalificacionCreada>;
}

export interface OpcionesClienteCrud {
  base: string;
  gestor: GestorTokens;
  timeoutMs: number;
  reintentos: number;
  esperaBaseMs: number;
  fetchFn?: typeof fetch;
}

function pendiente(funcion: string): Promise<never> {
  return Promise.reject(
    new AppError(501, 'no_implementado', `Pendiente de implementar: ${funcion}`, { funcion }),
  );
}

function texto(bruto: Record<string, unknown>, ...claves: string[]): string | null {
  for (const clave of claves) {
    const valor = bruto[clave];
    if (typeof valor === 'string' && valor !== '') {
      return valor;
    }
  }
  return null;
}

/** Normaliza la calificación creada (acepta snake_case o camelCase). */
function normalizarCreada(bruto: unknown): CalificacionCreada | null {
  if (typeof bruto !== 'object' || bruto === null) {
    return null;
  }
  const b = bruto as Record<string, unknown>;
  const id = texto(b, 'id');
  const reservaId = texto(b, 'reservaId', 'reserva_id');
  const dePerfilId = texto(b, 'dePerfilId', 'de_perfil_id');
  const paraPerfilId = texto(b, 'paraPerfilId', 'para_perfil_id');
  const estrellas = b['estrellas'];
  if (!id || !reservaId || !dePerfilId || !paraPerfilId || typeof estrellas !== 'number') {
    return null;
  }
  const comentario = texto(b, 'comentario');
  return {
    id,
    reservaId,
    dePerfilId,
    paraPerfilId,
    estrellas,
    ...(comentario ? { comentario } : {}),
  };
}

/**
 * Cliente del crud-api
 * Siempre a través del gateway (nunca directo a la base de datos de nadie).
 */
export function crearClienteCrud(opciones: OpcionesClienteCrud): ClienteCrud {
  const { base, gestor, timeoutMs, reintentos, esperaBaseMs } = opciones;
  const urlBase = base.replace(/\/+$/, '');

  function peticion(url: string, metodo: 'GET' | 'POST', cuerpo?: unknown) {
    return llamarConContexto('crud', () =>
      conToken(gestor, (token) =>
        enviar({
          url,
          metodo,
          ...(cuerpo !== undefined ? { cuerpo } : {}),
          cabeceras: { authorization: `Bearer ${token}` },
          timeoutMs,
          reintentos,
          esperaBaseMs,
          ...(opciones.fetchFn ? { fetchFn: opciones.fetchFn } : {}),
        }),
      ),
    );
  }

  return {
    async obtenerPerfil(_id): Promise<PerfilVista> {
      // GET /perfiles/{id} para validar el perfil en el puntaje.
      return pendiente('obtenerPerfil');
    },

    async listarCalificacionesRecibidas(_perfilId): Promise<CalificacionVista[]> {
      // GET /calificaciones?paraPerfilId=… para el promedio.
      return pendiente('listarCalificacionesRecibidas');
    },

    async crearCalificacion(entrada): Promise<CalificacionCreada> {
      const respuesta = await peticion(`${urlBase}/calificaciones`, 'POST', entrada);
      // 400 (datos inválidos / perfil inexistente) y 409 (duplicada) se
      // propagan tal cual con el formato común.
      asegurarExito(respuesta, 'crud');

      const calificacion = normalizarCreada(respuesta.cuerpo);
      if (!calificacion) {
        throw new AppError(503, 'crud_no_disponible', 'El CRUD devolvió un formato inesperado', {});
      }
      return calificacion;
    },
  };
}

/** Configuración por defecto leída del entorno (todo por variables). */
export function opcionesCrudDesdeConfig(gestor: GestorTokens): OpcionesClienteCrud {
  return {
    base: config.crudUrl,
    gestor,
    timeoutMs: config.http.timeoutMs,
    reintentos: config.http.reintentos,
    esperaBaseMs: config.http.esperaBaseMs,
  };
}
