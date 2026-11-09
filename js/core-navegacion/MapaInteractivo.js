/**
 * MapaInteractivo
 *
 * >>> SRP <<< Esta clase solo sabe escalar y posicionar los botones de
 * zona sobre el video de fondo, y avisar (con un callback) cuando se
 * hace click en una zona. No sabe nada de a d├│nde navegar ÔÇö eso lo
 * decide quien la usa (NavegacionNivelesController).
 * >>> ENCAPSULAMIENTO <<< VIDEO_WIDTH/VIDEO_HEIGHT y el estado de
 * escala quedan adentro de la instancia, no sueltos en el archivo.
 */
export class MapaInteractivo {
    constructor({ idOverlay, idVideo, zonas, alSeleccionarZona }) {
        this.overlay = document.getElementById(idOverlay);
        this.video = document.getElementById(idVideo);
        this.zonas = zonas;
        this.alSeleccionarZona = alSeleccionarZona;

        this.anchoVideo = 1920;
        this.altoVideo = 1088;

        this._cablearBotones();
        this._cablearEscalado();
    }

    _cablearBotones() {
        this.zonas.forEach((zona) => {
            const boton = document.getElementById(zona.id);
            if (!boton) return;

            boton.addEventListener("click", () => this.alSeleccionarZona(zona.id));
        });
    }

    _cablearEscalado() {
        window.addEventListener("resize", () => this._reposicionar());
        this.video.addEventListener("loadedmetadata", () => this._reposicionar());
        window.addEventListener("load", () => {
            this._reposicionar();
            this.video.play().catch(() => {});
        });
    }

    _reposicionar() {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        // "contain": el mapa completo queda visible (sin recortar zonas) y sin scroll,
        // ajustado al viewport en horizontal o vertical.
        const escala = Math.min(vw / this.anchoVideo, vh / this.altoVideo);

        const ancho = this.anchoVideo * escala;
        const alto = this.altoVideo * escala;
        const offsetX = (vw - ancho) / 2;
        const offsetY = (vh - alto) / 2;

        this.overlay.style.left = offsetX + "px";
        this.overlay.style.top = offsetY + "px";
        this.overlay.style.width = ancho + "px";
        this.overlay.style.height = alto + "px";

        this.zonas.forEach((zona) => {
            const boton = document.getElementById(zona.id);
            if (!boton) return;

            const size = zona.tamano * escala;
            boton.style.width = size + "px";
            boton.style.height = size + "px";
            boton.style.left = (zona.x * escala - size / 2) + "px";
            boton.style.top = (zona.y * escala - size / 2) + "px";
        });

        this._escalaActual = escala;
    }

    /** Usado por ModoCoordenadas para convertir un click en coordenadas del video real. */
    escalaActual() {
        return this._escalaActual;
    }
}
