import type { Request, Response } from 'express';
import { parsearCalificacionValidada } from '../comunes/validaciones.js';
import { calificarViajeValidada } from './calificacionesValidadas.service.js';

/** POST /calificaciones/validadas */
export async function calificarValidadaHandler(req: Request, res: Response): Promise<void> {
  const entrada = parsearCalificacionValidada(req.body);
  res.status(201).json(await calificarViajeValidada(entrada));
}
