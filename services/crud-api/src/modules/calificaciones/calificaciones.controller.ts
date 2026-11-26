import type { Request, Response } from 'express';
import {
  parsearCalificacionEntrada,
  parsearFiltrosCalificaciones,
} from './calificaciones.schemas.js';
import { crearCalificacion, listarCalificaciones } from './calificaciones.service.js';

/** GET /calificaciones — lista con filtros `paraPerfilId` y `dePerfilId`. */
export async function listarCalificacionesHandler(req: Request, res: Response): Promise<void> {
  const filtros = parsearFiltrosCalificaciones(req.query as Record<string, unknown>);
  res.status(200).json(await listarCalificaciones(filtros));
}

/** POST /calificaciones — crea una calificación (400 y 409 según reglas). */
export async function crearCalificacionHandler(req: Request, res: Response): Promise<void> {
  const entrada = parsearCalificacionEntrada(req.body);
  res.status(201).json(await crearCalificacion(entrada));
}
