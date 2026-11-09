-- =====================================================================
-- datos-simulados.sql  —  SEED de datos DEMO para que NADA se vea vacío
-- =====================================================================
-- Llena las 7 tablas, las 6 vistas y ejercita los 5 triggers, los 3
-- procedimientos y la función fn_confirmar_codigo.
--
--   * IDEMPOTENTE: borra SOLO lo demo (correo @demo.ninja / estado_json
--     con "demo":true) y lo vuelve a crear. No toca datos reales.
--   * Las cuentas permiten iniciar sesión de verdad: la clave es "clave123"
--     y el hash embebido fue generado con el PasswordHasher real (scrypt "sal:hash").
--   * Los códigos se guardan con sha256 (igual que CodigoHasher), para que
--     fn_confirmar_codigo los pueda comparar.
--
-- Cómo ejecutarlo:
--   pgAdmin  ->  Query Tool sobre la base "memoria_ninja"  ->  pegar y F5
--   psql     ->  psql -h localhost -p 6767 -U postgres -d memoria_ninja -f sql/datos-simulados.sql
--   npm      ->  npm run seed:demo   (versión Node, equivalente)
--
-- NOTA: los CALL a procedimientos van dentro de bloques DO porque
-- PostgreSQL NO permite subconsultas como argumento de CALL.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 0) Limpieza de SOLO lo demo (idempotencia)
-- ---------------------------------------------------------------------
DELETE FROM historial_partidas
 WHERE id_usuario IN (SELECT id FROM usuarios WHERE correo LIKE '%@demo.ninja');

DELETE FROM partidas WHERE estado_json LIKE '%"demo":true%';

DELETE FROM jugadores WHERE correo LIKE '%@demo.ninja';

-- Las filas de codigos/sesiones/auditoria caen por ON DELETE CASCADE.
DELETE FROM usuarios WHERE correo LIKE '%@demo.ninja';

-- ---------------------------------------------------------------------
-- 1) usuarios  (hash fijo de "clave123": sal:hash scrypt)
--    shikamaru y gaara se ajustan DESPUÉS para disparar la auditoría.
-- ---------------------------------------------------------------------
INSERT INTO usuarios
    (id, usuario, correo, nacimiento, password_hash,
     xp, victorias, derrotas, racha, puntaje_max,
     correo_verificado, correo_verificado_en)
SELECT
    gen_random_uuid()::text,
    t.usuario,
    t.usuario || '@demo.ninja',
    t.nacimiento::date,
    '958d3a0ebc96dbd41e609f9477118d88:940ff65b481a18c29beea02ca28918da4e732195ad46fb517967e59c0aa0a9a01c6d4cedcf956f8e3a9b95dc21f44f0a03ae61af1c5792c384afd1c667934d7b',
    t.xp, t.victorias, t.derrotas, t.racha, t.puntaje_max,
    t.verificado,
    CASE WHEN t.verificado THEN now() ELSE NULL END
FROM (VALUES
    ('sasuke',    '2001-07-23', 1200,  7, 2, 3, 850, true),
    ('sakura',    '2001-03-28',  900,  4, 3, 1, 720, true),
    ('kakashi',   '1990-09-15', 1500, 10, 1, 5, 980, true),
    ('hinata',    '2001-12-27',  500,  0, 0, 0,   0, false),
    ('shikamaru', '2001-09-22',  700,  2, 4, 0, 610, false),
    ('rocklee',   '2001-11-27', 1100,  6, 2, 2, 800, true),
    ('gaara',     '2001-01-19',  500,  0, 0, 0,   0, true)
) AS t(usuario, nacimiento, xp, victorias, derrotas, racha, puntaje_max, verificado);

-- ---------------------------------------------------------------------
-- 2) jugadores  (tabla legacy, aislada: INSERT directo)
-- ---------------------------------------------------------------------
INSERT INTO jugadores (nombre, password, nacimiento, correo, experiencia) VALUES
    ('naruto', 'legacy-no-login', '2000-10-10', 'naruto@demo.ninja',        320),
    ('sasuke', 'legacy-no-login', '2001-07-23', 'sasuke.legacy@demo.ninja', 260),
    ('sakura', 'legacy-no-login', '2001-03-28', 'sakura.legacy@demo.ninja', 180);

-- ---------------------------------------------------------------------
-- 3) partidas + historial_partidas  (vía PROCEDIMIENTOS reales)
-- ---------------------------------------------------------------------
DO $$
DECLARE
    v_sasuke    text; v_sakura    text; v_kakashi   text;
    v_shikamaru text; v_rocklee   text;
BEGIN
    SELECT id INTO v_sasuke    FROM usuarios WHERE correo = 'sasuke@demo.ninja';
    SELECT id INTO v_sakura    FROM usuarios WHERE correo = 'sakura@demo.ninja';
    SELECT id INTO v_kakashi   FROM usuarios WHERE correo = 'kakashi@demo.ninja';
    SELECT id INTO v_shikamaru FROM usuarios WHERE correo = 'shikamaru@demo.ninja';
    SELECT id INTO v_rocklee   FROM usuarios WHERE correo = 'rocklee@demo.ninja';

    CALL sp_crear_partida_completa(gen_random_uuid()::text,
        '{"demo":true,"zona":"arena","puntaje":850,"jugadores":{"sasuke":{"nombre":"sasuke","chakra":30,"vida":100}},"eventos":["inicio en arena","puntaje 850"],"poderesActivos":[]}',
        v_sasuke, 'arena', 850, 'clasico', 'sasuke');

    CALL sp_registrar_partida(v_sasuke, 'roca', 640, 'contrarreloj', 'rival');

    CALL sp_crear_partida_completa(gen_random_uuid()::text,
        '{"demo":true,"zona":"niebla","puntaje":720,"jugadores":{"sakura":{"nombre":"sakura","chakra":30,"vida":100}},"eventos":["inicio en niebla","puntaje 720"],"poderesActivos":[]}',
        v_sakura, 'niebla', 720, 'clasico', 'sakura');

    CALL sp_crear_partida_completa(gen_random_uuid()::text,
        '{"demo":true,"zona":"uchiha","puntaje":980,"jugadores":{"kakashi":{"nombre":"kakashi","chakra":30,"vida":100}},"eventos":["inicio en uchiha","puntaje 980"],"poderesActivos":[]}',
        v_kakashi, 'uchiha', 980, 'clasico', 'kakashi');

    CALL sp_registrar_partida(v_kakashi, 'nube', 700, 'contrarreloj', 'rival');

    CALL sp_crear_partida_completa(gen_random_uuid()::text,
        '{"demo":true,"zona":"hyuga","puntaje":610,"jugadores":{"shikamaru":{"nombre":"shikamaru","chakra":30,"vida":100}},"eventos":["inicio en hyuga","puntaje 610"],"poderesActivos":[]}',
        v_shikamaru, 'hyuga', 610, 'clasico', 'shikamaru');

    CALL sp_crear_partida_completa(gen_random_uuid()::text,
        '{"demo":true,"zona":"arena","puntaje":800,"jugadores":{"rocklee":{"nombre":"rocklee","chakra":30,"vida":100}},"eventos":["inicio en arena","puntaje 800"],"poderesActivos":[]}',
        v_rocklee, 'arena', 800, 'clasico', 'rocklee');

    CALL sp_crear_partida_completa(gen_random_uuid()::text,
        '{"demo":true,"zona":"roca","puntaje":760,"jugadores":{"rocklee":{"nombre":"rocklee","chakra":30,"vida":100}},"eventos":["inicio en roca","puntaje 760"],"poderesActivos":[]}',
        v_rocklee, 'roca', 760, 'contrarreloj', 'rocklee');

    CALL sp_registrar_partida(v_rocklee, 'nube', 520, 'clasico', 'rival');
END $$;

-- ---------------------------------------------------------------------
-- 4) codigos_verificacion  (hash sha256; el 2º REGISTRO de hinata
--    dispara trg_invalidar_codigo_previo: queda UNO solo vigente)
-- ---------------------------------------------------------------------
INSERT INTO codigos_verificacion (usuario_id, codigo_hash, tipo, expira_en)
VALUES
    ((SELECT id FROM usuarios WHERE correo = 'hinata@demo.ninja'),
     encode(digest('111111', 'sha256'), 'hex'), 'REGISTRO', now() + interval '15 min'),
    ((SELECT id FROM usuarios WHERE correo = 'hinata@demo.ninja'),
     encode(digest('333333', 'sha256'), 'hex'), 'REGISTRO', now() + interval '15 min'),
    ((SELECT id FROM usuarios WHERE correo = 'gaara@demo.ninja'),
     encode(digest('222222', 'sha256'), 'hex'), 'RECUPERACION', now() + interval '15 min');

-- ---------------------------------------------------------------------
-- 5) sesiones  (activas, revocada y vencida)
-- ---------------------------------------------------------------------
INSERT INTO sesiones (usuario_id, token_hash, ip, user_agent, expira_en, revocada_en) VALUES
    ((SELECT id FROM usuarios WHERE correo = 'sasuke@demo.ninja'),  encode(digest(gen_random_uuid()::text,'sha256'),'hex'), '127.0.0.1', 'Seed/Demo', now() + interval '1 hour',  NULL),  -- activa
    ((SELECT id FROM usuarios WHERE correo = 'rocklee@demo.ninja'), encode(digest(gen_random_uuid()::text,'sha256'),'hex'), '127.0.0.1', 'Seed/Demo', now() + interval '1 hour',  NULL),  -- activa
    ((SELECT id FROM usuarios WHERE correo = 'kakashi@demo.ninja'), encode(digest(gen_random_uuid()::text,'sha256'),'hex'), '127.0.0.1', 'Seed/Demo', now() + interval '1 hour',  NULL),  -- se revoca abajo
    ((SELECT id FROM usuarios WHERE correo = 'sakura@demo.ninja'),  encode(digest(gen_random_uuid()::text,'sha256'),'hex'), '127.0.0.1', 'Seed/Demo', now() + interval '1 hour',  now()), -- ya revocada
    ((SELECT id FROM usuarios WHERE correo = 'hinata@demo.ninja'),  encode(digest(gen_random_uuid()::text,'sha256'),'hex'), '127.0.0.1', 'Seed/Demo', now() - interval '1 hour',  NULL);  -- vencida

-- ---------------------------------------------------------------------
-- 6) AUDITORÍA (la generan los TRIGGERS, no inserts manuales)
-- ---------------------------------------------------------------------
-- CAMBIO_PASSWORD + revoca sesiones de kakashi (atómico dentro del SP).
DO $$
DECLARE v_kakashi text;
BEGIN
    SELECT id INTO v_kakashi FROM usuarios WHERE correo = 'kakashi@demo.ninja';
    -- Hash DISTINTO al insertado (misma clave "clave123", otra sal) para que
    -- el trigger trg_auditar_usuario registre el CAMBIO_PASSWORD.
    CALL sp_restablecer_password(v_kakashi,
        '82628276de67e18cf71ae9db4e64ae08:f3bf98ec23060d79b314fe09fdfbcc746c4a088a11f63ad52ef6ff8242a3814316c41802c3afb6d85ce54c4ff09c5babfc7f7cd91c58420b84683578458d9ee7');
END $$;

-- CAMBIO_VERIFICACION: shikamaru pasa a verificado.
UPDATE usuarios
   SET correo_verificado = true, correo_verificado_en = now()
 WHERE correo = 'shikamaru@demo.ninja';

-- CAMBIO_BLOQUEO: gaara queda bloqueado 1 día por intentos fallidos.
UPDATE usuarios
   SET intentos_fallidos = 5, bloqueado_hasta = now() + interval '1 day'
 WHERE correo = 'gaara@demo.ninja';

-- ---------------------------------------------------------------------
-- 7) fn_confirmar_codigo  (demostración: uno válido y uno inválido)
-- ---------------------------------------------------------------------
SELECT fn_confirmar_codigo(
    (SELECT id FROM usuarios WHERE correo = 'gaara@demo.ninja'),
    encode(digest('222222', 'sha256'), 'hex'),
    'RECUPERACION') AS codigo_bueno;   -- esperado: OK

-- Se deja de nuevo un código de recuperación vigente para gaara.
INSERT INTO codigos_verificacion (usuario_id, codigo_hash, tipo, expira_en)
VALUES ((SELECT id FROM usuarios WHERE correo = 'gaara@demo.ninja'),
        encode(digest('444444', 'sha256'), 'hex'), 'RECUPERACION', now() + interval '15 min');

SELECT fn_confirmar_codigo(
    (SELECT id FROM usuarios WHERE correo = 'sasuke@demo.ninja'),
    'deadbeef',
    'REGISTRO') AS codigo_malo;        -- esperado: CODIGO_INVALIDO

COMMIT;
