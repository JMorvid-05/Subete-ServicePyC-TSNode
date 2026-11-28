import './entorno.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/middleware/errores.js';
import { enviar } from '../src/clients/http.js';

test('enviar: éxito parsea JSON', async () => {
  const fetchFn: typeof fetch = async () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  const res = await enviar({ url: 'http://x/a', fetchFn });
  assert.equal(res.status, 200);
  assert.deepEqual(res.cuerpo, { ok: true });
});

test('enviar: 503 reintenta y luego éxito', async () => {
  let n = 0;
  const fetchFn: typeof fetch = async () => {
    n += 1;
    return n === 1
      ? new Response('busy', { status: 503 })
      : new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
  };
  const res = await enviar({ url: 'http://x/a', reintentos: 1, esperaBaseMs: 1, fetchFn });
  assert.equal(res.status, 200);
  assert.equal(n, 2);
});

test('enviar: 404 no se reintenta', async () => {
  let n = 0;
  const fetchFn: typeof fetch = async () => {
    n += 1;
    return new Response('nf', { status: 404 });
  };
  const res = await enviar({ url: 'http://x/a', reintentos: 2, esperaBaseMs: 1, fetchFn });
  assert.equal(res.status, 404);
  assert.equal(n, 1);
});

test('enviar: timeout (AbortError) → 503 tiempo_excedido tras reintentos', async () => {
  const fetchFn: typeof fetch = async (_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () =>
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
      );
    });
  try {
    await enviar({ url: 'http://x/a', timeoutMs: 20, reintentos: 1, esperaBaseMs: 1, fetchFn });
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 503);
    assert.equal(err.codigo, 'tiempo_excedido');
  }
});

test('enviar: red caída (TypeError) → 503 red_no_disponible tras reintentos', async () => {
  const fetchFn: typeof fetch = async () => {
    throw new TypeError('fetch failed');
  };
  try {
    await enviar({ url: 'http://x/a', reintentos: 1, esperaBaseMs: 1, fetchFn });
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 503);
    assert.equal(err.codigo, 'red_no_disponible');
  }
});
