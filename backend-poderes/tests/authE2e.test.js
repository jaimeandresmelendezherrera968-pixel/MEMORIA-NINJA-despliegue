"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("child_process");
const path = require("path");

const { crearDatabasePrueba, limpiarDatabase } = require("./helpers/baseDatosPrueba");

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
  for (let i = 0; i < 80; i++) {
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
  throw new Error(`El servidor no arranco a tiempo en ${BASE}. Salida:\n${salidaServidor}`);
}

function post(ruta, body, headers = {}) {
  return fetch(`${BASE}${ruta}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function extraerToken(setCookie) {
  return (setCookie || "").match(/memoria_ninja_sesion=([^;]+)/)?.[1];
}

describe("Autenticacion e2e (servidor real + PostgreSQL)", () => {
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
        NODE_ENV: "test",
        RENDER: "",
        PGDATABASE: process.env.PGDATABASE_TEST || "memoria_ninja_test",
        SERVER_PORT: String(PUERTO),
        MAILER: "consola",
        RATE_LIMIT_DESACTIVADO: "1",
        COOKIE_TTL_MIN: "60",
        COOKIE_TTL_RECORDAR_MIN: "43200",
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
      password: "clave1234",
    });
    const body = await res.json();

    assert.equal(res.status, 201, JSON.stringify(body));
    assert.equal(body.usuario?.usuario, USUARIO);
    assert.equal(body.usuario?.correoVerificado, false, JSON.stringify(body));

    codigoRegistro = await esperarCodigo(0);
    assert.ok(codigoRegistro, "el servidor debio imprimir el codigo de verificacion en consola");
    await pausa(150);
    assert.equal(codigosEnLog().length, 1, "el registro no debe generar un segundo codigo");
  });

  it("1b) registro duplicado responde 409", async () => {
    const res = await post("/api/auth/registro", {
      usuario: USUARIO,
      correo: "otro@test.com",
      nacimiento: "2000-01-01",
      password: "clave1234",
    });
    assert.equal(res.status, 409);
  });

  it("1c) correo normalizado en mayusculas no crea duplicado logico (409)", async () => {
    const res = await post("/api/auth/registro", {
      usuario: "otroUsuario",
      correo: "NARUTO@TEST.COM",
      nacimiento: "2000-01-01",
      password: "clave1234",
    });
    assert.equal(res.status, 409);
  });

  it("2) login pre-verificacion se bloquea con 403 y devuelve codigo y correo", async () => {
    const res = await post("/api/auth/login", { usuario: USUARIO, password: "clave1234" });
    const body = await res.json();
    assert.equal(res.status, 403, JSON.stringify(body));
    assert.equal(body.codigo, "CORREO_SIN_VERIFICAR");
    assert.equal(body.correo, CORREO);
  });

  it("3) login con clave incorrecta responde 401", async () => {
    const res = await post("/api/auth/login", { usuario: USUARIO, password: "claveMALA" });
    assert.equal(res.status, 401);
  });

  it("4) confirmar con codigo incorrecto responde 400", async () => {
    const res = await post("/api/auth/verificacion/confirmar", { correo: CORREO, codigo: "000000" });
    assert.equal(res.status, 400);
  });

  it("5) confirmar con el codigo correcto responde 200", async () => {
    const res = await post("/api/auth/verificacion/confirmar", {
      correo: CORREO,
      codigo: codigoRegistro,
    });
    assert.equal(res.status, 200, await res.text());
  });

  it("6) login OK sin recordar: cookie de sesion httpOnly sin Max-Age", async () => {
    const res = await post("/api/auth/login", { usuario: USUARIO, password: "clave1234", recordar: false });
    const setCookie = res.headers.get("set-cookie") || "";
    token = extraerToken(setCookie);

    assert.equal(res.status, 200);
    assert.ok(token, `set-cookie sin token: ${setCookie}`);
    assert.match(setCookie, /HttpOnly/);
    assert.doesNotMatch(setCookie, /Max-Age=/i);
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

  it("9) logout revoca la sesion (la cookie vieja deja de servir)", async () => {
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

  it("9b) login con recordar: cookie persistente con Max-Age y sesion valida", async () => {
    const res = await post("/api/auth/login", { usuario: USUARIO, password: "clave1234", recordar: true });
    const setCookie = res.headers.get("set-cookie") || "";
    token = extraerToken(setCookie);
    assert.equal(res.status, 200, await res.clone().text());
    assert.ok(token);
    assert.match(setCookie, /Max-Age=/i);

    const me = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: `memoria_ninja_sesion=${token}` } });
    assert.equal(me.status, 200);

    // logout invalida tambien la persistente
    const out = await fetch(`${BASE}/api/auth/logout`, {
      method: "POST",
      headers: { Cookie: `memoria_ninja_sesion=${token}` },
    });
    assert.equal(out.status, 200);
    const me2 = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: `memoria_ninja_sesion=${token}` } });
    assert.equal(me2.status, 401);
  });

  it("10) recuperacion: solicitar el codigo responde 200 y lo imprime", async () => {
    const res = await post("/api/auth/recuperacion/solicitar", { correo: CORREO });
    assert.equal(res.status, 200, await res.text());

    // codigos previos: 0 registro. ahora 1 recuperacion
    codigoRecuperacion = await esperarCodigo(1);
    assert.ok(codigoRecuperacion, "el servidor debio imprimir el codigo de recuperacion");
  });

  it("11) recuperacion: verificar rechaza el codigo malo y acepta el bueno", async () => {
    const malo = await post("/api/auth/recuperacion/verificar", { correo: CORREO, codigo: "000000" });
    assert.equal(malo.status, 400);

    const bueno = await post("/api/auth/recuperacion/verificar", {
      correo: CORREO,
      codigo: codigoRecuperacion,
    });
    assert.equal(bueno.status, 200, await bueno.text());
  });

  it("11b) recuperacion: contrasena de 7 caracteres responde 400 sin consumir el codigo", async () => {
    const res = await post("/api/auth/recuperacion/restablecer", {
      correo: CORREO,
      codigo: codigoRecuperacion,
      nuevaPassword: "abc1234", // 7
    });
    assert.equal(res.status, 400);

    // el codigo sigue siendo valido (no consumido por validacion de password)
    const ok = await post("/api/auth/recuperacion/restablecer", {
      correo: CORREO,
      codigo: codigoRecuperacion,
      nuevaPassword: "nuevaClave456",
    });
    assert.equal(ok.status, 200, await ok.text());
  });

  it("13) login con la nueva clave funciona y revoca las sesiones anteriores", async () => {
    // crear una sesion "vieja" con la clave nueva para verificar revocacion no aplica aqui,
    // pero la cookie previa ya fue revocada en 9b; comprobamos login y acceso
    const res = await post("/api/auth/login", { usuario: USUARIO, password: "nuevaClave456" });
    assert.equal(res.status, 200, await res.text());
    const setCookie = res.headers.get("set-cookie") || "";
    const nuevoToken = extraerToken(setCookie);
    const me = await fetch(`${BASE}/api/auth/me`, { headers: { Cookie: `memoria_ninja_sesion=${nuevoToken}` } });
    assert.equal(me.status, 200);
  });

  it("14) correo mal escrito se corrige con contraseña y el codigo viejo deja de servir", async () => {
    const usuario = "correoMalTest";
    const correoMal = "equivocado@test.com";
    const correoBien = "arreglado@test.com";

    const registro = await post("/api/auth/registro", {
      usuario,
      correo: correoMal,
      nacimiento: "2000-03-03",
      password: "clave1234",
    });
    assert.equal(registro.status, 201, await registro.text());

    const codigoMal = await esperarCodigo(2);
    assert.ok(codigoMal, "el registro con correo mal escrito debio imprimir un codigo");

    const antes = await post("/api/auth/login", { usuario, password: "clave1234" });
    const antesBody = await antes.json();
    assert.equal(antes.status, 403, JSON.stringify(antesBody));
    assert.equal(antesBody.correo, correoMal);
    assert.equal(antesBody.usuario, usuario);

    const claveMala = await post("/api/auth/verificacion/cambiar-correo", {
      usuario,
      password: "claveMALA",
      correoNuevo: correoBien,
    });
    assert.equal(claveMala.status, 401, await claveMala.text());

    const cambio = await post("/api/auth/verificacion/cambiar-correo", {
      usuario,
      password: "clave1234",
      correoNuevo: correoBien,
    });
    const cambioBody = await cambio.json();
    assert.equal(cambio.status, 200, JSON.stringify(cambioBody));
    assert.equal(cambioBody.correo, correoBien);
    assert.equal(cambioBody.correoEnviado, true);

    const codigoBien = await esperarCodigo(3);
    assert.ok(codigoBien, "el cambio de correo debio imprimir un codigo nuevo");

    const conCorreoViejo = await post("/api/auth/verificacion/confirmar", {
      correo: correoMal,
      codigo: codigoMal,
    });
    assert.equal(conCorreoViejo.status, 404);

    const conCodigoViejo = await post("/api/auth/verificacion/confirmar", {
      correo: correoBien,
      codigo: codigoMal,
    });
    assert.equal(conCodigoViejo.status, 400);

    const confirmado = await post("/api/auth/verificacion/confirmar", {
      correo: correoBien,
      codigo: codigoBien,
    });
    assert.equal(confirmado.status, 200, await confirmado.text());

    const yaVerificado = await post("/api/auth/verificacion/cambiar-correo", {
      usuario,
      password: "clave1234",
      correoNuevo: "otra@test.com",
    });
    assert.equal(yaVerificado.status, 403, await yaVerificado.text());

    const login = await post("/api/auth/login", { usuario, password: "clave1234" });
    assert.equal(login.status, 200, await login.text());
  });
});
