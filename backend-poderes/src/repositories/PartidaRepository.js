/**
 * INTERFAZ: PartidaRepository
 *
 * >>> ABSTRACCIÓN + ISP <<<
 * Define solo los métodos que el Service realmente necesita para leer y
 * guardar partidas — nada más. Si mañana hay que guardar en una base de
 * datos real en vez de en memoria, se crea otra clase que cumpla este
 * mismo contrato (ej. PartidaRepositoryMongo) y el Service no se entera
 * del cambio.
 */
class PartidaRepository {
  obtener(idPartida) {
    throw new Error("obtener() no implementado");
  }

  guardar(idPartida, partida) {
    throw new Error("guardar() no implementado");
  }

  /**
   * OPERACIÓN ATÓMICA leer-modificar-guardar.
   *
   * El Service la usa en vez de llamar obtener()+guardar() por separado.
   * La implementación por DEFECTO de aquí abajo basta para Memoria y
   * Archivo (obtener -> mutador -> guardar). Las implementaciones sobre
   * una base de datos real la SOBRESCRIBEN para envolverla en una
   * transacción con aislamiento (row lock), que es lo que evita el
   * "lost update" cuando dos peticiones compiten por la misma partida.
   *
   * Lanza si la partida no existe, para que el contrato sea el mismo en
   * todas las implementaciones (LSP).
   */
  async actualizar(idPartida, mutador) {
    const partida = await this.obtener(idPartida);
    if (!partida) {
      throw new Error(`No existe la partida ${idPartida}`);
    }
    const resultado = await mutador(partida);
    await this.guardar(idPartida, partida);
    return resultado;
  }
}

module.exports = PartidaRepository;
