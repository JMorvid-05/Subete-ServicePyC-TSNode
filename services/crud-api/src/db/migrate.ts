import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { pool } from './pool.js';

/**
 * Aplica las migraciones pendientes de forma idempotente:
 *   - crea la tabla de control `schema_migraciones`,
 *   - ejecuta cada .sql ordenado alfabéticamente dentro de una transacción,
 *   - registra cuáles ya se aplicaron.
 *
 * Uso: `npm run db:migrar` (desde services/crud-api). Las pruebas de
 * integración la importan y la llaman directamente.
 */
export async function aplicarMigraciones(log: (mensaje: string) => void = console.log): Promise<void> {
  const directorio = fileURLToPath(new URL('./migrations/', import.meta.url));

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migraciones (
      nombre       text PRIMARY KEY,
      aplicada_en  timestamptz NOT NULL DEFAULT now()
    )
  `);

  const archivos = (await readdir(directorio))
    .filter((nombre) => nombre.endsWith('.sql'))
    .sort();

  for (const archivo of archivos) {
    const yaAplicada = await pool.query('SELECT 1 FROM schema_migraciones WHERE nombre = $1', [
      archivo,
    ]);
    if ((yaAplicada.rowCount ?? 0) > 0) {
      log(`[migraciones] omitida (ya aplicada): ${archivo}`);
      continue;
    }

    const sql = await readFile(join(directorio, archivo), 'utf8');
    // Archivos esqueleto (solo comentarios): se omiten hasta que se implementen.
    const sinSentencias = sql.replace(/--[^\n]*/g, '').trim() === '';
    if (sinSentencias) {
      log(`[migraciones] omitida (esqueleto sin sentencias): ${archivo}`);
      continue;
    }
    const cliente = await pool.connect();
    try {
      await cliente.query('BEGIN');
      await cliente.query(sql);
      await cliente.query('INSERT INTO schema_migraciones (nombre) VALUES ($1)', [archivo]);
      await cliente.query('COMMIT');
      log(`[migraciones] aplicada: ${archivo}`);
    } catch (err) {
      await cliente.query('ROLLBACK');
      throw err;
    } finally {
      cliente.release();
    }
  }
}

// Solo corre como script cuando se ejecuta directamente (npm run db:migrar).
const esScript = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;

if (esScript) {
  aplicarMigraciones()
    .then(async () => {
      await pool.end();
      console.log('[migraciones] listo.');
    })
    .catch((err) => {
      console.error('[migraciones] falló:', err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
