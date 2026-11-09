const UsuarioRepository = require("./UsuarioRepository");
const Usuario = require("../entities/Usuario");

/**
 * IMPLEMENTACIÓN CONCRETA: UsuarioRepositorySQL
 *
 * Guarda usuarios en la tabla `usuarios` de la base activa. Las columnas
 * relacionales (usuario, correo con UNIQUE) garantizan que no existan
 * duplicados a nivel de base de datos, además de la validación que hace
 * UsuarioService/AuthService antes de insertar.
 *
 * Para desarrollo/offline se puede usar SQLite; en producción PostgreSQL.
 * Ambas capas (DatabaseSqlite y DatabasePostgres) exponen la MISMA
 * interfaz de repositorio: prepare().run/.get/.all y transaccion().
 */
class UsuarioRepositorySQL extends UsuarioRepository {
  #consultaPorUsuario;
  #consultaPorCorreo;
  #consultaPorId;
  #consultaTodos;
  #insertaUsuario;
  #actualizaPerfil;
  #marcaCorreoVerificado;
  #sumaIntentoFallido;
  #marcaBloqueado;
  #limpiaIntentos;
  #actualizaPassword;

  constructor(database) {
    super();
    this.database = database;
    // prepare() en el constructor, no como campo de clase: los campos se
    // inicializan antes del cuerpo del constructor (this.database aún no
    // existe en ese punto).
    this.#consultaPorUsuario = this.database.db.prepare(
      "SELECT * FROM usuarios WHERE lower(usuario) = lower(?)"
    );

    this.#consultaPorCorreo = this.database.db.prepare(
      "SELECT * FROM usuarios WHERE lower(correo) = lower(?)"
    );

    this.#consultaPorId = this.database.db.prepare(
      "SELECT * FROM usuarios WHERE id = ?"
    );

    this.#consultaTodos = this.database.db.prepare(
      "SELECT * FROM usuarios ORDER BY lower(usuario) ASC"
    );

    this.#insertaUsuario = this.database.db.prepare(`
      INSERT INTO usuarios (id, usuario, correo, nacimiento, password_hash,
                            xp, victorias, derrotas, racha, puntaje_max)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.#actualizaPerfil = this.database.db.prepare(`
      UPDATE usuarios
      SET xp = ?, victorias = ?, derrotas = ?, racha = ?, puntaje_max = ?
      WHERE id = ?
    `);

    // ------ Seguridad de cuenta -------------------------------------------------
    this.#marcaCorreoVerificado = this.database.db.prepare(`
      UPDATE usuarios
      SET correo_verificado = true, correo_verificado_en = now()
      WHERE id = ?
    `);

    // Devuelve el contador actualizado para que el Service decida si bloquea.
    this.#sumaIntentoFallido = this.database.db.prepare(`
      UPDATE usuarios
      SET intentos_fallidos = intentos_fallidos + 1
      WHERE id = ?
      RETURNING intentos_fallidos
    `);

    this.#marcaBloqueado = this.database.db.prepare(`
      UPDATE usuarios
      SET bloqueado_hasta = ?
      WHERE id = ?
    `);

    this.#limpiaIntentos = this.database.db.prepare(`
      UPDATE usuarios
      SET intentos_fallidos = 0, bloqueado_hasta = NULL
      WHERE id = ?
    `);

    // El trigger fn_auditar_usuario deja constancia en auditoria_cuentas
    // del cambio de contraseña (no guarda el hash, solo el CAMBIO).
    this.#actualizaPassword = this.database.db.prepare(`
      UPDATE usuarios
      SET password_hash = ?
      WHERE id = ?
    `);
  }

  #filaAUsuario(fila) {
    if (!fila) return null;
    return new Usuario({
      id: fila.id,
      usuario: fila.usuario,
      correo: fila.correo,
      nacimiento: fila.nacimiento,
      passwordHash: fila.password_hash,
      xp: fila.xp,
      victorias: fila.victorias,
      derrotas: fila.derrotas,
      racha: fila.racha,
      puntajeMax: fila.puntaje_max,
      correoVerificado: fila.correo_verificado,
      intentosFallidos: fila.intentos_fallidos,
      bloqueadoHasta: fila.bloqueado_hasta,
    });
  }

  async buscarPorUsuario(usuario) {
    return this.#filaAUsuario(await this.#consultaPorUsuario.get(usuario));
  }

  async buscarPorCorreo(correo) {
    return this.#filaAUsuario(await this.#consultaPorCorreo.get(correo));
  }

  async buscarPorId(id) {
    return this.#filaAUsuario(await this.#consultaPorId.get(id));
  }

  async obtenerTodos() {
    const filas = await this.#consultaTodos.all();
    return filas.map((fila) => this.#filaAUsuario(fila));
  }

  // Todos los métodos de escritura son async y DEVUELVEN la promesa del
  // run(): con SQLite (síncrono) el await es inocuo, pero con PostgreSQL
  // es OBLIGATORIO esperar para que el INSERT/UPDATE termine antes de la
  // siguiente lectura (sin esto habría condiciones de carrera).
  async guardar(usuario) {
    return this.#insertaUsuario.run(
      usuario.id,
      usuario.usuario,
      usuario.correo,
      usuario.nacimiento,
      usuario.passwordHash,
      usuario.xp,
      usuario.victorias,
      usuario.derrotas,
      usuario.racha,
      usuario.puntajeMax
    );
  }

  async actualizarPerfil(id, perfil) {
    return this.#actualizaPerfil.run(
      perfil.xp,
      perfil.victorias,
      perfil.derrotas,
      perfil.racha,
      perfil.puntajeMax,
      id
    );
  }

  /**
   * Fusiona el progreso del invitado en la cuenta usando la conexión `db`
   * (la del pool, o el dbCliente de Database.transaccion()): suma XP y
   * estadísticas; racha y puntajeMax se quedan con el MÁXIMO de los dos.
   * CASE WHEN en vez de GREATEST para que funcione en PostgreSQL y SQLite.
   */
  async fusionarPerfilEn(db, id, suma) {
    const sentencia = db.prepare(`
      UPDATE usuarios
      SET xp = xp + ?,
          victorias = victorias + ?,
          derrotas = derrotas + ?,
          racha = CASE WHEN racha < ? THEN ? ELSE racha END,
          puntaje_max = CASE WHEN puntaje_max < ? THEN ? ELSE puntaje_max END
      WHERE id = ?
    `);
    return sentencia.run(
      suma.xp,
      suma.victorias,
      suma.derrotas,
      suma.racha,
      suma.racha,
      suma.puntajeMax,
      suma.puntajeMax,
      id
    );
  }

  // ------ Seguridad de cuenta --------------------------------------------------
  async marcarCorreoVerificado(id) {
    return this.#marcaCorreoVerificado.run(id);
  }

  async sumarIntentoFallido(id) {
    const fila = await this.#sumaIntentoFallido.get(id);
    return fila?.intentos_fallidos ?? 0;
  }

  async marcarBloqueado(id, hasta) {
    return this.#marcaBloqueado.run(hasta, id);
  }

  async limpiarIntentosFallidos(id) {
    return this.#limpiaIntentos.run(id);
  }

  async actualizarPassword(id, nuevoHash) {
    return this.#actualizaPassword.run(nuevoHash, id);
  }
}

module.exports = UsuarioRepositorySQL;