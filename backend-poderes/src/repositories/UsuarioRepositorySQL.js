const UsuarioRepository = require("./UsuarioRepository");
const Usuario = require("../entities/Usuario");

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
    this.#consultaPorUsuario = this.database.db.prepare(
      "SELECT * FROM usuarios WHERE lower(usuario) = lower(?)"
    );
    this.#consultaPorCorreo = this.database.db.prepare(
      "SELECT * FROM usuarios WHERE lower(correo) = lower(?)"
    );
    this.#consultaPorId = this.database.db.prepare("SELECT * FROM usuarios WHERE id = ?");
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
    this.#marcaCorreoVerificado = this.database.db.prepare(`
      UPDATE usuarios SET correo_verificado = true, correo_verificado_en = now() WHERE id = ?
    `);
    this.#sumaIntentoFallido = this.database.db.prepare(`
      UPDATE usuarios SET intentos_fallidos = intentos_fallidos + 1 WHERE id = ? RETURNING intentos_fallidos
    `);
    this.#marcaBloqueado = this.database.db.prepare(`
      UPDATE usuarios SET bloqueado_hasta = ? WHERE id = ?
    `);
    this.#limpiaIntentos = this.database.db.prepare(`
      UPDATE usuarios SET intentos_fallidos = 0, bloqueado_hasta = NULL WHERE id = ?
    `);
    this.#actualizaPassword = this.database.db.prepare(`
      UPDATE usuarios SET password_hash = ? WHERE id = ?
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

  async guardar(usuario, ejecutor = null) {
    const valores = [
      usuario.id,
      usuario.usuario,
      usuario.correo,
      usuario.nacimiento,
      usuario.passwordHash,
      usuario.xp,
      usuario.victorias,
      usuario.derrotas,
      usuario.racha,
      usuario.puntajeMax,
    ];
    if (ejecutor) {
      return ejecutor
        .prepare(
          `INSERT INTO usuarios (id, usuario, correo, nacimiento, password_hash,
           xp, victorias, derrotas, racha, puntaje_max)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(...valores);
    }
    return this.#insertaUsuario.run(...valores);
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

  async marcarCorreoVerificado(id) { return this.#marcaCorreoVerificado.run(id); }
  async sumarIntentoFallido(id) {
    const fila = await this.#sumaIntentoFallido.get(id);
    return fila?.intentos_fallidos ?? 0;
  }
  async marcarBloqueado(id, hasta) { return this.#marcaBloqueado.run(hasta, id); }
  async limpiarIntentosFallidos(id) { return this.#limpiaIntentos.run(id); }
  async actualizarPassword(id, nuevoHash) { return this.#actualizaPassword.run(nuevoHash, id); }

  async actualizarPasswordCon(ejecutor, id, nuevoHash) {
    return ejecutor
      .prepare(`UPDATE usuarios SET password_hash = ? WHERE id = ?`)
      .run(nuevoHash, id);
  }

  async revocarTodasLasSesionesCon(ejecutor, idUsuario) {
    return ejecutor
      .prepare(
        `UPDATE sesiones
            SET revocada_en = now()
          WHERE usuario_id = ?
            AND revocada_en IS NULL`
      )
      .run(idUsuario);
  }
}

module.exports = UsuarioRepositorySQL;
