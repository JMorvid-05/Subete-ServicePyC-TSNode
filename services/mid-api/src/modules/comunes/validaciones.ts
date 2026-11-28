import { AppError } from '../../middleware/errores.js';

export interface CalificacionValidadaEntrada {
  reservaId: string;
  deId: string;
  paraId: string;
  estrellas: number;
  comentario?: string;
}

const RE_ID = /^[A-Za-z0-9_-]{1,60}$/;

/**
 * Valida el cuerpo de POST /calificaciones/validadas:
 *   { reservaId, deId, paraId, estrellas, comentario }
 * estrellas debe ser un entero de 1 a 5.
 * deId y paraId deben ser distintos (nadie se califica a sí mismo).
 */
export function parsearCalificacionValidada(cuerpo: unknown): CalificacionValidadaEntrada {
  if (typeof cuerpo !== 'object' || cuerpo === null) {
    throw new AppError(400, 'datos_invalidos', 'Los datos enviados no son válidos', {
      errores: ['El cuerpo debe ser un objeto JSON'],
    });
  }

  const { reservaId, deId, paraId, estrellas, comentario } = cuerpo as Record<string, unknown>;
  const errores: string[] = [];

  for (const [campo, valor] of [
    ['reservaId', reservaId],
    ['deId', deId],
    ['paraId', paraId],
  ] as const) {
    if (typeof valor !== 'string' || !RE_ID.test(valor)) {
      errores.push(`${campo}: requerido, formato de id válido`);
    }
  }

  if (
    typeof estrellas !== 'number' ||
    !Number.isInteger(estrellas) ||
    estrellas < 1 ||
    estrellas > 5
  ) {
    errores.push('estrellas: debe ser un entero entre 1 y 5');
  }

  if (errores.length > 0) {
    throw new AppError(400, 'datos_invalidos', 'Los datos enviados no son válidos', { errores });
  }

  // Auto-calificación: código propio del clúster, más preciso que datos_invalidos.
  if (deId === paraId) {
    throw new AppError(400, 'auto_calificacion', 'No puedes calificarte a ti mismo', {
      deId,
      paraId,
    });
  }

  const entrada: CalificacionValidadaEntrada = {
    reservaId: reservaId as string,
    deId: deId as string,
    paraId: paraId as string,
    estrellas: estrellas as number,
  };
  if (typeof comentario === 'string' && comentario.trim() !== '') {
    if (comentario.length > 500) {
      throw new AppError(400, 'datos_invalidos', 'Los datos enviados no son válidos', {
        errores: ['comentario: debe ser un texto de máximo 500 caracteres'],
      });
    }
    entrada.comentario = comentario.trim();
  }
  return entrada;
}

/** Valida el {id} de la ruta (acepta `unknown` por la tipación de Express). */
export function parsearId(valor: unknown): string {
  if (typeof valor !== 'string' || !RE_ID.test(valor)) {
    throw new AppError(400, 'datos_invalidos', 'Los datos enviados no son válidos', {
      errores: ['id: no tiene un formato válido'],
    });
  }
  return valor;
}
