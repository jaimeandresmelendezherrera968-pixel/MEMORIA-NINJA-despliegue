const crypto = require("node:crypto");

/**
 * IMPLEMENTACIÓN CONCRETA: ProcedimientoRepositorySQL
 *
 * Ejecuta el PROCEDIMIENTO ALMACENADO sp_registrar_partida.
 *
 * - PostgreSQL (motor = "postgres"): llama con CALL sp_registrar_partida(...).
 *   La traducción de placeholders (? -> $n) la hace DatabasePostgres.
 * - SQLite (motor = "sqlite"): SQLite no tiene procedimientos almacenados,
 *   así que ejecuta la MISMA operación como INSERT directo (semántica idéntica).
 *
 * >>> SRP <<< Solo persiste el resultado vía el mecanismo del motor.
 */
class ProcedimientoRepositorySQL {
  #callRegistrarPartida;
  #callCrearPartidaCompleta;
  #insertarResultado;
  #insertarPartida;
  #insertarHistorial;

  constructor(database) {
    this.database = database;
    // prepare() en el constructor (los campos se inicializan antes del
    // cuerpo del constructor, cuando this.database aún no existe).
    // IMPORTANTE: SQLite NO puede preparar "CALL ..." (sintaxis desconocida),
    // por eso solo se preparan en PostgreSQL.
    if (database.motor === "postgres") {
      this.#callRegistrarPartida = database.db.prepare(
        "CALL sp_registrar_partida(?, ?, ?, ?, ?)"
      );
      this.#callCrearPartidaCompleta = database.db.prepare(
        "CALL sp_crear_partida_completa(?, ?, ?, ?, ?, ?, ?)"
      );
    }

    this.#insertarResultado = this.database.db.prepare(`
      INSERT INTO historial_partidas
        (id, id_usuario, zona, puntaje, modo, ganador)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    this.#insertarPartida = this.database.db.prepare(`
      INSERT INTO partidas (id, estado_json) VALUES (?, ?)
    `);

    this.#insertarHistorial = this.database.db.prepare(`
      INSERT INTO historial_partidas
        (id, id_usuario, id_partida, zona, puntaje, modo, ganador)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
  }

  async registrarResultado({ idUsuario, zona, puntaje, modo, ganador }) {
    const id = crypto.randomUUID();

    if (this.database.motor === "postgres") {
      await this.#callRegistrarPartida.run(
        idUsuario,
        zona ?? null,
        puntaje ?? null,
        modo ?? null,
        ganador ?? null
      );
      return;
    }

    await this.#insertarResultado.run(
      id,
      idUsuario,
      zona ?? null,
      puntaje ?? null,
      modo ?? null,
      ganador ?? null
    );
  }

  async crearPartidaCompleta({ idPartida, estadoJson, idUsuario, zona, puntaje, modo, ganador }) {
    if (this.database.motor === "postgres") {
      await this.#callCrearPartidaCompleta.run(
        idPartida,
        estadoJson ?? "{}",
        idUsuario,
        zona ?? null,
        puntaje ?? null,
        modo ?? null,
        ganador ?? null
      );
      return;
    }

    // SQLite: misma operación con transacción para que sea igual de
    // atómica que el CALL de PostgreSQL (o todo, o nada).
    const db = this.database.db;
    db.exec("BEGIN");
    try {
      this.#insertarHistorial.run(
        crypto.randomUUID(),
        idUsuario,
        idPartida,
        zona ?? null,
        puntaje ?? null,
        modo ?? null,
        ganador ?? null
      );
      this.#insertarPartida.run(idPartida, estadoJson ?? "{}");
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

module.exports = ProcedimientoRepositorySQL;
