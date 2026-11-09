import { Poder } from "./Poder.js";

const DANO_BOMBA = 20;
const DANO_BOMBA_MITIGADO = 10;

export class BombaPoder extends Poder {
    constructor() {
        super({
            id: "bomba",
            nombre: "Bomba Explosiva",
            costoChakra: 50,
            usosIniciales: 2,
            botonId: "btnBomba",
            contadorId: "usosBomba",
        });
    }

    efecto(contexto, esSasuke) {
        const defensorEsSasuke = !esSasuke;

        // Colaboración entre poderes: Bomba le pregunta a Sustitución
        // (inyectada en el contexto) si el defensor la tiene armada,
        // en vez de leer una variable global suelta como antes.
        const defensorTieneSustitucion = contexto.sustitucion.estaArmada(defensorEsSasuke);

        let dano = DANO_BOMBA;
        let mitigado = false;

        if (defensorTieneSustitucion) {
            dano = DANO_BOMBA_MITIGADO;
            mitigado = true;
            contexto.sustitucion.desarmar(defensorEsSasuke);
        }

        contexto.perderVida(defensorEsSasuke, dano);
        this._activarAnimacion(contexto, defensorEsSasuke, dano, mitigado);
    }

    _activarAnimacion(contexto, defensorEsSasuke, dano, mitigado) {
        document.body.classList.add("bomba-temblor-pantalla");
        setTimeout(() => document.body.classList.remove("bomba-temblor-pantalla"), 600);

        const flash = document.createElement("div");
        flash.className = "bomba-flash-overlay";
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 650);

        const onda = document.createElement("div");
        onda.className = "bomba-onda-choque";
        document.body.appendChild(onda);
        setTimeout(() => onda.remove(), 800);

        const selectorAvatar = defensorEsSasuke
            ? ".panel-personaje-lateral .personaje-imagen"
            : ".panel-naruto-lateral .personaje-imagen";
        const avatar = document.querySelector(selectorAvatar);

        if (avatar) {
            avatar.classList.add("bomba-golpe-avatar");
            setTimeout(() => avatar.classList.remove("bomba-golpe-avatar"), 700);

            const rect = avatar.getBoundingClientRect();
            const numeroDano = document.createElement("div");
            numeroDano.className = "bomba-numero-dano";
            numeroDano.textContent = "-" + dano + " ❤️";
            numeroDano.style.left = (rect.left + rect.width / 2) + "px";
            numeroDano.style.top = (rect.top + rect.height / 2) + "px";
            document.body.appendChild(numeroDano);
            setTimeout(() => numeroDano.remove(), 1000);
        }

        const simbolo = document.createElement("div");
        simbolo.className = "bomba-simbolo-central";
        simbolo.textContent = mitigado ? "💣 BOMBA (MITIGADA)" : "💣 BOMBA EXPLOSIVA";
        document.body.appendChild(simbolo);
        setTimeout(() => simbolo.remove(), 1000);

        if (mitigado) {
            contexto.mostrarAvisoRapido("🔄 SUSTITUCIÓN REDUJO EL DAÑO A LA MITAD");
        }
    }
}
