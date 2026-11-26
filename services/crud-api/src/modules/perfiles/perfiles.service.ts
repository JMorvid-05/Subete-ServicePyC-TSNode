import { pendiente } from '../../middleware/errores.js';
import type { FiltroListadoPerfiles, PerfilEntrada } from './perfiles.schemas.js';

export interface Perfil {
  id: string;
  nombre: string;
  correo: string;
  rol: 'pasajero' | 'conductor' | 'ambos';
  activo: boolean;
  creado_en: Date;
}

export interface ListadoPerfiles {
  datos: Perfil[];
  total: number;
  pagina: number;
  porPagina: number;
}

/**
 * TODO: lista perfiles con filtro por rol y paginación.
 *   - los perfiles desactivados NO aparecen en el listado
 *   - devuelve `total` para que el cliente calcule las páginas
 * Uso: `consultar` / `consultarUno` de src/db/pool.ts (SQL parametrizado).
 */
export async function listarPerfiles(_filtros: FiltroListadoPerfiles): Promise<ListadoPerfiles> {
  return pendiente('listarPerfiles');
}

/**
 * TODO (P-HU1): crea un perfil con id autogenerado (`usr-…`).
 *   - correo repetido → 409 `correo_ya_registrado` (índice único, sin carrera)
 */
export async function crearPerfil(_entrada: PerfilEntrada): Promise<Perfil> {
  return pendiente('crearPerfil');
}

/** TODO: detalle de un perfil; si no existe → 404 `perfil_no_encontrado`. */
export async function obtenerPerfil(_id: string): Promise<Perfil> {
  return pendiente('obtenerPerfil');
}

/** TODO: actualiza nombre, correo y rol → 200 / 400 / 404 / 409 (correo repetido). */
export async function actualizarPerfil(_id: string, _entrada: PerfilEntrada): Promise<Perfil> {
  return pendiente('actualizarPerfil');
}

/**
 * TODO: DELETE = desactivación lógica (`activo = false`), no borra el registro
 * porque sus calificaciones siguen siendo históricas → 204 / 404.
 */
export async function desactivarPerfil(_id: string): Promise<void> {
  return pendiente('desactivarPerfil');
}
