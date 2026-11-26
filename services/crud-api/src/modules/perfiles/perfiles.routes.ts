import { Router } from 'express';
import {
  actualizarPerfilHandler,
  crearPerfilHandler,
  desactivarPerfilHandler,
  listarPerfilesHandler,
  obtenerPerfilHandler,
} from './perfiles.controller.js';

/** Rutas de perfiles: /perfiles (prefijo fijado en app.ts). */
export const perfilesRouter = Router();

perfilesRouter.get('/', listarPerfilesHandler);
perfilesRouter.post('/', crearPerfilHandler);
perfilesRouter.get('/:id', obtenerPerfilHandler);
perfilesRouter.put('/:id', actualizarPerfilHandler);
perfilesRouter.delete('/:id', desactivarPerfilHandler);
