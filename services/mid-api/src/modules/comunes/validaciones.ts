import { pendiente } from '../../middleware/errores.js';

export interface CalificacionValidadaEntrada {
  reservaId: string;
  deId: string;
  paraId: string;
  estrellas: number;
  comentario?: string;
}

/**
 * TODO (P-HU4): valida el cuerpo de POST /calificaciones/validadas:
 *   { reservaId, deId, paraId, estrellas, comentario }
 *   - ids con formato válido
 *   - estrellas: entero de 1 a 5 (si no, 400 `datos_invalidos`)
 *   - comentario opcional, máximo 500 caracteres
 */

// se compara el tipo de dato que tiene el argumento, después se valida cada uno de los
//atributos hasta que se retorna el objeto con esa interfaz
export function parsearCalificacionValidada(cuerpo: unknown): CalificacionValidadaEntrada {
  if (typeof cuerpo !== 'object') {
    throw new Error("El cuerpo de la petición es inválido");
  }
  const calificacion = cuerpo as CalificacionValidadaEntrada;
  if (
    typeof calificacion.reservaId !== 'string'
    || typeof calificacion.deId !== 'string'
    || typeof calificacion.paraId !== 'string'
  ) {
    throw new Error("Error en tipo de dato para los id");
  }
  if (typeof calificacion.estrellas !== 'number') {
    throw new Error("Error en tipo de dato para las estrellas");
  } else if (!Number.isInteger(calificacion.estrellas * 10)
    || Number(calificacion.estrellas) >= 1.0 && Number(calificacion.estrellas <= 5.0)) {
    throw new Error("Error en valores de estrellas");
  }
  if (typeof calificacion.comentario !== 'string') {
    throw new Error("Error en tipo de dato para comentario");
  } else if (calificacion.comentario.toString().length < 500) {
    throw new Error("Error en longitud de comentario");
  }
  return calificacion;
}

/** TODO: valida el {id} de la ruta (acepta `unknown` por la tipación de Express). */
export function parsearId(valor: unknown): string {
  if (typeof valor !== 'string') {
    throw new Error("el tipo de dato de la query es inválido");
  }
  return valor as string;
}
