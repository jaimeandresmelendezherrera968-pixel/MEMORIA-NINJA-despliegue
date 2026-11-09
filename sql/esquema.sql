-- =====================================================================
-- MEMORIA NINJA
-- ESQUEMA DE BASE DE DATOS (PostgreSQL) — FUENTE ÚNICA DE VERDAD
--
-- Contiene TODOS los objetos: tablas, tipos, índices, funciones,
-- triggers, procedimientos almacenados y vistas (juego + cuentas/auth).
--
-- Es IDEMPOTENTE: se puede ejecutar varias veces sin romper nada.
--
-- Cómo aplicarlo (opción A, psql)  desde la raíz del repo:
--   psql -U postgres -p 6767 -d memoria_ninja -f sql/esquema.sql
--
-- Cómo aplicarlo (opción B, script Node) desde backend-poderes:
--   npm run db:setup
--   npm run db:test-setup    (crea memoria_ninja_test y aplica el esquema)
-- =====================================================================

-- ---------- 0) Extensiones requeridas ----------
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- gen_random_uuid() y criptografía
CREATE EXTENSION IF NOT EXISTS citext;     -- comparación de texto sin mayúsculas

-- ---------- Tipos ----------
-- ENUM de códigos: a qué trámite pertenece cada código.
DO $tipo$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_codigo') THEN
    CREATE TYPE tipo_codigo AS ENUM ('REGISTRO', 'RECUPERACION');
  END IF;
END
$tipo$;

-- =====================================================================
-- 1) TABLAS
-- =====================================================================

-- ---------- 1.1) usuarios (cuentas del backend) ----------
CREATE TABLE IF NOT EXISTS usuarios (
    id                TEXT PRIMARY KEY,
    usuario           TEXT NOT NULL UNIQUE,
    correo            TEXT NOT NULL UNIQUE,
    nacimiento        TEXT,
    password_hash     TEXT NOT NULL,
    creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
    -- Perfil de juego: cuenta nueva = 500 XP, resto en 0.
    xp                INTEGER NOT NULL DEFAULT 500,
    victorias         INTEGER NOT NULL DEFAULT 0,
    derrotas          INTEGER NOT NULL DEFAULT 0,
    racha             INTEGER NOT NULL DEFAULT 0,
    puntaje_max       INTEGER NOT NULL DEFAULT 0,
    -- Seguridad de cuenta (módulo de autenticación real).
    correo_verificado   BOOLEAN NOT NULL DEFAULT FALSE,
    correo_verificado_en TIMESTAMPTZ,
    intentos_fallidos   INTEGER NOT NULL DEFAULT 0,
    bloqueado_hasta     TIMESTAMPTZ,
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migración idempotente de columnas (perfil + seguridad)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS xp            INTEGER NOT NULL DEFAULT 500;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS victorias     INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS derrotas      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS racha         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS puntaje_max   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS correo_verificado   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS correo_verificado_en TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS intentos_fallidos   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS bloqueado_hasta     TIMESTAMPTZ;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now();

-- Formato de correo razonable como último muro (constraint CHECK).
DO $check$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_correo_valido') THEN
    ALTER TABLE usuarios ADD CONSTRAINT usuarios_correo_valido
      CHECK (correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');
  END IF;
END
$check$;

-- ---------- 1.2) partidas (estado del juego serializado como JSON) ----------
CREATE TABLE IF NOT EXISTS partidas (
    id             TEXT PRIMARY KEY,
    estado_json    TEXT NOT NULL,
    creada_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 1.3) historial_partidas (resultados; FK -> usuarios) ----------
CREATE TABLE IF NOT EXISTS historial_partidas (
    id         TEXT NOT NULL,
    id_usuario TEXT NOT NULL,
    id_partida TEXT,
    zona       TEXT,
    puntaje    INTEGER,
    modo       TEXT,
    ganador    TEXT,
    jugada_en  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT historial_partidas_pkey PRIMARY KEY (id),
    CONSTRAINT fk_historial_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuarios (id)
);

-- ---------- 1.4) jugadores (sistema antiguo; aislada) ----------
CREATE TABLE IF NOT EXISTS jugadores (
    id          SERIAL PRIMARY KEY,
    nombre      VARCHAR(50)  NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    nacimiento  DATE,
    correo      VARCHAR(120) UNIQUE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    experiencia INTEGER DEFAULT 0
);

-- ---------- 1.5) codigos_verificacion (códigos de 1 solo uso) ----------
CREATE TABLE IF NOT EXISTS codigos_verificacion (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id     TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    codigo_hash    TEXT NOT NULL,           -- el código NUNCA va en claro
    tipo           tipo_codigo NOT NULL,    -- REGISTRO | RECUPERACION
    expira_en      TIMESTAMPTZ NOT NULL,
    usado_en       TIMESTAMPTZ,
    intentos       INTEGER NOT NULL DEFAULT 0,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- 1.6) sesiones (login con cookie httpOnly) ----------
CREATE TABLE IF NOT EXISTS sesiones (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,        -- token en BD; cookie guarda el crudo
    ip          TEXT,
    user_agent  TEXT,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
    expira_en   TIMESTAMPTZ NOT NULL,
    revocada_en TIMESTAMPTZ
);

-- ---------- 1.7) auditoria_cuentas (cambios sensibles de la cuenta) ----------
CREATE TABLE IF NOT EXISTS auditoria_cuentas (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id     TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    accion         TEXT NOT NULL,            -- CAMBIO_PASSWORD, CAMBIO_VERIFICACION, CAMBIO_BLOQUEO
    campo          TEXT,
    valor_anterior TEXT,
    valor_nuevo    TEXT,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================================
-- 2) ÍNDICES
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_historial_usuario
    ON historial_partidas (id_usuario, jugada_en DESC);

-- Solo UN código activo por usuario y tipo (verificado también por trigger).
CREATE UNIQUE INDEX IF NOT EXISTS uq_codigo_activo_por_tipo
    ON codigos_verificacion (usuario_id, tipo)
    WHERE usado_en IS NULL;

CREATE INDEX IF NOT EXISTS idx_codigos_expira
    ON codigos_verificacion (expira_en);

CREATE INDEX IF NOT EXISTS idx_sesiones_usuario
    ON sesiones (usuario_id);

CREATE INDEX IF NOT EXISTS idx_auditoria_usuario
    ON auditoria_cuentas (usuario_id, creado_en DESC);

-- =====================================================================
-- 3) FUNCIONES DE TRIGGER
-- =====================================================================

-- actualizado_en automático (las tablas de cuentas).
CREATE OR REPLACE FUNCTION fn_set_actualizado_en()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizado_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- actualizada_en automático de partidas (legacy del juego).
CREATE OR REPLACE FUNCTION fn_partidas_actualizar_fecha()
RETURNS TRIGGER AS $$
BEGIN
    NEW.actualizada_en = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Auditoría de cambios sensibles en usuarios.
-- El hash NO se guarda (solo se deja constancia de que cambió).
CREATE OR REPLACE FUNCTION fn_auditar_usuario()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.password_hash IS DISTINCT FROM OLD.password_hash THEN
        INSERT INTO auditoria_cuentas (usuario_id, accion, campo)
        VALUES (NEW.id, 'CAMBIO_PASSWORD', 'password_hash');
    END IF;

    IF NEW.correo_verificado IS DISTINCT FROM OLD.correo_verificado THEN
        INSERT INTO auditoria_cuentas (usuario_id, accion, campo, valor_anterior, valor_nuevo)
        VALUES (NEW.id, 'CAMBIO_VERIFICACION', 'correo_verificado',
                OLD.correo_verificado::text, NEW.correo_verificado::text);
    END IF;

    IF NEW.bloqueado_hasta IS DISTINCT FROM OLD.bloqueado_hasta THEN
        INSERT INTO auditoria_cuentas (usuario_id, accion, campo, valor_anterior, valor_nuevo)
        VALUES (NEW.id, 'CAMBIO_BLOQUEO', 'bloqueado_hasta',
                OLD.bloqueado_hasta::text, NEW.bloqueado_hasta::text);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Al crear un código nuevo, se invalida (marca como usado) el anterior
-- activo del mismo usuario y tipo: siempre un solo código vigente.
CREATE OR REPLACE FUNCTION fn_invalidar_codigo_previo()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE codigos_verificacion
       SET usado_en = now(), actualizado_en = now()
     WHERE usuario_id = NEW.usuario_id
       AND tipo = NEW.tipo
       AND usado_en IS NULL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 4) TRIGGERS
-- =====================================================================
DROP TRIGGER IF EXISTS trg_usuarios_updated ON usuarios;
CREATE TRIGGER trg_usuarios_updated
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

DROP TRIGGER IF EXISTS trg_codigos_updated ON codigos_verificacion;
CREATE TRIGGER trg_codigos_updated
    BEFORE UPDATE ON codigos_verificacion
    FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

DROP TRIGGER IF EXISTS trg_partidas_actualizar_fecha ON partidas;
CREATE TRIGGER trg_partidas_actualizar_fecha
    BEFORE UPDATE ON partidas
    FOR EACH ROW EXECUTE FUNCTION fn_partidas_actualizar_fecha();

DROP TRIGGER IF EXISTS trg_auditar_usuario ON usuarios;
CREATE TRIGGER trg_auditar_usuario
    AFTER UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_auditar_usuario();

DROP TRIGGER IF EXISTS trg_invalidar_codigo_previo ON codigos_verificacion;
CREATE TRIGGER trg_invalidar_codigo_previo
    BEFORE INSERT ON codigos_verificacion
    FOR EACH ROW EXECUTE FUNCTION fn_invalidar_codigo_previo();

-- =====================================================================
-- 5) FUNCIONES DE NEGOCIO (ACID)
-- =====================================================================

-- Confirma un código de forma ATOMICA: bloquea la fila (FOR UPDATE),
-- consume el código y marca el correo como verificado — todo o nada.
-- Debe llamarse DENTRO de una transacción (ver DatabasePostgres.transaccion).
-- Devuelve 'OK' o 'CODIGO_INVALIDO'.
CREATE OR REPLACE FUNCTION fn_confirmar_codigo(
    p_usuario_id  TEXT,
    p_codigo_hash TEXT,
    p_tipo        tipo_codigo
) RETURNS text AS $$
DECLARE
    v_id UUID;
BEGIN
    SELECT id INTO v_id
      FROM codigos_verificacion
     WHERE usuario_id = p_usuario_id
       AND codigo_hash = p_codigo_hash
       AND tipo = p_tipo
       AND usado_en IS NULL
       AND expira_en > now()
     FOR UPDATE;                                    -- aislamiento: evita doble uso

    IF v_id IS NULL THEN
        RETURN 'CODIGO_INVALIDO';
    END IF;

    UPDATE codigos_verificacion
       SET usado_en = now(), actualizado_en = now()
     WHERE id = v_id;

    IF p_tipo = 'REGISTRO' THEN
        UPDATE usuarios
           SET correo_verificado = true,
               correo_verificado_en = now()
         WHERE id = p_usuario_id;
    END IF;

    RETURN 'OK';
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 6) PROCEDIMIENTOS ALMACENADOS
-- =====================================================================

-- Registra el resultado de una partida de un usuario.
CREATE OR REPLACE PROCEDURE sp_registrar_partida(
    p_id_usuario TEXT,
    p_zona       TEXT,
    p_puntaje    INTEGER,
    p_modo       TEXT,
    p_ganador    TEXT
)
LANGUAGE plpgsql AS $BODY$
BEGIN
    INSERT INTO historial_partidas (id, id_usuario, zona, puntaje, modo, ganador)
    VALUES (gen_random_uuid()::TEXT, p_id_usuario, p_zona, p_puntaje, p_modo, p_ganador);
END;
$BODY$;

-- Crea una partida y registra su resultado en UNA sola operación (atómica).
CREATE OR REPLACE PROCEDURE sp_crear_partida_completa(
    p_id_partida  TEXT,
    p_estado_json TEXT,
    p_id_usuario  TEXT,
    p_zona        TEXT,
    p_puntaje     INTEGER,
    p_modo        TEXT,
    p_ganador     TEXT
)
LANGUAGE plpgsql AS $BODY$
BEGIN
    INSERT INTO historial_partidas (id, id_usuario, id_partida, zona, puntaje, modo, ganador)
    VALUES (gen_random_uuid()::TEXT, p_id_usuario, p_id_partida, p_zona, p_puntaje, p_modo, p_ganador);

    INSERT INTO partidas (id, estado_json) VALUES (p_id_partida, p_estado_json);
END;
$BODY$;

-- Restablece la contraseña y revoca todas sus sesiones (atómico).
CREATE OR REPLACE PROCEDURE sp_restablecer_password(
    p_usuario_id TEXT,
    p_nuevo_hash TEXT
)
LANGUAGE plpgsql AS $BODY$
BEGIN
    UPDATE sesiones
       SET revocada_en = now()
     WHERE usuario_id = p_usuario_id
       AND revocada_en IS NULL;

    UPDATE usuarios
       SET password_hash = p_nuevo_hash
     WHERE id = p_usuario_id;

    -- Cualquier código de recuperación pendiente queda invalidado.
    UPDATE codigos_verificacion
       SET usado_en = now(), actualizado_en = now()
     WHERE usuario_id = p_usuario_id
       AND tipo = 'RECUPERACION'
       AND usado_en IS NULL;
END;
$BODY$;

-- =====================================================================
-- 7) VISTAS
-- =====================================================================

-- Partidas más recientes
CREATE OR REPLACE VIEW vw_partidas_recientes AS
SELECT id, creada_en, actualizada_en
FROM partidas
ORDER BY actualizada_en DESC, creada_en DESC;

-- Historial detallado (con nombre de usuario)
CREATE OR REPLACE VIEW vw_historial_detallado AS
SELECT
    h.id, h.id_usuario, u.usuario, h.id_partida,
    h.zona, h.puntaje, h.modo, h.ganador, h.jugada_en
FROM historial_partidas h
LEFT JOIN usuarios u ON u.id = h.id_usuario
ORDER BY h.jugada_en DESC;

-- Ranking por mejor puntaje
CREATE OR REPLACE VIEW vw_ranking_mejor_puntaje AS
SELECT
    u.id AS id_usuario,
    u.usuario,
    MAX(h.puntaje) AS mejor_puntaje,
    COUNT(h.id) AS total_partidas,
    MAX(h.jugada_en) AS ultima_jugada
FROM historial_partidas h
INNER JOIN usuarios u ON u.id = h.id_usuario
GROUP BY u.id, u.usuario
ORDER BY mejor_puntaje DESC NULLS LAST, total_partidas DESC;

-- Usuarios con resumen de historial
CREATE OR REPLACE VIEW vw_usuarios_resumen AS
SELECT
    u.id, u.usuario, u.correo, u.nacimiento, u.creado_en,
    COUNT(h.id) AS total_partidas,
    MAX(h.puntaje) FILTER (WHERE h.puntaje IS NOT NULL) AS max_puntaje,
    MAX(h.jugada_en) AS ultima_partida
FROM usuarios u
LEFT JOIN historial_partidas h ON h.id_usuario = u.id
GROUP BY u.id, u.usuario, u.correo, u.nacimiento, u.creado_en
ORDER BY total_partidas DESC, u.usuario ASC;

-- Usuarios SIN el password_hash (capa de presentación segura)
CREATE OR REPLACE VIEW vw_usuarios_seguro AS
SELECT id, usuario, correo, nacimiento,
       correo_verificado, correo_verificado_en, creado_en
FROM usuarios;

-- Sesiones activas (no revocadas y no vencidas)
CREATE OR REPLACE VIEW vw_sesiones_activas AS
SELECT s.id, s.usuario_id, u.usuario,
       s.creado_en, s.expira_en, s.ip, s.user_agent
FROM sesiones s
JOIN usuarios u ON u.id = s.usuario_id
WHERE s.revocada_en IS NULL AND s.expira_en > now();