import './entorno.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/middleware/errores.js';
import { crearClienteCrud, type OpcionesClienteCrud } from '../src/clients/crud.client.js';

function opts(fetchFn: typeof fetch): OpcionesClienteCrud {
  return {
    base: 'http://vecino-prueba',
    gestor: { obtener: async () => 'tok' } as never,
    timeoutMs: 100,
    reintentos: 1,
    esperaBaseMs: 1,
    fetchFn,
  };
}

test('crearCalificacion 201 mapea snake_case', async () => {
  const fetchFn: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        id: 'cal-1',
        reserva_id: 'res-1',
        de_perfil_id: 'usr-12',
        para_perfil_id: 'usr-05',
        estrellas: 4,
        comentario: 'ok',
      }),
      { status: 201, headers: { 'content-type': 'application/json' } },
    );
  const cliente = crearClienteCrud(opts(fetchFn));
  const r = await cliente.crearCalificacion({
    reservaId: 'res-1',
    dePerfilId: 'usr-12',
    paraPerfilId: 'usr-05',
    estrellas: 4,
    comentario: 'ok',
  });
  assert.equal(r.id, 'cal-1');
  assert.equal(r.reservaId, 'res-1');
  assert.equal(r.dePerfilId, 'usr-12');
  assert.equal(r.paraPerfilId, 'usr-05');
  assert.equal(r.estrellas, 4);
  assert.equal(r.comentario, 'ok');
});

test('crearCalificacion 409 duplicada propaga codigo', async () => {
  const fetchFn: typeof fetch = async () =>
    new Response(JSON.stringify({ codigo: 'calificacion_duplicada', mensaje: 'ya', detalle: {} }), {
      status: 409,
      headers: { 'content-type': 'application/json' },
    });
  const cliente = crearClienteCrud(opts(fetchFn));
  try {
    await cliente.crearCalificacion({
      reservaId: 'res-1',
      dePerfilId: 'usr-12',
      paraPerfilId: 'usr-05',
      estrellas: 4,
    });
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 409);
    assert.equal(err.codigo, 'calificacion_duplicada');
  }
});

test('crearCalificacion 400 propaga codigo', async () => {
  const fetchFn: typeof fetch = async () =>
    new Response(JSON.stringify({ codigo: 'perfil_inexistente', mensaje: 'no', detalle: {} }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  const cliente = crearClienteCrud(opts(fetchFn));
  try {
    await cliente.crearCalificacion({
      reservaId: 'res-1',
      dePerfilId: 'usr-12',
      paraPerfilId: 'usr-05',
      estrellas: 4,
    });
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 400);
    assert.equal(err.codigo, 'perfil_inexistente');
  }
});

test('crearCalificacion red caída → 503 crud_no_disponible', async () => {
  const fetchFn: typeof fetch = async () => {
    throw new TypeError('fetch failed');
  };
  const cliente = crearClienteCrud(opts(fetchFn));
  try {
    await cliente.crearCalificacion({
      reservaId: 'res-1',
      dePerfilId: 'usr-12',
      paraPerfilId: 'usr-05',
      estrellas: 4,
    });
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 503);
    assert.equal(err.codigo, 'crud_no_disponible');
  }
});
