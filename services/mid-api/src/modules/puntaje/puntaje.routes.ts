import { Router } from 'express';
import { obtenerPuntajeHandler } from './puntaje.controller.js';

/**
 * Rutas del puntaje: montadas bajo /perfiles en app.ts.
 * GET /perfiles/{id}/puntaje
 */
export const puntajeRouter = Router();

puntajeRouter.get('/:id/puntaje', obtenerPuntajeHandler);
