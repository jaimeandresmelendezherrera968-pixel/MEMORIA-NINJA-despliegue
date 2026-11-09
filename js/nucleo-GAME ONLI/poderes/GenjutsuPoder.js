import { Poder } from "./Poder.js";

const DURACION_GENJUTSU = 5000;

export class GenjutsuPoder extends Poder {
    constructor() {
        super({
            id: "genjutsu",
            nombre: "Genjutsu",
            costoChakra: 35,
            usosIniciales: 2,
            botonId: "btnGenjutsu",
            contadorId: "usosGenjutsu",
        });
        this._activo = false;
        this._timeout = null;
        this._overlayEl = null;
    }

    estaBloqueado(contexto) {
        return this._activo;
    }

    /** Usado por ByakuganPoder para saber si hay que detectarlo/cancelarlo. */
    estaActivo() {
        return this._activo;
    }

    efecto(contexto) {
        this._activarAnimacion();
        this._activarIlusionTablero();

        this._activo = true;
        this._timeout = setTimeout(() => this.cancelar(false), DURACION_GENJUTSU);
    }

    /** Se llama sola a los 5s, o antes si Byakugan la detecta (detectadoPorByakugan=true). */
    cancelar(detectadoPorByakugan) {
        this._activo = false;

        if (this._timeout) {
            clearTimeout(this._timeout);
            this._timeout = null;
        }

        this._quitarIlusionTablero();

        if (detectadoPorByakugan) {
            this.contexto.mostrarAvisoRapido("¡GENJUTSU DETECTADO!");
        }
    }

    _activarAnimacion() {
        const simbolo = document.createElement("div");
        simbolo.className = "genjutsu-simbolo-central";
        simbolo.textContent = "🌀 GENJUTSU";
        document.body.appendChild(simbolo);
        setTimeout(() => simbolo.remove(), 900);
    }

    _activarIlusionTablero() {
        const tableroFrame = document.getElementById("boardFrame");
        if (tableroFrame) tableroFrame.classList.add("genjutsu-ilusion");

        if (!this._overlayEl) {
            this._overlayEl = document.createElement("div");
            this._overlayEl.className = "genjutsu-pantalla-overlay";
            document.body.appendChild(this._overlayEl);
        }
    }

    _quitarIlusionTablero() {
        const tableroFrame = document.getElementById("boardFrame");
        if (tableroFrame) tableroFrame.classList.remove("genjutsu-ilusion");

        if (this._overlayEl) {
            this._overlayEl.remove();
            this._overlayEl = null;
        }
    }
}
