export class JuegoService {


    constructor(
        partida,
        puntajeService
    ) {

        this.partida =
            partida;

        this.puntajeService =
            puntajeService;

    }


    iniciar(totalCartas) {

        this.partida.reiniciar();

        this.partida
            .establecerTotalCartas(
                totalCartas
            );

    }


    puedeVoltear(carta) {

        if (
            carta.estaVolteada()
        ) {

            return false;

        }


        if (
            carta.estaEmparejada()
        ) {

            return false;

        }


        if (
            this.partida
                .cartasVolteadas
                .length >= 2
        ) {

            return false;

        }


        return true;

    }


    voltearCarta(carta) {

        if (
            !this.puedeVoltear(carta)
        ) {

            return false;

        }


        carta.voltear();


        this.partida
            .agregarCartaVolteada(
                carta
            );


        return true;

    }


    verificarPareja() {

        const cartas =
            this.partida
                .cartasVolteadas;


        if (
            cartas.length !== 2
        ) {

            return null;

        }


        const carta1 =
            cartas[0];

        const carta2 =
            cartas[1];


        return (
            carta1.getIdPareja() ===
            carta2.getIdPareja()
        );

    }


    parejaCorrecta() {

        const cartas =
            this.partida
                .cartasVolteadas;


        cartas.forEach(
            carta => {

                carta.marcarEmparejada();

            }
        );


        this.partida
            .aumentarCartasEncontradas();


        const jugador =
            this.partida
                .obtenerJugadorActual();


        this.puntajeService
            .agregarPuntos(
                jugador
            );


        this.partida
            .limpiarCartasVolteadas();

    }


    parejaIncorrecta() {

        const cartas =
            this.partida
                .cartasVolteadas;


        cartas.forEach(
            carta => {

                carta.ocultar();

            }
        );


        this.partida
            .limpiarCartasVolteadas();


        if (
            this.partida.jugador2
        ) {

            this.partida
                .cambiarTurno();

        }

    }


    aumentarMovimiento() {

        this.partida
            .aumentarMovimientos();

    }


    hayVictoria() {

        return this.partida
            .hayVictoria();

    }


    obtenerJugador1() {

        return this.partida
            .jugador1;

    }


    obtenerJugador2() {

        return this.partida
            .jugador2;

    }


    obtenerJugadorActual() {

        return this.partida
            .obtenerJugadorActual();

    }

}