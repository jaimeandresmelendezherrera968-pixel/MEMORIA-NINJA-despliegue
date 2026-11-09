"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("child_process");
const http = require("node:http");
const path = require("path");

const { crearDatabasePrueba, limpiarDatabase } = require("./helpers/baseDatosPrueba");

/**
 * PRUEBA e2e DE AUTORIZACIÓN (Parte 4)
 *
 * Levanta el servidor de verdad contra la BD de test y verifica el
 * comportamiento del middleware de sesión (requiereSesion + esPropietario):
 *
 *   Públicas (sin sesión): estado, por-correo (registro), ranking, /auth/me.
 *   Protegidas (401 sin sesión): historial, perfil, importar, lista de
 *   usuarios, vistas internas, partida y poderes.
 *   Propia (200/201) vs ajena (403) en /usuarios/:id/*.
 *   CORS: allowlist por defecto vs origen rechazado.
 *
 * Dos cuentas reales (sakuraA y sakuraB) registradas y verificadas por el
 * MAILER=consola (códigos leídos de la salida del hijo).
 */

const PUERTO = Number(process.env.SERVER_PORT_AUTZ_E2E || 3107);
const BASE = `http://localhost:${PUERTO}`;

let database;
let child;
let salidaServidor = "";

let cuentaA;
let cuentaB;

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

function conCookie(ruta, token, opciones = {}) {
  return fetch(`${BASE}${ruta}`, {
    ...opciones,
    headers: { Cookie: `memoria_ninja_sesion=${token}`, ...(opciones.headers || {}) },
  });
}

function pedirConOrigin(ruta, origin) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      `${BASE}${ruta}`,
      { method: "GET", headers: { Origin: origin } },
      (res) => {
        res.resume();
        resolve({ status: res.statusCode, acao: res.headers["access-control-allow-origin"] });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function crearYLoguear(usuario, correo, indiceCodigo) {
  const registro = await post("/api/auth/registro", {
    usuario,
    correo,
    nacimiento: "2000-01-01",
    password: "clave123",
  });
  assert.equal(registro.status, 201, await registro.text());

  const codigo = await esperarCodigo(indiceCodigo);
  assert.ok(codigo, "el servidor debió imprimir el código de verificación en consola");

  const confirmar = await post("/api/auth/verificacion/confirmar", { correo, codigo });
  assert.equal(confirmar.status, 200, await confirmar.text());

  const login = await post("/api/auth/login", { usuario, password: "clave123" });
  assert.equal(login.status, 200, await login.text());
  const setCookie = login.headers.get("set-cookie") || "";
  const token = setCookie.match(/memoria_ninja_sesion=([^;]+)/)?.[1];
  assert.ok(token, `set-cookie sin token: ${setCookie}`);

  const me = await fetch(`${BASE}/api/auth/me`, {
    headers: { Cookie: `memoria_ninja_sesion=${token}` },
  });
  const bodyMe = await me.json();
  assert.equal(me.status, 200, JSON.stringify(bodyMe));
  return { token, id: bodyMe.usuario.id, correo };
}

describe("Autorización e2e (Parte 4 — middleware de sesión)", () => {
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
    cuentaA = await crearYLoguear("sakuraA", "sakuraA@test.com", 0);
    cuentaB = await crearYLoguear("sakuraB", "sakuraB@test.com", 1);
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

  it("P1) /api/estado sigue público (health check)", async () => {
    const res = await fetch(`${BASE}/api/estado`);
    assert.equal(res.status, 200);
  });

  it("P2) /api/auth/me sin cookie sigue respondiendo 401 (es el flujo de invitado)", async () => {
    const res = await fetch(`${BASE}/api/auth/me`);
    assert.equal(res.status, 401);
  });

  it("P3) GET /usuarios/por-correo sigue público (lo usa el registro sin sesión)", async () => {
    const res = await fetch(`${BASE}/api/usuarios/por-correo/${encodeURIComponent(cuentaA.correo)}`);
    assert.equal(res.status, 200, await res.text());
  });

  it("P4) GET /vistas/ranking sigue público (el menú lo muestra sin cuenta)", async () => {
    const res = await fetch(`${BASE}/api/vistas/ranking`);
    assert.equal(res.status, 200, await res.text());
  });

  it("G1) historial GET sin sesión -> 401", async () => {
    const res = await fetch(`${BASE}/api/usuarios/${cuentaA.id}/historial`);
    assert.equal(res.status, 401);
  });

  it("G2) historial POST sin sesión -> 401", async () => {
    const res = await post(`/api/usuarios/${cuentaA.id}/historial`, {
      idPartida: "sin-sesion-1",
      zona: "uzumaki",
      puntaje: 100,
      modo: "1",
      ganador: "sakuraA",
    });
    assert.equal(res.status, 401);
  });

  it("G3) perfil GET sin sesión -> 401", async () => {
    const res = await fetch(`${BASE}/api/usuarios/${cuentaA.id}/perfil`);
    assert.equal(res.status, 401);
  });

  it("G4) importar sin sesión -> 401", async () => {
    const res = await post(`/api/usuarios/${cuentaA.id}/importar`, { historial: [], perfil: null });
    assert.equal(res.status, 401);
  });

  it("G5) lista de usuarios sin sesión -> 401 (expone correos)", async () => {
    const res = await fetch(`${BASE}/api/usuarios`);
    assert.equal(res.status, 401);
  });

  it("G6) vistas internas sin sesión -> 401 (historial-detallado)", async () => {
    const res = await fetch(`${BASE}/api/vistas/historial-detallado`);
    assert.equal(res.status, 401);
  });

  it("G7) POST /partida sin sesión -> 401 (el invitado juega con el simulador)", async () => {
    const res = await post("/api/partida", {
      jugadores: ["a", "b"],
      chakraInicial: 50,
    });
    assert.equal(res.status, 401);
  });

  it("G8) POST /poder/activar sin sesión -> 401", async () => {
    const res = await post("/api/poder/activar", {
      idPartida: "x",
      idJugador: "a",
      idPoder: "robo",
    });
    assert.equal(res.status, 401);
  });

  it("O1) historial GET con cookie propia -> 200", async () => {
    const res = await conCookie(`/api/usuarios/${cuentaA.id}/historial`, cuentaA.token);
    assert.equal(res.status, 200, await res.text());
  });

  it("O2) historial POST con cookie propia -> 201", async () => {
    const res = await conCookie(`/api/usuarios/${cuentaA.id}/historial`, cuentaA.token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idPartida: "propietario-1",
        zona: "uzumaki",
        puntaje: 200,
        modo: "1",
        ganador: "sakuraA",
      }),
    });
    assert.equal(res.status, 201, await res.text());
  });

  it("O3) historial GET con cookie ajena -> 403", async () => {
    const res = await conCookie(`/api/usuarios/${cuentaA.id}/historial`, cuentaB.token);
    assert.equal(res.status, 403);
  });

  it("O4) perfil: POST propio -> 200 (XP real), GET ajeno -> 403", async () => {
    const postPropio = await conCookie(`/api/usuarios/${cuentaA.id}/perfil`, cuentaA.token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ victoria: true, puntaje: 250 }),
    });
    const cuerpo = await postPropio.json();
    assert.equal(postPropio.status, 200, JSON.stringify(cuerpo));
    assert.equal(cuerpo.perfil.xp, 600);

    const getAjeno = await conCookie(`/api/usuarios/${cuentaA.id}/perfil`, cuentaB.token);
    assert.equal(getAjeno.status, 403);
  });

  it("O5) importar: propio -> 201, ajeno -> 403", async () => {
    const propio = await conCookie(`/api/usuarios/${cuentaA.id}/importar`, cuentaA.token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historial: [], perfil: null }),
    });
    assert.equal(propio.status, 201, await propio.text());

    const ajeno = await conCookie(`/api/usuarios/${cuentaA.id}/importar`, cuentaB.token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ historial: [], perfil: null }),
    });
    assert.equal(ajeno.status, 403);
  });

  it("O6) POST /partida con cookie propia -> 201 (el motor online real funciona)", async () => {
    const res = await conCookie("/api/partida", cuentaA.token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idJugador1: cuentaA.id,
        nombre1: "sakuraA",
        idJugador2: cuentaB.id,
        nombre2: "sakuraB",
        chakraInicial1: 50,
        chakraInicial2: 50,
      }),
    });
    assert.equal(res.status, 201, await res.text());
  });

  it("O7) POST /poder/activar con cookie propia pasa el middleware (400 de negocio, no 401)", async () => {
    const res = await conCookie("/api/poder/activar", cuentaA.token, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idPartida: "no-existe", idJugador: "sakuraA", idPoder: "robo" }),
    });
    assert.equal(res.status, 400, await res.text());
  });

  it("C1) CORS: origen de la allowlist recibe cabecera; origen ajeno no", async () => {
    const permitido = await pedirConOrigin("/api/estado", "http://localhost:3000");
    assert.equal(permitido.acao, "http://localhost:3000");

    const rechazado = await pedirConOrigin("/api/estado", "http://malicioso.example");
    assert.equal(rechazado.acao, undefined);
  });
});
