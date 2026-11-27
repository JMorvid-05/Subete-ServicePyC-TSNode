import { pendiente } from '../../middleware/errores.js';
import { differenceInCalendarDays } from 'date-fns';


/**
 * Reglas puras del puntaje de confianza (P-HU3).
 * Sin I/O: se prueban directamente con el runner de Node.
 */

export type Insignia = 'nuevo' | 'confiable' | 'en_observacion' | 'regular';

export interface Estrella {
  //para poder filtrar de los de 30 días con los demás
  id: number;
  estrellas: number;
  /** Fecha de la calificación (Date o ISO). */
  //se deja string dado que se recibe de una petición y toca asegurar
  //convertirlo en date acá para evitar problemas de null
  creadoEn: string;
}

/** Ventana de "lo reciente": dentro de estos días pesa el doble. */
export const DIAS_RECIENTES = 30;

export interface DatosInsignia {
  puntaje: number;
  tasaCancelacion: number;
  viajesCompletados: number;
}

/**
 * TODO (P-HU3): promedio ponderado de estrellas.
 *   - las calificaciones de los últimos 30 días pesan 2, las anteriores pesan 1
 *   - devuelve 0 cuando no hay calificaciones
 */
export function promedioPonderado(calificaciones: Estrella[], ahora: Date): number | string {
  if (calificaciones == undefined) {
    return "error: se tuvo un error obteniendo la información";
  }

  //filtrar solo por -para_perfil_id-, _ca:
  //traer todas las fechas del perfil
  //va a tocar con id porque cómo distinguir cuáles eliminar?
  let calificacionFiltrar: number[] = [],
    estrellas30dias: number[] = [], estrellasmas30dias: Estrella[] = [];
  calificaciones.forEach(calificacion => {
    let dif: number = diferenciaFechas(calificacion?.creadoEn ?? '', ahora);
    if (dif <= 30) {
      //significa que hubo error en calificaciones donde es undefined
      estrellas30dias.push(calificacion.estrellas);
      if (calificacion !== undefined) {
        calificacionFiltrar.push(calificacion.id);
      }
    }
  });
  estrellasmas30dias = calificaciones.filter(calificacion => !calificacionFiltrar.includes(calificacion.id));
  //ese 2 quemado no sé
  let subtotal30dias: number = estrellas30dias.reduce((sumatotal, estrella) => sumatotal + estrella * 2);
  let subtotalmas30dias: number = estrellasmas30dias.reduce((sumatotal, estrella) => sumatotal + estrella.estrellas, 0);
  let divisor = (2 * estrellas30dias.length) + (1 * estrellasmas30dias.length);
  return (subtotal30dias + subtotalmas30dias) / divisor;
  /*
  Supongamos que tienes estas calificaciones:
  Nota	Porcentaje
  4.0	30%
  3.5	20%
  4.5	50%
  
  Multiplicamos cada nota por su porcentaje:
  \[
  \frac{4.0(30)+3.5(20)+4.5(50)}{30+20+50}
  \]
  
  \[
  =\frac{120+70+225}{100}
  \]
  */

  /* 
  se debe colocar valor inicial en caso de que se busque un diferente tipo
  estrellasmas30dias.reduce((a,e)=>a+e.estrellas);

*/


  /*
  ponderado= sigma(x_n*y_n)/sigma(y_n) 
  x_n= estrella
  y_n=peso
  0 E x_n =0
  */
}

/** TODO: tasa de cancelación = canceladas / total. 0 si no hay reservas. */
export function tasaCancelacion(_canceladas: number, _total: number): number {
  return pendiente('tasaCancelacion');
}

/**
 * TODO: puntaje de 0 a 5:
 *   puntaje = promedioPonderado - tasaCancelacion * 2   (limitado entre 0 y 5,
 *   redondeado a 2 decimales)
 */
export function calcularPuntaje(_promedio: number, _tasa: number): number {
  return pendiente('calcularPuntaje');
}

/**
 * TODO (P-HU3): insignia, en este orden:
 *   1. nuevo           → menos de 5 viajes completados (sin importar el puntaje)
 *   2. confiable       → puntaje >= 4.5 y tasa de cancelación < 10%
 *   3. en_observacion  → puntaje < 3.5 o tasa de cancelación > 30%
 *   4. regular         → el resto
 */
export function asignarInsignia(_datos: DatosInsignia): Insignia {
  return pendiente('asignarInsignia');
}


/*
Funciones para cálculos 
*/



function diferenciaFechas(date1: string, date2: Date): number {

  const d1 = new Date(date1);
  // se utiliza en días calendarios y no días normales por ser más usado
  //   comparar fechas y no la cantidad exacta de horas.

  return differenceInCalendarDays(d1, date2);
}


