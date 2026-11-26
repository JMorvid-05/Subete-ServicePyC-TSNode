import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errores.js';

/** Nombre de la cabecera secreta que agrega el API Gateway. */
export const CABECERA_GATEWAY = 'x-gateway-secret';

/**
 * Compara en tiempo constante (hash + timingSafeEqual) para no filtrar
 * la longitud del secreto por medio de ataques de temporización.
 */
function coincide(actual: string, esperado: string): boolean {
  const a = createHash('sha256').update(actual).digest();
  const b = createHash('sha256').update(esperado).digest();
  return timingSafeEqual(a, b);
}

/**
 * Rechaza con 401 cualquier petición que no traiga la cabecera secreta del
 * gateway: nadie puede usar el servicio saltándose el gateway.
 * Excepción: `/health` queda libre (la prueba de humo la llama directamente).
 */
export function exigirCabeceraGateway(secreto: string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.path === '/health') {
      next();
      return;
    }

    const recibida = req.header(CABECERA_GATEWAY);
    if (!recibida || !coincide(recibida, secreto)) {
      next(
        new AppError(
          401,
          'cabecera_gateway_invalida',
          'La petición no trae la cabecera secreta del API Gateway',
          { cabecera: CABECERA_GATEWAY },
        ),
      );
      return;
    }

    next();
  };
}
