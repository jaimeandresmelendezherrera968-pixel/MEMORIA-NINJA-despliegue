import { ObjetoJuego } from "./ObjetoJuego.js";

export class ObjetoMitologico extends ObjetoJuego {
    constructor(imagen) {
        super(imagen, "mitologia");
    }

    obtenerDescripcion() {
        return "Objeto de la categoría Mitología";
    }
}
