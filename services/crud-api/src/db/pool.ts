import pg from 'pg';
import { config } from '../config/env.js';

const { Pool } = pg;

/**
 * Pool de conexiones al PostgreSQL propio del grupo.
 * La conexión es perezosa: el primer query abre el pool. Así los tests
 * (que no tocan la base) pueden importar el módulo sin tener BD disponible.
 */
/** Pool de conexiones al PostgreSQL propio del grupo (exportado para migrate). */
export const pool = new Pool({
  connectionString: config.baseDatos,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

/** Ejecuta un query y devuelve las filas. */
export async function consultar<T extends pg.QueryResultRow = pg.QueryResultRow>(
  texto: string,
  parametros: readonly unknown[] = [],
): Promise<T[]> {
  const resultado = await pool.query<T>(texto, parametros as unknown[]);
  return resultado.rows;
}

/** Ejecuta un UPDATE/DELETE y devuelve la cantidad de filas afectadas. */
export async function ejecutar(
  texto: string,
  parametros: readonly unknown[] = [],
): Promise<number> {
  const resultado = await pool.query(texto, parametros as unknown[]);
  return resultado.rowCount ?? 0;
}

/** Ejecuta un query que devuelve como máximo una fila (o `null`). */
export async function consultarUno<T extends pg.QueryResultRow = pg.QueryResultRow>(
  texto: string,
  parametros: readonly unknown[] = [],
): Promise<T | null> {
  const filas = await consultar<T>(texto, parametros);
  return filas[0] ?? null;
}

/** Verifica que la base de datos responda (se usa al arrancar). */
export async function probarConexion(): Promise<void> {
  await pool.query('SELECT 1');
}

/** Cierra el pool (apagado ordenado). */
export async function cerrarPool(): Promise<void> {
  await pool.end();
}
