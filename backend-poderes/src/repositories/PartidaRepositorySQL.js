const PartidaRepository = require("./PartidaRepository");
const Jugador = require("../entities/Jugador");
const Partida = require("../entities/Partida");
const Tablero = require("../entities/Tablero");

/**
 * TERCERA IMPLEMENTACIÓN CONCRETA del mismo contrato PartidaRepository:
 * persiste cada partida en SQLite dentro de la tabla `partidas`.
 *
 * >>> LSP (Sustitución de Liskov) — la prueba fuerte <<<
 * Igual que PartidaRepositoryMemoria y PartidaRepositoryArchivo, esta
 * clase cumple SOLO los métodos que define el contrato (obtener/guardar)
 * y pasa la MISMA batería de tests (ver
 * tests/contratoPartidaRepository.js). El PoderService no se entera si
 * la partida vive en un Map, en un archivo JSON o en una base de datos
 * SQL — el contrato queda intacto.
 *
 * >>> SQL + JSON <<<
 * La columna `estado_json` guarda TODO el estado interno de la partida
 * (eventos, chakra y vida de cada jugador, poderes activos) serializado
 * como JSON. SQL aporta lo estructural (tabla, PK, fechas, consultas por
 * id) y JSON aporta lo flexible: el estado de una partida no cabe en
 * columnas fijas sin acoplarse a los 6 poderes que existen hoy.
 *
 * A diferencia de PartidaRepositoryArchivo — que escribía el JSON en
 * disco pero LEÍA de un cache en memoria (por eso perdía todo al
 * reiniciar el servidor) — acá la lectura VUELVE A LA BASE:
 * si reinicias el servidor, la partida sobrevive.
 */
const SQL_UPSERT_PARTIDA = `
  INSERT INTO partidas (id, estado_json)
  VALUES (?, ?)
  ON CONFLICT(id) DO UPDATE SET
    estado_json    = excluded.estado_json,
    actualizada_en = CURRENT_TIMESTAMP
`;
const SQL_SELECT_ESTADO = "SELECT estado_json FROM partidas WHERE id = ?";

class PartidaRepositorySQL extends PartidaRepository {
  #insertarPartida;
  #consultaPorId;

  constructor(database) {
    super();
    this.database = database;
    // Los prepare() van en el constructor y NO como inicializadores de
    // campo de clase: los campos de clase se inicializan antes del cuerpo
    // del constructor, cuando this.database todavía no existe.
    this.#insertarPartida = this.database.db.prepare(SQL_UPSERT_PARTIDA);
    this.#consultaPorId = this.database.db.prepare(SQL_SELECT_ESTADO);
  }

  /** Serializa el estado interno de la partida a la "foto" JSON que se guarda. */
  #foto(partida) {
    return {
      id: partida.id,
      eventos: partida.eventos || [],
      jugadores: Object.fromEntries(
        Object.entries(partida.jugadores).map(([id, j]) => [
          id,
          { nombre: j.nombre, chakra: j.chakra, vida: j.vida },
        ])
      ),
      poderesActivos: Object.fromEntries(
        Object.entries(partida.poderesActivos || {}).map(([id, poder]) => [
          id,
          { id: poder.id },
        ])
      ),
    };
  }

  /**
   * OPERACIÓN ATÓMICA leer-modificar-guardar CON AISLAMIENTO (ACID).
   *
   * Sobrescribe el default del contrato: en vez de obtener()+guardar()
   * en dos pasos, hace TODO dentro de UNA transacción:
   *
   *   - SQLite: BEGIN IMMEDIATE (bloqueo de escritura desde el arranque).
   *   - PostgreSQL: BEGIN + SELECT ... FOR UPDATE (bloquea la fila).
   *
   * Así dos activaciones de poder concurrentes sobre la misma partida no
   * se pisan (no hay lost update): la segunda lee el estado YA confirmado
   * por la primera. Si el mutador lanza, ROLLBACK deja la partida intacta.
   */
  async actualizar(idPartida, mutador) {
    const esPostgres = this.database.motor === "postgres";
    const sqlSelect = esPostgres
      ? `${SQL_SELECT_ESTADO} FOR UPDATE`
      : SQL_SELECT_ESTADO;

    return this.database.transaccion(async (db) => {
      const fila = await db.prepare(sqlSelect).get(idPartida);
      if (!fila) {
        throw new Error(`No existe la partida ${idPartida}`);
      }

      const partida = this.#reconstruirPartida(JSON.parse(fila.estado_json));
      const resultado = await mutador(partida);

      await db.prepare(SQL_UPSERT_PARTIDA).run(idPartida, JSON.stringify(this.#foto(partida)));
      return resultado;
    });
  }

  guardar(idPartida, partida) {
    this.#insertarPartida.run(idPartida, JSON.stringify(this.#foto(partida)));
  }

  async obtener(idPartida) {
    const fila = await this.#consultaPorId.get(idPartida);
    if (!fila) return null;
    return this.#reconstruirPartida(JSON.parse(fila.estado_json));
  }

  /**
   * Reconstruye la ENTIDAD Partida real (con todos sus métodos y reglas)
   * a partir del JSON. Esto es más fiel que el "envoltorio liviano" del
   * repositorio en archivo: chakra y vida se restauran con los métodos
   * encapulados de Jugador (ganarChakra/recibirDanio), y los poderes
   * activos se conservan por su id (que es todo lo que PoderService
   * necesita para el contraataque).
   */
  #reconstruirPartida(estado) {
    const jugadores = Object.entries(estado.jugadores || {}).map(
      ([id, datos]) => {
        const jugador = new Jugador(id, datos.nombre);
        jugador.ganarChakra(datos.chakra);
        if (datos.vida < jugador.vida) {
          jugador.recibirDanio(jugador.vida - datos.vida);
        }
        return jugador;
      }
    );

    const partida = new Partida(estado.id, jugadores[0], jugadores[1]);
    partida.eventos = estado.eventos || [];
    partida.poderesActivos = estado.poderesActivos || {};
    partida.tablero = new Tablero();
    return partida;
  }
}

module.exports = PartidaRepositorySQL;