import { ObjetoJuego } from "./ObjetoJuego.js";

export class ObjetoCienciaFiccion extends ObjetoJuego {
    constructor(imagen) {
        super(imagen, "scifi");
    }

    obtenerDescripcion() {
        return "Objeto de la categoría Ciencia Ficción";
    }
}
