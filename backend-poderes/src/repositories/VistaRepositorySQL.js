/**
 * IMPLEMENTACIÓN CONCRETA: VistaRepositorySQL
 *
 * Consulta las 4 VISTAS creadas en la BD (PostgreSQL o SQLite):
 *   vw_partidas_recientes, vw_historial_detallado,
 *   vw_ranking_mejor_puntaje, vw_usuarios_resumen.
 *
 * >>> SRP <<<
 * Solo traduce vistas en filas. No calcula rankings ni arma respuestas
 * HTTP — eso vive en VistaService / VistaController.
 */
class VistaRepositorySQL {
  #partidasRecientes;
  #historialDetallado;
  #rankingMejorPuntaje;
  #usuariosResumen;

  constructor(database) {
    this.database = database;
    // prepare() en el constructor (los campos se inicializan antes del
    // cuerpo del constructor, cuando this.database aún no existe).
    this.#partidasRecientes = this.database.db.prepare(
      "SELECT * FROM vw_partidas_recientes"
    );

    this.#historialDetallado = this.database.db.prepare(
      "SELECT * FROM vw_historial_detallado"
    );

    this.#rankingMejorPuntaje = this.database.db.prepare(
      "SELECT * FROM vw_ranking_mejor_puntaje"
    );

    this.#usuariosResumen = this.database.db.prepare(
      "SELECT * FROM vw_usuarios_resumen"
    );
  }

  async partidasRecientes() {
    return this.#partidasRecientes.all();
  }

  async historialDetallado() {
    return this.#historialDetallado.all();
  }

  async rankingMejorPuntaje() {
    return this.#rankingMejorPuntaje.all();
  }

  async usuariosResumen() {
    return this.#usuariosResumen.all();
  }
}

module.exports = VistaRepositorySQL;
