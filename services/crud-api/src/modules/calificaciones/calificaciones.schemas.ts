import { AppError } from '../../middleware/errores.js';
import {
  esIdValido,
  exigirObjeto,
  lanzarSiHayErrores,
  leerIdOpcional,
  parsearPaginacion,
  type ErrorCampo,
} from '../comunes/validaciones.js';

export interface CalificacionEntrada {
  reservaId: string;
  dePerfilId: string;
  paraPerfilId: string;
  estrellas: number;
  comentario?: string;
}

export interface FiltroListadoCalificaciones {
  paraPerfilId?: string;
  dePerfilId?: string;
  pagina: number;
  porPagina: number;
}

export const COMENTARIO_MAXIMO = 500;

/**
 * P-HU2: valida el cuerpo de POST /calificaciones.
 *   - reservaId, dePerfilId y paraPerfilId con formato de id válido
 *   - estrellas: entero de 1 a 5 (si no, 400 `datos_invalidos`)
 *   - comentario opcional, máximo 500 caracteres
 *   - nadie se califica a sí mismo (400 `auto_calificacion`)
 */
export function parsearCalificacionEntrada(cuerpo: unknown): CalificacionEntrada {
  const datos = exigirObjeto(cuerpo);
  const errores: ErrorCampo[] = [];

  for (const campo of ['reservaId', 'dePerfilId', 'paraPerfilId'] as const) {
    if (!esIdValido(datos[campo])) {
      errores.push({ campo, mensaje: 'es requerido y debe tener un formato de id válido' });
    }
  }

  const estrellas = datos.estrellas;
  if (typeof estrellas !== 'number' || !Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) {
    errores.push({ campo: 'estrellas', mensaje: 'debe ser un entero entre 1 y 5' });
  }

  let comentario: string | undefined;
  if (datos.comentario !== undefined && datos.comentario !== null) {
    if (typeof datos.comentario !== 'string') {
      errores.push({ campo: 'comentario', mensaje: 'debe ser un texto' });
    } else {
      comentario = datos.comentario.trim();
      if (comentario.length > COMENTARIO_MAXIMO) {
        errores.push({ campo: 'comentario', mensaje: `máximo ${COMENTARIO_MAXIMO} caracteres` });
      }
      if (comentario === '') comentario = undefined;
    }
  }

  lanzarSiHayErrores(errores);

  const entrada: CalificacionEntrada = {
    reservaId: datos.reservaId as string,
    dePerfilId: datos.dePerfilId as string,
    paraPerfilId: datos.paraPerfilId as string,
    estrellas: estrellas as number,
    ...(comentario !== undefined && { comentario }),
  };

  if (entrada.dePerfilId === entrada.paraPerfilId) {
    throw new AppError(400, 'auto_calificacion', 'Nadie puede calificarse a sí mismo', {
      perfilId: entrada.dePerfilId,
    });
  }

  return entrada;
}

/**
 * Valida los query params de GET /calificaciones.
 *   - paraPerfilId y dePerfilId opcionales (formato de id)
 *   - pagina >= 1 (defecto 1), porPagina 1..100 (defecto 20)
 */
export function parsearFiltrosCalificaciones(
  query: Record<string, unknown>,
): FiltroListadoCalificaciones {
  const errores: ErrorCampo[] = [];
  const { pagina, porPagina } = parsearPaginacion(query, errores);
  const paraPerfilId = leerIdOpcional(query, 'paraPerfilId', errores);
  const dePerfilId = leerIdOpcional(query, 'dePerfilId', errores);
  lanzarSiHayErrores(errores);
  return {
    ...(paraPerfilId !== undefined && { paraPerfilId }),
    ...(dePerfilId !== undefined && { dePerfilId }),
    pagina,
    porPagina,
  };
}
