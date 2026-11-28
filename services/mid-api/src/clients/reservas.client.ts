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

const POR_PAGINA_RESERVAS = 100;

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

interface ListadoReservas {
  datos: ReservaVista[];
  total: number;
  pagina: number;
  porPagina: number;
}

function normalizarListadoReservas(bruto: unknown): ListadoReservas | null {
  if (typeof bruto !== 'object' || bruto === null) {
    return null;
  }
  const b = bruto as Record<string, unknown>;
  const { datos, total, pagina, porPagina } = b;
  if (
    !Array.isArray(datos) ||
    typeof total !== 'number' ||
    !Number.isInteger(total) ||
    total < 0 ||
    typeof pagina !== 'number' ||
    !Number.isInteger(pagina) ||
    pagina < 1 ||
    typeof porPagina !== 'number' ||
    !Number.isInteger(porPagina) ||
    porPagina < 1
  ) {
    return null;
  }

  const reservas: ReservaVista[] = [];
  for (const dato of datos) {
    const reserva = normalizar(dato);
    if (!reserva) {
      return null;
    }
    reservas.push(reserva);
  }
  return { datos: reservas, total, pagina, porPagina };
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
    async listarPorUsuario(usuarioId): Promise<ReservaVista[]> {
      const reservas: ReservaVista[] = [];
      let totalPaginas = 1;

      for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
        const parametros = new URLSearchParams({
          usuarioId,
          pagina: String(pagina),
          porPagina: String(POR_PAGINA_RESERVAS),
        });
        const respuesta = await peticion(`${urlBase}/reservas?${parametros}`);
        asegurarExito(respuesta, 'reservas');

        const listado = normalizarListadoReservas(respuesta.cuerpo);
        if (
          !listado ||
          listado.pagina !== pagina ||
          listado.porPagina !== POR_PAGINA_RESERVAS
        ) {
          throw new AppError(
            503,
            'reservas_no_disponible',
            'Reservas devolvió un formato inesperado',
            {},
          );
        }

        if (pagina === 1) {
          totalPaginas = Math.ceil(listado.total / listado.porPagina);
        }
        const filasEsperadas = Math.min(
          listado.porPagina,
          Math.max(0, listado.total - (pagina - 1) * listado.porPagina),
        );
        if (listado.datos.length !== filasEsperadas) {
          throw new AppError(
            503,
            'reservas_no_disponible',
            'Reservas devolvió un formato inesperado',
            {},
          );
        }
        reservas.push(...listado.datos);
      }
      return reservas;
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
