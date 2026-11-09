const fs = require("fs");
const path = require("path");
const PartidaRepository = require("./PartidaRepository");
const Jugador = require("../entities/Jugador");
const Partida = require("../entities/Partida");
const Tablero = require("../entities/Tablero");

/**
 * SEGUNDA IMPLEMENTACIÓN CONCRETA del mismo contrato: en vez de guardar
 * en memoria, guarda cada partida como un archivo JSON en disco.
 *
 * >>> LSP (Sustitución de Liskov), la prueba fuerte <<<
 * Esta clase se puede usar en CUALQUIER lugar donde se use
 * PartidaRepositoryMemoria (por ejemplo, en server.js) y el
 * PoderService ni se entera del cambio — sigue llamando exactamente
 * los mismos dos métodos (obtener/guardar) con el mismo comportamiento
 * esperado. Las tres implementaciones pasan exactamente la misma batería
 * de tests de contrato (ver tests/contratoPartidaRepository.js).
 *
 * >>> PERSISTENCIA REAL EN DISCO (JSON) <<<
 * guardar() escribe una "foto" JSON del estado de la partida en
 * {carpeta}/{id}.json. obtener() primero consulta el cache en memoria
 * del proceso (rápido) y, si falla —por ejemplo, tras reiniciar el
 * servidor— VUELVE AL DISCO: lee el archivo JSON y reconstruye la
 * ENTIDAD Partida real con sus métodos encapsulados (igual que hace
 * PartidaRepositorySQL con la columna estado_json). Así la partida
 * sobrevive a un reinicio, cosa que antes no pasaba porque la lectura
 * solo miraba el cache.
 */
class PartidaRepositoryArchivo extends PartidaRepository {
  constructor(carpeta = path.join(__dirname, "..", "..", "data")) {
    super();
    this.carpeta = carpeta;
    if (!fs.existsSync(this.carpeta)) {
      fs.mkdirSync(this.carpeta, { recursive: true });
    }
  }

  #rutaDe(idPartida) {
    return path.join(this.carpeta, `${idPartida}.json`);
  }

  guardar(idPartida, partida) {
    // Se guarda la partida completa como referencia en memoria del
    // proceso (Map interno) Y además se persiste una foto en JSON del
    // estado, para que la lectura VUELVA AL DISCO si el proceso
    // reinicia (y el cache queda vacío).
    this.cacheEnMemoria ??= new Map();
    this.cacheEnMemoria.set(idPartida, partida);

    const foto = {
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
    fs.writeFileSync(this.#rutaDe(idPartida), JSON.stringify(foto, null, 2));
  }

  obtener(idPartida) {
    this.cacheEnMemoria ??= new Map();
    if (this.cacheEnMemoria.has(idPartida)) {
      return this.cacheEnMemoria.get(idPartida);
    }

    const ruta = this.#rutaDe(idPartida);
    if (!fs.existsSync(ruta)) return null;

    const foto = JSON.parse(fs.readFileSync(ruta, "utf8"));
    const partida = this.#reconstruirPartida(foto);
    this.cacheEnMemoria.set(idPartida, partida);
    return partida;
  }

  /**
   * Reconstruye la ENTIDAD Partida real (con todos sus métodos y reglas)
   * a partir del JSON leído en disco. Igual que hace PartidaRepositorySQL
   * con la columna estado_json: chakra y vida se restauran con los
   * métodos encapsulados de Jugador (ganarChakra/recibirDanio) y los
   * poderes activos se conservan por su id.
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

module.exports = PartidaRepositoryArchivo;