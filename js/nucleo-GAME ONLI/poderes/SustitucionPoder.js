import { Poder } from "./Poder.js";

const DURACION_ARMADA_SUSTITUCION = 8000;

export class SustitucionPoder extends Poder {
    constructor() {
        super({
            id: "sustitucion",
            nombre: "Jutsu de Sustitución",
            costoChakra: 25,
            usosIniciales: 2,
            botonId: "btnSustitucion",
            contadorId: "usosSustitucion",
        });
        this._armada = { sasuke: false, naruto: false };
        this._timeout = null;
        this.spanEstado = document.getElementById("sustitucionEstado");
    }

    // Reemplaza el "if (armada) return;" del original
    estaBloqueado(contexto) {
        const esSasuke = contexto.esTurnoDeSasuke();
        return esSasuke ? this._armada.sasuke : this._armada.naruto;
    }

    /** Reemplaza mostrarAvisoSustitucionUsada() del original — se llama cuando salva de un error. */
    notificarUsoDefensivo() {
        if (!this.spanEstado) return;
        this.spanEstado.textContent = "🪵💨 ¡SUSTITUCIÓN!";
        this.spanEstado.classList.add("sustitucion-usada");
        setTimeout(() => {
            this.spanEstado.classList.remove("sustitucion-usada");
            this.spanEstado.textContent = "";
        }, 900);
    }

    /** Usado por BombaPoder para saber si el defensor tiene Sustitución armada. */
    estaArmada(esSasuke) {
        return esSasuke ? this._armada.sasuke : this._armada.naruto;
    }

    /** Usado por BombaPoder para consumir la Sustitución al mitigar el daño. */
    desarmar(esSasuke) {
        if (esSasuke) { this._armada.sasuke = false; } else { this._armada.naruto = false; }

        if (this._timeout) {
            clearTimeout(this._timeout);
            this._timeout = null;
        }

        if (this.spanEstado) {
            this.spanEstado.classList.remove("sustitucion-activa");
            this.spanEstado.textContent = "";
        }
    }

    efecto(contexto, esSasuke) {
        if (esSasuke) { this._armada.sasuke = true; } else { this._armada.naruto = true; }

        this._activarAnimacion(esSasuke);

        if (this.spanEstado) {
            this.spanEstado.textContent = "🔄 SUSTITUCIÓN ARMADA";
            this.spanEstado.classList.add("sustitucion-activa");
        }

        this._timeout = setTimeout(() => this.desarmar(esSasuke), DURACION_ARMADA_SUSTITUCION);
    }

    _activarAnimacion(esSasuke) {
        const selector = esSasuke
            ? ".panel-personaje-lateral .personaje-imagen"
            : ".panel-naruto-lateral .personaje-imagen";

        const avatar = document.querySelector(selector);
        if (avatar) {
            avatar.classList.add("sustitucion-brillo-avatar");
            setTimeout(() => avatar.classList.remove("sustitucion-brillo-avatar"), 600);
        }

        const simbolo = document.createElement("div");
        simbolo.className = "sustitucion-simbolo-central";
        simbolo.textContent = "🪵💨 SUSTITUCIÓN";
        document.body.appendChild(simbolo);
        setTimeout(() => simbolo.remove(), 900);
    }
}
