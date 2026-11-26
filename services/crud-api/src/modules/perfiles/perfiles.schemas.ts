import { pendiente } from '../../middleware/errores.js';

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

/**
 * TODO (P-HU1): valida el cuerpo de POST /perfiles.
 *   - nombre: requerido, 2 a 80 caracteres
 *   - correo: formato válido (único en la base)
 *   - rol: uno de ROLES
 * Lanza AppError 400 `datos_invalidos` con `detalle.errores` si algo falla.
 */
export function parsearPerfilEntrada(_cuerpo: unknown): PerfilEntrada {
  return pendiente('parsearPerfilEntrada');
}

/**
 * TODO: valida los query params de GET /perfiles.
 *   - rol: opcional, uno de ROLES
 *   - pagina: entero >= 1 (por defecto 1)
 *   - porPagina: entero entre 1 y 100 (por defecto 20)
 */
export function parsearFiltrosPerfiles(_query: Record<string, unknown>): FiltroListadoPerfiles {
  return pendiente('parsearFiltrosPerfiles');
}

/** TODO: valida el {id} de la ruta (formato de id seguro, ej. usr-01). */
export function parsearIdPerfil(_valor: unknown): string {
  return pendiente('parsearIdPerfil');
}
