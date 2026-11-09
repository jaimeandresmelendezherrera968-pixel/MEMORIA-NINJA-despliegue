export class PuntajeService {

    constructor() {

        this.puntosPorPareja = 10;
    }


    calcularPuntos() {

        return this.puntosPorPareja;
    }


    agregarPuntos(jugador) {

        jugador.sumarPuntos(
            this.calcularPuntos()
        );
    }
}