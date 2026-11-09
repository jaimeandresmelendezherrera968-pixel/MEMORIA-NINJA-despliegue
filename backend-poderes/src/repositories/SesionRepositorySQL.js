const SesionRepository = require("./SesionRepository");
const Usuario = require("../entities/Usuario");

/**
 * IMPLEMENTACIÓN CONCRETA: SesionRepositorySQL
 *
 * Sesiones en PostgreSQL (tabla sesiones). La cookie guarda el token en
 * claro; la base guarda token_hash (sha256). La vista vw_sesiones_activas
 * y el SP sp_restablecer_password (revocar todo) viven en el esquema y se
 * consumen desde el Service.
 */
class SesionRepositorySQL extends SesionRepository {
  constructor(database) {
    super();
    this.database = database;
  }

  async crear({ usuarioId, tokenHash, ip, userAgent, expiraEn }) {
    await this.database.db
      .prepare(
        `INSERT INTO sesiones (usuario_id, token_hash, ip, user_agent, expira_en)
         VALUES (?, ?, ?, ?, ?)`
      )
      .run(usuarioId, tokenHash, ip, userAgent, expiraEn);
  }

  async buscarPorTokenHash(tokenHash) {
    const fila = await this.database.db
      .prepare(
        `SELECT s.id AS sesion_id, s.usuario_id, s.token_hash, s.ip, s.user_agent,
                s.creado_en, s.expira_en, s.revocada_en,
                u.usuario, u.correo, u.nacimiento, u.password_hash,
                u.xp, u.victorias, u.derrotas, u.racha, u.puntaje_max,
                u.correo_verificado, u.intentos_fallidos, u.bloqueado_hasta
           FROM sesiones s
           JOIN usuarios u ON u.id = s.usuario_id
          WHERE s.token_hash = ?`
      )
      .get(tokenHash);
    if (!fila) return null;

    const usuario = new Usuario({
      id: fila.usuario_id,
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

    return {
      sesion: {
        id: fila.sesion_id,
        usuarioId: fila.usuario_id,
        creadoEn: fila.creado_en,
        expiraEn: fila.expira_en,
        revocadaEn: fila.revocada_en,
        ip: fila.ip,
        userAgent: fila.user_agent,
      },
      usuario,
    };
  }

  async revocar(tokenHash) {
    await this.database.db
      .prepare(
        `UPDATE sesiones
            SET revocada_en = now()
          WHERE token_hash = ?
            AND revocada_en IS NULL`
      )
      .run(tokenHash);
  }

  async revocarTodasPorUsuario(usuarioId) {
    await this.database.db
      .prepare(
        `UPDATE sesiones
            SET revocada_en = now()
          WHERE usuario_id = ?
            AND revocada_en IS NULL`
      )
      .run(usuarioId);
  }
}

module.exports = SesionRepositorySQL;