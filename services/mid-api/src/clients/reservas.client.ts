import { AppError } from '../middleware/errores.js';
import { config } from '../config/env.js';
import { enviar } from './http.js';
import { conToken, type GestorTokens } from './tokens.js';
import { asegurarExito, llamarConContexto } from './traduccion.js';

/** Vista normalizada de una reserva del grupo Reservas. */
export interface ReservaVista {
  id: string;
  estado: string;
  pasajeroId: string;
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

function texto(bruto: Record<string, unknown>, ...claves: string[]): string | null {
  for (const clave of claves) {
    const valor = bruto[clave];
    if (typeof valor === 'string' && valor !== '') {
      return valor;
    }
  }
  return null;
}

/**
 * Acepta tanto snake_case (contrato de Reservas: `pasajero_id`,
 * `conductor_id`, `ruta_id`) como camelCase (`pasajeroId`, `conductorId`).
 * El campo `conductor_id` es el que permite validar ambos participantes.
 */
function normalizar(bruto: unknown): ReservaVista | null {
  if (typeof bruto !== 'object' || bruto === null) {
    return null;
  }
  const b = bruto as Record<string, unknown>;
  const id = texto(b, 'id', 'reservaId');
  const pasajeroId = texto(b, 'pasajeroId', 'pasajero_id');
  const estado = texto(b, 'estado');
  if (!id || !pasajeroId || !estado) {
    return null;
  }

  const conductorId = texto(b, 'conductorId', 'conductor_id');
  const rutaId = texto(b, 'rutaId', 'ruta_id');
  return {
    id,
    estado,
    pasajeroId,
    ...(conductorId ? { conductorId } : {}),
    ...(rutaId ? { rutaId } : {}),
  };
}

/**
 * Cliente resiliente de Reservas (grupo C): token por Client Credentials,
 * 401 → renueva y reintenta una vez (vía `conToken`), sin reintentos ante
 * 403/404, tiempo máximo y reintentos limitados ante 503 o red caída.
 */
export function crearClienteReservas(opciones: OpcionesClienteReservas): ClienteReservas {
  const { base, gestor, timeoutMs, reintentos, esperaBaseMs } = opciones;
  const urlBase = base.replace(/\/+$/, '');

  function peticion(url: string) {
    return llamarConContexto('reservas', () =>
      conToken(gestor, (token) =>
        enviar({
          url,
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
    async listarPorUsuario(_usuarioId): Promise<ReservaVista[]> {
      // TODO (P-HU3): paginar GET /reservas?usuarioId=… para el puntaje.
      return Promise.reject(
        new AppError(501, 'no_implementado', 'Pendiente de implementar: listarPorUsuario', {
          funcion: 'listarPorUsuario',
        }),
      );
    },

    async obtener(reservaId): Promise<ReservaVista> {
      const respuesta = await peticion(`${urlBase}/reservas/${encodeURIComponent(reservaId)}`);

      if (respuesta.status === 404) {
        throw new AppError(404, 'reserva_no_encontrada', `No existe la reserva ${reservaId}`, {
          reservaId,
        });
      }
      asegurarExito(respuesta, 'reservas');

      const reserva = normalizar(respuesta.cuerpo);
      if (!reserva) {
        throw new AppError(503, 'reservas_no_disponible', 'Reservas devolvió un formato inesperado', {
          reservaId,
        });
      }
      return reserva;
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
