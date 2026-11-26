import express from 'express';
import type { Application } from 'express';
import { config } from './config/env.js';
import { exigirCabeceraGateway } from './middleware/gatewayHeader.js';
import { manejadorErrores, rutaNoEncontrada } from './middleware/errores.js';
import { puntajeRouter } from './modules/puntaje/puntaje.routes.js';
import { validadasRouter } from './modules/calificaciones-validadas/calificacionesValidadas.routes.js';

/**
 * Construye la aplicación Express del mid-api.
 *
 * Nota de integración con el gateway (acordar con el líder): el gateway
 * enruta por prefijo, pero estos dos endpoints comparten prefijo con el
 * crud-api del mismo grupo, así que deben tener ruta específica prioritaria:
 *   · GET  /perfiles/{id}/puntaje          → mid-api
 *   · POST /calificaciones/validadas       → mid-api
 *   · /perfiles/* y /calificaciones/*      → crud-api
 */
export function crearApp(): Application {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));

  // Salud: 200 siempre, exenta de la cabecera del gateway (prueba de humo).
  app.get('/health', (_req, res) => {
    res.status(200).json({ estado: 'ok', servicio: 'mid-api' });
  });

  // Todas las rutas de negocio pasan por la validación de la cabecera.
  app.use(exigirCabeceraGateway(config.cabeceraGateway));

  app.use('/perfiles', puntajeRouter);
  app.use('/calificaciones', validadasRouter);

  app.use(rutaNoEncontrada);
  app.use(manejadorErrores);

  return app;
}
