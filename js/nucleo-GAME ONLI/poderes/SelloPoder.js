import { Poder } from "./Poder.js";

const DURACION_SELLO = 5000;

export class SelloPoder extends Poder {
    constructor() {
        super({
            id: "sello",
            nombre: "Sello de Bloqueo",
            costoChakra: 30,
            usosIniciales: 2,
            botonId: "btnSello",
            contadorId: "usosSello",
        });
        this._cartaSelladaActual = null;
        this._timeout = null;
    }

    // Reemplaza el "if (cartaSelladaActual) { mensaje; return; }" del original
    estaBloqueado(contexto) {
        if (this._cartaSelladaActual) {
            this.mostrarMensaje("YA HAY UN SELLO ACTIVO");
            return true;
        }
        return false;
    }

    validarCondicionesExtra(contexto) {
        this._cartaParaSellar = contexto.BoardManager.obtenerCartaParaSello();
        if (!this._cartaParaSellar) {
            this.mostrarMensaje("NO HAY CARTAS DISPONIBLES");
            return false;
        }
        return true;
    }

    efecto() {
        this._activarAnimacion();
        this._sellarCarta(this._cartaParaSellar);
    }

    _activarAnimacion() {
        const flash = document.createElement("div");
        flash.className = "sello-flash-overlay";
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 500);

        const simbolo = document.createElement("div");
        simbolo.className = "sello-simbolo-central";
        simbolo.textContent = "🔒 SELLO DE BLOQUEO";
        document.body.appendChild(simbolo);
        setTimeout(() => simbolo.remove(), 900);
    }

    _sellarCarta(carta) {
        this._cartaSelladaActual = carta;
        carta.classList.add("carta-sellada");

        const icono = document.createElement("div");
        icono.className = "sello-icono-carta";
        icono.textContent = "🔒";
        carta.appendChild(icono);

        this._timeout = setTimeout(() => this._quitarSello(), DURACION_SELLO);
    }

    // La carta nunca perdió su dataset.valor: solo se le sacan la clase
    // y el ícono, así que vuelve a jugarse con total normalidad.
    _quitarSello() {
        if (this._cartaSelladaActual) {
            this._cartaSelladaActual.classList.remove("carta-sellada");
            const icono = this._cartaSelladaActual.querySelector(".sello-icono-carta");
            if (icono) icono.remove();
            this._cartaSelladaActual = null;
        }
        if (this._timeout) {
            clearTimeout(this._timeout);
            this._timeout = null;
        }
    }
}
