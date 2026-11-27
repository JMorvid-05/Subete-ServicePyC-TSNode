import { AppError } from '../../middleware/errores.js';

/** Un error de validación de un campo concreto (va en `detalle.errores`). */
export interface ErrorCampo {
  campo: string;
  mensaje: string;
}

/** Ids legibles del clúster: usr-01, cal-0001, res-0001, ruta-0001… */
const PATRON_ID = /^[a-z]{2,5}-[A-Za-z0-9-]{1,40}$/;

export function esIdValido(valor: unknown): valor is string {
  return typeof valor === 'string' && PATRON_ID.test(valor);
}

/** Lanza 400 `datos_invalidos` con la lista de errores si hay alguno. */
export function lanzarSiHayErrores(errores: ErrorCampo[]): void {
  if (errores.length > 0) {
    throw new AppError(400, 'datos_invalidos', 'Los datos enviados no son válidos', { errores });
  }
}

/** Exige que el cuerpo sea un objeto JSON (no null, no arreglo). */
export function exigirObjeto(cuerpo: unknown): Record<string, unknown> {
  if (typeof cuerpo !== 'object' || cuerpo === null || Array.isArray(cuerpo)) {
    throw new AppError(400, 'datos_invalidos', 'El cuerpo debe ser un objeto JSON', {
      errores: [{ campo: 'cuerpo', mensaje: 'debe ser un objeto JSON' }],
    });
  }
  return cuerpo as Record<string, unknown>;
}

/**
 * Lee un entero positivo de un query param. Devuelve `defecto` si no viene;
 * agrega un error si viene pero no es un entero dentro de [min, max].
 */
function leerEntero(
  query: Record<string, unknown>,
  campo: string,
  defecto: number,
  min: number,
  max: number,
  errores: ErrorCampo[],
): number {
  const crudo = query[campo];
  if (crudo === undefined || crudo === '') return defecto;
  const texto = Array.isArray(crudo) ? crudo[0] : crudo;
  const numero = typeof texto === 'string' && /^\d+$/.test(texto) ? Number(texto) : Number.NaN;
  if (!Number.isInteger(numero) || numero < min || numero > max) {
    errores.push({ campo, mensaje: `debe ser un entero entre ${min} y ${max}` });
    return defecto;
  }
  return numero;
}

export const POR_PAGINA_DEFECTO = 20;
export const POR_PAGINA_MAXIMO = 100;

/** pagina >= 1 (defecto 1) y porPagina 1..100 (defecto 20). */
export function parsearPaginacion(
  query: Record<string, unknown>,
  errores: ErrorCampo[],
): { pagina: number; porPagina: number } {
  return {
    pagina: leerEntero(query, 'pagina', 1, 1, Number.MAX_SAFE_INTEGER, errores),
    porPagina: leerEntero(query, 'porPagina', POR_PAGINA_DEFECTO, 1, POR_PAGINA_MAXIMO, errores),
  };
}

/** Lee un filtro opcional de tipo id desde el query. */
export function leerIdOpcional(
  query: Record<string, unknown>,
  campo: string,
  errores: ErrorCampo[],
): string | undefined {
  const crudo = query[campo];
  if (crudo === undefined || crudo === '') return undefined;
  if (!esIdValido(crudo)) {
    errores.push({ campo, mensaje: 'no tiene un formato de id válido' });
    return undefined;
  }
  return crudo;
}
