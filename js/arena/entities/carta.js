export class Carta {

    constructor(id, imagen) {
        this.id = id;
        this.imagen = imagen;
        this.volteada = false;
        this.encontrada = false;
    }

    voltear() {
        this.volteada = true;
    }

    ocultar() {
        this.volteada = false;
    }

    marcarEncontrada() {
        this.encontrada = true;
    }

    getId() {
        return this.id;
    }

    getImagen() {
        return this.imagen;
    }

    estaVolteada() {
        return this.volteada;
    }

    estaEncontrada() {
        return this.encontrada;
    }
}