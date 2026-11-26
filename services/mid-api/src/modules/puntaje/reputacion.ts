import { pendiente } from '../../middleware/errores.js';

/**
 * Reglas puras del puntaje de confianza (P-HU3).
 * Sin I/O: se prueban directamente con el runner de Node.
 */

export type Insignia = 'nuevo' | 'confiable' | 'en_observacion' | 'regular';

export interface Estrella {
  estrellas: number;
  /** Fecha de la calificación (Date o ISO). */
  creadoEn: Date | string;
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
export function promedioPonderado(_calificaciones: Estrella[], _ahora: Date): number {
  return pendiente('promedioPonderado');
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
