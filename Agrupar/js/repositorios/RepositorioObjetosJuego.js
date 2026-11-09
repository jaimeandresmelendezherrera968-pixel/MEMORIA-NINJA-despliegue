import { RepositorioObjetos } from "./RepositorioObjetos.js";
import { ObjetoMitologico } from "../entidades/ObjetoMitologico.js";
import { ObjetoCienciaFiccion } from "../entidades/ObjetoCienciaFiccion.js";

export class RepositorioObjetosJuego extends RepositorioObjetos {
    obtenerObjetos() {
        return [
            new ObjetoMitologico("Zeus.png"),
            new ObjetoMitologico("Sirena.png"),
            new ObjetoMitologico("Mounstro.png"),
            new ObjetoMitologico("Medusa.png"),
            new ObjetoMitologico("Minotauro.png"),
            new ObjetoMitologico("Cupido.png"),

            new ObjetoCienciaFiccion("Batman.png"),
            new ObjetoCienciaFiccion("LinternaVerde.png"),
            new ObjetoCienciaFiccion("Marciano.png"),
            new ObjetoCienciaFiccion("Nave.png"),
            new ObjetoCienciaFiccion("StrangerThings.png"),
            new ObjetoCienciaFiccion("Superman.png")
        ];
    }
}
