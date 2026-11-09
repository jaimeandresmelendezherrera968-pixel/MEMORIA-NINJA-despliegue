export class JuegoService {

    constructor(
        partida,
        secuenciaService,
        puntajeService
    ) {

        this.partida = partida;

        this.secuenciaService =
            secuenciaService;

        this.puntajeService =
            puntajeService;

    }


    iniciar(ids) {

        this.partida.reiniciar();


        const secuencia =
            this.secuenciaService
                .generarSecuencia(ids);


        this.partida
            .establecerSecuencia(secuencia);


        return secuencia;

    }


    registrarRespuesta(id) {

        this.partida
            .agregarRespuesta(id);


        const posicion =
            this.partida.respuestaJugador.length - 1;


        const correcto =
            id ===
            this.partida.secuencia[posicion];


        return {

            correcto: correcto,

            posicion: posicion,

            terminado:
                this.partida.respuestaJugador.length ===
                this.partida.ronda

        };

    }


    rondaCompletada() {

        return (
            this.partida.respuestaJugador.length ===
            this.partida.ronda
        );

    }


    sumarPuntos() {

        return this.puntajeService
            .agregarPuntos(
                this.partida.jugador,
                this.partida.ronda
            );

    }


    siguienteRonda() {

        this.partida.aumentarRonda();

        this.partida.limpiarRespuesta();

    }


    esVictoria() {

        return this.partida.ronda === 16;

    }


    obtenerSecuencia() {

        return this.partida.secuencia;

    }


    obtenerRonda() {

        return this.partida.ronda;

    }


    obtenerPuntaje() {

        return this.partida.jugador
            .getPuntaje();

    }

}