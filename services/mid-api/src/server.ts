import { crearApp } from './app.js';
import { config } from './config/env.js';

function main(): void {
  const app = crearApp();
  const servidor = app.listen(config.puerto, () => {
    console.log(`[mid-api] escuchando en el puerto ${config.puerto} (${config.entorno})`);
  });

  // Apagado ordenado del servicio.
  const apagar = (senal: string) => {
    console.log(`[mid-api] recibe ${senal}, apagando...`);
    servidor.close(() => process.exit(0));
  };
  process.on('SIGINT', () => apagar('SIGINT'));
  process.on('SIGTERM', () => apagar('SIGTERM'));
}

main();
