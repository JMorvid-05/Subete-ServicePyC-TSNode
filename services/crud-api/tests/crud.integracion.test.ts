// Pruebas de integración contra un PostgreSQL REAL.
//
// Corren si hay DATABASE_URL_PRUEBAS (en el .env local) o PRUEBAS_BD=1 (CI).
// ⚠ BORRAN las tablas del esquema en esa base: usen una base SOLO de
// pruebas, nunca la de desarrollo ni la del despliegue.
import './entorno.js';
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

const activas = process.env.PRUEBAS_BD === '1';
const SECRETO = process.env.GATEWAY_SECRET ?? 'secreto-de-prueba';

let servidor: Server;
let base = '';
let cerrar: () => Promise<void> = async () => {};

interface Respuesta<T = Record<string, unknown>> {
  status: number;
  cuerpo: T;
}

async function llamar<T = Record<string, unknown>>(
  metodo: string,
  ruta: string,
  cuerpo?: unknown,
): Promise<Respuesta<T>> {
  const respuesta = await fetch(`${base}${ruta}`, {
    method: metodo,
    headers: { 'content-type': 'application/json', 'x-gateway-secret': SECRETO },
    ...(cuerpo !== undefined && { body: JSON.stringify(cuerpo) }),
  });
  const texto = await respuesta.text();
  return { status: respuesta.status, cuerpo: (texto ? JSON.parse(texto) : {}) as T };
}

describe('CRUD contra PostgreSQL', { skip: !activas && 'define PRUEBAS_BD=1 para correrlas' }, () => {
  before(async () => {
    // Importes dinámicos: sin PRUEBAS_BD ni siquiera se carga el pool.
    const { pool, cerrarPool } = await import('../src/db/pool.js');
    const { aplicarMigraciones } = await import('../src/db/migrate.js');
    const { crearApp } = await import('../src/app.js');

    await pool.query(`
      DROP TABLE IF EXISTS calificaciones, perfiles, schema_migraciones;
      DROP SEQUENCE IF EXISTS perfiles_seq, calificaciones_seq;
    `);
    await aplicarMigraciones(() => {});
    // Correrlas otra vez no debe fallar ni duplicar nada (idempotencia).
    await aplicarMigraciones(() => {});

    const app = crearApp();
    await new Promise<void>((resolver) => {
      servidor = app.listen(0, () => resolver());
    });
    base = `http://127.0.0.1:${(servidor.address() as AddressInfo).port}`;
    cerrar = cerrarPool;
  });

  after(async () => {
    if (servidor) await new Promise<void>((resolver) => servidor.close(() => resolver()));
    await cerrar();
  });

  describe('semilla', () => {
    test('trae 12 perfiles activos', async () => {
      const { status, cuerpo } = await llamar<{ total: number }>('GET', '/perfiles');
      assert.equal(status, 200);
      assert.equal(cuerpo.total, 12);
    });
  });

  describe('perfiles (P-HU1)', () => {
    let creadoId = '';

    test('POST crea un perfil con id usr-13 y responde camelCase', async () => {
      const { status, cuerpo } = await llamar<Record<string, unknown>>('POST', '/perfiles', {
        nombre: 'Prueba Integración',
        correo: 'prueba.integracion@ejemplo.edu.co',
        rol: 'pasajero',
      });
      assert.equal(status, 201);
      assert.equal(cuerpo.id, 'usr-13');
      assert.equal(cuerpo.activo, true);
      assert.ok(typeof cuerpo.creadoEn === 'string');
      creadoId = cuerpo.id as string;
    });

    test('correo repetido (aunque cambien mayúsculas) → 409 correo_ya_registrado', async () => {
      const { status, cuerpo } = await llamar<{ codigo: string }>('POST', '/perfiles', {
        nombre: 'Otra Persona',
        correo: 'PRUEBA.Integracion@ejemplo.edu.co',
        rol: 'conductor',
      });
      assert.equal(status, 409);
      assert.equal(cuerpo.codigo, 'correo_ya_registrado');
    });

    test('GET /perfiles/{id} → 200; inexistente → 404 perfil_no_encontrado', async () => {
      assert.equal((await llamar('GET', `/perfiles/${creadoId}`)).status, 200);
      const { status, cuerpo } = await llamar<{ codigo: string }>('GET', '/perfiles/usr-999');
      assert.equal(status, 404);
      assert.equal(cuerpo.codigo, 'perfil_no_encontrado');
    });

    test('PUT actualiza; con el correo de otro perfil → 409; inexistente → 404', async () => {
      const ok = await llamar<{ rol: string }>('PUT', `/perfiles/${creadoId}`, {
        nombre: 'Prueba Editada',
        correo: 'prueba.integracion@ejemplo.edu.co',
        rol: 'ambos',
      });
      assert.equal(ok.status, 200);
      assert.equal(ok.cuerpo.rol, 'ambos');

      const choque = await llamar('PUT', `/perfiles/${creadoId}`, {
        nombre: 'Prueba Editada',
        correo: 'laura.gomez@ejemplo.edu.co',
        rol: 'ambos',
      });
      assert.equal(choque.status, 409);

      const noExiste = await llamar('PUT', '/perfiles/usr-999', {
        nombre: 'Nadie',
        correo: 'nadie@ejemplo.edu.co',
        rol: 'pasajero',
      });
      assert.equal(noExiste.status, 404);
    });

    test('filtro por rol y paginación', async () => {
      const { cuerpo } = await llamar<{
        datos: { rol: string }[];
        total: number;
        porPagina: number;
      }>('GET', '/perfiles?rol=conductor&pagina=1&porPagina=2');
      assert.equal(cuerpo.porPagina, 2);
      assert.equal(cuerpo.datos.length, 2);
      assert.equal(cuerpo.total, 3); // usr-01, usr-03, usr-04 en la semilla
      assert.ok(cuerpo.datos.every((p) => p.rol === 'conductor'));

      const pagina2 = await llamar<{ datos: unknown[] }>(
        'GET',
        '/perfiles?rol=conductor&pagina=2&porPagina=2',
      );
      assert.equal(pagina2.cuerpo.datos.length, 1);
    });

    test('DELETE desactiva (204): sale del listado pero el detalle muestra activo=false', async () => {
      assert.equal((await llamar('DELETE', `/perfiles/${creadoId}`)).status, 204);

      const listado = await llamar<{ datos: { id: string }[]; total: number }>(
        'GET',
        '/perfiles?porPagina=100',
      );
      assert.ok(!listado.cuerpo.datos.some((p) => p.id === creadoId));
      assert.equal(listado.cuerpo.total, 12);

      const detalle = await llamar<{ activo: boolean }>('GET', `/perfiles/${creadoId}`);
      assert.equal(detalle.status, 200);
      assert.equal(detalle.cuerpo.activo, false);

      assert.equal((await llamar('DELETE', '/perfiles/usr-999')).status, 404);
    });
  });

  describe('calificaciones (P-HU2)', () => {
    const nueva = {
      reservaId: 'res-9001',
      dePerfilId: 'usr-07',
      paraPerfilId: 'usr-01',
      estrellas: 4,
      comentario: 'Buen viaje',
    };

    test('POST crea la calificación → 201', async () => {
      const { status, cuerpo } = await llamar<Record<string, unknown>>(
        'POST',
        '/calificaciones',
        nueva,
      );
      assert.equal(status, 201);
      assert.equal(cuerpo.id, 'cal-0021');
      assert.equal(cuerpo.reservaId, 'res-9001');
      assert.equal(cuerpo.estrellas, 4);
    });

    test('calificar dos veces la misma reserva → 409 calificacion_duplicada', async () => {
      const { status, cuerpo } = await llamar<{ codigo: string }>('POST', '/calificaciones', {
        ...nueva,
        estrellas: 1,
      });
      assert.equal(status, 409);
      assert.equal(cuerpo.codigo, 'calificacion_duplicada');
    });

    test('la otra persona del viaje sí puede calificar la misma reserva', async () => {
      const { status } = await llamar('POST', '/calificaciones', {
        ...nueva,
        dePerfilId: 'usr-01',
        paraPerfilId: 'usr-07',
      });
      assert.equal(status, 201);
    });

    test('perfil inexistente → 400 perfil_inexistente', async () => {
      const { status, cuerpo } = await llamar<{ codigo: string; detalle: { campo: string } }>(
        'POST',
        '/calificaciones',
        { ...nueva, reservaId: 'res-9002', paraPerfilId: 'usr-999' },
      );
      assert.equal(status, 400);
      assert.equal(cuerpo.codigo, 'perfil_inexistente');
      assert.equal(cuerpo.detalle.campo, 'paraPerfilId');
    });

    test('dos POST simultáneos de la misma calificación: uno 201 y otro 409', async () => {
      const cuerpo = { ...nueva, reservaId: 'res-9003' };
      const estados = (
        await Promise.all([
          llamar('POST', '/calificaciones', cuerpo),
          llamar('POST', '/calificaciones', cuerpo),
        ])
      )
        .map((r) => r.status)
        .sort();
      assert.deepEqual(estados, [201, 409]);
    });

    test('filtros paraPerfilId / dePerfilId, más recientes primero', async () => {
      const { cuerpo } = await llamar<{
        datos: { paraPerfilId: string; creadoEn: string }[];
        total: number;
      }>('GET', '/calificaciones?paraPerfilId=usr-01&porPagina=100');
      assert.ok(cuerpo.total >= 6);
      assert.ok(cuerpo.datos.every((c) => c.paraPerfilId === 'usr-01'));
      const fechas = cuerpo.datos.map((c) => Date.parse(c.creadoEn));
      assert.deepEqual(fechas, [...fechas].sort((a, b) => b - a));

      const de = await llamar<{ datos: { dePerfilId: string }[] }>(
        'GET',
        '/calificaciones?dePerfilId=usr-01',
      );
      assert.ok(de.cuerpo.datos.length > 0);
      assert.ok(de.cuerpo.datos.every((c) => c.dePerfilId === 'usr-01'));
    });
  });
});
