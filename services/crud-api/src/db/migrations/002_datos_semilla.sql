-- 002 — Datos de semilla (PROVISIONALES)
--
-- ⚠ Pendiente de acordar con el clúster antes de la demo:
--   - Rutas: qué perfiles son conductores (conductorId de las 15 rutas).
--   - Reservas: los reserva_id reales (aquí se usa res-0001…res-0014) y que
--     sean reservas `completadas` donde participaron ambos perfiles.
--   - La insignia depende también de Reservas: con menos de 5 viajes
--     completados el MID asigna `nuevo` sin importar las estrellas, así que
--     los perfiles objetivo confiable / regular / en_observacion necesitan
--     al menos 5 reservas completadas cada uno en la semilla de Reservas.
--
-- Perfiles objetivo (si Reservas acompaña con sus datos):
--   usr-01 conductor  → confiable       (estrellas altas, sin cancelaciones)
--   usr-02 ambos      → regular        (estrellas ~4)
--   usr-03 conductor  → en_observacion (estrellas bajas)
--   usr-04 conductor  → nuevo          (pocos viajes)
--   usr-05 pasajero   → confiable
--   usr-06 pasajero   → en_observacion (el que Reservas bloquea con 403)
--   usr-07 pasajero   → nuevo
--
-- Las fechas son relativas a now() para que la regla "últimos 30 días pesan
-- el doble" siga siendo cierta el día de la demo. Idempotente: ON CONFLICT.

INSERT INTO perfiles (id, nombre, correo, rol) VALUES
  ('usr-01', 'Laura Gómez',      'laura.gomez@ejemplo.edu.co',      'conductor'),
  ('usr-02', 'Andrés Rojas',     'andres.rojas@ejemplo.edu.co',     'ambos'),
  ('usr-03', 'Camilo Pardo',     'camilo.pardo@ejemplo.edu.co',     'conductor'),
  ('usr-04', 'Valentina Ruiz',   'valentina.ruiz@ejemplo.edu.co',   'conductor'),
  ('usr-05', 'Sofía Martínez',   'sofia.martinez@ejemplo.edu.co',   'pasajero'),
  ('usr-06', 'Julián Herrera',   'julian.herrera@ejemplo.edu.co',   'pasajero'),
  ('usr-07', 'Mariana López',    'mariana.lopez@ejemplo.edu.co',    'pasajero'),
  ('usr-08', 'Daniel Castro',    'daniel.castro@ejemplo.edu.co',    'pasajero'),
  ('usr-09', 'Paula Torres',     'paula.torres@ejemplo.edu.co',     'ambos'),
  ('usr-10', 'Santiago Díaz',    'santiago.diaz@ejemplo.edu.co',    'pasajero'),
  ('usr-11', 'Natalia Moreno',   'natalia.moreno@ejemplo.edu.co',   'pasajero'),
  ('usr-12', 'Felipe Vargas',    'felipe.vargas@ejemplo.edu.co',    'pasajero')
ON CONFLICT (id) DO NOTHING;

INSERT INTO calificaciones (id, reserva_id, de_perfil_id, para_perfil_id, estrellas, comentario, creado_en) VALUES
  -- usr-01: conductora confiable
  ('cal-0001', 'res-0001', 'usr-05', 'usr-01', 5, 'Puntual y muy amable.',                 now() - interval '3 days'),
  ('cal-0002', 'res-0001', 'usr-01', 'usr-05', 5, 'Excelente pasajera.',                   now() - interval '3 days'),
  ('cal-0003', 'res-0002', 'usr-08', 'usr-01', 5, NULL,                                    now() - interval '10 days'),
  ('cal-0004', 'res-0002', 'usr-01', 'usr-08', 4, 'Llegó un par de minutos tarde.',        now() - interval '10 days'),
  ('cal-0005', 'res-0003', 'usr-09', 'usr-01', 4, NULL,                                    now() - interval '20 days'),
  ('cal-0006', 'res-0004', 'usr-10', 'usr-01', 5,
   'Viaje muy cómodo: salió a la hora acordada, respetó la ruta publicada, manejó con prudencia y nos dejó justo en la entrada de la universidad.',
   now() - interval '45 days'),
  ('cal-0007', 'res-0005', 'usr-11', 'usr-01', 5, NULL,                                    now() - interval '60 days'),
  ('cal-0008', 'res-0005', 'usr-01', 'usr-11', 5, NULL,                                    now() - interval '60 days'),
  -- usr-03: conductor en observación
  ('cal-0009', 'res-0006', 'usr-06', 'usr-03', 2, 'Cambió el punto de encuentro sin avisar.', now() - interval '5 days'),
  ('cal-0010', 'res-0006', 'usr-03', 'usr-06', 2, 'No llegó al punto acordado.',           now() - interval '5 days'),
  ('cal-0011', 'res-0007', 'usr-08', 'usr-03', 3, NULL,                                    now() - interval '15 days'),
  ('cal-0012', 'res-0008', 'usr-09', 'usr-03', 2, 'Manejo brusco.',                        now() - interval '40 days'),
  ('cal-0013', 'res-0009', 'usr-12', 'usr-03', 1, 'Salió 30 minutos tarde.',               now() - interval '70 days'),
  -- usr-02: regular
  ('cal-0014', 'res-0010', 'usr-05', 'usr-02', 4, NULL,                                    now() - interval '8 days'),
  ('cal-0015', 'res-0010', 'usr-02', 'usr-05', 5, NULL,                                    now() - interval '8 days'),
  ('cal-0016', 'res-0011', 'usr-10', 'usr-02', 4, NULL,                                    now() - interval '25 days'),
  ('cal-0017', 'res-0012', 'usr-11', 'usr-02', 3, 'Bien, aunque el carro iba muy lleno.',   now() - interval '50 days'),
  ('cal-0018', 'res-0013', 'usr-06', 'usr-02', 3, NULL,                                    now() - interval '12 days'),
  ('cal-0019', 'res-0013', 'usr-02', 'usr-06', 2, 'Canceló dos veces antes de este viaje.', now() - interval '12 days'),
  -- usr-04: conductora nueva
  ('cal-0020', 'res-0014', 'usr-07', 'usr-04', 5, 'Primer viaje, todo muy bien.',          now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

-- Los ids nuevos continúan después de la semilla (usr-13, cal-0021, …).
SELECT setval('perfiles_seq', GREATEST(12, (SELECT count(*) FROM perfiles)));
SELECT setval('calificaciones_seq', GREATEST(20, (SELECT count(*) FROM calificaciones)));
