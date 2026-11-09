export class Jugador {

    constructor(nombre) {
        this.nombre = nombre;
        this.puntaje = 0;
    }

    sumarPuntos(puntos) {
        this.puntaje += puntos;
    }

    reiniciarPuntaje() {
        this.puntaje = 0;
    }

    getNombre() {
        return this.nombre;
    }

    getPuntaje() {
        return this.puntaje;
    }
}