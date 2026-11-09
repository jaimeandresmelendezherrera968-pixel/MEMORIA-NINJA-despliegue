export class Partida {

    constructor(jugador) {

        this.jugador = jugador;

        this.secuencia = [];

        this.respuestaJugador = [];

        this.ronda = 4;

        this.segundos = 0;

        this.minutos = 0;

        this.finalizada = false;

    }


    establecerSecuencia(secuencia) {

        this.secuencia = secuencia;

    }


    agregarRespuesta(id) {

        this.respuestaJugador.push(id);

    }


    limpiarRespuesta() {

        this.respuestaJugador = [];

    }


    aumentarRonda() {

        this.ronda += 2;

    }


    sumarTiempo() {

        this.segundos++;

        if (this.segundos === 60) {

            this.segundos = 0;

            this.minutos++;

        }

    }


    reiniciar() {

        this.secuencia = [];

        this.respuestaJugador = [];

        this.ronda = 4;

        this.segundos = 0;

        this.minutos = 0;

        this.finalizada = false;

        this.jugador.reiniciarPuntaje();

    }


    obtenerRonda() {

        return this.ronda;

    }


    obtenerPuntaje() {

        return this.jugador.getPuntaje();

    }

}