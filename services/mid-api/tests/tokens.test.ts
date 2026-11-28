import './entorno.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/middleware/errores.js';
import { crearGestorTokens, conToken } from '../src/clients/tokens.js';

test('crearGestorTokens obtiene y cachea el token', async () => {
  let llamadas = 0;
  const fetchFn: typeof fetch = async () =>
    new Response(JSON.stringify({ access_token: 'tok-1', expires_in: 300 }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  const gestor = crearGestorTokens({
    url: 'http://gw',
    clientId: 'c',
    clientSecret: 's',
    margenVencimientoS: 30,
    timeoutMs: 100,
    fetchFn: async (url) => {
      llamadas += 1;
      return fetchFn(url);
    },
  });
  assert.equal(await gestor.obtener(), 'tok-1');
  assert.equal(await gestor.obtener(), 'tok-1');
  assert.equal(llamadas, 1);
});

test('crearGestorTokens forzar=true renueva el token', async () => {
  let llamadas = 0;
  const gestor = crearGestorTokens({
    url: 'http://gw',
    clientId: 'c',
    clientSecret: 's',
    margenVencimientoS: 30,
    timeoutMs: 100,
    fetchFn: async () => {
      llamadas += 1;
      return new Response(JSON.stringify({ access_token: `tok-${llamadas}`, expires_in: 300 }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });
  assert.equal(await gestor.obtener(), 'tok-1');
  assert.equal(await gestor.obtener(true), 'tok-2');
  assert.equal(llamadas, 2);
});

test('crearGestorTokens: respuesta inválida → 503 token_no_disponible', async () => {
  const gestor = crearGestorTokens({
    url: 'http://gw',
    clientId: 'c',
    clientSecret: 's',
    margenVencimientoS: 30,
    timeoutMs: 100,
    fetchFn: async () =>
      new Response(JSON.stringify({ error: 'bad' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }),
  });
  try {
    await gestor.obtener();
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 503);
    assert.equal(err.codigo, 'token_no_disponible');
  }
});

test('conToken: 401 renueva y reintenta una sola vez (éxito en el segundo)', async () => {
  let tokenCalls = 0;
  const gestor = {
    obtener: async (forzar = false) => {
      tokenCalls += 1;
      return forzar ? 'tok-2' : 'tok-1';
    },
  };
  let opCalls = 0;
  const usados: string[] = [];
  const operacion = async (token: string) => {
    opCalls += 1;
    usados.push(token);
    if (opCalls === 1) return { status: 401, cuerpo: {} };
    return { status: 201, cuerpo: { ok: true } };
  };
  const res = await conToken(gestor as never, operacion);
  assert.equal(res.status, 201);
  assert.equal(opCalls, 2);
  assert.deepEqual(usados, ['tok-1', 'tok-2']);
  assert.equal(tokenCalls, 2);
});

test('conToken: dos 401 → devuelve el segundo sin tercer intento', async () => {
  const gestor = { obtener: async () => 'tok' };
  let opCalls = 0;
  const operacion = async () => {
    opCalls += 1;
    return { status: 401, cuerpo: {} };
  };
  const res = await conToken(gestor as never, operacion);
  assert.equal(res.status, 401);
  assert.equal(opCalls, 2);
});
