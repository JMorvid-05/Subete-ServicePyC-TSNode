-- 001 — Esquema de la API CRUD: perfiles y calificaciones.
--
-- Las reglas de integridad viven en la base (no solo en el código), así
-- dos peticiones simultáneas nunca rompen la unicidad del correo ni la de
-- (reserva, autor): el servicio traduce el error de Postgres a 409.

-- Secuencias para los ids legibles (usr-13, cal-0031, ...). La semilla
-- usa ids fijos y luego ajusta las secuencias con setval.
CREATE SEQUENCE IF NOT EXISTS perfiles_seq START 1;
CREATE SEQUENCE IF NOT EXISTS calificaciones_seq START 1;

CREATE TABLE IF NOT EXISTS perfiles (
  id         text        PRIMARY KEY,
  nombre     text        NOT NULL CHECK (char_length(nombre) BETWEEN 2 AND 80),
  correo     text        NOT NULL,
  rol        text        NOT NULL CHECK (rol IN ('pasajero', 'conductor', 'ambos')),
  activo     boolean     NOT NULL DEFAULT true,
  creado_en  timestamptz NOT NULL DEFAULT now()
);

-- Correo único sin distinguir mayúsculas: A@x.com y a@x.com son el mismo.
CREATE UNIQUE INDEX IF NOT EXISTS perfiles_correo_unico ON perfiles (lower(correo));
CREATE INDEX IF NOT EXISTS perfiles_rol_idx ON perfiles (rol) WHERE activo;

CREATE TABLE IF NOT EXISTS calificaciones (
  id              text        PRIMARY KEY,
  -- La reserva pertenece al servicio de Reservas: no hay llave foránea
  -- (ningún servicio lee la base de otro).
  reserva_id      text        NOT NULL,
  de_perfil_id    text        NOT NULL REFERENCES perfiles (id),
  para_perfil_id  text        NOT NULL REFERENCES perfiles (id),
  estrellas       smallint    NOT NULL CHECK (estrellas BETWEEN 1 AND 5),
  comentario      text        CHECK (comentario IS NULL OR char_length(comentario) <= 500),
  creado_en       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT calificaciones_no_auto CHECK (de_perfil_id <> para_perfil_id),
  CONSTRAINT calificaciones_reserva_autor_unica UNIQUE (reserva_id, de_perfil_id)
);

CREATE INDEX IF NOT EXISTS calificaciones_para_idx ON calificaciones (para_perfil_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS calificaciones_de_idx ON calificaciones (de_perfil_id);
