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

const POR_PAGINA_CALIFICACIONES = 100;

function texto(bruto: Record<string, unknown>, ...claves: string[]): string | null {
  for (const clave of claves) {
    const valor = bruto[clave];
    if (typeof valor === 'string' && valor !== '') {
      return valor;
    }
  }
  return null;
}

function normalizarPerfil(bruto: unknown): PerfilVista | null {
  if (typeof bruto !== 'object' || bruto === null) {
    return null;
  }
  const b = bruto as Record<string, unknown>;
  const id = texto(b, 'id');
  const nombre = texto(b, 'nombre');
  const correo = texto(b, 'correo');
  const rol = texto(b, 'rol');
  const activo = b['activo'];
  if (!id || !nombre || !correo || !rol || typeof activo !== 'boolean') {
    return null;
  }
  return { id, nombre, correo, rol, activo };
}

function normalizarCalificacion(bruto: unknown): CalificacionVista | null {
  if (typeof bruto !== 'object' || bruto === null) {
    return null;
  }
  const b = bruto as Record<string, unknown>;
  const id = texto(b, 'id');
  const estrellas = b['estrellas'];
  const creadoEn = b['creadoEn'] ?? b['creado_en'];
  const fechaValida =
    (typeof creadoEn === 'string' && creadoEn !== '' && !Number.isNaN(Date.parse(creadoEn))) ||
    (creadoEn instanceof Date && !Number.isNaN(creadoEn.getTime()));
  if (
    !id ||
    typeof estrellas !== 'number' ||
    !Number.isInteger(estrellas) ||
    estrellas < 1 ||
    estrellas > 5 ||
    !fechaValida
  ) {
    return null;
  }
  return { id, estrellas, creadoEn };
}

interface ListadoCalificaciones {
  datos: CalificacionVista[];
  total: number;
  pagina: number;
  porPagina: number;
}

function normalizarListadoCalificaciones(bruto: unknown): ListadoCalificaciones | null {
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

  const calificaciones: CalificacionVista[] = [];
  for (const dato of datos) {
    const calificacion = normalizarCalificacion(dato);
    if (!calificacion) {
      return null;
    }
    calificaciones.push(calificacion);
  }
  return { datos: calificaciones, total, pagina, porPagina };
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
    async obtenerPerfil(id): Promise<PerfilVista> {
      const respuesta = await peticion(
        `${urlBase}/perfiles/${encodeURIComponent(id)}`,
        'GET',
      );
      if (respuesta.status === 404) {
        throw new AppError(404, 'perfil_no_encontrado', `No existe el perfil ${id}`, {
          perfilId: id,
        });
      }
      asegurarExito(respuesta, 'crud');

      const perfil = normalizarPerfil(respuesta.cuerpo);
      if (!perfil) {
        throw new AppError(503, 'crud_no_disponible', 'El CRUD devolvió un formato inesperado', {});
      }
      return perfil;
    },

    async listarCalificacionesRecibidas(perfilId): Promise<CalificacionVista[]> {
      const calificaciones: CalificacionVista[] = [];
      let totalPaginas = 1;

      for (let pagina = 1; pagina <= totalPaginas; pagina += 1) {
        const parametros = new URLSearchParams({
          paraPerfilId: perfilId,
          pagina: String(pagina),
          porPagina: String(POR_PAGINA_CALIFICACIONES),
        });
        const respuesta = await peticion(`${urlBase}/calificaciones?${parametros}`, 'GET');
        asegurarExito(respuesta, 'crud');

        const listado = normalizarListadoCalificaciones(respuesta.cuerpo);
        if (
          !listado ||
          listado.pagina !== pagina ||
          listado.porPagina !== POR_PAGINA_CALIFICACIONES
        ) {
          throw new AppError(503, 'crud_no_disponible', 'El CRUD devolvió un formato inesperado', {});
        }

        if (pagina === 1) {
          totalPaginas = Math.ceil(listado.total / listado.porPagina);
        }
        const filasEsperadas = Math.min(
          listado.porPagina,
          Math.max(0, listado.total - (pagina - 1) * listado.porPagina),
        );
        if (listado.datos.length !== filasEsperadas) {
          throw new AppError(503, 'crud_no_disponible', 'El CRUD devolvió un formato inesperado', {});
        }
        calificaciones.push(...listado.datos);
      }
      return calificaciones;
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
