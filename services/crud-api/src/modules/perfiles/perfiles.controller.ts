import type { Request, Response } from 'express';
import {
  parsearFiltrosPerfiles,
  parsearIdPerfil,
  parsearPerfilEntrada,
} from './perfiles.schemas.js';
import {
  actualizarPerfil,
  crearPerfil,
  desactivarPerfil,
  listarPerfiles,
  obtenerPerfil,
} from './perfiles.service.js';

/** GET /perfiles — lista con filtro por rol y paginación. */
export async function listarPerfilesHandler(req: Request, res: Response): Promise<void> {
  const filtros = parsearFiltrosPerfiles(req.query as Record<string, unknown>);
  res.status(200).json(await listarPerfiles(filtros));
}

/** POST /perfiles — crea un perfil (409 si el correo ya existe). */
export async function crearPerfilHandler(req: Request, res: Response): Promise<void> {
  const entrada = parsearPerfilEntrada(req.body);
  res.status(201).json(await crearPerfil(entrada));
}

/** GET /perfiles/{id} — detalle (404 si no existe). */
export async function obtenerPerfilHandler(req: Request, res: Response): Promise<void> {
  const id = parsearIdPerfil(req.params.id);
  res.status(200).json(await obtenerPerfil(id));
}

/** PUT /perfiles/{id} — actualiza (400/404/409). */
export async function actualizarPerfilHandler(req: Request, res: Response): Promise<void> {
  const id = parsearIdPerfil(req.params.id);
  const entrada = parsearPerfilEntrada(req.body);
  res.status(200).json(await actualizarPerfil(id, entrada));
}

/** DELETE /perfiles/{id} — desactiva el perfil (204). */
export async function desactivarPerfilHandler(req: Request, res: Response): Promise<void> {
  const id = parsearIdPerfil(req.params.id);
  await desactivarPerfil(id);
  res.status(204).send();
}
