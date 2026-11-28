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

test('obtenerPerfil 200 normaliza el perfil y codifica el id', async () => {
  let urlSolicitada = '';
  let tokenEnviado: string | undefined;
  const fetchFn: typeof fetch = async (input, init) => {
    urlSolicitada = String(input);
    tokenEnviado = (init?.headers as Record<string, string>).authorization;
    return new Response(
      JSON.stringify({
        id: 'usr/05',
        nombre: 'Perfil de prueba',
        correo: 'perfil@test.com',
        rol: 'pasajero',
        activo: true,
        creado_en: '2026-01-01T00:00:00.000Z',
      }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  const cliente = crearClienteCrud(opts(fetchFn));

  const perfil = await cliente.obtenerPerfil('usr/05');

  assert.equal(urlSolicitada, 'http://vecino-prueba/perfiles/usr%2F05');
  assert.equal(tokenEnviado, 'Bearer tok');
  assert.deepEqual(perfil, {
    id: 'usr/05',
    nombre: 'Perfil de prueba',
    correo: 'perfil@test.com',
    rol: 'pasajero',
    activo: true,
  });
});

test('obtenerPerfil 404 devuelve perfil_no_encontrado', async () => {
  const fetchFn: typeof fetch = async () =>
    new Response(JSON.stringify({ codigo: 'perfil_no_encontrado', mensaje: 'no existe' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  const cliente = crearClienteCrud(opts(fetchFn));

  await assert.rejects(
    cliente.obtenerPerfil('usr-404'),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 404 &&
      error.codigo === 'perfil_no_encontrado' &&
      error.detalle.perfilId === 'usr-404',
  );
});

test('listarCalificacionesRecibidas normaliza y concatena todas las páginas', async () => {
  const paginasSolicitadas: number[] = [];
  const fetchFn: typeof fetch = async (input) => {
    const url = new URL(String(input));
    assert.equal(url.searchParams.get('paraPerfilId'), 'usr-05');
    assert.equal(url.searchParams.get('porPagina'), '100');
    const pagina = Number(url.searchParams.get('pagina'));
    paginasSolicitadas.push(pagina);
    const datos =
      pagina === 1
        ? Array.from({ length: 100 }, (_, indice) => ({
            id: `cal-${indice + 1}`,
            estrellas: (indice % 5) + 1,
            creado_en: '2026-11-28T12:00:00.000Z',
          }))
        : [{ id: 'cal-101', estrellas: 5, creado_en: '2026-10-20T12:00:00.000Z' }];
    return new Response(
      JSON.stringify({ datos, total: 101, pagina, porPagina: 100 }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  const cliente = crearClienteCrud(opts(fetchFn));

  const calificaciones = await cliente.listarCalificacionesRecibidas('usr-05');

  assert.deepEqual(paginasSolicitadas, [1, 2]);
  assert.equal(calificaciones.length, 101);
  assert.deepEqual(calificaciones[0], {
    id: 'cal-1',
    estrellas: 1,
    creadoEn: '2026-11-28T12:00:00.000Z',
  });
  assert.deepEqual(calificaciones[100], {
    id: 'cal-101',
    estrellas: 5,
    creadoEn: '2026-10-20T12:00:00.000Z',
  });
});

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
