const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const PasswordHasher = require("../src/infraestructura/PasswordHasher");
const UsuarioRepositorySQL = require("../src/repositories/UsuarioRepositorySQL");
const HistorialPartidaRepositorySQL = require("../src/repositories/HistorialPartidaRepositorySQL");
const UsuarioService = require("../src/services/UsuarioService");
const { crearDatabasePrueba, limpiarDatabase } = require("./helpers/baseDatosPrueba");

/**
 * >>> DIP en acción con PostgreSQL <<<
 * Se arma un UsuarioService con repositorios SQL concretos y se prueba
 * el ciclo de vida real: registro -> login -> registro de partida ->
 * historial. Todo persistido en memoria_ninja_test (el MISMO motor que
 * usa la app). Cada test limpia las tablas para arrancar aislado.
 *
 * Los métodos del Service son async (funcionan igual con SQLite síncrono
 * y con PostgreSQL asíncrono), por eso los tests hacen await.
 */
let database;

before(async () => {
  database = crearDatabasePrueba();
  await database.init();
});

after(async () => {
  await database.close();
});

async function crearServicio() {
  await limpiarDatabase(database);
  const usuarioRepository = new UsuarioRepositorySQL(database);
  const historialRepository = new HistorialPartidaRepositorySQL(database);
  const passwordHasher = new PasswordHasher();
  const servicio = new UsuarioService(usuarioRepository, historialRepository, passwordHasher);
  return { servicio, usuarioRepository };
}

describe("UsuarioService con repositorios SQL", () => {
  it("registra un usuario y lo devuelve sin exponer el hash", async () => {
    const { servicio, usuarioRepository } = await crearServicio();

    const creado = await servicio.registrar({
      usuario: "naruto",
      correo: "naruto@konoha.ni",
      nacimiento: "1990-10-10",
      password: "secreto123",
    });

    assert.equal(creado.usuario, "naruto");
    assert.equal(creado.correo, "naruto@konoha.ni");
    assert.equal("passwordHash" in creado, false);
    assert.equal(creado.passwordHash, undefined);

    // En la base quedó un hash real (nunca la contraseña en texto plano).
    const guardado = await usuarioRepository.buscarPorCorreo("naruto@konoha.ni");
    assert.notEqual(guardado, null);
    assert.notEqual(guardado.passwordHash, "secreto123");
    assert.ok(guardado.passwordHash.includes(":"));
  });

  it("rechaza registro con usuario ya existente (formato duplicado)", async () => {
    const { servicio } = await crearServicio();
    await servicio.registrar({ usuario: "sasuke", correo: "sasuke@konoha.ni", password: "clave123" });

    await assert.rejects(
      () => servicio.registrar({ usuario: "sasuke", correo: "otro@correo.com", password: "clave123" }),
      /ya está en uso/
    );
  });

  it("rechaza registro con correo ya existente", async () => {
    const { servicio } = await crearServicio();
    await servicio.registrar({ usuario: "sakura", correo: "sakura@konoha.ni", password: "clave123" });

    await assert.rejects(
      () => servicio.registrar({ usuario: "otro", correo: "Sakura@Konoha.ni", password: "clave123" }),
      /correo ya está registrado/
    );
  });

  it("inicia sesión con credenciales correctas y rechaza las incorrectas", async () => {
    const { servicio } = await crearServicio();
    await servicio.registrar({ usuario: "hinata", correo: "hinata@konoha.ni", password: "byakugan" });

    const sesion = await servicio.iniciarSesion({ usuario: "hinata", password: "byakugan" });
    assert.equal(sesion.usuario, "hinata");

    await assert.rejects(
      () => servicio.iniciarSesion({ usuario: "hinata", password: "mal" }),
      /Usuario o contraseña incorrectos/
    );
    await assert.rejects(
      () => servicio.iniciarSesion({ usuario: "fantasma", password: "byakugan" }),
      /Usuario o contraseña incorrectos/
    );
  });

  it("guarda resultados de partidas y los lista ordenados del más reciente al más antiguo", async () => {
    const { servicio } = await crearServicio();
    const { id } = await servicio.registrar({ usuario: "kiba", correo: "kiba@konoha.ni", password: "akamaru" });

    await servicio.guardarResultadoPartida({ idUsuario: id, zona: "roca", puntaje: 120, modo: "1", ganador: "kiba" });
    await servicio.guardarResultadoPartida({ idUsuario: id, zona: "niebla", puntaje: 90, modo: "2", ganador: "rival" });

    const historial = await servicio.obtenerHistorial(id);
    assert.equal(historial.length, 2);
    assert.equal(historial[0].zona, "niebla");
    assert.equal(historial[0].puntaje, 90);
    assert.equal(historial[1].zona, "roca");
  });

  it("no guarda historial para un usuario inexistente (FK protegida por el Service)", async () => {
    const { servicio } = await crearServicio();
    await assert.rejects(
      () => servicio.guardarResultadoPartida({ idUsuario: "uuid-inexistente", zona: "roca", puntaje: 1 }),
      /no existe/
    );
  });

  it("buscarPorCorreo devuelve el usuario público o null (para el repositorio HTTP del frontend)", async () => {
    const { servicio } = await crearServicio();
    await servicio.registrar({ usuario: "rocklee", correo: "lee@konoha.ni", password: "konohaForte" });

    const encontrado = await servicio.buscarPorCorreo("lee@konoha.ni");
    assert.equal(encontrado.usuario, "rocklee");
    assert.equal(encontrado.passwordHash, undefined);

    assert.equal(await servicio.buscarPorCorreo("no-existe@konoha.ni"), null);
  });

  it("obtenerTodos lista usuarios públicos sin exponer hashes", async () => {
    const { servicio } = await crearServicio();
    await servicio.registrar({ usuario: "tenten", correo: "tenten@konoha.ni", password: "arma123" });
    await servicio.registrar({ usuario: "neji", correo: "neji@konoha.ni", password: "giro123" });

    const todos = await servicio.obtenerTodos();
    assert.equal(todos.length, 2);
    todos.forEach((u) => assert.equal(u.passwordHash, undefined));
  });
});
