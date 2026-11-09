export class Partida {

    constructor(jugador) {
        this.jugador = jugador;
        this.movimientos = 0;
        this.segundos = 60;
        this.cartasVolteadas = [];
        this.cartasEncontradas = 0;
    }

    aumentarMovimientos() {
        this.movimientos++;
    }

    agregarCartaVolteada(carta) {
        this.cartasVolteadas.push(carta);
    }

    limpiarCartasVolteadas() {
        this.cartasVolteadas = [];
    }

    obtenerJugador() {
        return this.jugador;
    }

    reiniciar() {

        this.movimientos = 0;
        this.segundos = 60;
        this.cartasVolteadas = [];
        this.cartasEncontradas = 0;

        this.jugador.reiniciarPuntaje();
    }
}