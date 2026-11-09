/**
 * VistaClan
 *
 * >>> SRP <<< Solo sabe pintar los datos de un clan en el DOM (panel
 * superior + footer). No decide qué clan mostrar ni a dónde navegar.
 */
export class VistaClan {
    mostrar(clan) {
        document.getElementById("clan-title").innerText = clan.nombre;
        document.getElementById("dificultad").innerText = clan.dificultad;
        document.getElementById("recompensa").innerText = clan.xp;
        document.getElementById("desc-text").innerText = clan.descripcion;

        document.getElementById("bar-title").innerText = clan.nombre;
        document.getElementById("bar-diff").innerText = clan.dificultad;
        document.getElementById("bar-xp").innerText = clan.xp;
        document.getElementById("bar-desc").innerText = clan.descripcion;

        // Si la imagen no carga, se queda vacía sin romper el diseño (igual que antes)
        document.getElementById("bar-logo").src = clan.logo;
    }

    mostrarBotonIniciar() {
        document.getElementById("btn-iniciar").hidden = false;
    }

    marcarConfirmado() {
        const boton = document.getElementById("btn-confirmar");
        boton.classList.add("confirmado");
        boton.disabled = true;
        boton.innerText = "NIVEL CONFIRMADO";
    }

    estaConfirmado() {
        return document.getElementById("btn-confirmar").disabled;
    }
}
