import { Router } from 'express';
import {
  crearCalificacionHandler,
  listarCalificacionesHandler,
} from './calificaciones.controller.js';

/** Rutas de calificaciones: /calificaciones (prefijo fijado en app.ts). */
export const calificacionesRouter = Router();

calificacionesRouter.get('/', listarCalificacionesHandler);
calificacionesRouter.post('/', crearCalificacionHandler);
