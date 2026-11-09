import { RepositorioClanes } from "./core-navegacion/RepositorioClanes.js";
import { VistaClan } from "./core-navegacion/VistaClan.js";

/**
 * PrePartidaController
 *
 * >>> SRP <<< Decide QUÉ clan mostrar (a partir de localStorage) y
 * QUÉ pasa al confirmar/iniciar. Delega el CÓMO se ve en VistaClan y
 * el DÓNDE están los datos en RepositorioClanes.
 * >>> DIP <<< Recibe ambas dependencias por constructor.
 */
class PrePartidaController {
    constructor(repositorioClanes, vistaClan) {
        this.repositorioClanes = repositorioClanes;
        this.vistaClan = vistaClan;
        this.claveActual = null;
    }

    iniciar() {
        const nivelGuardado = localStorage.getItem("nivelActual");
        const idInicial = this.repositorioClanes.existe(nivelGuardado) ? nivelGuardado : "uzumaki";

        this._seleccionarClan(idInicial);

        document.getElementById("btn-iniciar").addEventListener("click", () => this._irAJugar());
    }

    _seleccionarClan(idClan) {
        const clan = this.repositorioClanes.obtener(idClan);
        if (!clan) return;

        this.claveActual = idClan;
        this.vistaClan.mostrar(clan);
    }

    seleccionarClan(idClan) {
        this._seleccionarClan(idClan);
    }

    confirmarNivel() {
        if (this.vistaClan.estaConfirmado()) return;

        this.vistaClan.mostrarBotonIniciar();
        this.vistaClan.marcarConfirmado();
    }

    _irAJugar() {
        const destino = this.repositorioClanes.obtenerDestinoJuego(this.claveActual);
        if (destino) window.location.href = destino;
    }
}

// ================== RAÍZ DE COMPOSICIÓN ==================
const repositorioClanes = new RepositorioClanes();
const vistaClan = new VistaClan();
const prePartidaController = new PrePartidaController(repositorioClanes, vistaClan);

// Se mantiene window.confirmarNivel por compatibilidad, pero el botón se
// conecta por listener (el CSP bloquea los onclick inline).
window.confirmarNivel = () => prePartidaController.confirmarNivel();

// --- Conexión real con el DOM (sin onclick inline: el CSP lo bloquea) ---
document.getElementById("btn-confirmar")?.addEventListener("click", () =>
  prePartidaController.confirmarNivel()
);

document.getElementById("btnVolverMenu")?.addEventListener("click", () => {
  window.location.href = "menu.html";
});

document.getElementById("btn-cambiar-nivel")?.addEventListener("click", () => {
  window.location.href = "niveles.html";
});

prePartidaController.iniciar();

// Vista igual que PC en móvil H/V: lienzo fijo escalado para que quepa TODO sin scroll.
function ajustarPrePartida() {
    const cont = document.querySelector(".game-container");
    if (!cont) return;
    cont.style.transform = "translate(-50%, -50%) scale(1)";
    const baseW = 1100;
    const baseH = 720;
    const margen = 8;
    const vw = Math.max((window.visualViewport && window.visualViewport.width) || window.innerWidth, 280);
    const vh = Math.max((window.visualViewport && window.visualViewport.height) || window.innerHeight, 280);
    const escala = Math.min((vw - margen) / baseW, (vh - margen) / baseH);
    cont.style.transform = `translate(-50%, -50%) scale(${escala})`;
}
window.addEventListener("resize", ajustarPrePartida);
window.addEventListener("orientationchange", () => setTimeout(ajustarPrePartida, 120));
window.addEventListener("orientationchange", () => setTimeout(ajustarPrePartida, 400));
if (window.visualViewport) window.visualViewport.addEventListener("resize", ajustarPrePartida);
document.fonts && document.fonts.ready && document.fonts.ready.then(ajustarPrePartida);
setTimeout(ajustarPrePartida, 60);
setTimeout(ajustarPrePartida, 300);
setTimeout(ajustarPrePartida, 700);
