import type { NextFunction, Request, Response } from 'express';

/**
 * Error con el formato común acordado en el clúster:
 *   { "codigo": "...", "mensaje": "...", "detalle": {} }
 */
export class AppError extends Error {
  readonly codigo: string;
  readonly detalle: Record<string, unknown>;

  constructor(
    readonly status: number,
    codigo: string,
    mensaje: string,
    detalle: Record<string, unknown> = {},
  ) {
    super(mensaje);
    this.name = 'AppError';
    this.codigo = codigo;
    this.detalle = detalle;
  }
}

/** Responde 404 con el formato común para rutas inexistentes. */
export function rutaNoEncontrada(req: Request, _res: Response, next: NextFunction): void {
  next(
    new AppError(404, 'ruta_no_encontrada', `No existe el recurso ${req.method} ${req.path}`, {
      metodo: req.method,
      ruta: req.path,
    }),
  );
}

/** Manejador final: siempre responde el formato común del clúster. */
export function manejadorErrores(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) {
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({
      codigo: err.codigo,
      mensaje: err.message,
      detalle: err.detalle,
    });
    return;
  }

  // Sin filtrar información interna (ni stack, ni mensajes del proveedor).
  console.error('[error_interno]', err);
  res.status(500).json({
    codigo: 'error_interno',
    mensaje: 'Ocurrió un error inesperado en el servicio',
    detalle: {},
  });
}

/**
 * Helper del esqueleto: marca una función como pendiente de implementar.
 * Cada integrante lo reemplaza por su implementación real.
 */
export function pendiente(funcion: string): never {
  throw new AppError(
    501,
    'no_implementado',
    `Pendiente de implementar: ${funcion}`,
    { funcion },
  );
}
