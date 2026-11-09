/**
 * SERVICIO: PoderService
 *
 * >>> SRP (Responsabilidad Única) <<<
 * Esta clase SOLO se ocupa de la lógica de "activar un poder dentro de
 * una partida": validar, aplicar el efecto, guardar el resultado y
 * registrar el evento. No sabe nada de HTTP (eso es del Controller) ni
 * de cómo se guardan los datos en disco/memoria (eso es del Repository).
 *
 * >>> DIP (Inversión de Dependencias) <<<
 * Recibe el repositorio y la fábrica de poderes YA ARMADOS por el
 * constructor (inyección de dependencias). No hace "new PartidaRepositoryMemoria()"
 * ni "new PoderFactory()" en medio de su lógica — depende de las
 * ABSTRACCIONES que le pasan desde afuera (server.js), no de clases
 * concretas. Esto permite testear este Service con un repositorio falso
 * (o con la implementación en archivo) sin tocar una sola línea de esta
 * clase — ver tests/poderService.test.js.
 */
class PoderService {
  constructor(partidaRepository, poderFactory) {
    this.partidaRepository = partidaRepository;
    this.poderFactory = poderFactory;
  }

  /**
   * Activa un poder dentro de una partida.
   *
   * >>> ACID -> Isolation <<<
   * Toda la lectura-modificación-escritura ocurre dentro de
   * `partidaRepository.actualizar(...)`, que la ejecuta en UNA transacción
   * con aislamiento. Antes eran dos pasos (obtener + guardar) que, bajo
   * concurrencia, permitían un "lost update"; ahora no.
   */
  async activarPoder({ idPartida, idJugador, idPoder }) {
    return this.partidaRepository.actualizar(idPartida, (partida) => {
      const jugador = partida.obtenerJugador(idJugador);
      const rival = partida.obtenerRival(idJugador);

      // >>> POLIMORFISMO <<<
      // No importa cuál de los 6 poderes sea: siempre se llama igual.
      const poder = this.poderFactory.crear(idPoder);

      if (!jugador.tieneChakraPara(poder.costoChakra)) {
        partida.registrarEvento(`${jugador.nombre} intentó usar ${poder.nombre} sin chakra suficiente`);
        return { exito: false, motivo: "chakra_insuficiente" };
      }

      // Contraataque: si el rival tiene el poder contrario listo, se bloquea
      const poderRivalActivo = partida.poderActivoDe(rival.id);
      if (poderRivalActivo && poder.puedeSerContrarrestadoPor(poderRivalActivo)) {
        jugador.gastarChakra(poder.costoChakra); // igual pierde el chakra
        partida.registrarEvento(`${rival.nombre} contrarrestó ${poder.nombre} con ${poderRivalActivo.nombre}`);
        return { exito: false, motivo: "contrarrestado", contrarrestadoPor: poderRivalActivo.nombre };
      }

      const resultado = poder.activar({
        jugador,
        rival,
        tablero: partida.tablero,
        registrarEvento: (mensaje) => partida.registrarEvento(mensaje),
      });

      partida.marcarPoderActivo(jugador.id, poder);
      return { exito: true, resultado, chakraRestante: jugador.chakra, vidaRival: rival.vida };
    });
  }
}

module.exports = PoderService;
