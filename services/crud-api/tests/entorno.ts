// DEBE importarse primero en cada archivo de prueba: define las variables de
// entorno de prueba antes de que src/config/env.ts las lea (falla si faltan).
import { existsSync, readFileSync } from 'node:fs';
import dotenv from 'dotenv';

process.env.NODE_ENV = 'test';

// Base de pruebas de integración: se toma SOLO de DATABASE_URL_PRUEBAS
// (variable del sistema o del .env local), nunca de DATABASE_URL, porque
// las pruebas de integración borran las tablas.
if (!process.env.DATABASE_URL_PRUEBAS && existsSync('.env')) {
  const archivo = dotenv.parse(readFileSync('.env'));
  if (archivo.DATABASE_URL_PRUEBAS) {
    process.env.DATABASE_URL_PRUEBAS = archivo.DATABASE_URL_PRUEBAS;
  }
}
if (process.env.DATABASE_URL_PRUEBAS) {
  process.env.PRUEBAS_BD = '1';
  process.env.DATABASE_URL = process.env.DATABASE_URL_PRUEBAS;
}

// En el CI, PRUEBAS_BD=1 y DATABASE_URL apuntan al Postgres desechable del job.
process.env.DATABASE_URL ??= 'postgresql://prueba:prueba@127.0.0.1:5432/prueba';
process.env.GATEWAY_SECRET ??= 'secreto-de-prueba';
process.env.CRUD_API_PORT ??= '0';
