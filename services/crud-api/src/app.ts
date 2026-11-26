import express from 'express';
import type { Application } from 'express';
import { config } from './config/env.js';
import { exigirCabeceraGateway } from './middleware/gatewayHeader.js';
import { manejadorErrores, rutaNoEncontrada } from './middleware/errores.js';
import { perfilesRouter } from './modules/perfiles/perfiles.routes.js';
import { calificacionesRouter } from './modules/calificaciones/calificaciones.routes.js';

/**
 * Construye la aplicación Express del crud-api.
 * Orden importante: JSON → /health → cabecera del gateway → rutas → 404 → errores.
 */
export function crearApp(): Application {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  // Salud del servicio: responde 200 siempre y está exenta de la cabecera
  // del gateway (la prueba de humo del pipeline la llama directamente).
  app.get('/health', (_req, res) => {
    res.status(200).json({ estado: 'ok', servicio: 'crud-api' });
  });

  // Todas las rutas de negocio pasan por la validación de la cabecera.
  app.use(exigirCabeceraGateway(config.cabeceraGateway));

  app.use('/perfiles', perfilesRouter);
  app.use('/calificaciones', calificacionesRouter);

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);

  return app;
}
