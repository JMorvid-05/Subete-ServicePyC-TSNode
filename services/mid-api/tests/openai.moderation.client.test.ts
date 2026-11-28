import './entorno.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/middleware/errores.js';
import {
  crearClienteModeracion,
  type ConfigModeracion,
} from '../src/clients/openai.moderation.client.js';

// Re-export alias not needed; use ConfigModeracion.
type Cfg = ConfigModeracion;

function cfg(overrides: Partial<Cfg> & { fetchFn?: typeof fetch } = {}): Cfg {
  const { fetchFn, ...rest } = overrides;
  return {
    url: 'https://api.openai.com/v1/moderations',
    apiKey: 'sk-test',
    model: 'omni-moderation-latest',
    timeoutMs: 100,
    maxReintentos: 1,
    cacheTtlMs: 60000,
    planDegradacion: 'permitir',
    umbral: 0,
    ...(fetchFn ? { fetchFn } : {}),
    ...rest,
  } as Cfg;
}

test('moderar: comentario aprobado → flagged false', async () => {
  const fetchFn: typeof fetch = async () =>
    new Response(
      JSON.stringify({ results: [{ flagged: false, categories: { hate: false }, category_scores: { hate: 0.01 } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  const c = crearClienteModeracion(cfg({ fetchFn }));
  const r = await c.moderar('hola mundo');
  assert.equal(r.flagged, false);
  assert.equal(r.degradado, false);
  assert.equal(r.categorias.hate, false);
});

test('moderar: comentario rechazado → flagged true', async () => {
  const fetchFn: typeof fetch = async () =>
    new Response(
      JSON.stringify({ results: [{ flagged: true, categories: { hate: true }, category_scores: { hate: 0.95 } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  const c = crearClienteModeracion(cfg({ fetchFn }));
  const r = await c.moderar('texto ofensivo');
  assert.equal(r.flagged, true);
  assert.equal(r.categorias.hate, true);
});

test('moderar: acierto de caché no llama a la red', async () => {
  let calls = 0;
  const fetchFn: typeof fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ results: [{ flagged: false }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const c = crearClienteModeracion(cfg({ fetchFn }));
  await c.moderar('hola');
  await c.moderar('hola');
  assert.equal(calls, 1);
});

test('moderar: texto normalizado comparte caché', async () => {
  let calls = 0;
  const fetchFn: typeof fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify({ results: [{ flagged: false }] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const c = crearClienteModeracion(cfg({ fetchFn }));
  await c.moderar('  Hola  ');
  await c.moderar('hola');
  assert.equal(calls, 1);
});

test('moderar: umbral de puntaje marca flagged', async () => {
  const fetchFn: typeof fetch = async () =>
    new Response(
      JSON.stringify({ results: [{ flagged: false, categories: { hate: false }, category_scores: { hate: 0.9 } }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  const c = crearClienteModeracion(cfg({ fetchFn, umbral: 0.8 }));
  const r = await c.moderar('texto');
  assert.equal(r.flagged, true);
});

test('moderar: red caída con plan permitir → degradado, sin cachear', async () => {
  let calls = 0;
  const fetchFn: typeof fetch = async () => {
    calls += 1;
    throw new TypeError('fetch failed');
  };
  const c = crearClienteModeracion(cfg({ fetchFn, maxReintentos: 0 }));
  const r1 = await c.moderar('texto');
  assert.equal(r1.degradado, true);
  assert.equal(r1.flagged, false);
  // No se cacheó: el siguiente intento vuelve a llamar.
  await c.moderar('texto');
  assert.equal(calls, 2);
});

test('moderar: red caída con plan 503 → lanza 503 moderacion_no_disponible', async () => {
  const fetchFn: typeof fetch = async () => {
    throw new TypeError('fetch failed');
  };
  const c = crearClienteModeracion(cfg({ fetchFn, maxReintentos: 0, planDegradacion: '503' }));
  try {
    await c.moderar('texto');
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 503);
    assert.equal(err.codigo, 'moderacion_no_disponible');
  }
});

test('moderar: sin API key → plan de degradación (permitir → degradado)', async () => {
  const fetchFn: typeof fetch = async () => {
    throw new Error('no debería llamar a la red');
  };
  const c = crearClienteModeracion(cfg({ fetchFn, apiKey: '' }));
  const r = await c.moderar('texto');
  assert.equal(r.degradado, true);
  assert.equal(r.flagged, false);
});

test('moderar: sin API key con plan 503 → lanza 503', async () => {
  const c = crearClienteModeracion(cfg({ apiKey: '', planDegradacion: '503' }));
  try {
    await c.moderar('texto');
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 503);
    assert.equal(err.codigo, 'moderacion_no_disponible');
  }
});

test('moderar: respuesta 5xx → reintenta y aplica degradación', async () => {
  let calls = 0;
  const fetchFn: typeof fetch = async () => {
    calls += 1;
    return new Response('server error', { status: 500 });
  };
  const c = crearClienteModeracion(cfg({ fetchFn, maxReintentos: 1 }));
  const r = await c.moderar('texto');
  assert.equal(r.degradado, true);
  assert.equal(calls, 2);
});

test('moderar: formato inesperado de OpenAI → degradación (plan permitir)', async () => {
  const fetchFn: typeof fetch = async () =>
    new Response(JSON.stringify({ foo: 'bar' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  const c = crearClienteModeracion(cfg({ fetchFn }));
  const r = await c.moderar('texto');
  assert.equal(r.degradado, true);
});

test('moderar: no filtra la API key en los errores', async () => {
  const fetchFn: typeof fetch = async () => {
    throw new TypeError('fetch failed');
  };
  const c = crearClienteModeracion(cfg({ fetchFn, maxReintentos: 0, planDegradacion: '503', apiKey: 'sk-super-secreta' }));
  try {
    await c.moderar('texto');
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    const serializado = JSON.stringify(err);
    assert.ok(!serializado.includes('sk-super-secreta'));
  }
});
