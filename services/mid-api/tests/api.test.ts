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
