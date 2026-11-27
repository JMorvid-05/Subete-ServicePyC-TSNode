import { consultar, consultarUno } from '../../db/pool.js';
import { AppError } from '../../middleware/errores.js';
import { esErrorPg, PG_CHECK, PG_LLAVE_FORANEA, PG_UNICIDAD } from '../comunes/erroresPg.js';
import type { CalificacionEntrada, FiltroListadoCalificaciones } from './calificaciones.schemas.js';

/** Calificación tal como la expone el API (camelCase). */
export interface Calificacion {
  id: string;
  reservaId: string;
  dePerfilId: string;
  paraPerfilId: string;
  estrellas: number;
  comentario: string | null;
  creadoEn: Date;
}

export interface ListadoCalificaciones {
  datos: Calificacion[];
  total: number;
  pagina: number;
  porPagina: number;
}

/** Fila de la tabla `calificaciones` (snake_case). */
interface FilaCalificacion {
  id: string;
  reserva_id: string;
  de_perfil_id: string;
  para_perfil_id: string;
  estrellas: number;
  comentario: string | null;
  creado_en: Date;
}

const COLUMNAS = 'id, reserva_id, de_perfil_id, para_perfil_id, estrellas, comentario, creado_en';

function aVista(fila: FilaCalificacion): Calificacion {
  return {
    id: fila.id,
    reservaId: fila.reserva_id,
    dePerfilId: fila.de_perfil_id,
    paraPerfilId: fila.para_perfil_id,
    estrellas: fila.estrellas,
    comentario: fila.comentario,
    creadoEn: fila.creado_en,
  };
}

/**
 * Lista calificaciones con filtros `paraPerfilId` y `dePerfilId` + paginación.
 * Orden: las más recientes primero.
 */
export async function listarCalificaciones(
  filtros: FiltroListadoCalificaciones,
): Promise<ListadoCalificaciones> {
  const para = filtros.paraPerfilId ?? null;
  const de = filtros.dePerfilId ?? null;
  const donde = `($1::text IS NULL OR para_perfil_id = $1) AND ($2::text IS NULL OR de_perfil_id = $2)`;
  const desplazamiento = (filtros.pagina - 1) * filtros.porPagina;

  const [filas, conteo] = await Promise.all([
    consultar<FilaCalificacion>(
      `SELECT ${COLUMNAS} FROM calificaciones
        WHERE ${donde}
        ORDER BY creado_en DESC, id
        LIMIT $3 OFFSET $4`,
      [para, de, filtros.porPagina, desplazamiento],
    ),
    consultarUno<{ total: string }>(
      `SELECT count(*) AS total FROM calificaciones WHERE ${donde}`,
      [para, de],
    ),
  ]);

  return {
    datos: filas.map(aVista),
    total: Number(conteo?.total ?? 0),
    pagina: filtros.pagina,
    porPagina: filtros.porPagina,
  };
}

/**
 * P-HU2: crea una calificación. Las reglas las garantiza la base:
 *   - perfiles inexistentes → 400 `perfil_inexistente` (llave foránea)
 *   - misma reserva y mismo autor → 409 `calificacion_duplicada` (UNIQUE)
 *   - auto-calificación → 400 `auto_calificacion` (CHECK; el schema ya lo filtra)
 */
export async function crearCalificacion(entrada: CalificacionEntrada): Promise<Calificacion> {
  try {
    const fila = await consultarUno<FilaCalificacion>(
      `INSERT INTO calificaciones (id, reserva_id, de_perfil_id, para_perfil_id, estrellas, comentario)
       VALUES ((SELECT 'cal-' || lpad(n::text, greatest(4, length(n::text)), '0')
                  FROM nextval('calificaciones_seq') AS n), $1, $2, $3, $4, $5)
       RETURNING ${COLUMNAS}`,
      [
        entrada.reservaId,
        entrada.dePerfilId,
        entrada.paraPerfilId,
        entrada.estrellas,
        entrada.comentario ?? null,
      ],
    );
    return aVista(fila as FilaCalificacion);
  } catch (err) {
    if (esErrorPg(err, PG_UNICIDAD, 'calificaciones_reserva_autor_unica')) {
      throw new AppError(
        409,
        'calificacion_duplicada',
        'Ese perfil ya calificó esta reserva',
        { reservaId: entrada.reservaId, dePerfilId: entrada.dePerfilId },
      );
    }
    if (esErrorPg(err, PG_LLAVE_FORANEA)) {
      const campo = err.constraint?.includes('para_perfil') ? 'paraPerfilId' : 'dePerfilId';
      throw new AppError(400, 'perfil_inexistente', 'Uno de los perfiles no existe', {
        campo,
        id: campo === 'paraPerfilId' ? entrada.paraPerfilId : entrada.dePerfilId,
      });
    }
    if (esErrorPg(err, PG_CHECK, 'calificaciones_no_auto')) {
      throw new AppError(400, 'auto_calificacion', 'Nadie puede calificarse a sí mismo', {
        perfilId: entrada.dePerfilId,
      });
    }
    throw err;
  }
}
