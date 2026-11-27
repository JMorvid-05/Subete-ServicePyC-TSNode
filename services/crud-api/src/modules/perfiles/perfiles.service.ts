import { consultar, consultarUno, ejecutar } from '../../db/pool.js';
import { AppError } from '../../middleware/errores.js';
import { esErrorPg, PG_UNICIDAD } from '../comunes/erroresPg.js';
import type { FiltroListadoPerfiles, PerfilEntrada, Rol } from './perfiles.schemas.js';

/** Perfil tal como lo expone el API (camelCase, igual que el resto del clúster). */
export interface Perfil {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  creadoEn: Date;
}

export interface ListadoPerfiles {
  datos: Perfil[];
  total: number;
  pagina: number;
  porPagina: number;
}

/** Fila de la tabla `perfiles` (snake_case). */
interface FilaPerfil {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  creado_en: Date;
}

const COLUMNAS = 'id, nombre, correo, rol, activo, creado_en';
const RESTRICCION_CORREO = 'perfiles_correo_unico';

function aVista(fila: FilaPerfil): Perfil {
  return {
    id: fila.id,
    nombre: fila.nombre,
    correo: fila.correo,
    rol: fila.rol,
    activo: fila.activo,
    creadoEn: fila.creado_en,
  };
}

function noEncontrado(id: string): AppError {
  return new AppError(404, 'perfil_no_encontrado', `No existe el perfil ${id}`, { id });
}

/** El índice único sobre lower(correo) resuelve la carrera: 23505 → 409. */
function traducirCorreoRepetido(err: unknown, correo: string): never {
  if (esErrorPg(err, PG_UNICIDAD, RESTRICCION_CORREO)) {
    throw new AppError(409, 'correo_ya_registrado', 'Ya existe un perfil con ese correo', {
      correo,
    });
  }
  throw err;
}

/**
 * Lista perfiles activos con filtro por rol y paginación.
 * Devuelve `total` para que el cliente calcule las páginas.
 */
export async function listarPerfiles(filtros: FiltroListadoPerfiles): Promise<ListadoPerfiles> {
  const rol = filtros.rol ?? null;
  const desplazamiento = (filtros.pagina - 1) * filtros.porPagina;

  const [filas, conteo] = await Promise.all([
    consultar<FilaPerfil>(
      `SELECT ${COLUMNAS} FROM perfiles
        WHERE activo AND ($1::text IS NULL OR rol = $1)
        ORDER BY id
        LIMIT $2 OFFSET $3`,
      [rol, filtros.porPagina, desplazamiento],
    ),
    consultarUno<{ total: string }>(
      `SELECT count(*) AS total FROM perfiles WHERE activo AND ($1::text IS NULL OR rol = $1)`,
      [rol],
    ),
  ]);

  return {
    datos: filas.map(aVista),
    total: Number(conteo?.total ?? 0),
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  };
}

/** P-HU1: crea un perfil con id autogenerado (`usr-13`, `usr-14`, …). */
export async function crearPerfil(entrada: PerfilEntrada): Promise<Perfil> {
  try {
    const fila = await consultarUno<FilaPerfil>(
      `INSERT INTO perfiles (id, nombre, correo, rol)
       VALUES ((SELECT 'usr-' || lpad(n::text, greatest(2, length(n::text)), '0')
                  FROM nextval('perfiles_seq') AS n), $1, $2, $3)
       RETURNING ${COLUMNAS}`,
      [entrada.nombre, entrada.correo, entrada.rol],
    );
    return aVista(fila as FilaPerfil);
  } catch (err) {
    return traducirCorreoRepetido(err, entrada.correo);
  }
}

/**
 * Detalle de un perfil; si no existe → 404 `perfil_no_encontrado`.
 * Los perfiles desactivados se devuelven con `activo: false` (el MID lo usa).
 */
export async function obtenerPerfil(id: string): Promise<Perfil> {
  const fila = await consultarUno<FilaPerfil>(`SELECT ${COLUMNAS} FROM perfiles WHERE id = $1`, [
    id,
  ]);
  if (!fila) throw noEncontrado(id);
  return aVista(fila);
}

/** Actualiza nombre, correo y rol → 200 / 404 / 409 (correo repetido). */
export async function actualizarPerfil(id: string, entrada: PerfilEntrada): Promise<Perfil> {
  let fila: FilaPerfil | null;
  try {
    fila = await consultarUno<FilaPerfil>(
      `UPDATE perfiles SET nombre = $2, correo = $3, rol = $4
        WHERE id = $1
        RETURNING ${COLUMNAS}`,
      [id, entrada.nombre, entrada.correo, entrada.rol],
    );
  } catch (err) {
    return traducirCorreoRepetido(err, entrada.correo);
  }
  if (!fila) throw noEncontrado(id);
  return aVista(fila);
}

/**
 * DELETE = desactivación lógica (`activo = false`). No borra el registro
 * porque sus calificaciones siguen siendo históricas → 204 / 404.
 */
export async function desactivarPerfil(id: string): Promise<void> {
  const afectadas = await ejecutar(`UPDATE perfiles SET activo = false WHERE id = $1`, [id]);
  if (afectadas === 0) throw noEncontrado(id);
}
