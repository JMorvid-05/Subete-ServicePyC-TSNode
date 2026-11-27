import { createHash, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errores.js';

/** Nombre de la cabecera secreta que agrega el API Gateway. */
export const CABECERA_GATEWAY = 'x-gateway-secret';

/** Comparación en tiempo constante para no filtrar el secreto.
 * o sea, asegurarse de solo mostrar true | false sin revelar el tiempo
 * de revisión para evitar ataques de fuerza bruta.
 */
function coincide(actual: string, esperado: string): boolean {
  const a = createHash('sha256').update(actual).digest();
  const b = createHash('sha256').update(esperado).digest();
  //
  return timingSafeEqual(a, b);
}

/**
 * Rechaza con 401 cualquier petición sin la cabecera secreta del gateway:
 * nadie puede usar el servicio saltándose el gateway.
 * `/health` queda exenta (la prueba de humo del pipeline la llama directa).
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
