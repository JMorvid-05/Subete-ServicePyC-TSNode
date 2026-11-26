import { crearApp } from './app.js';
import { config } from './config/env.js';
import { probarConexion, cerrarPool } from './db/pool.js';

async function main(): Promise<void> {
  // Verifica la conexión a PostgreSQL antes de aceptar tráfico.
  await probarConexion();

  const app = crearApp();
  const servidor = app.listen(config.puerto, () => {
    console.log(`[crud-api] escuchando en el puerto ${config.puerto} (${config.entorno})`);
  });

  // Apagado ordenado: deja de aceptar conexiones y cierra el pool de la BD.
  const apagar = (senal: string) => {
    console.log(`[crud-api] recibe ${senal}, apagando...`);
    servidor.close(async () => {
      await cerrarPool();
      process.exit(0);
    });
  };
  process.on('SIGINT', () => apagar('SIGINT'));
  process.on('SIGTERM', () => apagar('SIGTERM'));
}

main().catch((err) => {
  console.error('[crud-api] no pudo arrancar:', err instanceof Error ? err.message : err);
  process.exit(1);
});
