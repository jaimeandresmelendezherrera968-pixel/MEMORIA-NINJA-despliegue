-- =====================================================================
-- consultas-demo.sql — Todo para VER con contenido en pgAdmin
-- =====================================================================
-- Pegá esto en la Query Tool (sobre la base "memoria_ninja") DESPUÉS de
-- correr el seed (npm run seed:demo  o  sql/datos-simulados.sql).
--
-- Está dividido en secciones para que ejecutes por partes (seleccioná un
-- bloque y F5). También trae al final cómo VER EL CÓDIGO de vistas,
-- funciones, procedimientos y triggers desde el catálogo.
-- =====================================================================


-- =====================================================================
-- 1) TABLAS (todas deben tener filas)
-- =====================================================================
SELECT * FROM usuarios;                -- 7 cuentas demo
SELECT * FROM partidas;                -- 6 partidas
SELECT * FROM historial_partidas;      -- 9 resultados
SELECT * FROM jugadores;               -- 3 filas (tabla legacy)
SELECT * FROM codigos_verificacion;    -- 4 códigos (1 vigente por tipo)
SELECT * FROM sesiones;                -- 5 sesiones (activas/revocada/vencida)
SELECT * FROM auditoria_cuentas;       -- 3 cambios sensibles (los puso el trigger)


-- =====================================================================
-- 2) VISTAS (todas deben tener filas)
-- =====================================================================
SELECT * FROM vw_partidas_recientes;
SELECT * FROM vw_historial_detallado;
SELECT * FROM vw_ranking_mejor_puntaje;   -- ranking por puntaje máximo
SELECT * FROM vw_usuarios_resumen;
SELECT * FROM vw_usuarios_seguro;         -- SIN datos sensibles (sin password_hash)
SELECT * FROM vw_sesiones_activas;        -- solo activas (2)


-- =====================================================================
-- 3) PROCEDIMIENTOS (los "procesos" que ejecutás)
-- =====================================================================
-- OJO: PostgreSQL NO permite subconsultas como argumento de CALL, por eso
-- van dentro de bloques DO (que resuelven el id por correo y llaman).

-- 3.1) sp_registrar_partida: solo historial
DO $$
DECLARE v_id text;
BEGIN
    SELECT id INTO v_id FROM usuarios WHERE correo = 'kakashi@demo.ninja';
    CALL sp_registrar_partida(v_id, 'arena', 900, 'clasico', 'kakashi');
END $$;

-- 3.2) sp_crear_partida_completa: partida + historial en UNA operación
DO $$
DECLARE v_id text;
BEGIN
    SELECT id INTO v_id FROM usuarios WHERE correo = 'sakura@demo.ninja';
    CALL sp_crear_partida_completa(
        gen_random_uuid()::text,
        '{"demo":true,"zona":"hyuga","puntaje":730,"eventos":["demo manual"],"poderesActivos":[]}',
        v_id, 'hyuga', 730, 'clasico', 'sakura');
END $$;

-- 3.3) sp_restablecer_password: cambia el hash Y revoca sesiones (atómico)
DO $$
DECLARE v_id text;
BEGIN
    SELECT id INTO v_id FROM usuarios WHERE correo = 'sasuke@demo.ninja';
    CALL sp_restablecer_password(v_id, 'sal_demo:hash_demo');
END $$;

SELECT * FROM auditoria_cuentas ORDER BY creado_en DESC;   -- verás nuevos registros


-- =====================================================================
-- 4) FUNCIÓN fn_confirmar_codigo  ('OK' o 'CODIGO_INVALIDO')
-- =====================================================================
-- Código VÁLIDO de gaara (tipo RECUPERACION, vigente):
SELECT fn_confirmar_codigo(
    (SELECT id FROM usuarios WHERE correo='gaara@demo.ninja'),
    encode(digest('444444','sha256'),'hex'),
    'RECUPERACION') AS resultado_valido;      -- OK

-- Código INEXISTENTE:
SELECT fn_confirmar_codigo(
    (SELECT id FROM usuarios WHERE correo='gaara@demo.ninja'),
    'noexiste',
    'RECUPERACION') AS resultado_invalido;    -- CODIGO_INVALIDO


-- =====================================================================
-- 5) TRIGGERS (efectos visibles)
-- =====================================================================
-- trg_invalidar_codigo_previo: solo UN código vigente por usuario+tipo.
SELECT usuario_id, tipo, (usado_en IS NULL) AS vigente, count(*)
  FROM codigos_verificacion
 GROUP BY usuario_id, tipo, vigente ORDER BY usuario_id;

-- trg_auditar_usuario: la auditoría la escribió el trigger, no un INSERT.
SELECT u.usuario, a.accion, a.campo, a.valor_anterior, a.valor_nuevo, a.creado_en
  FROM auditoria_cuentas a JOIN usuarios u ON u.id = a.usuario_id
 ORDER BY a.creado_en;

-- trg_usuarios_updated / trg_partidas_actualizar_fecha: tocar y ver cómo
-- actualizado_en / actualizada_en se refresca solo.
UPDATE usuarios SET xp = xp + 1 WHERE correo = 'sasuke@demo.ninja';
SELECT usuario, actualizado_en FROM usuarios WHERE correo = 'sasuke@demo.ninja';


-- =====================================================================
-- 6) CONSULTAS DE NEGOCIO
-- =====================================================================
-- Top 5 por mejor puntaje
SELECT usuario, mejor_puntaje, total_partidas, ultima_jugada
  FROM vw_ranking_mejor_puntaje LIMIT 5;

-- Ranking + stats de perfil combinados
SELECT u.usuario, u.xp, u.victorias, u.derrotas, u.racha, u.puntaje_max,
       r.mejor_puntaje, r.total_partidas
  FROM usuarios u
  LEFT JOIN vw_ranking_mejor_puntaje r ON r.id_usuario = u.id
 ORDER BY u.puntaje_max DESC;

-- Cuentas bloqueadas / sin verificar
SELECT usuario, correo_verificado, bloqueado_hasta FROM usuarios
 WHERE correo_verificado = false OR bloqueado_hasta > now();

-- Historial de un usuario puntual
SELECT h.* FROM historial_partidas h JOIN usuarios u ON u.id = h.id_usuario
 WHERE u.usuario = 'rocklee' ORDER BY h.jugada_en DESC;


-- =====================================================================
-- 7) VER EL CÓDIGO DE LOS OBJETOS desde el catálogo
-- =====================================================================
-- Definición de una vista
SELECT pg_get_viewdef('vw_ranking_mejor_puntaje', true);

-- Código fuente de las funciones y procedimientos
SELECT proname AS nombre, prosrc AS codigo
  FROM pg_proc
 WHERE proname IN ('fn_confirmar_codigo','fn_auditar_usuario','fn_invalidar_codigo_previo',
                   'sp_registrar_partida','sp_crear_partida_completa','sp_restablecer_password')
 ORDER BY proname;

-- Lista de triggers (tabla, momento, evento)
SELECT event_object_table AS tabla, trigger_name, action_timing, event_manipulation
  FROM information_schema.triggers
 ORDER BY tabla, trigger_name;
