import { Poder } from "./Poder.js";

const DURACION_BYAKUGAN = 3000;

export class ByakuganPoder extends Poder {
    constructor() {
        super({
            id: "byakugan",
            nombre: "Byakugan",
            costoChakra: 30,
            usosIniciales: 2,
            botonId: "btnByakugan",
            contadorId: "usosByakugan",
        });
        this._activo = false;
    }

    // Reemplaza el "if (byakuganActivo) return;" del original
    estaBloqueado(contexto) {
        return this._activo;
    }

    // Reemplaza el chequeo de "cartas.length < 2" del original
    validarCondicionesExtra(contexto) {
        this._cartasParaRevelar = contexto.BoardManager.obtenerCartasParaByakugan();
        if (this._cartasParaRevelar.length < 2) {
            this.mostrarMensaje("NO HAY CARTAS DISPONIBLES");
            return false;
        }
        return true;
    }

    efecto(contexto, esSasuke) {
        this._activo = true;

        this._activarAnimacion(esSasuke);
        this._revelarCartas(this._cartasParaRevelar, contexto);

        // Contraataque: si Genjutsu está activo, Byakugan lo detecta y lo cancela
        if (contexto.genjutsu.estaActivo()) {
            contexto.genjutsu.cancelar(true);
        }
    }

    _activarAnimacion(esSasuke) {
        const selector = esSasuke
            ? ".panel-personaje-lateral .personaje-imagen"
            : ".panel-naruto-lateral .personaje-imagen";

        const avatar = document.querySelector(selector);
        if (avatar) {
            avatar.classList.add("byakugan-brillo-avatar");
            setTimeout(() => avatar.classList.remove("byakugan-brillo-avatar"), 600);
        }

        const simbolo = document.createElement("div");
        simbolo.className = "byakugan-simbolo-central";
        simbolo.textContent = "👁️ BYAKUGAN";
        document.body.appendChild(simbolo);
        setTimeout(() => simbolo.remove(), 900);
    }

    _revelarCartas(cartas, contexto) {
        const bm = contexto && contexto.BoardManager;
        cartas.forEach((carta) => {
            carta.dataset.backOriginal = "1";
            if (bm && typeof bm.revelarTemporal === "function") {
                // usar API del tablero (maneja 2 caras/flip y tema)
                const idx = Number(carta.dataset.index);
                if (Number.isInteger(idx) && carta.dataset.valor) {
                    bm.revelarTemporal(idx, carta.dataset.valor, carta.dataset.aldea || "arena", DURACION_BYAKUGAN);
                    return;
                }
            }
            const imagen = carta.querySelector("img.front, img.img-card.front, img");
            if (!imagen) return;
            carta.dataset._byakuganSrc = imagen.src;
            const ruta = bm && typeof bm.obtenerRutaCarta === "function"
                ? bm.obtenerRutaCarta(carta.dataset.valor, carta.dataset.aldea)
                : `assets/img/cards/aldeas/${carta.dataset.aldea || "arena"}/${carta.dataset.valor}.png`;
            imagen.src = ruta;
            carta.classList.add("byakugan-revelada");
        });

        setTimeout(() => {
            cartas.forEach((carta) => {
                carta.classList.remove("byakugan-revelada");
                if (bm && typeof bm.revelarTemporal === "function") return; // ya se restauró
                const imagen = carta.querySelector("img.front, img.img-card.front, img");
                if (!imagen) return;
                const reverso = bm && typeof bm.obtenerReverso === "function" ? bm.obtenerReverso() : "assets/img/back.png";
                imagen.src = carta.dataset._byakuganSrc || reverso;
            });
            this._activo = false;
        }, DURACION_BYAKUGAN);
    }
}
