import './entorno.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/middleware/errores.js';
import { crearClienteReservas, type OpcionesClienteReservas } from '../src/clients/reservas.client.js';

function opts(fetchFn: typeof fetch, gestor?: any): OpcionesClienteReservas {
  const g =
    gestor ??
    {
      obtener: async () => 'tok',
    };
  return {
    base: 'http://vecino-prueba',
    gestor: g as never,
    timeoutMs: 100,
    reintentos: 1,
    esperaBaseMs: 1,
    fetchFn,
  };
}

test('obtener normaliza snake_case incluyendo conductor_id', async () => {
  const fetchFn: typeof fetch = async () =>
    new Response(
      JSON.stringify({
        id: 'res-1',
        estado: 'completada',
        pasajero_id: 'usr-12',
        conductor_id: 'usr-05',
        ruta_id: 'ruta-1',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  const cliente = crearClienteReservas(opts(fetchFn));
  const r = await cliente.obtener('res-1');
  assert.equal(r.id, 'res-1');
  assert.equal(r.pasajeroId, 'usr-12');
  assert.equal(r.conductorId, 'usr-05');
  assert.equal(r.rutaId, 'ruta-1');
});

test('obtener 404 → reserva_no_encontrada con detalle.reservaId', async () => {
  const fetchFn: typeof fetch = async () =>
    new Response(JSON.stringify({ codigo: 'ruta_no_encontrada', mensaje: 'x', detalle: {} }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  const cliente = crearClienteReservas(opts(fetchFn));
  try {
    await cliente.obtener('res-404');
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 404);
    assert.equal(err.codigo, 'reserva_no_encontrada');
    assert.equal(err.detalle.reservaId, 'res-404');
  }
});

test('obtener red caída → 503 reservas_no_disponible tras reintentos', async () => {
  const fetchFn: typeof fetch = async () => {
    throw new TypeError('fetch failed');
  };
  const cliente = crearClienteReservas(opts(fetchFn));
  try {
    await cliente.obtener('res-1');
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 503);
    assert.equal(err.codigo, 'reservas_no_disponible');
  }
});

test('obtener: 401 renueva token y reintenta una sola vez (éxito)', async () => {
  let tokenCalls = 0;
  const gestor = {
    obtener: async (forzar = false) => {
      tokenCalls += 1;
      return forzar ? 'tok-2' : 'tok-1';
    },
  };
  let reservasCalls = 0;
  const fetchFn: typeof fetch = async (_url, init) => {
    const url = String(_url);
    if (url.endsWith('/reservas/res-1')) {
      reservasCalls += 1;
      const auth = (init?.headers as Record<string, string> | undefined)?.authorization;
      if (auth === 'Bearer tok-1') {
        return new Response('unauth', { status: 401 });
      }
      return new Response(
        JSON.stringify({ id: 'res-1', estado: 'completada', pasajero_id: 'usr-12', conductor_id: 'usr-05' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    }
    return new Response('nf', { status: 404 });
  };
  const cliente = crearClienteReservas({
    base: 'http://vecino-prueba',
    gestor: gestor as never,
    timeoutMs: 100,
    reintentos: 0,
    esperaBaseMs: 1,
    fetchFn,
  });
  const r = await cliente.obtener('res-1');
  assert.equal(r.id, 'res-1');
  assert.equal(tokenCalls, 2);
  assert.equal(reservasCalls, 2);
});
