import './entorno.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/middleware/errores.js';
import {
  calcularPuntajePerfil,
  type DependenciasPuntaje,
} from '../src/modules/puntaje/puntaje.service.js';
import type { CalificacionVista } from '../src/clients/crud.client.js';
import type { ReservaVista } from '../src/clients/reservas.client.js';

function crearDependencias(overrides: Partial<DependenciasPuntaje> = {}): DependenciasPuntaje {
  return {
    perfiles: { obtener: async () => ({ id: 'usr-05', nombre: 'Test', correo: 'test@test.com', rol: 'pasajero', activo: true }) },
    calificaciones: { listarRecibidas: async () => [] },
    reservas: { listarPorUsuario: async () => [] },
    ...overrides,
  };
}

test('calcularPuntajePerfil: perfil inexistente → 404 perfil_no_encontrado', async () => {
  const dependencias = crearDependencias({
    calificaciones: {
      listarRecibidas: async () => {
        throw new AppError(404, 'perfil_no_encontrado', 'no existe', {});
      },
    },
  });

  await assert.rejects(
    calcularPuntajePerfil('usr-404', dependencias),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 404 &&
      error.codigo === 'perfil_no_encontrado',
  );
});

test('calcularPuntajePerfil: Reservas no disponible → 503 conexion_reservas', async () => {
  const dependencias = crearDependencias({
    calificaciones: { listarRecibidas: async () => [] },
    reservas: {
      listarPorUsuario: async () => {
        throw new Error('servicio no disponible');
      },
    },
  });

  await assert.rejects(
    calcularPuntajePerfil('usr-05', dependencias),
    (error: unknown) =>
      error instanceof AppError &&
      error.status === 503 &&
      error.codigo === 'conexion_reservas',
  );
});

test('calcularPuntajePerfil: calcula el resultado correctamente', async () => {
  const ahora = new Date();
  const dia = 24 * 60 * 60 * 1000;
  const calificaciones: CalificacionVista[] = [
    ...[5, 4, 3, 4, 5].map((estrellas, indice) => ({
      id: `cal-reciente-${indice + 1}`,
      estrellas,
      creadoEn: new Date(ahora.getTime() - indice * dia),
    })),
    ...[1, 2, 3, 4, 5].map((estrellas, indice) => ({
      id: `cal-antigua-${indice + 1}`,
      estrellas,
      creadoEn: new Date(ahora.getTime() - (35 + indice) * dia),
    })),
  ];
  const reservas: ReservaVista[] = [
    ...Array.from({ length: 2 }, (_, indice) => ({
      id: `res-cancelada-${indice + 1}`,
      estado: 'cancelada',
      pasajeroId: 'usr-05',
    })),
    ...Array.from({ length: 8 }, (_, indice) => ({
      id: `res-completada-${indice + 1}`,
      estado: 'completada',
      pasajeroId: 'usr-05',
    })),
  ];
  const dependencias = crearDependencias({
    calificaciones: { listarRecibidas: async () => calificaciones },
    reservas: { listarPorUsuario: async () => reservas },
  });

  const resultado = await calcularPuntajePerfil('usr-05', dependencias);

  assert.deepEqual(resultado, {
    puntaje: 3.4,
    insignia: 'en_observacion',
    viajesCompletados: 8,
    tasaCancelacion: 0.2,
    totalCalificaciones: 10,
  });
});