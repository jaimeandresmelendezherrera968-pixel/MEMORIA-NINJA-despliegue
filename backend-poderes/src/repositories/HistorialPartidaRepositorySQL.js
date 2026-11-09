/**
 * IMPLEMENTACIÓN CONCRETA: HistorialPartidaRepositorySQL
 *
 * Guarda el HISTORIAL de partidas de cada usuario en la tabla
 * `historial_partidas` (relación por FK con `usuarios`). Esta tabla es
 * 100% relacional: puntaje, zona, modo, ganador y fecha son columnas
 * consultables — aquí JSON no aporta nada porque no hay estado flexible.
 *
 * >>> SRP <<<
 * Esta clase solo sabe persistir/consultar histórico. No calcula
 * puntajes ni decide ganadores: eso es del frontend/Services.
 */
class HistorialPartidaRepositorySQL {
  #insertaRegistro;
  #consultaPorUsuario;

  constructor(database) {
    this.database = database;
    // prepare() en el constructor, no como campo de clase (los campos se
    // inicializan antes del cuerpo del constructor).
    this.#insertaRegistro = this.database.db.prepare(`
      INSERT INTO historial_partidas
        (id, id_usuario, id_partida, zona, puntaje, modo, ganador)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    this.#consultaPorUsuario = this.database.db.prepare(`
      SELECT * FROM historial_partidas
      WHERE id_usuario = ?
      ORDER BY jugada_en DESC, rowid DESC
    `);
  }

  // async + devolver la promesa del run(): imprescindible en PostgreSQL
  // (asíncrono) e inocuo en SQLite (síncrono).
  async registrar({ id, idUsuario, idPartida, zona, puntaje, modo, ganador }) {
    return this.#insertaRegistro.run(
      id,
      idUsuario,
      idPartida ?? null,
      zona ?? null,
      puntaje ?? null,
      modo ?? null,
      ganador ?? null
    );
  }

  /**
   * Inserta un resultado usando la conexión `db` que se le pase: por
   * defecto la del pool, o el `dbCliente` de Database.transaccion()
   * para que el INSERT quede dentro de una transacción ACID (sub-parte 3.5).
   */
  async registrarEn(db, { id, idUsuario, idPartida, zona, puntaje, modo, ganador }) {
    const sentencia = db.prepare(`
      INSERT INTO historial_partidas
        (id, id_usuario, id_partida, zona, puntaje, modo, ganador)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    return sentencia.run(
      id,
      idUsuario,
      idPartida ?? null,
      zona ?? null,
      puntaje ?? null,
      modo ?? null,
      ganador ?? null
    );
  }

  /** ids de partida ya registrados para un usuario (dedup del merge invitado). */
  async idPartidasDe(idUsuario, db = this.database.db) {
    const sentencia = db.prepare(`
      SELECT id_partida FROM historial_partidas
      WHERE id_usuario = ? AND id_partida IS NOT NULL
    `);
    const filas = await sentencia.all(idUsuario);
    return new Set(filas.map((fila) => fila.id_partida));
  }

  async porUsuario(idUsuario) {
    return this.#consultaPorUsuario.all(idUsuario);
  }
}

module.exports = HistorialPartidaRepositorySQL;