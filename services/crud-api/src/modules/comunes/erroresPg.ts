/** Códigos SQLSTATE de PostgreSQL que traducimos a errores de negocio. */
export const PG_UNICIDAD = '23505';
export const PG_LLAVE_FORANEA = '23503';
export const PG_CHECK = '23514';

interface ErrorPg {
  code: string;
  constraint?: string;
}

/** ¿Es un error de Postgres con ese código (y, opcionalmente, esa restricción)? */
export function esErrorPg(err: unknown, codigo: string, restriccion?: string): err is ErrorPg {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as Partial<ErrorPg>;
  if (e.code !== codigo) return false;
  return restriccion === undefined || e.constraint === restriccion;
}
