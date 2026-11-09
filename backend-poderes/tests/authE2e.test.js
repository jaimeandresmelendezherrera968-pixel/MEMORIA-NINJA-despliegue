"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("child_process");
const path = require("path");

const { crearDatabasePrueba, limpiarDatabase } = require("./helpers/baseDatosPrueba");

/**
 * PRUEBA e2e REAL DEL MÓDULO DE AUTENTICACIÓN
 *
 * Levanta el servidor de verdad (server.js) como proceso hijo, señalando a
 * la base de datos de test (PGDATABASE_TEST), y recorre el flujo completo
 * con peticiones HTTP reales:
 *
 *   registro -> login bloqueado (sin verificar) -> confirmar código ->
 *   login + cookie httpOnly -> /me -> logout -> recuperación de clave.
 *
 * Los códigos de verificación se leen de la salida del servidor
 * (MAILER=consola los imprime como "... es: 123456"). El rate-limit se
 * desactiva (RATE_LIMIT_DESACTIVADO=1) para que repetir la suite no dé 429.
 *
 * Los `it` comparten estado y se ejecutan EN ORDEN: es un escenario, no
 * pruebas independientes.
 */

const PUERTO = Number(process.env.SERVER_PORT_E2E || 3099);
const BASE = `http://localhost:${PUERTO}`;
const USUARIO = "narutoTest";
const CORREO = "naruto@test.com";

let database;
let child;
let salidaServidor = "";

let token;
let codigoRegistro;
let codigoRecuperacion;

function pausa(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function codigosEnLog() {
  return (salidaServidor.match(/es:\s*(\d{6})/g) || []).map((m) => m.match(/(\d{6})/)[1]);
}

async function esperarCodigo(indice) {
  for (let i = 0; i < 60; i++) {
    const codigos = codigosEnLog();
    if (codigos.length > indice) return codigos[indice];
    await pausa(50);
  }
  return undefined;
}

async function esperarServidor(intentos = 60) {
  for (let i = 0; i < intentos; i++) {
    try {
      const res = await fetch(`${BASE}/api/estado`);
      if (res.ok) return;
    } catch {}
    await pausa(250);
  }
  throw new Error(`El servidor no arrancó a tiempo en ${BASE}. Salida:\n${salidaServidor}`);
}

function post(ruta, body, headers = {}) {
  return fetch(`${BASE}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

describe("Autenticación e2e (servidor real + PostgreSQL)", () => {
  before(async () => {
    database = crearDatabasePrueba();
    await database.init();
    await limpiarDatabase(database);

    child = spawn(process.execPath, ["server.js"], {
      cwd: path.join(__dirname, ".."),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      env: {
        ...process.env,
        PGDATABASE: process.env.PGDATABASE_TEST || "memoria_ninja_test",
        SERVER_PORT: String(PUERTO),
        MAILER: "consola",
        RATE_LIMIT_DESACTIVADO: "1",
      },
    });
    child.stdout.on("data", (d) => (salidaServidor += d.toString()));
    child.stderr.on("data", (d) => (salidaServidor += d.toString()));

    await esperarServidor();
  });

  after(async () => {
    if (child) {
      child.kill();
      await pausa(300);
    }
    if (database) {
      await limpiarDatabase(database);
      await database.close();
    }
  });

  it("1) registro responde 201 y la cuenta nace sin verificar", async () => {
    const res = await post("/api/auth/registro", {
      usuario: USUARIO,
      correo: CORREO,
      nacimiento: "2000-01-01",
      password: "clave123",
    });
    const body = await res.json();

    assert.equal(res.status, 201, JSON.stringify(body));
    assert.equal(body.usuario?.usuario, USUARIO);
    assert.equal(body.usuario?.correoVerificado, false, JSON.stringify(body));

    codigoRegistro = await esperarCodigo(0);
    assert.ok(codigoRegistro, "el servidor debió imprimir el código de verificación en consola");
  });

  it("2) login pre-verificación se bloquea con 403", async () => {
    const res = await post("/api/auth/login", { usuario: USUARIO, password: "clave123" });
    assert.equal(res.status, 403);
  });

  it("3) login con clave incorrecta responde 401", async () => {
    const res = await post("/api/auth/login", { usuario: USUARIO, password: "claveMAL" });
    assert.equal(res.status, 401);
  });

  it("4) confirmar con código incorrecto responde 400", async () => {
    const res = await post("/api/auth/verificacion/confirmar", { correo: CORREO, codigo: "000000" });
    assert.equal(res.status, 400);
  });

  it("5) confirmar con el código correcto responde 200", async () => {
    const res = await post("/api/auth/verificacion/confirmar", {
      correo: CORREO,
      codigo: codigoRegistro,
    });
    assert.equal(res.status, 200, await res.text());
  });

  it("6) login OK: 200 y cookie de sesión httpOnly", async () => {
    const res = await post("/api/auth/login", { usuario: USUARIO, password: "clave123" });
    const setCookie = res.headers.get("set-cookie") || "";
    token = setCookie.match(/memoria_ninja_sesion=([^;]+)/)?.[1];

    assert.equal(res.status, 200);
    assert.ok(token, `set-cookie sin token: ${setCookie}`);
    assert.match(setCookie, /HttpOnly/);
  });

  it("7) /api/auth/me con cookie devuelve el usuario", async () => {
    const res = await fetch(`${BASE}/api/auth/me`, {
      headers: { Cookie: `memoria_ninja_sesion=${token}` },
    });
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.equal(body.usuario?.usuario, USUARIO);
  });

  it("8) /api/auth/me sin cookie responde 401", async () => {
    const res = await fetch(`${BASE}/api/auth/me`);
    assert.equal(res.status, 401);
  });

  it("9) logout revoca la sesión (la cookie vieja deja de servir)", async () => {
    const res = await fetch(`${BASE}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: `memoria_ninja_sesion=${token}` },
    });
    assert.equal(res.status, 200);

    const res2 = await fetch(`${BASE}/api/auth/me`, {
      headers: { Cookie: `memoria_ninja_sesion=${token}` },
    });
    assert.equal(res2.status, 401);
  });

  it("10) recuperación: solicitar el código responde 200 y lo imprime", async () => {
    const res = await post("/api/auth/recuperacion/solicitar", { correo: CORREO });
    assert.equal(res.status, 200, await res.text());

    codigoRecuperacion = await esperarCodigo(1);
    assert.ok(codigoRecuperacion, "el servidor debió imprimir el código de recuperación");
  });

  it("11) recuperación: verificar rechaza el código malo y acepta el bueno", async () => {
    const malo = await post("/api/auth/recuperacion/verificar", { correo: CORREO, codigo: "000000" });
    assert.equal(malo.status, 400);

    const bueno = await post("/api/auth/recuperacion/verificar", {
      correo: CORREO,
      codigo: codigoRecuperacion,
    });
    assert.equal(bueno.status, 200, await bueno.text());
  });

  it("12) restablecer con el código válido responde 200", async () => {
    const res = await post("/api/auth/recuperacion/restablecer", {
      correo: CORREO,
      codigo: codigoRecuperacion,
      nuevaPassword: "nuevaClave456",
    });
    assert.equal(res.status, 200, await res.text());
  });

  it("13) login con la nueva clave funciona y revoca las sesiones anteriores", async () => {
    const res = await post("/api/auth/login", { usuario: USUARIO, password: "nuevaClave456" });
    assert.equal(res.status, 200, await res.text());

    const vieja = await fetch(`${BASE}/api/auth/me`, {
      headers: { Cookie: `memoria_ninja_sesion=${token}` },
    });
    assert.equal(vieja.status, 401, "la cookie emitida antes del cambio de clave debió quedar revocada");
  });
});
