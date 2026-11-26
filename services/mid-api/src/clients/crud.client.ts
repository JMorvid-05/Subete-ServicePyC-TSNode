import { config } from '../config/env.js';
import { pendiente } from '../middleware/errores.js';
import type { GestorTokens } from './tokens.js';

/** Perfil tal como lo expone el crud-api del propio grupo. */
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

/**
 * TODO: cliente del crud-api propio del grupo. Siempre a través del
 * gateway (nunca directo a la base de datos de nadie): token, 401 →
 * reintenta una vez, y normaliza los campos snake_case/camelCase.
 */
export function crearClienteCrud(_opciones: OpcionesClienteCrud): ClienteCrud {
  return {
    async obtenerPerfil(_id): Promise<PerfilVista> {
      return pendiente('ClienteCrud.obtenerPerfil');
    },
    async listarCalificacionesRecibidas(_perfilId): Promise<CalificacionVista[]> {
      return pendiente('ClienteCrud.listarCalificacionesRecibidas');
    },
    async crearCalificacion(_entrada): Promise<CalificacionCreada> {
      return pendiente('ClienteCrud.crearCalificacion');
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
