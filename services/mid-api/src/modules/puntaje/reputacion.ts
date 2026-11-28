import { pendiente } from '../../middleware/errores.js';
import { differenceInCalendarDays } from 'date-fns';


/**
 * Reglas puras del puntaje de confianza (P-HU3).
 * Sin I/O: se prueban directamente con el runner de Node.
 */

export type Insignia = 'nuevo' | 'confiable' | 'en_observacion' | 'regular';
//Debe ser igual a CalificacionVista
export interface Estrella {
  //para poder filtrar de los de 30 días con los demás
  id: string;
  estrellas: number;
  /** Fecha de la calificación (Date o ISO). */
  //se deja string dado que se recibe de una petición y toca asegurar
  //convertirlo en date acá para evitar problemas de null
  creadoEn: string | Date;
}

/** Ventana de "lo reciente": dentro de estos días pesa el doble. */
export const DIAS_RECIENTES = 30;


/**
 * TODO (P-HU3): promedio ponderado de estrellas.
 *   - las calificaciones de los últimos 30 días pesan 2, las anteriores pesan 1
 *   - devuelve 0 cuando no hay calificaciones

  Cómo funciona: Recorre un listado de calificaciones donde se compara si es menor a 30 días en la que
  fue realizada, en caso de que lo sea, se agrega a un vector llamado estrellas30dias donde tendrá todas las calificaciones
  con esa condición y su id. Se hace un filtro de todas las calificaciones para tener todas aquellas que NO
  cumplen la condición de creación en el vector estrellasmas30dias. Finalmente se hace un .reduce (suma acumulada) de cada
  vector según el peso (1 si dias>30 y 2 si dias<=30) a cada calificación y así obtener el promedio ponderado

 */
export function promedioPonderado(calificaciones: Estrella[], ahora: Date): number {
  //Cuando no hay calificaciones, devuelve 0
  if (calificaciones == undefined) {
    return 0;
  }

  //filtrar solo por -para_perfil_id-, _ca:
  //traer todas las fechas del perfil
  //va a tocar con id porque cómo distinguir cuáles eliminar?
  let calificacionFiltrar: string[] = [],
    estrellas30dias: number[] = [], estrellasmas30dias: Estrella[] = []
  calificaciones.forEach(calificacion => {
    let dif: number = diferenciaFechas(calificacion?.creadoEn ?? '', ahora);
    if (dif >= 0 && dif <= DIAS_RECIENTES) {
      //significa que hubo error en calificaciones donde es undefined
      estrellas30dias.push(calificacion.estrellas);
      if (calificacion !== undefined) {
        calificacionFiltrar.push(calificacion.id);
      }
    }
  });
  //Acá se obtiene las calificaciones sin que estén las de hace 30 días
  estrellasmas30dias = calificaciones.filter(calificacion => !calificacionFiltrar.includes(calificacion.id));
  //por defecto se coloca en 0 el reduce
  let subtotal30dias: number = estrellas30dias.reduce((sumatotal, estrella) => sumatotal + estrella * 2, 0);
  let subtotalmas30dias: number = estrellasmas30dias.reduce((sumatotal, estrella) => sumatotal + estrella.estrellas, 0);
  let divisor = (2 * estrellas30dias.length) + (1 * estrellasmas30dias.length);
  return Number(((subtotal30dias + subtotalmas30dias) / divisor).toFixed(2));

}

/** TODO: tasa de cancelación = canceladas / total. 0 si no hay reservas. */
export function tasaCancelacion(canceladas: number, total: number): number {
  //Pedir datos de reserva: id_pasajero, estado->cancelada, total de reservas
  if (total == 0) {
    //no hay reservas para ese pasajero
    return 0;
  } else {
    return Number((canceladas / total).toFixed(2));
  }
  //return pendiente('tasaCancelacion');
}

/**
 * TODO: puntaje de 0 a 5:
 *   puntaje = promedioPonderado - tasaCancelacion * 2   (limitado entre 0 y 5,
 *   se redondea a 1 decimal ya que no especifica
 */
export function calcularPuntaje(promedio: number, tasa_canceladas: number): number {
  let puntaje = promedio - (tasa_canceladas * 2)
  return Number(puntaje.toFixed(1));
}

/**
 * TODO (P-HU3): insignia, en este orden:
 *   1. nuevo           → menos de 5 viajes completados (sin importar el puntaje)
 *   2. confiable       → puntaje >= 4.5 y tasa de cancelación < 10%
 *   3. en_observacion  → puntaje < 3.5 o tasa de cancelación > 30%
 *   4. regular         → el resto
 */
export function asignarInsignia(puntaje: number, tasa_cancelacion:number, viajes_completados: number): Insignia {
  let insignia: Insignia = 'regular';
  // export type Insignia = 'nuevo' | 'confiable' | 'en_observacion' | 'regular';
  if (viajes_completados < 5) {
    insignia = 'nuevo';

  } else if (puntaje >= 4.5 && tasa_cancelacion < 0.1) {
    insignia = 'confiable';

  } else if (puntaje < 3.5 || tasa_cancelacion > 0.3) {
    insignia = 'en_observacion';
  }
  return insignia;

}


/*
Funciones para cálculos 
*/



function diferenciaFechas(date1: string | Date, date2: Date): number {

  const d1 = new Date(date1);
  // se utiliza en días calendarios y no días normales por ser más usado
  //   comparar fechas y no la cantidad exacta de horas.
  //nota: este método , el arg1 es la fecha más reciente y arg2 la más antigua
  return differenceInCalendarDays(date2, d1);
}


