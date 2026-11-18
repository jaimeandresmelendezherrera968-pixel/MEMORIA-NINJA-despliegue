"use strict";

const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { spawn } = require("child_process");
const crypto = require("crypto");
const path = require("path");
const { io: conectarIo } = require("socket.io-client");

const PasswordHasher = require("../src/infraestructura/PasswordHasher");
const UsuarioRepositorySQL = require("../src/repositories/UsuarioRepositorySQL");
const HistorialPartidaRepositorySQL = require("../src/repositories/HistorialPartidaRepositorySQL");
const UsuarioService = require("../src/services/UsuarioService");
const { crearDatabasePrueba, limpiarDatabase } = require("./helpers/baseDatosPrueba");

const PUERTO = Number(process.env.SERVER_PORT_AMISTADES_E2E || 3113);
const BASE = `http://localhost:${PUERTO}`;

let database;
let child;
let salidaServidor = "";
let cuentas;
let tokens;
let sockets = [];

function pausa(ms) {
  return new Promise((resolver) => setTimeout(resolver, ms));
}

async function verificar(respuesta, estado) {
  const texto = await respuesta.text();
  assert.equal(respuesta.status, estado, texto);
  return texto ? JSON.parse(texto) : null;
}

async function esperarServidor() {
  for (let intento = 0; intento < 80; intento++) {
    try {
      const respuesta = await fetch(`${BASE}/api/estado`);
      if (respuesta.ok) return;
    } catch {}
    await pausa(250);
  }
  throw new Error(`El servidor no arrancó en ${BASE}. Salida:\n${salidaServidor}`);
}

function pedir(ruta, token, opciones = {}) {
  return fetch(`${BASE}${ruta}`, {
    ...opciones,
    headers: {
      ...(opciones.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Cookie: `memoria_ninja_sesion=${token}` } : {}),
      ...(opciones.headers || {}),
    },
  });
}

async function iniciarSesion(usuario) {
  const respuesta = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, password: "clave123" }),
  });
  const cuerpo = await verificar(respuesta, 200);
  const token = (respuesta.headers.get("set-cookie") || "").match(
    /memoria_ninja_sesion=([^;]+)/
  )?.[1];
  assert.ok(token, `sin token de sesión para ${usuario}`);
  return { token, id: cuerpo.usuario.id };
}

function abrirSocket(token) {
  return new Promise((resolver, rechazar) => {
    const socket = conectarIo(BASE, {
      transports: ["websocket"],
      auth: { token: crypto.randomUUID() },
      extraHeaders: { Cookie: `memoria_ninja_sesion=${token}` },
      reconnection: false,
      timeout: 4000,
    });
    socket.once("connect", () => resolver(socket));
    socket.once("connect_error", rechazar);
  });
}

function esperarEvento(socket, evento, ms = 4000) {
  return new Promise((resolver, rechazar) => {
    const temporizador = setTimeout(() => {
      socket.off(evento, manejador);
      rechazar(new Error(`no llegó el evento ${evento}`));
    }, ms);
    function manejador(datos) {
      clearTimeout(temporizador);
      socket.off(evento, manejador);
      resolver(datos);
    }
    socket.on(evento, manejador);
  });
}

function emitirSocket(socket, evento, datos = {}, ms = 4000) {
  return new Promise((resolver, rechazar) => {
    const temporizador = setTimeout(() => {
      rechazar(new Error(`sin respuesta para ${evento}`));
    }, ms);
    socket.emit(evento, datos, (respuesta) => {
      clearTimeout(temporizador);
      resolver(respuesta);
    });
  });
}

describe("Amistades e2e (HTTP + Socket.io)", () => {
  before(async () => {
    database = crearDatabasePrueba();
    await database.init();
    await limpiarDatabase(database);

    const usuarioRepository = new UsuarioRepositorySQL(database);
    const historialRepository = new HistorialPartidaRepositorySQL(database);
    const usuarioService = new UsuarioService(
      usuarioRepository,
      historialRepository,
      new PasswordHasher()
    );
    cuentas = {};
    for (const nombre of ["narutoE2e", "sasukeE2e", "sakuraE2e"]) {
      const cuenta = await usuarioService.registrar({
        usuario: nombre,
        correo: `${nombre}@amistades.test`,
        password: "clave123",
      });
      await usuarioRepository.marcarCorreoVerificado(cuenta.id);
      cuentas[nombre] = cuenta;
    }

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
        SERVIR_FRONTEND: "0",
      },
    });
    child.stdout.on("data", (d) => (salidaServidor += d.toString()));
    child.stderr.on("data", (d) => (salidaServidor += d.toString()));
    await esperarServidor();

    tokens = {
      naruto: await iniciarSesion("narutoE2e"),
      sasuke: await iniciarSesion("sasukeE2e"),
      sakura: await iniciarSesion("sakuraE2e"),
    };
  });

  after(async () => {
    for (const socket of sockets) socket.disconnect();
    if (child) {
      child.kill();
      await pausa(300);
    }
    if (database) {
      await limpiarDatabase(database);
      await database.close();
    }
  });

  it("exige sesión para las rutas de amistades", async () => {
    await verificar(await pedir("/api/amistades/resumen"), 401);
    await verificar(await pedir("/api/amistades/buscar?q=naruto"), 401);
  });

  it("busca, solicita, notifica, acepta, renombra y elimina por HTTP", async () => {
    const tokenA = tokens.naruto.token;
    const tokenB = tokens.sasuke.token;
    const tokenC = tokens.sakura.token;
    const a = cuentas.narutoE2e;
    const b = cuentas.sasukeE2e;
    const c = cuentas.sakuraE2e;

    const socketA = await abrirSocket(tokenA);
    const socketB = await abrirSocket(tokenB);
    sockets.push(socketA, socketB);
    await pausa(300);

    const buscado = await verificar(
      await pedir(`/api/amistades/buscar?q=${encodeURIComponent(b.codigoAmigo.toLowerCase())}`, tokenA),
      200
    );
    assert.equal(buscado.usuarios.length, 1);
    assert.equal(buscado.usuarios[0].id, b.id);

    const recibida = esperarEvento(socketB, "amigos:solicitud-recibida");
    const enviada = await verificar(
      await pedir("/api/amistades/solicitudes", tokenA, {
        method: "POST",
        body: JSON.stringify({ termino: b.usuario.toUpperCase() }),
      }),
      201
    );
    const notificacion = await recibida;
    assert.equal(enviada.solicitud.id, notificacion.id);
    assert.equal(notificacion.emisor.codigoAmigo, a.codigoAmigo);

    const resumenB = await verificar(await pedir("/api/amistades/resumen", tokenB), 200);
    assert.equal(resumenB.perfil.codigoAmigo, b.codigoAmigo);
    assert.equal(resumenB.solicitudesRecibidas.length, 1);

    const ajena = await verificar(
      await pedir(`/api/amistades/solicitudes/${enviada.solicitud.id}/aceptar`, tokenC, {
        method: "POST",
      }),
      403
    );
    assert.equal(ajena.codigo, "NO_AUTORIZADO");

    const respondida = esperarEvento(socketA, "amigos:solicitud-respondida");
    const aceptada = await verificar(
      await pedir(`/api/amistades/solicitudes/${enviada.solicitud.id}/aceptar`, tokenB, {
        method: "POST",
      }),
      200
    );
    const eventoRespuesta = await respondida;
    assert.equal(eventoRespuesta.estado, "ACEPTADA");
    assert.equal(eventoRespuesta.por.usuario, b.usuario);
    assert.equal(aceptada.amistad.usuarioId, [a.id, b.id].sort()[0]);

    const resumenA = await verificar(await pedir("/api/amistades/resumen", tokenA), 200);
    assert.equal(resumenA.amigos.length, 1);
    assert.equal(resumenA.amigos[0].usuario, b.usuario);
    assert.equal(resumenA.amigos[0].codigoAmigo, b.codigoAmigo);

    const renombrado = await verificar(
      await pedir(`/api/usuarios/${b.id}/nombre`, tokenB, {
        method: "PATCH",
        body: JSON.stringify({ nombre: "sasukeNuevo" }),
      }),
      200
    );
    assert.equal(renombrado.perfil.codigoAmigo, b.codigoAmigo);

    const duplicado = await verificar(
      await pedir(`/api/usuarios/${c.id}/nombre`, tokenC, {
        method: "PATCH",
        body: JSON.stringify({ nombre: "SASUKENUEVO" }),
      }),
      409
    );
    assert.equal(duplicado.codigo, "USUARIO_DUPLICADO");

    const resumenRenombrado = await verificar(await pedir("/api/amistades/resumen", tokenA), 200);
    assert.equal(resumenRenombrado.amigos[0].usuario, "sasukeNuevo");
    assert.equal(resumenRenombrado.amigos[0].codigoAmigo, b.codigoAmigo);

    await verificar(await pedir(`/api/amistades/${b.id}`, tokenA, { method: "DELETE" }), 200);
    const resumenFinalA = await verificar(await pedir("/api/amistades/resumen", tokenA), 200);
    const resumenFinalB = await verificar(await pedir("/api/amistades/resumen", tokenB), 200);
    assert.equal(resumenFinalA.amigos.length, 0);
    assert.equal(resumenFinalB.amigos.length, 0);
  });

  it("notifica presencia, invita a una sala, cancela solicitudes y bloquea por HTTP", async () => {
    const tokenA = tokens.naruto.token;
    const tokenB = tokens.sasuke.token;
    const tokenC = tokens.sakura.token;
    const a = cuentas.narutoE2e;
    const b = cuentas.sasukeE2e;
    const c = cuentas.sakuraE2e;

    const solicitud = await verificar(
      await pedir("/api/amistades/solicitudes", tokenA, {
        method: "POST",
        body: JSON.stringify({ termino: "sasukeNuevo" }),
      }),
      201
    );
    await verificar(
      await pedir(`/api/amistades/solicitudes/${solicitud.solicitud.id}/aceptar`, tokenB, {
        method: "POST",
      }),
      200
    );

    const socketA = await abrirSocket(tokenA);
    sockets.push(socketA);
    const presencia = esperarEvento(socketA, "amigos:presencia");
    const socketB = await abrirSocket(tokenB);
    sockets.push(socketB);
    const eventoPresencia = await presencia;
    assert.equal(eventoPresencia.idUsuario, b.id);
    assert.equal(eventoPresencia.estado, "online");

    const sala = await emitirSocket(socketA, "crear-sala", {
      nombre: "Invitador",
      config: { modo: "1v1" },
    });
    assert.equal(sala.exito, true);

    const invitacionRecibida = esperarEvento(socketB, "amigos:invitacion-recibida");
    const invitacionEnviada = await emitirSocket(socketA, "amigos:invitar-partida", {
      idAmigo: b.id,
      codigoSala: sala.codigo,
    });
    assert.equal(invitacionEnviada.exito, true);
    const invitacion = await invitacionRecibida;
    assert.equal(invitacion.emisorId, a.id);
    assert.equal(invitacion.codigoSala, sala.codigo);

    const aceptada = esperarEvento(socketA, "amigos:invitacion-aceptada");
    const respuesta = await emitirSocket(socketB, "amigos:responder-invitacion", {
      id: invitacion.id,
      aceptar: true,
    });
    assert.equal(respuesta.codigoSala, sala.codigo);
    assert.equal((await aceptada).usuarioId, b.id);

    const pendiente = await verificar(
      await pedir("/api/amistades/solicitudes", tokenA, {
        method: "POST",
        body: JSON.stringify({ termino: c.usuario }),
      }),
      201
    );
    const socketC = await abrirSocket(tokenC);
    sockets.push(socketC);
    const cancelacion = esperarEvento(socketC, "amigos:solicitud-cancelada");
    await verificar(
      await pedir(`/api/amistades/solicitudes/${pendiente.solicitud.id}`, tokenA, {
        method: "DELETE",
      }),
      200
    );
    assert.equal((await cancelacion).solicitudId, pendiente.solicitud.id);

    const bloqueo = await verificar(
      await pedir(`/api/amistades/bloqueos/${b.id}`, tokenA, { method: "POST" }),
      200
    );
    assert.equal(bloqueo.bloqueado, true);
    const resumenBloqueado = await verificar(await pedir("/api/amistades/resumen", tokenA), 200);
    assert.equal(resumenBloqueado.amigos.length, 0);
    assert.equal(resumenBloqueado.bloqueados.length, 1);
    const oculto = await verificar(
      await pedir(`/api/amistades/buscar?q=${encodeURIComponent("sasukeNuevo")}`, tokenA),
      200
    );
    assert.equal(oculto.usuarios.length, 0);
    const visibleParaOtro = await verificar(
      await pedir(`/api/amistades/buscar?q=${encodeURIComponent("sasukeNuevo")}`, tokenC),
      200
    );
    assert.equal(visibleParaOtro.usuarios.length, 1);

    await verificar(
      await pedir(`/api/amistades/bloqueos/${b.id}`, tokenA, { method: "DELETE" }),
      200
    );
    const visibleOtraVez = await verificar(
      await pedir(`/api/amistades/buscar?q=${encodeURIComponent("sasukeNuevo")}`, tokenA),
      200
    );
    assert.equal(visibleOtraVez.usuarios.length, 1);
  });
});
