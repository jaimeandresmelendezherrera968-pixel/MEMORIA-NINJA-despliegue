"use strict";

/**
 * seed-demo.js — DATOS SIMULADOS para que NADA se vea vacío.
 *
 * Llena las 7 tablas, las 6 vistas, y ejercita los 5 triggers, las 3
 * funciones/procedimientos y fn_confirmar_codigo, para que al abrir el SQL
 * o ejecutarlo en pgAdmin SIEMPRE se vea información.
 *
 * - Es IDEMPOTENTE: borra SOLO lo demo (correo @demo.ninja / estado_json
 *   con "demo":true) y lo vuelve a crear. No toca data real.
 * - Las cuentas permiten INICIAR SESIÓN de verdad (clave: clave123), porque
 *   la contraseña se hashea con el PasswordHasher real (scrypt "sal:hash").
 * - Usa los caminos REALES del sistema: los sp_* y los triggers se disparan
 *   solos (auditoría, invalidar código previo, actualizado_en).
 *
 * Uso:
 *   npm run seed:demo
 *   node scripts/seed-demo.js            # usa PGDATABASE del .env
 *   node scripts/seed-demo.js --database memoria_ninja
 */

require("dotenv").config();
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const PasswordHasher = require("../src/infraestructura/PasswordHasher");
const CodigoHasher = require("../src/infraestructura/CodigoHasher");

const DOMINIO_DEMO = "@demo.ninja";
const CLAVE_DEMO = "clave123";

const argumento = (nombre) => {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

const database = argumento("--database") || process.env.PGDATABASE || "memoria_ninja";

const config = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD,
  database,
};

// ---------------------------------------------------------------------------
// DATOS DEMO
// ---------------------------------------------------------------------------

// 7 cuentas temáticas. `verificado` es el estado BASE que insertamos.
// `shikamaru` y `gaara` se ajustan DESPUÉS con UPDATE para disparar la
// auditoría (CAMBIO_VERIFICACION / CAMBIO_BLOQUEO).
const CUENTAS = [
  { usuario: "sasuke",    nacimiento: "2001-07-23", xp: 1200, victorias: 7,  derrotas: 2, racha: 3, puntajeMax: 850, verificado: true },
  { usuario: "sakura",    nacimiento: "2001-03-28", xp: 900,  victorias: 4,  derrotas: 3, racha: 1, puntajeMax: 720, verificado: true },
  { usuario: "kakashi",   nacimiento: "1990-09-15", xp: 1500, victorias: 10, derrotas: 1, racha: 5, puntajeMax: 980, verificado: true },
  { usuario: "hinata",    nacimiento: "2001-12-27", xp: 500,  victorias: 0,  derrotas: 0, racha: 0, puntajeMax: 0,   verificado: false },
  { usuario: "shikamaru", nacimiento: "2001-09-22", xp: 700,  victorias: 2,  derrotas: 4, racha: 0, puntajeMax: 610, verificado: false },
  { usuario: "rocklee",   nacimiento: "2001-11-27", xp: 1100, victorias: 6,  derrotas: 2, racha: 2, puntajeMax: 800, verificado: true },
  { usuario: "gaara",     nacimiento: "2001-01-19", xp: 500,  victorias: 0,  derrotas: 0, racha: 0, puntajeMax: 0,   verificado: true },
];

// Resultados de partidas. `partida:true` => crea también una fila en la tabla
// `partidas` (vía sp_crear_partida_completa); `false` => solo historial.
const RESULTADOS = [
  { u: "sasuke",    partida: true,  zona: "arena",   puntaje: 850, modo: "clasico",      ganador: "sasuke" },
  { u: "sasuke",    partida: false, zona: "roca",    puntaje: 640, modo: "contrarreloj", ganador: "rival" },
  { u: "sakura",    partida: true,  zona: "niebla",  puntaje: 720, modo: "clasico",      ganador: "sakura" },
  { u: "kakashi",   partida: true,  zona: "uchiha",  puntaje: 980, modo: "clasico",      ganador: "kakashi" },
  { u: "kakashi",   partida: false, zona: "nube",    puntaje: 700, modo: "contrarreloj", ganador: "rival" },
  { u: "shikamaru", partida: true,  zona: "hyuga",   puntaje: 610, modo: "clasico",      ganador: "shikamaru" },
  { u: "rocklee",   partida: true,  zona: "arena",   puntaje: 800, modo: "clasico",      ganador: "rocklee" },
  { u: "rocklee",   partida: true,  zona: "roca",    puntaje: 760, modo: "contrarreloj", ganador: "rocklee" },
  { u: "rocklee",   partida: false, zona: "nube",    puntaje: 520, modo: "clasico",      ganador: "rival" },
];

// Tabla legacy `jugadores` (aislada, sin FK): se llena por INSERT directo.
const JUGADORES_LEGACY = [
  { nombre: "naruto", nacimiento: "2000-10-10", correo: "naruto" + DOMINIO_DEMO, experiencia: 320 },
  { nombre: "sasuke", nacimiento: "2001-07-23", correo: "sasuke.legacy" + DOMINIO_DEMO, experiencia: 260 },
  { nombre: "sakura", nacimiento: "2001-03-28", correo: "sakura.legacy" + DOMINIO_DEMO, experiencia: 180 },
];

const hasherPassword = new PasswordHasher();
const hasherCodigo = new CodigoHasher();
const token = () => crypto.randomBytes(24).toString("hex");

function estadoDemo(usuario, zona, puntaje) {
  return JSON.stringify({
    demo: true,
    zona,
    puntaje,
    jugadores: { [usuario]: { nombre: usuario, chakra: 30, vida: 100 } },
    tablero: { filas: 4, columnas: 4, cartas: [] },
    eventos: [`inicio en ${zona}`, `puntaje ${puntaje}`],
    poderesActivos: [],
  });
}

async function asegurarEsquema(cliente) {
  const ok = await cliente.query("select to_regclass('public.usuarios') as t");
  if (!ok.rows[0].t) {
    const ruta = path.resolve(__dirname, "..", "..", "sql", "esquema.sql");
    console.log("Esquema ausente: aplicando " + ruta);
    await cliente.query(fs.readFileSync(ruta, "utf8"));
  }
}

async function limpiarDemo(cliente) {
  await cliente.query(
    "delete from historial_partidas where id_usuario in (select id from usuarios where correo like $1)",
    ["%" + DOMINIO_DEMO]
  );
  await cliente.query("delete from partidas where estado_json like '%\"demo\":true%'");
  await cliente.query("delete from jugadores where correo like $1", ["%" + DOMINIO_DEMO]);
  // El borrado de usuarios arrastra codigos/sesiones/auditoria (ON DELETE CASCADE).
  await cliente.query("delete from usuarios where correo like $1", ["%" + DOMINIO_DEMO]);
}

async function main() {
  if (!config.password) {
    console.error("Falta PGPASSWORD. Copiá .env.example a .env y completá tus credenciales.");
    process.exit(1);
  }

  const cliente = new Client(config);
  await cliente.connect();
  console.log("Sembrando datos simulados en '" + database + "' ...");

  await asegurarEsquema(cliente);
  await cliente.query("BEGIN");

  try {
    await limpiarDemo(cliente);

    // ---------- usuarios ----------
    const idPorUsuario = {};
    for (const c of CUENTAS) {
      const id = crypto.randomUUID();
      idPorUsuario[c.usuario] = id;
      await cliente.query(
        `insert into usuarios
           (id, usuario, correo, nacimiento, password_hash, xp, victorias, derrotas, racha, puntaje_max, correo_verificado, correo_verificado_en)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          id,
          c.usuario,
          c.usuario + DOMINIO_DEMO,
          c.nacimiento,
          hasherPassword.generarHash(CLAVE_DEMO),
          c.xp, c.victorias, c.derrotas, c.racha, c.puntajeMax,
          c.verificado,
          c.verificado ? new Date() : null,
        ]
      );
    }

    // ---------- jugadores (legacy, aislada) ----------
    for (const j of JUGADORES_LEGACY) {
      await cliente.query(
        `insert into jugadores (nombre, password, nacimiento, correo, experiencia)
         values ($1, $2, $3, $4, $5)`,
        [j.nombre, "legacy-no-login", j.nacimiento, j.correo, j.experiencia]
      );
    }

    // ---------- partidas + historial (vía procedimientos REALES) ----------
    for (const r of RESULTADOS) {
      const idUsuario = idPorUsuario[r.u];
      if (r.partida) {
        const idPartida = crypto.randomUUID();
        await cliente.query(
          "call sp_crear_partida_completa($1,$2,$3,$4,$5,$6,$7)",
          [idPartida, estadoDemo(r.u, r.zona, r.puntaje), idUsuario, r.zona, r.puntaje, r.modo, r.ganador]
        );
      } else {
        await cliente.query(
          "call sp_registrar_partida($1,$2,$3,$4,$5)",
          [idUsuario, r.zona, r.puntaje, r.modo, r.ganador]
        );
      }
    }

    // ---------- codigos_verificacion ----------
    const futuro = new Date(Date.now() + 15 * 60 * 1000);
    // hinata: código de REGISTRO activo...
    await cliente.query(
      `insert into codigos_verificacion (usuario_id, codigo_hash, tipo, expira_en)
       values ($1,$2,$3::tipo_codigo,$4)`,
      [idPorUsuario.hinata, hasherCodigo.hash("111111"), "REGISTRO", futuro]
    );
    // ...y un SEGUNDO REGISTRO: dispara trg_invalidar_codigo_previo (queda uno solo vigente).
    await cliente.query(
      `insert into codigos_verificacion (usuario_id, codigo_hash, tipo, expira_en)
       values ($1,$2,$3::tipo_codigo,$4)`,
      [idPorUsuario.hinata, hasherCodigo.hash("333333"), "REGISTRO", futuro]
    );
    // gaara: código de RECUPERACION activo.
    await cliente.query(
      `insert into codigos_verificacion (usuario_id, codigo_hash, tipo, expira_en)
       values ($1,$2,$3::tipo_codigo,$4)`,
      [idPorUsuario.gaara, hasherCodigo.hash("222222"), "RECUPERACION", futuro]
    );

    // ---------- sesiones ----------
    const insertarSesion = (idUsuario, expira, revocada) =>
      cliente.query(
        `insert into sesiones (usuario_id, token_hash, ip, user_agent, expira_en, revocada_en)
         values ($1,$2,$3,$4,$5,$6)`,
        [idUsuario, token(), "127.0.0.1", "Seed/Demo", expira, revocada]
      );
    const enUnaHora = new Date(Date.now() + 60 * 60 * 1000);
    const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000);
    await insertarSesion(idPorUsuario.sasuke, enUnaHora, null);          // activa
    await insertarSesion(idPorUsuario.rocklee, enUnaHora, null);         // activa
    await insertarSesion(idPorUsuario.kakashi, enUnaHora, null);         // se revoca abajo
    await insertarSesion(idPorUsuario.sakura, enUnaHora, new Date());    // ya revocada
    await insertarSesion(idPorUsuario.hinata, haceUnaHora, null);        // vencida

    // ---------- AUDITORÍA por triggers ----------
    // 1) CAMBIO_PASSWORD + revoca sesiones de kakashi (dentro del SP atómico).
    await cliente.query("call sp_restablecer_password($1,$2)", [
      idPorUsuario.kakashi,
      hasherPassword.generarHash(CLAVE_DEMO),
    ]);
    // 2) CAMBIO_VERIFICACION (shikamaru pasa a verificado).
    await cliente.query(
      "update usuarios set correo_verificado = true, correo_verificado_en = now() where id = $1",
      [idPorUsuario.shikamaru]
    );
    // 3) CAMBIO_BLOQUEO (gaara queda bloqueado 1 día por intentos fallidos).
    await cliente.query(
      "update usuarios set intentos_fallidos = 5, bloqueado_hasta = now() + interval '1 day' where id = $1",
      [idPorUsuario.gaara]
    );

    // ---------- fn_confirmar_codigo (demostración) ----------
    const ok = await cliente.query("select fn_confirmar_codigo($1,$2,$3::tipo_codigo) as r", [
      idPorUsuario.gaara,
      hasherCodigo.hash("222222"),
      "RECUPERACION",
    ]);
    // Dejamos de nuevo un código de recuperación vigente para gaara.
    await cliente.query(
      `insert into codigos_verificacion (usuario_id, codigo_hash, tipo, expira_en)
       values ($1,$2,$3::tipo_codigo,$4)`,
      [idPorUsuario.gaara, hasherCodigo.hash("444444"), "RECUPERACION", futuro]
    );
    const malo = await cliente.query("select fn_confirmar_codigo($1,$2,$3::tipo_codigo) as r", [
      idPorUsuario.sasuke,
      "deadbeef",
      "REGISTRO",
    ]);

    await cliente.query("COMMIT");

    console.log("fn_confirmar_codigo(código bueno) =", ok.rows[0].r);
    console.log("fn_confirmar_codigo(código malo)  =", malo.rows[0].r);
    console.log("Seed aplicado. Cuentas demo: clave '" + CLAVE_DEMO + "' (correos " + DOMINIO_DEMO + ").");
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    await cliente.end();
  }

  // ---------- Verificación (contenido, no vacío) ----------
  const ver = new Client(config);
  await ver.connect();
  const tablas = ["usuarios", "partidas", "historial_partidas", "jugadores", "codigos_verificacion", "sesiones", "auditoria_cuentas"];
  const vistas = ["vw_partidas_recientes", "vw_historial_detallado", "vw_ranking_mejor_puntaje", "vw_usuarios_resumen", "vw_usuarios_seguro", "vw_sesiones_activas"];
  console.log("\n--- FILAS POR TABLA ---");
  for (const t of tablas) {
    const r = await ver.query("select count(*)::int n from " + t);
    console.log("  " + t.padEnd(22) + r.rows[0].n);
  }
  console.log("--- FILAS POR VISTA ---");
  for (const v of vistas) {
    const r = await ver.query("select count(*)::int n from " + v);
    console.log("  " + v.padEnd(26) + r.rows[0].n);
  }
  await ver.end();
}

main().catch((e) => {
  console.error("Error en seed-demo:", e.message);
  process.exit(1);
});
