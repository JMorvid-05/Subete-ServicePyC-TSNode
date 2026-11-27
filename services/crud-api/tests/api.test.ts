import './entorno.js';
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { crearApp } from '../src/app.js';

const SECRETO = 'secreto-de-prueba';
let servidor: Server;
let base = '';

before(async () => {
  const app = crearApp();
  await new Promise<void>((resolver) => {
    servidor = app.listen(0, () => resolver());
  });
  const direccion = servidor.address() as AddressInfo;
  base = `http://127.0.0.1:${direccion.port}`;
});

after(async () => {
  await new Promise<void>((resolver) => servidor.close(() => resolver()));
});

test('GET /health responde 200 sin la cabecera del gateway', async () => {
  const respuesta = await fetch(`${base}/health`);
  assert.equal(respuesta.status, 200);
  const cuerpo = (await respuesta.json()) as { estado: string; servicio: string };
  assert.equal(cuerpo.estado, 'ok');
  assert.equal(cuerpo.servicio, 'crud-api');
});

test('rechaza con 401 una llamada directa sin la cabecera secreta', async () => {
  const respuesta = await fetch(`${base}/perfiles`);
  assert.equal(respuesta.status, 401);
  const cuerpo = (await respuesta.json()) as {
    codigo: string;
    mensaje: string;
    detalle: Record<string, unknown>;
  };
  assert.equal(cuerpo.codigo, 'cabecera_gateway_invalida');
  assert.equal(typeof cuerpo.mensaje, 'string');
  assert.ok(cuerpo.detalle);
});

test('rechaza con 401 una cabecera secreta incorrecta', async () => {
  const respuesta = await fetch(`${base}/perfiles`, {
    headers: { 'x-gateway-secret': 'esta-no-es' },
  });
  assert.equal(respuesta.status, 401);
});

// Estas pruebas no necesitan base de datos: la validación falla antes de consultarla.
test('POST /perfiles con datos inválidos responde 400 datos_invalidos', async () => {
  const respuesta = await fetch(`${base}/perfiles`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-gateway-secret': SECRETO },
    body: JSON.stringify({ nombre: 'P', correo: 'no-es-correo', rol: 'admin' }),
  });
  assert.equal(respuesta.status, 400);
  const cuerpo = (await respuesta.json()) as {
    codigo: string;
    detalle: { errores: { campo: string }[] };
  };
  assert.equal(cuerpo.codigo, 'datos_invalidos');
  assert.equal(cuerpo.detalle.errores.length, 3);
});

test('JSON mal formado responde 400 y no 500', async () => {
  const respuesta = await fetch(`${base}/perfiles`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-gateway-secret': SECRETO },
    body: '{"nombre": ',
  });
  assert.equal(respuesta.status, 400);
  const cuerpo = (await respuesta.json()) as { codigo: string };
  assert.equal(cuerpo.codigo, 'datos_invalidos');
});

test('POST /calificaciones con auto-calificación responde 400 auto_calificacion', async () => {
  const respuesta = await fetch(`${base}/calificaciones`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-gateway-secret': SECRETO },
    body: JSON.stringify({
      reservaId: 'res-0001',
      dePerfilId: 'usr-01',
      paraPerfilId: 'usr-01',
      estrellas: 5,
    }),
  });
  assert.equal(respuesta.status, 400);
  const cuerpo = (await respuesta.json()) as { codigo: string };
  assert.equal(cuerpo.codigo, 'auto_calificacion');
});

test('GET /perfiles con porPagina fuera de rango responde 400', async () => {
  const respuesta = await fetch(`${base}/perfiles?porPagina=500`, {
    headers: { 'x-gateway-secret': SECRETO },
  });
  assert.equal(respuesta.status, 400);
});

test('ruta desconocida responde 404 en el formato común', async () => {
  const respuesta = await fetch(`${base}/no-existe`, {
    headers: { 'x-gateway-secret': SECRETO },
  });
  assert.equal(respuesta.status, 404);
  const cuerpo = (await respuesta.json()) as { codigo: string };
  assert.equal(cuerpo.codigo, 'ruta_no_encontrada');
});
