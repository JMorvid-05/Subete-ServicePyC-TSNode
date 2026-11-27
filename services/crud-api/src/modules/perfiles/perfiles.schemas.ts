import { AppError } from '../../middleware/errores.js';
import {
  esIdValido,
  exigirObjeto,
  lanzarSiHayErrores,
  parsearPaginacion,
  type ErrorCampo,
} from '../comunes/validaciones.js';

/** Roles válidos de un perfil (los define el clúster Súbete). */
export const ROLES = ['pasajero', 'conductor', 'ambos'] as const;
export type Rol = (typeof ROLES)[number];

export interface PerfilEntrada {
  nombre: string;
  correo: string;
  rol: Rol;
}

export interface FiltroListadoPerfiles {
  rol?: Rol;
  pagina: number;
  porPagina: number;
}

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function esRol(valor: unknown): valor is Rol {
  return typeof valor === 'string' && (ROLES as readonly string[]).includes(valor);
}

/**
 * P-HU1: valida el cuerpo de POST /perfiles y PUT /perfiles/{id}.
 *   - nombre: requerido, 2 a 80 caracteres (sin contar espacios de los extremos)
 *   - correo: formato válido, máximo 254; se guarda en minúsculas
 *   - rol: uno de ROLES
 * Lanza 400 `datos_invalidos` con `detalle.errores` si algo falla.
 */
export function parsearPerfilEntrada(cuerpo: unknown): PerfilEntrada {
  const datos = exigirObjeto(cuerpo);
  const errores: ErrorCampo[] = [];

  const nombre = typeof datos.nombre === 'string' ? datos.nombre.trim() : '';
  if (nombre.length < 2 || nombre.length > 80) {
    errores.push({ campo: 'nombre', mensaje: 'es requerido y debe tener entre 2 y 80 caracteres' });
  }

  const correo = typeof datos.correo === 'string' ? datos.correo.trim().toLowerCase() : '';
  if (!PATRON_CORREO.test(correo) || correo.length > 254) {
    errores.push({ campo: 'correo', mensaje: 'es requerido y debe ser un correo válido' });
  }

  if (!esRol(datos.rol)) {
    errores.push({ campo: 'rol', mensaje: `debe ser uno de: ${ROLES.join(', ')}` });
  }

  lanzarSiHayErrores(errores);
  return { nombre, correo, rol: datos.rol as Rol };
}

/**
 * Valida los query params de GET /perfiles.
 *   - rol: opcional, uno de ROLES
 *   - pagina: entero >= 1 (por defecto 1)
 *   - porPagina: entero entre 1 y 100 (por defecto 20)
 */
export function parsearFiltrosPerfiles(query: Record<string, unknown>): FiltroListadoPerfiles {
  const errores: ErrorCampo[] = [];
  const { pagina, porPagina } = parsearPaginacion(query, errores);

  let rol: Rol | undefined;
  if (query.rol !== undefined && query.rol !== '') {
    if (esRol(query.rol)) {
      rol = query.rol;
    } else {
      errores.push({ campo: 'rol', mensaje: `debe ser uno de: ${ROLES.join(', ')}` });
    }
  }

  lanzarSiHayErrores(errores);
  return { ...(rol !== undefined && { rol }), pagina, porPagina };
}

/** Valida el {id} de la ruta (formato de id seguro, ej. usr-01). */
export function parsearIdPerfil(valor: unknown): string {
  if (!esIdValido(valor)) {
    throw new AppError(400, 'datos_invalidos', 'El id del perfil no tiene un formato válido', {
      errores: [{ campo: 'id', mensaje: 'no tiene un formato de id válido (ej. usr-01)' }],
    });
  }
  return valor;
}
