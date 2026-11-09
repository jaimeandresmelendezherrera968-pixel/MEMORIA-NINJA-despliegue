/**
 * ModoCoordenadas
 *
 * >>> SRP <<< Es una herramienta de DESARROLLO (tocar "C" para ver
 * coordenadas al hacer click, y copiarlas al portapapeles) — no tiene
 * nada que ver con la navegación real del jugador. Separarla en su
 * propia clase dice claramente "esto es una herramienta aparte", en
 * vez de quedar mezclada en medio de la lógica real del mapa.
 */
export class ModoCoordenadas {
    constructor({ idOverlay, mapaInteractivo }) {
        this.overlay = document.getElementById(idOverlay);
        this.mapaInteractivo = mapaInteractivo;
        this.activo = false;

        this._cablearToggle();
        this._cablearClickOverlay();
    }

    _cablearToggle() {
        document.addEventListener("keydown", (evento) => {
            if (evento.key.toLowerCase() !== "c") return;

            this.activo = !this.activo;
            console.clear();
            console.log(this.activo ? "🗺️ Modo coordenadas ACTIVADO" : "✖️ Modo coordenadas DESACTIVADO");
        });
    }

    _cablearClickOverlay() {
        this.overlay.addEventListener("click", (evento) => {
            if (!this.activo) return;

            const rect = this.overlay.getBoundingClientRect();
            const escala = rect.width / 1920;

            const x = Math.round((evento.clientX - rect.left) / escala);
            const y = Math.round((evento.clientY - rect.top) / escala);

            console.log(`x:${x}, y:${y}`);
            navigator.clipboard.writeText(`{x:${x},y:${y}}`);

            this._marcarPunto(evento, rect);
        });
    }

    _marcarPunto(evento, rect) {
        const punto = document.createElement("div");
        punto.style.position = "absolute";
        punto.style.left = (evento.clientX - rect.left - 5) + "px";
        punto.style.top = (evento.clientY - rect.top - 5) + "px";
        punto.style.width = "10px";
        punto.style.height = "10px";
        punto.style.background = "red";
        punto.style.borderRadius = "50%";
        punto.style.pointerEvents = "none";

        this.overlay.appendChild(punto);
        setTimeout(() => punto.remove(), 800);
    }
}
