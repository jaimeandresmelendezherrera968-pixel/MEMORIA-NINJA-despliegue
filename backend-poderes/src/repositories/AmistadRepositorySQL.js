const crypto = require("crypto");
const AmistadRepository = require("./AmistadRepository");

class AmistadRepositorySQL extends AmistadRepository {
  #listarAmigos;
  #listarRecibidas;
  #listarEnviadas;
  #bloquear;
  #desbloquear;
  #listarBloqueados;
  #estaBloqueado;

  constructor(database) {
    super();
    this.database = database;
    const db = this.database.db;

    this.#listarAmigos = db.prepare(`
      SELECT a.id AS amistad_id, u.id AS usuario_id, u.usuario, u.codigo_amigo, a.creado_en
      FROM amistades a
      JOIN usuarios u ON u.id = CASE WHEN a.usuario_id = ? THEN a.amigo_id ELSE a.usuario_id END
      WHERE a.usuario_id = ? OR a.amigo_id = ?
      ORDER BY lower(u.usuario) ASC
    `);
    this.#listarRecibidas = db.prepare(`
      SELECT s.id AS solicitud_id, s.emisor_id AS desde,
             u.id AS usuario_id, u.usuario, u.codigo_amigo, s.creado_en
      FROM solicitudes_amistad s
      JOIN usuarios u ON u.id = s.emisor_id
      WHERE s.receptor_id = ? AND s.estado = 'PENDIENTE'
      ORDER BY s.creado_en DESC
    `);
    this.#listarEnviadas = db.prepare(`
      SELECT s.id AS solicitud_id, s.emisor_id AS desde,
             u.id AS usuario_id, u.usuario, u.codigo_amigo, s.creado_en
      FROM solicitudes_amistad s
      JOIN usuarios u ON u.id = s.receptor_id
      WHERE s.emisor_id = ? AND s.estado = 'PENDIENTE'
      ORDER BY s.creado_en DESC
    `);
    this.#bloquear = db.prepare(`
      INSERT INTO bloqueos_usuario (usuario_id, bloqueado_id)
      VALUES (?, ?)
      ON CONFLICT (usuario_id, bloqueado_id) DO NOTHING
    `);
    this.#desbloquear = db.prepare(`
      DELETE FROM bloqueos_usuario WHERE usuario_id = ? AND bloqueado_id = ?
    `);
    this.#listarBloqueados = db.prepare(`
      SELECT u.id AS usuario_id, u.usuario, u.codigo_amigo, b.creado_en
      FROM bloqueos_usuario b
      JOIN usuarios u ON u.id = b.bloqueado_id
      WHERE b.usuario_id = ?
      ORDER BY lower(u.usuario) ASC
    `);
    this.#estaBloqueado = db.prepare(`
      SELECT 1 FROM bloqueos_usuario
      WHERE (usuario_id = ? AND bloqueado_id = ?) OR (usuario_id = ? AND bloqueado_id = ?)
      LIMIT 1
    `);
  }

  #db(ejecutor) {
    return ejecutor || this.database.db;
  }

  #filaASolicitud(fila) {
    if (!fila) return null;
    return {
      id: fila.id,
      emisorId: fila.emisor_id,
      receptorId: fila.receptor_id,
      estado: fila.estado,
      creadoEn: fila.creado_en,
    };
  }

  #filaAAmistad(fila) {
    if (!fila) return null;
    return {
      id: fila.id,
      usuarioId: fila.usuario_id,
      amigoId: fila.amigo_id,
      creadoEn: fila.creado_en,
    };
  }

  async #buscarSolicitudCon(ejecutor, id) {
    const fila = await this.#db(ejecutor)
      .prepare("SELECT * FROM solicitudes_amistad WHERE id = ?")
      .get(id);
    return this.#filaASolicitud(fila);
  }

  async #buscarAmistadCon(ejecutor, usuarioA, usuarioB) {
    const [primero, segundo] = [usuarioA, usuarioB].sort();
    const fila = await this.#db(ejecutor)
      .prepare(
        `SELECT id, usuario_id, amigo_id, creado_en FROM amistades
         WHERE (usuario_id = ? AND amigo_id = ?) OR (usuario_id = ? AND amigo_id = ?)
         LIMIT 1`
      )
      .get(primero, segundo, primero, segundo);
    return this.#filaAAmistad(fila);
  }

  async listarAmigos(idUsuario) {
    const filas = await this.#listarAmigos.all(idUsuario, idUsuario, idUsuario);
    return filas.map((fila) => ({
      id: fila.usuario_id,
      amistadId: fila.amistad_id,
      usuario: fila.usuario,
      codigoAmigo: fila.codigo_amigo,
      creadoEn: fila.creado_en,
      desde: fila.creado_en,
    }));
  }

  async listarSolicitudesRecibidas(idUsuario) {
    const filas = await this.#listarRecibidas.all(idUsuario);
    return filas.map((fila) => ({
      id: fila.solicitud_id,
      usuarioId: fila.usuario_id,
      usuario: fila.usuario,
      codigoAmigo: fila.codigo_amigo,
      creadoEn: fila.creado_en,
      desde: fila.desde,
    }));
  }

  async listarSolicitudesEnviadas(idUsuario) {
    const filas = await this.#listarEnviadas.all(idUsuario);
    return filas.map((fila) => ({
      id: fila.solicitud_id,
      usuarioId: fila.usuario_id,
      usuario: fila.usuario,
      codigoAmigo: fila.codigo_amigo,
      creadoEn: fila.creado_en,
      desde: fila.desde,
    }));
  }

  async buscarSolicitudPorId(id) {
    return this.#buscarSolicitudCon(null, id);
  }

  async buscarSolicitudPendiente(emisorId, receptorId) {
    const fila = await this.#db(null)
      .prepare(
        `SELECT * FROM solicitudes_amistad
         WHERE estado = 'PENDIENTE'
           AND ((emisor_id = ? AND receptor_id = ?) OR (emisor_id = ? AND receptor_id = ?))
         LIMIT 1`
      )
      .get(emisorId, receptorId, receptorId, emisorId);
    return this.#filaASolicitud(fila);
  }

  async crearSolicitud(solicitud, ejecutor = null) {
    const creadoEn = solicitud.creadoEn || new Date();
    const estado = solicitud.estado || "PENDIENTE";
    await this.#db(ejecutor)
      .prepare(
        `INSERT INTO solicitudes_amistad (id, emisor_id, receptor_id, estado, creado_en)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(solicitud.id, solicitud.emisorId, solicitud.receptorId, estado, creadoEn);
    return {
      id: solicitud.id,
      emisorId: solicitud.emisorId,
      receptorId: solicitud.receptorId,
      estado,
      creadoEn,
    };
  }

  async actualizarEstadoSolicitud(id, estado, ejecutor = null) {
    const resultado = await this.#db(ejecutor)
      .prepare(
        "UPDATE solicitudes_amistad SET estado = ?, respondido_en = now() WHERE id = ? AND estado = 'PENDIENTE'"
      )
      .run(estado, id);
    if (!resultado.changes) return null;
    return this.#buscarSolicitudCon(ejecutor, id);
  }

  async cancelarSolicitud(id, emisorId, ejecutor = null) {
    const resultado = await this.#db(ejecutor)
      .prepare("DELETE FROM solicitudes_amistad WHERE id = ? AND emisor_id = ? AND estado = 'PENDIENTE'")
      .run(id, emisorId);
    return resultado.changes > 0;
  }

  async eliminarSolicitudesPendientes(usuarioA, usuarioB, ejecutor = null) {
    const resultado = await this.#db(ejecutor)
      .prepare(
        "DELETE FROM solicitudes_amistad WHERE estado = 'PENDIENTE' AND ((emisor_id = ? AND receptor_id = ?) OR (emisor_id = ? AND receptor_id = ?))"
      )
      .run(usuarioA, usuarioB, usuarioB, usuarioA);
    return resultado.changes;
  }

  async crearAmistad(usuarioA, usuarioB, ejecutor = null) {
    const [primero, segundo] = [usuarioA, usuarioB].sort();
    const id = crypto.randomUUID();
    await this.#db(ejecutor)
      .prepare(
        `INSERT INTO amistades (id, usuario_id, amigo_id)
         VALUES (?, ?, ?)
         ON CONFLICT (usuario_id, amigo_id) DO NOTHING`
      )
      .run(id, primero, segundo);
    return this.#buscarAmistadCon(ejecutor, primero, segundo);
  }

  async existeAmistad(usuarioA, usuarioB) {
    return this.#buscarAmistadCon(null, usuarioA, usuarioB);
  }

  async eliminarAmistad(idAmistad, idUsuario, ejecutor = null) {
    const resultado = await this.#db(ejecutor)
      .prepare("DELETE FROM amistades WHERE id = ? AND (usuario_id = ? OR amigo_id = ?)")
      .run(idAmistad, idUsuario, idUsuario);
    return resultado.changes > 0;
  }

  async estaBloqueado(usuarioA, usuarioB) {
    const fila = await this.#estaBloqueado.get(usuarioA, usuarioB, usuarioB, usuarioA);
    return Boolean(fila);
  }

  async bloquear(usuarioId, bloqueadoId, ejecutor = null) {
    await this.#db(ejecutor).prepare(
      "INSERT INTO bloqueos_usuario (usuario_id, bloqueado_id) VALUES (?, ?) ON CONFLICT (usuario_id, bloqueado_id) DO NOTHING"
    ).run(usuarioId, bloqueadoId);
  }

  async desbloquear(usuarioId, bloqueadoId, ejecutor = null) {
    const resultado = await this.#db(ejecutor).prepare(
      "DELETE FROM bloqueos_usuario WHERE usuario_id = ? AND bloqueado_id = ?"
    ).run(usuarioId, bloqueadoId);
    return resultado.changes > 0;
  }

  async listarBloqueados(usuarioId) {
    const filas = await this.#listarBloqueados.all(usuarioId);
    return filas.map((fila) => ({
      id: fila.usuario_id,
      usuario: fila.usuario,
      codigoAmigo: fila.codigo_amigo,
      creadoEn: fila.creado_en,
    }));
  }
}

module.exports = AmistadRepositorySQL;
