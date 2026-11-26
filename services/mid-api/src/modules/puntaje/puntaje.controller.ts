import type { Request, Response } from 'express';
import { parsearId } from '../comunes/validaciones.js';
import { calcularPuntajePerfil } from './puntaje.service.js';

/** GET /perfiles/{id}/puntaje */
export async function obtenerPuntajeHandler(req: Request, res: Response): Promise<void> {
  const id = parsearId(req.params.id);
  res.status(200).json(await calcularPuntajePerfil(id));
}
