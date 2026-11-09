export class Partida {

    constructor(jugador1, jugador2 = null) {

        this.jugador1 = jugador1;

        this.jugador2 = jugador2;

        this.jugadorActual = 1;

        this.movimientos = 0;

        this.segundos = 60;

        this.cartasVolteadas = [];

        this.cartasEncontradas = 0;

        this.totalCartas = 0;

        this.finalizada = false;

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


    cambiarTurno() {

        this.jugadorActual =
            this.jugadorActual === 1
                ? 2
                : 1;

    }


    obtenerJugadorActual() {

        return this.jugadorActual === 1
            ? this.jugador1
            : this.jugador2;

    }


    aumentarCartasEncontradas() {

        this.cartasEncontradas += 2;

    }


    establecerTotalCartas(total) {

        this.totalCartas = total;

    }


    hayVictoria() {

        return (
            this.cartasEncontradas >=
            this.totalCartas
        );

    }


    reiniciar() {

        this.jugadorActual = 1;

        this.movimientos = 0;

        this.segundos = 60;

        this.cartasVolteadas = [];

        this.cartasEncontradas = 0;

        this.finalizada = false;

        this.jugador1.reiniciarPuntaje();

        if (this.jugador2) {

            this.jugador2.reiniciarPuntaje();

        }

    }

}