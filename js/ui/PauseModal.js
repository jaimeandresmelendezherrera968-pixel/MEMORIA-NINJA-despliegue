import {
    guardarConfiguracion,
    iniciarAudioNivel,
    leerConfiguracion,
    pausarMusicaNivel,
    reanudarMusicaNivel,
    reproducirVolteo
} from "../services/ConfiguracionAudio.js";

const PLANTILLA_PAUSA = `
    <button class="btn-pausa-nivel" id="btnPausaNivel" type="button" aria-label="Pausar partida" aria-expanded="false" title="Pausar partida (Esc)">
        <span class="pausa-icono" aria-hidden="true"><i></i><i></i></span>
    </button>

    <div class="pausa-overlay" id="pauseModal" hidden>
        <div class="pausa-panel" id="pausaPanel" role="dialog" aria-modal="true" aria-labelledby="pausaTitulo" tabindex="-1">
            <div class="pausa-brillo" aria-hidden="true"></div>

            <header class="pausa-header">
                <span class="pausa-simbolo" aria-hidden="true"><i></i><i></i></span>
                <div>
                    <h2 id="pausaTitulo">PAUSA</h2>
                    <p>La partida está en pausa</p>
                </div>
            </header>

            <div class="pausa-opciones">
                <div class="pausa-fila">
                    <div class="pausa-etiqueta">
                        <span class="pausa-emoji" aria-hidden="true">♪</span>
                        <div>
                            <strong>MÚSICA</strong>
                            <small>Sonido de fondo</small>
                        </div>
                    </div>
                    <label class="pausa-switch">
                        <input type="checkbox" id="pausaMusica">
                        <span class="pausa-slider" aria-hidden="true"></span>
                    </label>
                </div>

                <div class="pausa-fila">
                    <div class="pausa-etiqueta">
                        <span class="pausa-emoji" aria-hidden="true">✧</span>
                        <div>
                            <strong>EFECTOS</strong>
                            <small>Sonido al voltear cartas</small>
                        </div>
                    </div>
                    <label class="pausa-switch">
                        <input type="checkbox" id="pausaEfectos">
                        <span class="pausa-slider" aria-hidden="true"></span>
                    </label>
                </div>

                <div class="pausa-fila pausa-fila-volumen">
                    <div class="pausa-etiqueta">
                        <span class="pausa-emoji" aria-hidden="true">◕</span>
                        <div>
                            <strong>VOLUMEN</strong>
                            <small>Nivel general del sonido</small>
                        </div>
                    </div>
                    <div class="pausa-volumen-control">
                        <input type="range" id="pausaVolumen" min="0" max="100" step="1" class="pausa-rango" aria-label="Nivel de volumen">
                        <output id="pausaVolumenValor" class="pausa-valor" for="pausaVolumen">80%</output>
                    </div>
                </div>
            </div>

            <div class="pausa-acciones">
                <button class="pausa-btn pausa-btn-principal" id="pausaReanudar" type="button">
                    REANUDAR
                </button>
                <button class="pausa-btn pausa-btn-secundario" id="pausaMapa" type="button">
                    SELECCIONAR NIVEL
                </button>
                <button class="pausa-btn pausa-btn-fantasma" id="pausaMenu" type="button">
                    MENÚ PRINCIPAL
                </button>
            </div>

            <p class="pausa-ayuda">Presiona <kbd>Esc</kbd> para continuar</p>
        </div>
    </div>
`;

let instanciaPausa = null;

class PauseModal {

    constructor(tiempoService) {
        this.tiempoService = tiempoService;
        this.abierto = false;
        this.ultimoFoco = null;
        this.observador = null;
    }

    montar() {
        if (document.getElementById("btnPausaNivel")) {
            return this;
        }

        const contenedor = document.createElement("div");
        contenedor.innerHTML = PLANTILLA_PAUSA;

        while (contenedor.firstElementChild) {
            document.body.appendChild(contenedor.firstElementChild);
        }

        this.boton = document.getElementById("btnPausaNivel");
        this.overlay = document.getElementById("pauseModal");
        this.panel = document.getElementById("pausaPanel");
        this.checkMusica = document.getElementById("pausaMusica");
        this.checkEfectos = document.getElementById("pausaEfectos");
        this.rangoVolumen = document.getElementById("pausaVolumen");
        this.valorVolumen = document.getElementById("pausaVolumenValor");

        this.boton.addEventListener("click", () => this.abrir());

        document.getElementById("pausaReanudar").addEventListener("click", () => this.cerrar());
        document.getElementById("pausaMapa").addEventListener("click", () => this.irA("niveles.html"));
        document.getElementById("pausaMenu").addEventListener("click", () => this.irA("menu.html"));

        this.overlay.addEventListener("click", (evento) => {
            if (evento.target === this.overlay) {
                this.cerrar();
            }
        });

        document.addEventListener("keydown", (evento) => {
            if (evento.key !== "Escape") {
                return;
            }

            if (this.abierto) {
                evento.preventDefault();
                this.cerrar();
                return;
            }

            if (!this.partidaTerminada()) {
                evento.preventDefault();
                this.abrir();
            }
        });

        this.checkMusica.addEventListener("change", () => {
            const configuracion = guardarConfiguracion({ musica: this.checkMusica.checked });

            if (configuracion.musica) {
                reanudarMusicaNivel();
            } else {
                pausarMusicaNivel();
            }
        });

        this.checkEfectos.addEventListener("change", () => {
            guardarConfiguracion({ efectos: this.checkEfectos.checked });

            if (this.checkEfectos.checked) {
                reproducirVolteo();
            }
        });

        this.rangoVolumen.addEventListener("input", () => {
            guardarConfiguracion({ volumen: Number(this.rangoVolumen.value) });
            this.actualizarValorVolumen();
        });

        this.observarFinDePartida();
        this.sincronizarControles();
        this.actualizarBoton();
        iniciarAudioNivel();

        return this;
    }

    observarFinDePartida() {
        const modales = [
            document.getElementById("modal"),
            document.getElementById("victoryModal")
        ].filter(Boolean);

        this.observador = new MutationObserver(() => this.actualizarBoton());

        modales.forEach((modal) => {
            this.observador.observe(modal, {
                attributes: true,
                attributeFilter: ["class", "hidden"]
            });
        });
    }

    sincronizarControles() {
        const configuracion = leerConfiguracion();

        this.checkMusica.checked = configuracion.musica;
        this.checkEfectos.checked = configuracion.efectos;
        this.rangoVolumen.value = String(configuracion.volumen);
        this.actualizarValorVolumen(configuracion.volumen);
    }

    actualizarValorVolumen(volumen = Number(this.rangoVolumen.value)) {
        this.valorVolumen.textContent = `${volumen}%`;
    }

    partidaTerminada() {
        return ["modal", "victoryModal"]
            .map((id) => document.getElementById(id))
            .some((modal) => modal && !modal.classList.contains("hidden"));
    }

    actualizarBoton() {
        const oculto = this.abierto || this.partidaTerminada();

        this.boton.classList.toggle("pausa-boton-oculto", oculto);
        this.boton.setAttribute("aria-hidden", oculto ? "true" : "false");
    }

    abrir() {
        if (this.abierto || this.partidaTerminada()) {
            return;
        }

        this.abierto = true;
        this.ultimoFoco = document.activeElement;

        this.sincronizarControles();
        this.tiempoService.pausar();
        pausarMusicaNivel();

        document.body.classList.add("juego-pausado");
        this.overlay.hidden = false;
        this.boton.setAttribute("aria-expanded", "true");
        this.actualizarBoton();

        requestAnimationFrame(() => {
            this.overlay.classList.add("pausa-visible");
        });

        this.panel.focus({ preventScroll: true });
    }

    cerrar({ reanudar = true, devolverFoco = true } = {}) {
        if (!this.abierto) {
            return;
        }

        this.abierto = false;

        this.overlay.classList.remove("pausa-visible");
        this.overlay.hidden = true;
        document.body.classList.remove("juego-pausado");
        this.boton.setAttribute("aria-expanded", "false");

        if (reanudar) {
            this.tiempoService.reanudar();
            reanudarMusicaNivel();
        } else {
            pausarMusicaNivel();
        }

        this.actualizarBoton();

        if (devolverFoco && this.ultimoFoco instanceof HTMLElement) {
            this.ultimoFoco.focus({ preventScroll: true });
        }
    }

    irA(destino) {
        this.cerrar({ reanudar: false, devolverFoco: false });
        window.location.href = destino;
    }
}

export function conectarPausa(tiempoService) {
    if (!instanciaPausa) {
        instanciaPausa = new PauseModal(tiempoService).montar();
    }

    return instanciaPausa;
}
