import { Router } from 'express';
import { calificarValidadaHandler } from './calificacionesValidadas.controller.js';

/**
 * Rutas de calificaciones validadas: montadas bajo /calificaciones en app.ts.
 * POST /calificaciones/validadas
 */
export const validadasRouter = Router();

validadasRouter.post('/validadas', calificarValidadaHandler);
