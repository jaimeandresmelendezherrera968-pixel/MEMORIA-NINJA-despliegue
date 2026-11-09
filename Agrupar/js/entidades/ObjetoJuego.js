export class ObjetoJuego {
    #imagen;
    #categoria;

    constructor(imagen, categoria) {
        if (new.target === ObjetoJuego) {
            throw new Error("ObjetoJuego es una clase abstracta.");
        }

        this.#imagen = imagen;
        this.#categoria = categoria;
    }

    get imagen() {
        return this.#imagen;
    }

    get categoria() {
        return this.#categoria;
    }

    obtenerDescripcion() {
        throw new Error("El método obtenerDescripcion debe ser implementado.");
    }
}
