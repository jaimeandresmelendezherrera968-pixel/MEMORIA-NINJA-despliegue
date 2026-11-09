export class JuegoService {

    constructor(partida, cartaService, puntajeService) {
        this.partida = partida;
        this.cartaService = cartaService;
        this.puntajeService = puntajeService;
    }

    iniciar() {

        this.partida.reiniciar();

        return this.cartaService.obtenerCartas();
    }

    voltearCarta(carta) {

        if (carta.estaEncontrada()) {
            return false;
        }

        if (carta.estaVolteada()) {
            return false;
        }

        if (this.partida.cartasVolteadas.length >= 2) {
            return false;
        }

        carta.voltear();

        this.partida.agregarCartaVolteada(carta);

        return true;
    }

    verificarPareja() {

        const cartas = this.partida.cartasVolteadas;

        if (cartas.length !== 2) {
            return null;
        }

        const carta1 = cartas[0];
        const carta2 = cartas[1];

        const coinciden =
            carta1.getId() === carta2.getId();

        if (coinciden) {

            carta1.marcarEncontrada();
            carta2.marcarEncontrada();

            this.puntajeService.agregarPuntos(
                this.partida.obtenerJugador()
            );

            this.partida.cartasEncontradas += 2;
        }

        return coinciden;
    }

    finalizarIntento() {
        this.partida.limpiarCartasVolteadas();
    }

    aumentarMovimiento() {
        this.partida.aumentarMovimientos();
    }

    verificarVictoria(totalCartas) {
        return this.partida.cartasEncontradas >= totalCartas;
    }
}