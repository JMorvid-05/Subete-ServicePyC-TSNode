import { config } from '../config/env.js';
import { pendiente } from '../middleware/errores.js';
import type { GestorTokens } from './tokens.js';

/** Vista normalizada de una reserva del grupo Reservas. */
export interface ReservaVista {
  id: string;
  estado: string;
  pasajeroId: string;
  /** Presente si el MID Reservas lo incluye en la respuesta. */
  conductorId?: string;
  rutaId?: string;
}

export interface ClienteReservas {
  /** GET /reservas?usuarioId=… — recorre todas las páginas. */
  listarPorUsuario(usuarioId: string): Promise<ReservaVista[]>;
  /** GET /reservas/{id} — 404 `reserva_no_encontrada` si no existe. */
  obtener(reservaId: string): Promise<ReservaVista>;
}

export interface OpcionesClienteReservas {
  base: string;
  gestor: GestorTokens;
  timeoutMs: number;
  reintentos: number;
  esperaBaseMs: number;
  fetchFn?: typeof fetch;
}

/**
 * TODO: cliente resiliente de Reservas (grupo C): token por Client
 * Credentials, 401 → renueva y reintenta una vez (vía `conToken`), sin
 * reintentos ante 403/404, tiempo máximo y reintentos limitados ante 503 o
 * red caída. Normaliza snake_case/camelCase y recorre páginas.
 */
export function crearClienteReservas(_opciones: OpcionesClienteReservas): ClienteReservas {
  return {
    async listarPorUsuario(_usuarioId): Promise<ReservaVista[]> {
      return pendiente('ClienteReservas.listarPorUsuario');
    },
    async obtener(_reservaId): Promise<ReservaVista> {
      return pendiente('ClienteReservas.obtener');
    },
  };
}

/** Configuración por defecto leída del entorno (todo por variables). */
export function opcionesReservasDesdeConfig(gestor: GestorTokens): OpcionesClienteReservas {
  return {
    base: config.reservasUrl,
    gestor,
    timeoutMs: config.http.timeoutMs,
    reintentos: config.http.reintentos,
    esperaBaseMs: config.http.esperaBaseMs,
  };
}
