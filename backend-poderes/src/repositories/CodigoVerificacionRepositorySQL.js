const CodigoVerificacionRepository = require("./CodigoVerificacionRepository");

/**
 * IMPLEMENTACIÓN CONCRETA: CodigoVerificacionRepositorySQL
 *
 * Persiste códigos en PostgreSQL (tabla codigos_verificacion).
 *
 * ATENCIÓN: los métodos aceptan un `ejecutor` opcional. Cuando un Service
 * corre dentro de DatabasePostgres.transaccion(), SIEMPRE pasa el `db`
 * del cliente para que todas las sentencias vivan en la MISMA conexión
 * (BEGIN ... COMMIT) — así fn_confirmar_codigo usa su FOR UPDATE real.
 */
class CodigoVerificacionRepositorySQL extends CodigoVerificacionRepository {
  constructor(database) {
    super();
    this.database = database;
  }

  #preparar(sql, ejecutor) {
    return (ejecutor || this.database.db).prepare(sql);
  }

  async guardar({ usuarioId, codigoHash, tipo, expiraEn }, ejecutor) {
    await this.#preparar(
      `INSERT INTO codigos_verificacion (usuario_id, codigo_hash, tipo, expira_en)
       VALUES (?, ?, ?, ?)`,
      ejecutor
    ).run(usuarioId, codigoHash, tipo, expiraEn);
  }

  async buscarActivo({ usuarioId, tipo }, ejecutor) {
    return this.#preparar(
      `SELECT *
         FROM codigos_verificacion
        WHERE usuario_id = ?
          AND tipo = ?
          AND usado_en IS NULL
          AND expira_en > now()
        ORDER BY creado_en DESC
        LIMIT 1`,
      ejecutor
    ).get(usuarioId, tipo);
  }

  async aumentarIntento(id, ejecutor) {
    const fila = await this.#preparar(
      `UPDATE codigos_verificacion
          SET intentos = intentos + 1
        WHERE id = ?
        RETURNING intentos`,
      ejecutor
    ).get(id);
    return fila?.intentos ?? 0;
  }

  /**
   * Llama a la función ACID fn_confirmar_codigo DENTRO de la transacción:
   * bloquea la fila (FOR UPDATE), consume el código y marca el correo
   * como verificado — todo o nada. Devuelve 'OK' o 'CODIGO_INVALIDO'.
   */
  async confirmarCon(ejecutor, { usuarioId, codigoHash, tipo }) {
    const fila = await this.#preparar(
      `SELECT fn_confirmar_codigo(?, ?, ?) AS resultado`,
      ejecutor
    ).get(usuarioId, codigoHash, tipo);
    return fila?.resultado ?? "CODIGO_INVALIDO";
  }
}

module.exports = CodigoVerificacionRepositorySQL;