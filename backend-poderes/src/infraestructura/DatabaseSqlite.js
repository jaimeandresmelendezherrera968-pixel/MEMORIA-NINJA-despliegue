const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

/**
 * INFRAESTRUCTURA: DatabaseSqlite
 *
 * Punto ÚNICO de contacto con SQLite. Todos los repositorios SQL
 * (PartidaRepositorySQL, UsuarioRepositorySQL, HistorialPartidaRepositorySQL)
 * reciben ESTA clase por constructor y usan su propiedad `db` — nunca
 * abren su propia conexión. Así la creación del esquema (migración) y
 * la conexión viven en un solo lugar.
 *
 * >>> SRP <<<
 * Esta clase solo sabe UNA cosa: abrir la base y garantizar que las
 * tablas existan. No conoce partidas, usuarios ni reglas de negocio.
 *
 * >>> DIP <<<
 * Quien usa la base de datos no sabe (ni le interesa) que por debajo
 * es SQLite: los repositorios reciben "un DatabaseSqlite" ya armado
 * desde server.js (composition root).
 *
 * El estado complejo de cada partida (tablero, eventos, chakra, vida,
 * poderes activos) se persiste como COLUMNA JSON dentro de la tabla
 * `partidas`: SQL para lo estructural (id, claves, fechas, historial
 * consultable) + JSON para lo flexible (el estado exacto del juego).
 */
class DatabaseSqlite {
  constructor(rutaArchivo = path.join(__dirname, "..", "..", "data", "memorice.sqlite")) {
    if (rutaArchivo !== ":memory:") {
      const carpeta = path.dirname(rutaArchivo);
      if (!fs.existsSync(carpeta)) {
        fs.mkdirSync(carpeta, { recursive: true });
      }
    }

    this.ubicacion = rutaArchivo;
    this.motor = "sqlite";
    this.db = new DatabaseSync(rutaArchivo);
    this.db.exec("PRAGMA foreign_keys = ON;");
    this.#crearEsquema();
    this.#migrarColumnasPerfil();
  }

  /**
   * Migración idempotente del PERFIL: las bases creadas antes de existir
   * el sistema de experiencia no tienen las columnas de perfil. Como
   * CREATE TABLE IF NOT EXISTS no añade columnas a una tabla ya creada,
   * se agregan una por una solo si faltan. El DEFAULT rellena las filas
   * viejas: toda cuenta preexistente queda con 500 XP y el resto en 0.
   */
  #migrarColumnasPerfil() {
    const columnasExistentes = this.db
      .prepare("PRAGMA table_info(usuarios)")
      .all()
      .map((columna) => columna.name);

    const columnasPerfil = [
      ["xp", "INTEGER NOT NULL DEFAULT 500"],
      ["victorias", "INTEGER NOT NULL DEFAULT 0"],
      ["derrotas", "INTEGER NOT NULL DEFAULT 0"],
      ["racha", "INTEGER NOT NULL DEFAULT 0"],
      ["puntaje_max", "INTEGER NOT NULL DEFAULT 0"],
    ];

    for (const [nombre, definicion] of columnasPerfil) {
      if (!columnasExistentes.includes(nombre)) {
        this.db.exec(`ALTER TABLE usuarios ADD COLUMN ${nombre} ${definicion}`);
      }
    }
  }

  /** Crea las tablas si no existen (migración idempotente). */
  #crearEsquema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS partidas (
        id             TEXT PRIMARY KEY,
        estado_json    TEXT NOT NULL,
        creada_en      TEXT NOT NULL DEFAULT (datetime('now')),
        actualizada_en TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS usuarios (
        id            TEXT PRIMARY KEY,
        usuario       TEXT NOT NULL UNIQUE,
        correo        TEXT NOT NULL UNIQUE,
        nacimiento    TEXT,
        password_hash TEXT NOT NULL,
        creado_en     TEXT NOT NULL DEFAULT (datetime('now')),
        -- Perfil de juego: toda cuenta nueva nace con 500 XP y el resto en 0.
        xp            INTEGER NOT NULL DEFAULT 500,
        victorias     INTEGER NOT NULL DEFAULT 0,
        derrotas      INTEGER NOT NULL DEFAULT 0,
        racha         INTEGER NOT NULL DEFAULT 0,
        puntaje_max   INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS historial_partidas (
        id         TEXT PRIMARY KEY,
        id_usuario TEXT NOT NULL,
        id_partida TEXT,
        zona       TEXT,
        puntaje    INTEGER,
        modo       TEXT,
        ganador    TEXT,
        jugada_en  TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
      );

      CREATE INDEX IF NOT EXISTS idx_historial_usuario
        ON historial_partidas(id_usuario, jugada_en DESC);

      -- 1 TRIGGER: actualiza actualizada_en automáticamente en cada UPDATE
      CREATE TRIGGER IF NOT EXISTS trg_partidas_actualizar_fecha
      BEFORE UPDATE ON partidas
      FOR EACH ROW
      BEGIN
        UPDATE partidas
        SET actualizada_en = datetime('now')
        WHERE id = OLD.id;
      END;

      -- 4 VISTAS
      CREATE VIEW IF NOT EXISTS vw_partidas_recientes AS
        SELECT id, creada_en, actualizada_en
        FROM partidas
        ORDER BY actualizada_en DESC, creada_en DESC;

      CREATE VIEW IF NOT EXISTS vw_historial_detallado AS
        SELECT h.id, h.id_usuario, u.usuario, h.id_partida, h.zona,
               h.puntaje, h.modo, h.ganador, h.jugada_en
        FROM historial_partidas h
        LEFT JOIN usuarios u ON u.id = h.id_usuario
        ORDER BY h.jugada_en DESC;

      CREATE VIEW IF NOT EXISTS vw_ranking_mejor_puntaje AS
        SELECT u.id AS id_usuario, u.usuario,
               MAX(h.puntaje) AS mejor_puntaje,
               COUNT(h.id) AS total_partidas,
               MAX(h.jugada_en) AS ultima_jugada
        FROM historial_partidas h
        INNER JOIN usuarios u ON u.id = h.id_usuario
        GROUP BY u.id, u.usuario
        ORDER BY mejor_puntaje DESC NULLS LAST, total_partidas DESC;

      CREATE VIEW IF NOT EXISTS vw_usuarios_resumen AS
        SELECT u.id, u.usuario, u.correo, u.nacimiento, u.creado_en,
               COUNT(h.id) AS total_partidas,
               MAX(h.puntaje) FILTER (WHERE h.puntaje IS NOT NULL) AS max_puntaje,
               MAX(h.jugada_en) AS ultima_partida
        FROM usuarios u
        LEFT JOIN historial_partidas h ON h.id_usuario = u.id
        GROUP BY u.id, u.usuario, u.correo, u.nacimiento, u.creado_en
        ORDER BY total_partidas DESC, u.usuario ASC;
    `);
  }

  /**
   * TRANSACCIÓN con AISLAMIENTO real.
   *
   * BEGIN IMMEDIATE toma el bloqueo de escritura DESDE EL ARRANQUE (no al
   * primer write), así que dos operaciones leer-modificar-guardar
   * concurrentes sobre la misma partida NO pueden intercalarse: la
   * segunda espera a que la primera confirme. Eso es lo que evita el
   * "lost update" (ACID -> Isolation). Todas las sentencias comparten
   * `this.db` (la única conexión), por lo que todas caen en la misma
   * transacción.
   *
   * Recibe un callback `fn(db)` que devuelve el resultado a propagar.
   */
  async transaccion(fn) {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const resultado = await fn(this.db);
      this.db.exec("COMMIT");
      return resultado;
    } catch (error) {
      this.db.exec("ROLLBACK");
      throw error;
    }
  }

  cerrar() {
    this.db.close();
  }
}

module.exports = DatabaseSqlite;