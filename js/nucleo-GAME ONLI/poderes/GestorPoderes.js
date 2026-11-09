import { ByakuganPoder } from "./ByakuganPoder.js";
import { SustitucionPoder } from "./SustitucionPoder.js";
import { RoboPoder } from "./RoboPoder.js";
import { GenjutsuPoder } from "./GenjutsuPoder.js";
import { SelloPoder } from "./SelloPoder.js";
import { BombaPoder } from "./BombaPoder.js";

/**
 * GESTOR DE PODERES
 */
export class GestorPoderes {
    constructor(contexto) {
        this.byakugan = new ByakuganPoder();
        this.sustitucion = new SustitucionPoder();
        this.robo = new RoboPoder();
        this.genjutsu = new GenjutsuPoder();
        this.sello = new SelloPoder();
        this.bomba = new BombaPoder();

        this.poderes = [
            this.byakugan,
            this.sustitucion,
            this.robo,
            this.genjutsu,
            this.sello,
            this.bomba,
        ];

        const contextoCompleto = { ...contexto, sustitucion: this.sustitucion, genjutsu: this.genjutsu };
        this.poderes.forEach((poder) => poder.inyectarContexto(contextoCompleto));
    }
}
