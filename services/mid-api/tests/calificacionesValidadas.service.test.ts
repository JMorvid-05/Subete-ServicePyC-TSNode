import './entorno.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/middleware/errores.js';
import {
  calificarViajeValidada,
  type DependenciasValidacion,
} from '../src/modules/calificaciones-validadas/calificacionesValidadas.service.js';
import type { ReservaVista } from '../src/clients/reservas.client.js';
import type { CalificacionCreada } from '../src/clients/crud.client.js';

function reserva(overrides: Partial<ReservaVista> = {}): ReservaVista {
  return {
    id: 'res-0001',
    estado: 'completada',
    pasajeroId: 'usr-12',
    conductorId: 'usr-05',
    ...overrides,
  };
}

function crearDeps(overrides: Partial<DependenciasValidacion> = {}): DependenciasValidacion {
  return {
    reservas: { obtener: async () => reserva() },
    crud: {
      crearCalificacion: async (entrada) =>
        ({ id: 'cal-0001', ...entrada }) as CalificacionCreada,
    },
    moderacion: {
      moderar: async () => ({ flagged: false, categorias: {}, puntajes: {}, degradado: false }),
    },
    ...overrides,
  };
}

test('calificarViajeValidada: pasajero → conductor devuelve 201', async () => {
  let capturada: unknown;
  const deps = crearDeps({
    crud: {
      crearCalificacion: async (entrada) => {
        capturada = entrada;
        return { id: 'cal-0001', ...entrada } as CalificacionCreada;
      },
    },
  });
  const resultado = await calificarViajeValidada(
    { reservaId: 'res-0001', deId: 'usr-12', paraId: 'usr-05', estrellas: 4, comentario: 'bien' },
    deps,
  );
  assert.equal(resultado.id, 'cal-0001');
  assert.equal(resultado.estrellas, 4);
  const env = capturada as Record<string, unknown>;
  assert.equal(env.reservaId, 'res-0001');
  assert.equal(env.dePerfilId, 'usr-12');
  assert.equal(env.paraPerfilId, 'usr-05');
  assert.equal(env.comentario, 'bien');
});

test('calificarViajeValidada: conductor → pasajero devuelve 201', async () => {
  let capturada: unknown;
  const deps = crearDeps({
    crud: {
      crearCalificacion: async (entrada) => {
        capturada = entrada;
        return { id: 'cal-0002', ...entrada } as CalificacionCreada;
      },
    },
  });
  const resultado = await calificarViajeValidada(
    { reservaId: 'res-0001', deId: 'usr-05', paraId: 'usr-12', estrellas: 5 },
    deps,
  );
  assert.equal(resultado.id, 'cal-0002');
  const env = capturada as Record<string, unknown>;
  assert.equal(env.dePerfilId, 'usr-05');
  assert.equal(env.paraPerfilId, 'usr-12');
});

test('calificarViajeValidada: reserva inexistente → 404 reserva_no_encontrada', async () => {
  const deps = crearDeps({
    reservas: {
      obtener: async () => {
        throw new AppError(404, 'reserva_no_encontrada', 'no existe', { reservaId: 'res-404' });
      },
    },
  });
  try {
    await calificarViajeValidada(
      { reservaId: 'res-404', deId: 'usr-12', paraId: 'usr-05', estrellas: 4 },
      deps,
    );
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 404);
    assert.equal(err.codigo, 'reserva_no_encontrada');
  }
});

for (const estado of ['pendiente', 'confirmada', 'cancelada']) {
  test(`calificarViajeValidada: estado ${estado} → 409 reserva_no_completada`, async () => {
    const deps = crearDeps({
      reservas: { obtener: async () => reserva({ estado }) },
    });
    try {
      await calificarViajeValidada(
        { reservaId: 'res-0001', deId: 'usr-12', paraId: 'usr-05', estrellas: 4 },
        deps,
      );
      assert.fail('debía lanzar');
    } catch (err) {
      assert.ok(err instanceof AppError);
      assert.equal(err.status, 409);
      assert.equal(err.codigo, 'reserva_no_completada');
      assert.equal(err.detalle.estadoActual, estado);
    }
  });
}

test('calificarViajeValidada: deId ajeno → 403 no_participante', async () => {
  const deps = crearDeps();
  try {
    await calificarViajeValidada(
      { reservaId: 'res-0001', deId: 'usr-99', paraId: 'usr-05', estrellas: 4 },
      deps,
    );
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 403);
    assert.equal(err.codigo, 'no_participante');
  }
});

test('calificarViajeValidada: paraId ajeno → 403 no_participante', async () => {
  const deps = crearDeps();
  try {
    await calificarViajeValidada(
      { reservaId: 'res-0001', deId: 'usr-12', paraId: 'usr-99', estrellas: 4 },
      deps,
    );
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 403);
    assert.equal(err.codigo, 'no_participante');
  }
});

test('calificarViajeValidada: propagación de 409 duplicada del crud', async () => {
  const deps = crearDeps({
    crud: {
      crearCalificacion: async () => {
        throw new AppError(409, 'calificacion_duplicada', 'ya calificó', {});
      },
    },
  });
  try {
    await calificarViajeValidada(
      { reservaId: 'res-0001', deId: 'usr-12', paraId: 'usr-05', estrellas: 4 },
      deps,
    );
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 409);
    assert.equal(err.codigo, 'calificacion_duplicada');
  }
});

test('calificarViajeValidada: propagación de 503 de Reservas', async () => {
  const deps = crearDeps({
    reservas: {
      obtener: async () => {
        throw new AppError(503, 'reservas_no_disponible', 'caído', {});
      },
    },
  });
  try {
    await calificarViajeValidada(
      { reservaId: 'res-0001', deId: 'usr-12', paraId: 'usr-05', estrellas: 4 },
      deps,
    );
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 503);
    assert.equal(err.codigo, 'reservas_no_disponible');
  }
});

test('calificarViajeValidada: comentario marcado inapropiado → 400 comentario_no_permitido', async () => {
  const deps = crearDeps({
    moderacion: {
      moderar: async () => ({ flagged: true, categorias: { hate: true }, puntajes: { hate: 0.9 }, degradado: false }),
    },
  });
  try {
    await calificarViajeValidada(
      { reservaId: 'res-0001', deId: 'usr-12', paraId: 'usr-05', estrellas: 4, comentario: 'texto ofensivo' },
      deps,
    );
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 400);
    assert.equal(err.codigo, 'comentario_no_permitido');
  }
});

test('calificarViajeValidada: moderación degradada (plan permitir) → continúa y crea', async () => {
  const deps = crearDeps({
    moderacion: {
      moderar: async () => ({ flagged: false, categorias: {}, puntajes: {}, degradado: true }),
    },
  });
  const resultado = await calificarViajeValidada(
    { reservaId: 'res-0001', deId: 'usr-12', paraId: 'usr-05', estrellas: 4, comentario: 'hola' },
    deps,
  );
  assert.equal(resultado.id, 'cal-0001');
});

test('calificarViajeValidada: moderación 503 (plan 503) se propaga', async () => {
  const deps = crearDeps({
    moderacion: {
      moderar: async () => {
        throw new AppError(503, 'moderacion_no_disponible', 'OpenAI no disponible', {});
      },
    },
  });
  try {
    await calificarViajeValidada(
      { reservaId: 'res-0001', deId: 'usr-12', paraId: 'usr-05', estrellas: 4, comentario: 'hola' },
      deps,
    );
    assert.fail('debía lanzar');
  } catch (err) {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 503);
    assert.equal(err.codigo, 'moderacion_no_disponible');
  }
});

test('calificarViajeValidada: sin comentario no llama a moderación', async () => {
  let llamadas = 0;
  const deps = crearDeps({
    moderacion: {
      moderar: async () => {
        llamadas += 1;
        return { flagged: false, categorias: {}, puntajes: {}, degradado: false };
      },
    },
  });
  await calificarViajeValidada(
    { reservaId: 'res-0001', deId: 'usr-12', paraId: 'usr-05', estrellas: 4 },
    deps,
  );
  assert.equal(llamadas, 0);
});
