import './entorno.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/middleware/errores.js';
import { parsearCalificacionValidada, parsearId } from '../src/modules/comunes/validaciones.js';

function esperarError(cuerpo: unknown, codigoEsperado?: string): AppError {
  try {
    parsearCalificacionValidada(cuerpo);
    assert.fail('se esperaba que lanzara AppError');
  } catch (err) {
    assert.ok(err instanceof AppError, 'debe ser AppError');
    if (codigoEsperado) assert.equal(err.codigo, codigoEsperado);
    return err;
  }
}

test('parsearCalificacionValidada acepta una entrada válida', () => {
  const entrada = parsearCalificacionValidada({
    reservaId: 'res-0001',
    deId: 'usr-12',
    paraId: 'usr-05',
    estrellas: 4,
    comentario: '  Buen viaje  ',
  });
  assert.equal(entrada.reservaId, 'res-0001');
  assert.equal(entrada.deId, 'usr-12');
  assert.equal(entrada.paraId, 'usr-05');
  assert.equal(entrada.estrellas, 4);
  assert.equal(entrada.comentario, 'Buen viaje');
});

test('parsearCalificacionValidada sin comentario no lo incluye', () => {
  const entrada = parsearCalificacionValidada({
    reservaId: 'res-0001',
    deId: 'usr-12',
    paraId: 'usr-05',
    estrellas: 5,
  });
  assert.equal(entrada.comentario, undefined);
});

test('parsearCalificacionValidada: cuerpo no objeto → 400', () => {
  esperarError('texto', 'datos_invalidos');
  esperarError(null, 'datos_invalidos');
  esperarError(42, 'datos_invalidos');
});

test('parsearCalificacionValidada: faltan ids → 400', () => {
  const err = esperarError({ estrellas: 3 }, 'datos_invalidos');
  assert.ok((err.detalle.errores as unknown as string[]).length >= 1);
});

test('parsearCalificacionValidada: ids con formato inválido → 400', () => {
  esperarError(
    { reservaId: 'res 1', deId: 'usr-12', paraId: 'usr-05', estrellas: 3 },
    'datos_invalidos',
  );
});

test('parsearCalificacionValidada: estrellas inválidas → 400', () => {
  esperarError({ reservaId: 'res-1', deId: 'usr-1', paraId: 'usr-2', estrellas: 0 }, 'datos_invalidos');
  esperarError({ reservaId: 'res-1', deId: 'usr-1', paraId: 'usr-2', estrellas: 6 }, 'datos_invalidos');
  esperarError({ reservaId: 'res-1', deId: 'usr-1', paraId: 'usr-2', estrellas: 2.5 }, 'datos_invalidos');
  esperarError({ reservaId: 'res-1', deId: 'usr-1', paraId: 'usr-2', estrellas: '5' }, 'datos_invalidos');
});

test('parsearCalificacionValidada: auto-calificación → 400 auto_calificacion', () => {
  const err = esperarError(
    { reservaId: 'res-1', deId: 'usr-1', paraId: 'usr-1', estrellas: 4 },
    'auto_calificacion',
  );
  assert.equal(typeof err.message, 'string');
});

test('parsearCalificacionValidada: comentario > 500 → 400', () => {
  esperarError(
    { reservaId: 'res-1', deId: 'usr-1', paraId: 'usr-2', estrellas: 4, comentario: 'a'.repeat(501) },
    'datos_invalidos',
  );
});

test('parsearCalificacionValidada: comentario vacío se omite', () => {
  const entrada = parsearCalificacionValidada({
    reservaId: 'res-1',
    deId: 'usr-1',
    paraId: 'usr-2',
    estrellas: 3,
    comentario: '   ',
  });
  assert.equal(entrada.comentario, undefined);
});

test('parsearId acepta id válido y rechaza inválido', () => {
  assert.equal(parsearId('usr-01'), 'usr-01');
  try {
    parsearId('bad id');
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
  }
  try {
    parsearId(123);
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
  }
});
