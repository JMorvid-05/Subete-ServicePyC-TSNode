import './entorno.js';
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AppError } from '../src/middleware/errores.js';
import {
  parsearFiltrosPerfiles,
  parsearIdPerfil,
  parsearPerfilEntrada,
} from '../src/modules/perfiles/perfiles.schemas.js';
import {
  parsearCalificacionEntrada,
  parsearFiltrosCalificaciones,
} from '../src/modules/calificaciones/calificaciones.schemas.js';

/** Comprueba que `fn` lance un AppError con ese status y código. */
function lanzaError(fn: () => unknown, status: number, codigo: string): AppError {
  try {
    fn();
  } catch (err) {
    assert.ok(err instanceof AppError, 'debe lanzar AppError');
    assert.equal(err.status, status);
    assert.equal(err.codigo, codigo);
    return err;
  }
  assert.fail('se esperaba un error');
}

const perfilValido = { nombre: 'Laura Gómez', correo: 'Laura@Ejemplo.edu.co', rol: 'conductor' };
const calificacionValida = {
  reservaId: 'res-0001',
  dePerfilId: 'usr-05',
  paraPerfilId: 'usr-01',
  estrellas: 5,
  comentario: 'Muy puntual',
};

describe('parsearPerfilEntrada (P-HU1)', () => {
  test('acepta un perfil válido y normaliza el correo a minúsculas', () => {
    const perfil = parsearPerfilEntrada({ ...perfilValido, nombre: '  Laura Gómez  ' });
    assert.deepEqual(perfil, {
      nombre: 'Laura Gómez',
      correo: 'laura@ejemplo.edu.co',
      rol: 'conductor',
    });
  });

  test('rechaza correo inválido, rol inválido y nombre corto a la vez', () => {
    const err = lanzaError(
      () => parsearPerfilEntrada({ nombre: 'L', correo: 'no-es-correo', rol: 'admin' }),
      400,
      'datos_invalidos',
    );
    const campos = (err.detalle.errores as { campo: string }[]).map((e) => e.campo).sort();
    assert.deepEqual(campos, ['correo', 'nombre', 'rol']);
  });

  test('rechaza un cuerpo que no es objeto', () => {
    lanzaError(() => parsearPerfilEntrada(null), 400, 'datos_invalidos');
    lanzaError(() => parsearPerfilEntrada([perfilValido]), 400, 'datos_invalidos');
  });

  test('acepta los tres roles válidos', () => {
    for (const rol of ['pasajero', 'conductor', 'ambos']) {
      assert.equal(parsearPerfilEntrada({ ...perfilValido, rol }).rol, rol);
    }
  });
});

describe('parsearFiltrosPerfiles', () => {
  test('usa pagina 1 y porPagina 20 por defecto', () => {
    assert.deepEqual(parsearFiltrosPerfiles({}), { pagina: 1, porPagina: 20 });
  });

  test('lee rol, pagina y porPagina', () => {
    assert.deepEqual(parsearFiltrosPerfiles({ rol: 'pasajero', pagina: '2', porPagina: '5' }), {
      rol: 'pasajero',
      pagina: 2,
      porPagina: 5,
    });
  });

  test('rechaza paginación fuera de rango y rol desconocido', () => {
    lanzaError(() => parsearFiltrosPerfiles({ pagina: '0' }), 400, 'datos_invalidos');
    lanzaError(() => parsearFiltrosPerfiles({ porPagina: '101' }), 400, 'datos_invalidos');
    lanzaError(() => parsearFiltrosPerfiles({ porPagina: 'diez' }), 400, 'datos_invalidos');
    lanzaError(() => parsearFiltrosPerfiles({ pagina: '1.5' }), 400, 'datos_invalidos');
    lanzaError(() => parsearFiltrosPerfiles({ rol: 'admin' }), 400, 'datos_invalidos');
  });
});

describe('parsearIdPerfil', () => {
  test('acepta ids del clúster y rechaza formatos peligrosos', () => {
    assert.equal(parsearIdPerfil('usr-01'), 'usr-01');
    lanzaError(() => parsearIdPerfil("usr-01'; DROP TABLE perfiles;--"), 400, 'datos_invalidos');
    lanzaError(() => parsearIdPerfil('01'), 400, 'datos_invalidos');
    lanzaError(() => parsearIdPerfil(undefined), 400, 'datos_invalidos');
  });
});

describe('parsearCalificacionEntrada (P-HU2)', () => {
  test('acepta una calificación válida', () => {
    assert.deepEqual(parsearCalificacionEntrada(calificacionValida), calificacionValida);
  });

  test('el comentario es opcional', () => {
    const { comentario: _omitido, ...sinComentario } = calificacionValida;
    assert.equal(parsearCalificacionEntrada(sinComentario).comentario, undefined);
  });

  test('estrellas fuera de 1 a 5 o no enteras → 400 datos_invalidos', () => {
    for (const estrellas of [0, 6, 3.5, '5', null]) {
      lanzaError(
        () => parsearCalificacionEntrada({ ...calificacionValida, estrellas }),
        400,
        'datos_invalidos',
      );
    }
  });

  test('acepta los extremos 1 y 5', () => {
    assert.equal(parsearCalificacionEntrada({ ...calificacionValida, estrellas: 1 }).estrellas, 1);
    assert.equal(parsearCalificacionEntrada({ ...calificacionValida, estrellas: 5 }).estrellas, 5);
  });

  test('nadie puede calificarse a sí mismo → 400 auto_calificacion', () => {
    lanzaError(
      () => parsearCalificacionEntrada({ ...calificacionValida, paraPerfilId: 'usr-05' }),
      400,
      'auto_calificacion',
    );
  });

  test('comentario de más de 500 caracteres → 400', () => {
    lanzaError(
      () => parsearCalificacionEntrada({ ...calificacionValida, comentario: 'a'.repeat(501) }),
      400,
      'datos_invalidos',
    );
  });

  test('ids faltantes o inválidos → 400', () => {
    lanzaError(
      () => parsearCalificacionEntrada({ ...calificacionValida, reservaId: undefined }),
      400,
      'datos_invalidos',
    );
    lanzaError(
      () => parsearCalificacionEntrada({ ...calificacionValida, dePerfilId: 'x' }),
      400,
      'datos_invalidos',
    );
  });
});

describe('parsearFiltrosCalificaciones', () => {
  test('lee filtros opcionales y paginación', () => {
    assert.deepEqual(parsearFiltrosCalificaciones({ paraPerfilId: 'usr-01' }), {
      paraPerfilId: 'usr-01',
      pagina: 1,
      porPagina: 20,
    });
  });

  test('rechaza ids con formato inválido', () => {
    lanzaError(() => parsearFiltrosCalificaciones({ dePerfilId: '<script>' }), 400, 'datos_invalidos');
  });
});
