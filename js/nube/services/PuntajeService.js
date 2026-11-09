//Aquí aplico Responsabilidad Única porque PuntajeService se encarga únicamente de calcular y agregar el puntaje
//por qué es importante
//Porque si necesito cambiar la forma de calcular el puntaje, 
// solamente modifico este servicio y no tengo que modificar todo el juego

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