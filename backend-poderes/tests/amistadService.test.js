const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const PasswordHasher = require("../src/infraestructura/PasswordHasher");
const UsuarioRepositorySQL = require("../src/repositories/UsuarioRepositorySQL");
const AmistadRepositorySQL = require("../src/repositories/AmistadRepositorySQL");
const HistorialPartidaRepositorySQL = require("../src/repositories/HistorialPartidaRepositorySQL");
const UsuarioService = require("../src/services/UsuarioService");
const AmistadService = require("../src/services/AmistadService");
const { crearDatabasePrueba, limpiarDatabase } = require("./helpers/baseDatosPrueba");

let database;

before(async () => {
  database = crearDatabasePrueba();
  await database.init();
});

after(async () => {
  await database.close();
});

async function codigoDeError(fn) {
  try {
    await fn();
    return null;
  } catch (error) {
    return error.codigo;
  }
}

async function crearContexto() {
  await limpiarDatabase(database);
  const usuarioRepository = new UsuarioRepositorySQL(database);
  const amistadRepository = new AmistadRepositorySQL(database);
  const historialRepository = new HistorialPartidaRepositorySQL(database);
  const passwordHasher = new PasswordHasher();
  const usuarioService = new UsuarioService(
    usuarioRepository,
    historialRepository,
    passwordHasher,
    database
  );
  const notificador = {
    eventos: [],
    notificarSolicitud(idReceptor, payload) {
      this.eventos.push({ tipo: "solicitud", idReceptor, payload });
    },
    notificarRespuesta(idEmisor, payload) {
      this.eventos.push({ tipo: "respuesta", idEmisor, payload });
    },
    notificarSolicitudCancelada(idReceptor, payload) {
      this.eventos.push({ tipo: "cancelada", idReceptor, payload });
    },
    notificarCambio(ids) {
      this.eventos.push({ tipo: "cambio", ids });
    },
    async presenciaDeAmigos(ids) {
      return Object.fromEntries(ids.map((id) => [id, "online"]));
    },
  };
  const amistadService = new AmistadService(
    amistadRepository,
    usuarioRepository,
    database,
    notificador
  );

  const a = await usuarioService.registrar({
    usuario: "naruto",
    correo: "naruto@konoha.test",
    password: "clave123",
  });
  const b = await usuarioService.registrar({
    usuario: "sasuke",
    correo: "sasuke@konoha.test",
    password: "clave123",
  });
  const c = await usuarioService.registrar({
    usuario: "sakura",
    correo: "sakura@konoha.test",
    password: "clave123",
  });

  return { usuarioService, amistadService, amistadRepository, notificador, a, b, c };
}

describe("AmistadService con repositorios SQL", () => {
  it("busca por nombre y por código de amigo sin distinción de mayúsculas", async () => {
    const { amistadService, a } = await crearContexto();

    const porNombre = await amistadService.buscar("  NARUTO  ");
    const porCodigo = await amistadService.buscar(a.codigoAmigo.toLowerCase());

    assert.deepEqual(porNombre, [{ id: a.id, usuario: a.usuario, codigoAmigo: a.codigoAmigo }]);
    assert.deepEqual(porCodigo, porNombre);
    assert.deepEqual(await amistadService.buscar("   "), []);
  });

  it("envía una solicitud, notifica al receptor y rechaza el duplicado inverso", async () => {
    const { amistadService, notificador, a, b } = await crearContexto();

    const enviada = await amistadService.enviarSolicitud({
      emisorId: a.id,
      termino: b.codigoAmigo.toLowerCase(),
    });
    assert.equal(enviada.solicitud.emisorId, a.id);
    assert.equal(enviada.solicitud.receptorId, b.id);
    assert.equal(enviada.solicitud.estado, "PENDIENTE");

    const evento = notificador.eventos.find((e) => e.tipo === "solicitud");
    assert.equal(evento.idReceptor, b.id);
    assert.deepEqual(evento.payload.emisor, {
      id: a.id,
      usuario: a.usuario,
      codigoAmigo: a.codigoAmigo,
    });

    assert.equal(
      await codigoDeError(() =>
        amistadService.enviarSolicitud({ emisorId: b.id, termino: a.usuario })
      ),
      "SOLICITUD_PENDIENTE"
    );
    assert.equal(
      await codigoDeError(() =>
        amistadService.enviarSolicitud({ emisorId: a.id, termino: a.usuario })
      ),
      "VALIDACION"
    );
  });

  it("acepta solo el receptor, crea la amistad y la muestra para ambos", async () => {
    const { amistadService, notificador, a, b, c } = await crearContexto();
    const enviada = await amistadService.enviarSolicitud({
      emisorId: a.id,
      termino: b.usuario.toUpperCase(),
    });
    const solicitudId = enviada.solicitud.id;

    assert.equal(
      await codigoDeError(() =>
        amistadService.aceptar({ usuarioId: c.id, solicitudId })
      ),
      "NO_AUTORIZADO"
    );

    const aceptada = await amistadService.aceptar({ usuarioId: b.id, solicitudId });
    assert.equal(aceptada.solicitud.estado, "ACEPTADA");
    assert.equal(aceptada.amistad.usuarioId, [a.id, b.id].sort()[0]);
    assert.equal(aceptada.amistad.amigoId, [a.id, b.id].sort()[1]);

    const respuesta = notificador.eventos.find((e) => e.tipo === "respuesta");
    assert.equal(respuesta.idEmisor, a.id);
    assert.deepEqual(respuesta.payload, {
      solicitudId,
      estado: "ACEPTADA",
      por: { id: b.id, usuario: b.usuario, codigoAmigo: b.codigoAmigo },
    });

    const resumenA = await amistadService.resumen(a.id);
    const resumenB = await amistadService.resumen(b.id);
    assert.equal(resumenA.amigos.length, 1);
    assert.equal(resumenB.amigos.length, 1);
    assert.equal(resumenA.amigos[0].id, b.id);
    assert.equal(resumenB.amigos[0].id, a.id);
    assert.equal(resumenA.amigos[0].codigoAmigo, b.codigoAmigo);
    assert.equal(resumenA.solicitudesRecibidas.length, 0);
    assert.equal(resumenB.solicitudesEnviadas.length, 0);

    assert.equal(
      await codigoDeError(() =>
        amistadService.aceptar({ usuarioId: b.id, solicitudId })
      ),
      "SOLICITUD_YA_RESPONDIDA"
    );
    assert.equal(
      await codigoDeError(() =>
        amistadService.enviarSolicitud({ emisorId: a.id, termino: b.codigoAmigo })
      ),
      "YA_AMIGOS"
    );
  });

  it("rechaza una solicitud sin crear amistad", async () => {
    const { amistadService, notificador, a, c } = await crearContexto();
    const enviada = await amistadService.enviarSolicitud({
      emisorId: a.id,
      termino: c.usuario,
    });

    const rechazada = await amistadService.rechazar({
      usuarioId: c.id,
      solicitudId: enviada.solicitud.id,
    });
    assert.equal(rechazada.solicitud.estado, "RECHAZADA");
    assert.equal(rechazada.amistad, null);

    const resumenA = await amistadService.resumen(a.id);
    const resumenC = await amistadService.resumen(c.id);
    assert.equal(resumenA.amigos.length, 0);
    assert.equal(resumenC.amigos.length, 0);
    assert.equal(resumenA.solicitudesEnviadas.length, 0);
    assert.equal(resumenC.solicitudesRecibidas.length, 0);

    const respuesta = notificador.eventos.find((e) => e.tipo === "respuesta");
    assert.deepEqual(respuesta.payload.estado, "RECHAZADA");
  });

  it("elimina una amistad solo si el usuario es parte del par", async () => {
    const { amistadService, a, b, c } = await crearContexto();
    const enviada = await amistadService.enviarSolicitud({
      emisorId: a.id,
      termino: b.usuario,
    });
    const aceptada = await amistadService.aceptar({
      usuarioId: b.id,
      solicitudId: enviada.solicitud.id,
    });

    const eliminada = await amistadService.eliminarAmistad({
      usuarioId: a.id,
      idAmigo: b.id,
    });
    assert.deepEqual(eliminada, { eliminada: true });

    assert.equal((await amistadService.resumen(a.id)).amigos.length, 0);
    assert.equal((await amistadService.resumen(b.id)).amigos.length, 0);
    assert.equal(aceptada.amistad.usuarioId < aceptada.amistad.amigoId, true);
    assert.equal(
      await codigoDeError(() =>
        amistadService.eliminarAmistad({ usuarioId: c.id, idAmigo: a.id })
      ),
      "NO_ENCONTRADO"
    );
  });

  it("cambiar el nombre conserva el código y se refleja en los listados", async () => {
    const { usuarioService, amistadService, a, b } = await crearContexto();
    const enviada = await amistadService.enviarSolicitud({
      emisorId: a.id,
      termino: b.usuario,
    });
    await amistadService.aceptar({ usuarioId: b.id, solicitudId: enviada.solicitud.id });

    const codigoAntes = b.codigoAmigo;
    const perfil = await usuarioService.cambiarNombre(b.id, "Sasuke-Nuevo");
    assert.equal(perfil.usuario, "Sasuke-Nuevo");
    assert.equal(perfil.codigoAmigo, codigoAntes);

    const resumenA = await amistadService.resumen(a.id);
    assert.equal(resumenA.amigos[0].usuario, "Sasuke-Nuevo");
    assert.equal(resumenA.amigos[0].codigoAmigo, codigoAntes);
    assert.equal((await amistadService.perfil(b.id)).codigoAmigo, codigoAntes);

    const delCambio = await amistadService.buscar("sasuke-nuevo");
    assert.equal(delCambio[0].id, b.id);
    assert.deepEqual(await amistadService.buscar(codigoAntes.toLowerCase()), delCambio);
  });

  it("envía la solicitud al nombre exacto aunque otro usuario comparta el prefijo", async () => {
    const { usuarioService, amistadService, a, b } = await crearContexto();
    await usuarioService.registrar({
      usuario: "sasuke_legendario",
      correo: "sasuke-l@konoha.test",
      password: "clave123",
    });

    const enviada = await amistadService.enviarSolicitud({
      emisorId: a.id,
      termino: b.usuario.toUpperCase(),
    });

    assert.equal(enviada.solicitud.receptorId, b.id);
    assert.equal(enviada.receptor.codigoAmigo, b.codigoAmigo);
    assert.equal(
      await codigoDeError(() =>
        amistadService.enviarSolicitud({ emisorId: a.id, termino: "sasuke" })
      ),
      "SOLICITUD_PENDIENTE"
    );
  });

  it("no permite responder dos veces la misma solicitud en paralelo", async () => {
    const { amistadService, a, b } = await crearContexto();
    const enviada = await amistadService.enviarSolicitud({
      emisorId: a.id,
      termino: b.codigoAmigo,
    });

    const resultados = await Promise.allSettled([
      amistadService.aceptar({ usuarioId: b.id, solicitudId: enviada.solicitud.id }),
      amistadService.rechazar({ usuarioId: b.id, solicitudId: enviada.solicitud.id }),
    ]);

    assert.equal(resultados.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(resultados.filter((r) => r.status === "rejected").length, 1);
    assert.equal(
      resultados.find((r) => r.status === "rejected")?.reason?.codigo,
      "SOLICITUD_YA_RESPONDIDA"
    );
    assert.equal((await amistadService.resumen(a.id)).amigos.length <= 1, true);
  });

  it("busca también por ID de usuario exacto", async () => {
    const { amistadService, b } = await crearContexto();
    const resultados = await amistadService.buscar(String(b.id));
    assert.deepEqual(resultados, [{ id: b.id, usuario: b.usuario, codigoAmigo: b.codigoAmigo }]);
  });

  it("cancela una solicitud enviada y avisa al receptor", async () => {
    const { amistadService, notificador, a, b } = await crearContexto();
    const enviada = await amistadService.enviarSolicitud({
      emisorId: a.id,
      termino: b.codigoAmigo,
    });

    assert.equal(
      await codigoDeError(() =>
        amistadService.cancelarSolicitud({ usuarioId: b.id, solicitudId: enviada.solicitud.id })
      ),
      "NO_AUTORIZADO"
    );

    const cancelada = await amistadService.cancelarSolicitud({
      usuarioId: a.id,
      solicitudId: enviada.solicitud.id,
    });
    assert.equal(cancelada.cancelada, true);
    assert.equal((await amistadService.resumen(a.id)).solicitudesEnviadas.length, 0);
    assert.equal((await amistadService.resumen(b.id)).solicitudesRecibidas.length, 0);
    assert.equal(notificador.eventos.some((evento) => evento.tipo === "cancelada"), true);
  });

  it("bloquear elimina amistad y solicitudes, oculta al usuario y se puede desbloquear", async () => {
    const { amistadService, a, b, c } = await crearContexto();
    const enviada = await amistadService.enviarSolicitud({
      emisorId: a.id,
      termino: b.codigoAmigo,
    });
    await amistadService.aceptar({ usuarioId: b.id, solicitudId: enviada.solicitud.id });
    assert.equal((await amistadService.resumen(a.id)).amigos.length, 1);

    await amistadService.bloquear({ usuarioId: a.id, idUsuario: b.id });
    const resumen = await amistadService.resumen(a.id);
    assert.equal(resumen.amigos.length, 0);
    assert.equal(resumen.bloqueados.length, 1);
    assert.equal(resumen.bloqueados[0].id, b.id);
    assert.deepEqual(await amistadService.buscar("sasuke", a.id), []);
    assert.equal((await amistadService.buscar("sasuke", c.id)).length, 1);

    await amistadService.desbloquear({ usuarioId: a.id, idUsuario: b.id });
    assert.equal((await amistadService.resumen(a.id)).bloqueados.length, 0);
    assert.equal((await amistadService.buscar("sasuke", a.id)).length, 1);
  });

  it("bloquear descarta solicitudes pendientes en cualquier dirección", async () => {
    const { amistadRepository, amistadService, a, b } = await crearContexto();
    await amistadService.enviarSolicitud({ emisorId: b.id, termino: a.usuario });
    assert.ok(await amistadRepository.buscarSolicitudPendiente(a.id, b.id));

    await amistadService.bloquear({ usuarioId: a.id, idUsuario: b.id });
    assert.equal(await amistadRepository.buscarSolicitudPendiente(a.id, b.id), null);
  });

  it("el resumen expone enviadas, bloqueados y presencia", async () => {
    const { amistadService, a, b, c } = await crearContexto();
    await amistadService.enviarSolicitud({ emisorId: a.id, termino: b.usuario });
    await amistadService.enviarSolicitud({ emisorId: a.id, termino: c.usuario });
    await amistadService.bloquear({ usuarioId: a.id, idUsuario: c.id });

    const resumen = await amistadService.resumen(a.id);
    assert.equal(resumen.solicitudesEnviadas.length, 1);
    assert.equal(resumen.solicitudesEnviadas[0].usuarioId, b.id);
    assert.equal(resumen.bloqueados.length, 1);
    assert.deepEqual(resumen.presencia, {});
  });
});
