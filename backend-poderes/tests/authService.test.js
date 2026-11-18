"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const AuthService = require("../src/services/AuthService");
const DatabaseSqlite = require("../src/infraestructura/DatabaseSqlite");
const PasswordHasher = require("../src/infraestructura/PasswordHasher");

function crearNotificador(exito = true, enviados = []) {
  return {
    async enviar(datos) {
      enviados.push(datos);
      if (!exito) throw new Error("SMTP caido");
    },
  };
}

function crearGenerador(codigo = "123456") {
  return { generar: () => codigo };
}

function crearHasherCodigo() {
  return { hash: (v) => "hash:" + v };
}

describe("AuthService (registro atomico, correo post-commit, recordar)", () => {
  let database;
  let usuarioRepo;
  let codigoRepo;
  let sesionRepo;
  let sesiones;
  let usuarios;

  beforeEach(() => {
    database = new DatabaseSqlite(":memory:");
    database.db.exec("DROP TABLE IF EXISTS codigos_verificacion; DROP TABLE IF EXISTS usuarios; DROP TABLE IF EXISTS historial_partidas; DROP TABLE IF EXISTS partidas;");
    database.db.exec(
      "CREATE TABLE usuarios (id TEXT PRIMARY KEY, usuario TEXT, correo TEXT);" +
      "CREATE TABLE codigos_verificacion (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario_id TEXT, codigo_hash TEXT, tipo TEXT, expira_en TEXT, usado_en TEXT);"
    );
    usuarios = [];
    sesiones = [];
    usuarioRepo = {
      async buscarPorUsuario(u) { return usuarios.find((x) => String(x.usuario).toLowerCase() === String(u).toLowerCase()) || null; },
      async buscarPorCorreo(c) { return usuarios.find((x) => String(x.correo).toLowerCase() === String(c).toLowerCase()) || null; },
      async guardar(entidad, ejecutor = null) {
        const db = ejecutor || database.db;
        const resultado = await db.prepare("INSERT INTO usuarios (id, usuario, correo) VALUES (?, ?, ?)").run(entidad.id, entidad.usuario, entidad.correo);
        usuarios.push({
          id: entidad.id,
          usuario: entidad.usuario,
          correo: entidad.correo,
          passwordHash: entidad.passwordHash,
          correoVerificado: false,
          bloqueadoHasta: null,
        });
        return resultado;
      },
      async actualizarCorreoCon(ejecutor, id, correo) {
        const db = ejecutor || database.db;
        await db.prepare("UPDATE usuarios SET correo = ? WHERE id = ?").run(correo, id);
        const encontrado = usuarios.find((x) => x.id === id);
        if (encontrado) encontrado.correo = correo;
      },
      async sumarIntentoFallido() { return 0; },
      async marcarBloqueado() {},
      async limpiarIntentosFallidos() {},
    };
    codigoRepo = {
      async guardar(datos, ejecutor = null) {
        const db = ejecutor || database.db;
        return db.prepare("INSERT INTO codigos_verificacion (usuario_id, codigo_hash, tipo, expira_en) VALUES (?, ?, ?, ?)").run(datos.usuarioId, datos.codigoHash, datos.tipo, String(datos.expiraEn));
      },
      async invalidarActivos({ usuarioId, tipo }, ejecutor = null) {
        const db = ejecutor || database.db;
        await db
          .prepare("UPDATE codigos_verificacion SET usado_en = ? WHERE usuario_id = ? AND tipo = ? AND usado_en IS NULL")
          .run(new Date().toISOString(), usuarioId, tipo);
      },
    };
    sesionRepo = {
      async crear(s) { sesiones.push(s); },
      async buscarPorTokenHash() { return null; },
      async revocar() {},
      async revocarTodasPorUsuario() {},
    };
  });

  afterEach(() => {
    if (database) database.cerrar();
  });

  function crearService({ notificador, generador, hasherCodigo, durSesion = 60, durRecordar = 43200 } = {}) {
    return new AuthService(
      usuarioRepo,
      codigoRepo,
      sesionRepo,
      new PasswordHasher(),
      generador || crearGenerador(),
      hasherCodigo || crearHasherCodigo(),
      notificador || crearNotificador(true),
      durSesion,
      durRecordar,
      database
    );
  }

  it("registro exitoso crea cuenta+codigo en la misma transaccion y envia correo despues del commit", async () => {
    const enviados = [];
    const service = crearService({ notificador: crearNotificador(true, enviados) });
    const res = await service.registrar({
      usuario: "Naruto",
      correo: "NARUTO@konoha.ni",
      nacimiento: "2000-10-10",
      password: "clave1234",
    });
    assert.equal(res.correoEnviado, true);
    assert.equal(res.correo, "naruto@konoha.ni");
    assert.equal(res.usuario.usuario, "Naruto");
    assert.equal(enviados.length, 1);
    assert.match(enviados[0].texto, /123456/);
    assert.match(enviados[0].html, /1 2 3 4 5 6/);
    assert.match(enviados[0].html, /Vence en 10 minutos/);
    const filasU = await database.db.prepare("SELECT * FROM usuarios").all();
    const filasC = await database.db.prepare("SELECT * FROM codigos_verificacion").all();
    assert.equal(filasU.length, 1);
    assert.equal(filasC.length, 1);
    assert.equal(filasC[0].usuario_id, filasU[0].id);
    assert.equal(filasC[0].tipo, "REGISTRO");
  });

  it("si falla guardar el codigo, hace rollback y no queda cuenta (SQLite/ejecutor.prepare)", async () => {
    const enviados = [];
    const codigoRepoFalla = { async guardar() { throw new Error("fallo guardando codigo"); } };
    const service = new AuthService(
      usuarioRepo, codigoRepoFalla, sesionRepo, new PasswordHasher(),
      crearGenerador(), crearHasherCodigo(), crearNotificador(true, enviados),
      60, 43200, database
    );
    await assert.rejects(
      () => service.registrar({ usuario: "Sasuke", correo: "sasuke@konoha.ni", password: "clave1234" }),
      /fallo guardando codigo/
    );
    const filasU = await database.db.prepare("SELECT * FROM usuarios").all();
    assert.equal(filasU.length, 0);
    assert.equal(enviados.length, 0);
  });

  it("si falla el envio de correo, conserva cuenta+codigo y devuelve correoEnviado:false", async () => {
    const enviados = [];
    const service = crearService({ notificador: crearNotificador(false, enviados) });
    const res = await service.registrar({ usuario: "Sakura", correo: "sakura@konoha.ni", password: "clave1234" });
    assert.equal(res.correoEnviado, false);
    assert.match(res.aviso, /no pudimos enviar el correo/i);
    const filasU = await database.db.prepare("SELECT * FROM usuarios").all();
    const filasC = await database.db.prepare("SELECT * FROM codigos_verificacion").all();
    assert.equal(filasU.length, 1);
    assert.equal(filasC.length, 1);
  });

  it("rechaza duplicados normalizados con codigo de error", async () => {
    const service = crearService();
    await service.registrar({ usuario: "Kakashi", correo: "kakashi@konoha.ni", password: "clave1234" });
    // simular que ya existen para los chequeos de unicidad
    usuarios.push({ usuario: "Kakashi", correo: "kakashi@konoha.ni" });
    await assert.rejects(
      () => service.registrar({ usuario: "kakashi", correo: "otro@konoha.ni", password: "clave1234" }),
      (e) => e && e.codigo === "USUARIO_DUPLICADO"
    );
    await assert.rejects(
      () => service.registrar({ usuario: "otro", correo: "KAKASHI@KONOHA.NI", password: "clave1234" }),
      (e) => e && e.codigo === "CORREO_DUPLICADO"
    );
  });

  it("rechaza contrasena menor a 8 en registro", async () => {
    const service = crearService();
    await assert.rejects(
      () => service.registrar({ usuario: "Lee", correo: "lee@konoha.ni", password: "abc1234" }),
      (e) => e && e.codigo === "VALIDACION"
    );
  });

  it("iniciarSesion usa TTL de recordar cuando corresponde", async () => {
    const service = crearService({ durSesion: 60, durRecordar: 43200 });
    const passHash = new PasswordHasher().generarHash("clave1234");
    const encontrado = {
      id: "u1", usuario: "hinata", correo: "hinata@konoha.ni", correoVerificado: true,
      passwordHash: passHash, bloqueadoHasta: null,
      publico() { return { id: "u1", usuario: "hinata", correo: "hinata@konoha.ni" }; },
    };
    usuarioRepo.buscarPorUsuario = async (u) => String(u).toLowerCase() === "hinata" ? encontrado : null;
    usuarioRepo.buscarPorCorreo = async () => null;

    const antes = Date.now();
    const res = await service.iniciarSesion({ usuario: "HINATA", password: "clave1234", recordar: true, ip: "1", userAgent: "t" });
    const despues = Date.now();
    assert.equal(res.recordar, true);
    assert.equal(sesiones.length, 1);
    const exp = new Date(sesiones[0].expiraEn).getTime();
    const esperadoMin = antes + 43200 * 60 * 1000;
    const esperadoMax = despues + 43200 * 60 * 1000;
    assert.ok(exp >= esperadoMin - 1000 && exp <= esperadoMax + 1000, "expiraEn fuera de rango: " + exp);
  });

  it("iniciarSesion sin recordar usa TTL de sesion normal", async () => {
    const service = crearService({ durSesion: 60, durRecordar: 43200 });
    const passHash = new PasswordHasher().generarHash("clave1234");
    const encontrado = {
      id: "u2", usuario: "shino", correo: "shino@konoha.ni", correoVerificado: true,
      passwordHash: passHash, bloqueadoHasta: null,
      publico() { return { id: "u2", usuario: "shino", correo: "shino@konoha.ni" }; },
    };
    usuarioRepo.buscarPorUsuario = async (u) => String(u).toLowerCase() === "shino" ? encontrado : null;
    usuarioRepo.buscarPorCorreo = async () => null;
    const antes = Date.now();
    const res = await service.iniciarSesion({ usuario: "shino", password: "clave1234", recordar: false });
    const despues = Date.now();
    assert.equal(res.recordar, false);
    const exp = new Date(sesiones[0].expiraEn).getTime();
    const esperadoMin = antes + 60 * 60 * 1000;
    const esperadoMax = despues + 60 * 60 * 1000;
    assert.ok(exp >= esperadoMin - 1000 && exp <= esperadoMax + 1000);
  });

  it("iniciarSesion con correo sin verificar expone codigo y correo sin crear sesion", async () => {
    const service = crearService();
    const passHash = new PasswordHasher().generarHash("clave1234");
    const encontrado = {
      id: "u3", usuario: "neji", correo: "neji@konoha.ni", correoVerificado: false,
      passwordHash: passHash, bloqueadoHasta: null,
      publico() { return { id: "u3", usuario: "neji", correo: "neji@konoha.ni" }; },
    };
    usuarioRepo.buscarPorUsuario = async (u) => String(u).toLowerCase() === "neji" ? encontrado : null;
    usuarioRepo.buscarPorCorreo = async () => null;

    await assert.rejects(
      () => service.iniciarSesion({ usuario: "neji", password: "clave1234" }),
      (error) => error && error.codigo === "CORREO_SIN_VERIFICAR" && error.correo === "neji@konoha.ni"
    );
    assert.equal(sesiones.length, 0);
  });

  it("cambiarCorreoPendiente corrige correo mal escrito, invalida codigo viejo y envia uno nuevo", async () => {
    const enviados = [];
    const service = crearService({ notificador: crearNotificador(true, enviados) });
    await service.registrar({
      usuario: "Tenten",
      correo: "tenten@konohaa.ni",
      nacimiento: "2000-02-02",
      password: "clave1234",
    });

    const mutable = usuarios[0];
    usuarioRepo.buscarPorUsuario = async (u) =>
      String(u).toLowerCase() === "tenten" ? mutable : null;
    usuarioRepo.buscarPorCorreo = async (c) =>
      usuarios.find((x) => String(x.correo).toLowerCase() === String(c).toLowerCase()) || null;

    const res = await service.cambiarCorreoPendiente({
      usuario: "TENTEN",
      password: "clave1234",
      correoNuevo: "TENTEN@KONOHA.NI",
    });

    assert.equal(res.correo, "tenten@konoha.ni");
    assert.equal(res.correoEnviado, true);
    assert.equal(mutable.correo, "tenten@konoha.ni");
    assert.equal(enviados.length, 2);
    assert.match(enviados[1].texto, /123456/);

    const codigos = await database.db.prepare("SELECT * FROM codigos_verificacion ORDER BY id").all();
    assert.equal(codigos.length, 2);
    assert.ok(codigos[0].usado_en, "el codigo del correo mal escrito debe quedar invalidado");
    assert.equal(codigos[1].usado_en, null);

    await assert.rejects(
      () => service.cambiarCorreoPendiente({
        usuario: "tenten",
        password: "mala1234",
        correoNuevo: "otra@konoha.ni",
      }),
      (e) => e && e.codigo === "CREDENCIALES"
    );

    mutable.correoVerificado = true;
    await assert.rejects(
      () => service.cambiarCorreoPendiente({
        usuario: "tenten",
        password: "clave1234",
        correoNuevo: "otra@konoha.ni",
      }),
      (e) => e && e.codigo === "CORREO_YA_VERIFICADO"
    );
  });
});
