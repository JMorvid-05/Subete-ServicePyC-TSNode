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
  assert.equal(cuerpo.servicio, 'mid-api');
});

test('rechaza con 401 una llamada directa sin la cabecera secreta', async () => {
  const respuesta = await fetch(`${base}/perfiles/usr-01/puntaje`);
  assert.equal(respuesta.status, 401);
  const cuerpo = (await respuesta.json()) as { codigo: string; detalle: Record<string, unknown> };
  assert.equal(cuerpo.codigo, 'cabecera_gateway_invalida');
  assert.ok(cuerpo.detalle);
});

test('los endpoints aún no implementados responden 501 no_implementado', async () => {
  const respuesta = await fetch(`${base}/perfiles/usr-01/puntaje`, {
    headers: { 'x-gateway-secret': SECRETO },
  });
  assert.equal(respuesta.status, 501);
  const cuerpo = (await respuesta.json()) as { codigo: string; detalle: { funcion: string } };
  assert.equal(cuerpo.codigo, 'no_implementado');
  assert.equal(typeof cuerpo.detalle.funcion, 'string');
});

test('ruta desconocida responde 404 en el formato común', async () => {
  const respuesta = await fetch(`${base}/no-existe`, {
    headers: { 'x-gateway-secret': SECRETO },
  });
  assert.equal(respuesta.status, 404);
  const cuerpo = (await respuesta.json()) as { codigo: string };
  assert.equal(cuerpo.codigo, 'ruta_no_encontrada');
});

test('POST /calificaciones/validadas con estrellas inválidas responde 400', async () => {
  const respuesta = await fetch(`${base}/calificaciones/validadas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-gateway-secret': SECRETO },
    body: JSON.stringify({ reservaId: 'res-1', deId: 'usr-12', paraId: 'usr-05', estrellas: 9 }),
  });
  assert.equal(respuesta.status, 400);
  const cuerpo = (await respuesta.json()) as { codigo: string; detalle: { errores: string[] } };
  assert.equal(cuerpo.codigo, 'datos_invalidos');
  assert.ok(cuerpo.detalle.errores.length >= 1);
});

test('POST /calificaciones/validadas auto-calificación responde 400', async () => {
  const respuesta = await fetch(`${base}/calificaciones/validadas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-gateway-secret': SECRETO },
    body: JSON.stringify({ reservaId: 'res-1', deId: 'usr-12', paraId: 'usr-12', estrellas: 4 }),
  });
  assert.equal(respuesta.status, 400);
  const cuerpo = (await respuesta.json()) as { codigo: string };
  assert.equal(cuerpo.codigo, 'auto_calificacion');
});

test('POST /calificaciones/validadas válida responde 503 cuando Reservas no responde', async () => {
  const respuesta = await fetch(`${base}/calificaciones/validadas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-gateway-secret': SECRETO },
    body: JSON.stringify({ reservaId: 'res-1', deId: 'usr-12', paraId: 'usr-05', estrellas: 4 }),
  });
  assert.equal(respuesta.status, 503);
  const cuerpo = (await respuesta.json()) as { codigo: string };
  assert.equal(cuerpo.codigo, 'reservas_no_disponible');
});
