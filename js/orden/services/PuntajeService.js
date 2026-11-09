export class PuntajeService {


    calcularPuntos(ronda) {

        return ronda * 10;

    }


    agregarPuntos(jugador, ronda) {

        const puntos =
            this.calcularPuntos(ronda);

        jugador.sumarPuntos(puntos);

        return puntos;

    }

}