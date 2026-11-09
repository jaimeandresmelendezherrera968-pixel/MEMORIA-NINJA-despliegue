/**
 * VISTA: VistaPartida
 *
 * >>> SRP <<< Junta TODAS las lecturas/escrituras al DOM del panel
 * principal (turno, tiempo, chakra, vida, combo, paneles de jugador,
 * modal final). Ninguna otra clase del "núcleo" (GestorTurno,
 * GestorTiempo, Personaje, GestorPartida) toca el DOM directamente —
 * se lo piden a esta clase. Así, si mañana cambia el HTML, se edita
 * SOLO acá, sin tocar la lógica del juego.
 */
export class VistaPartida {
    constructor() {
        this.tiempo = document.getElementById("timer");
        this.movimientos = document.getElementById("moves");
        this.puntaje = document.getElementById("score");

        this.turnoSasuke = document.getElementById("turnoSasuke");
        this.turnoNaruto = document.getElementById("turnoNaruto");
        this.tiempoSasukeEl = document.getElementById("tiempoSasuke");
        this.tiempoNarutoEl = document.getElementById("tiempoNaruto");
        this.comboSasuke = document.getElementById("comboSasuke");
        this.comboNaruto = document.getElementById("comboNaruto");

        this.chakraTextoSasuke = document.getElementById("chakraTextoSasuke");
        this.chakraTextoNaruto = document.getElementById("chakraTextoNaruto");
        this.chakraBarraSasuke = document.getElementById("chakraBarraSasuke");
        this.chakraBarraNaruto = document.getElementById("chakraBarraNaruto");

        this.vidaTextoSasuke = document.getElementById("vidaTextoSasuke");
        this.vidaTextoNaruto = document.getElementById("vidaTextoNaruto");
        this.vidaBarraSasuke = document.getElementById("vidaBarraSasuke");
        this.vidaBarraNaruto = document.getElementById("vidaBarraNaruto");

        this.nombreJugador = document.getElementById("playerName");
        this.avatarJugador = document.getElementById("playerAvatar");
        this.chakraJugador = document.getElementById("playerChakra");
        this.chakraTextoJugador = document.getElementById("playerChakraText");
        this.aciertosJugador = document.getElementById("playerHits");
        this.erroresJugador = document.getElementById("playerErrors");
        this.comboJugador = document.getElementById("playerCombo");

        this.nombreRival = document.getElementById("enemyName");
        this.avatarRival = document.getElementById("enemyAvatar");
        this.chakraRival = document.getElementById("enemyChakra");
        this.chakraTextoRival = document.getElementById("enemyChakraText");
        this.aciertosRival = document.getElementById("enemyHits");
        this.erroresRival = document.getElementById("enemyErrors");
        this.comboRival = document.getElementById("enemyCombo");

        this.estadoPartida = document.getElementById("matchStatus");
        this.modal = document.getElementById("modal");
        this.finalStats = document.getElementById("finalStats");
        this.modalFinal = document.getElementById("modalFinal");
        this.modalFinalPanel = this.modalFinal?.querySelector(".modal-final-panel");
        this.bannerPoder = document.getElementById("bannerPoderOnline");
        this.finalTitulo = document.getElementById("finalTitulo");
        this.finalSubtitulo = document.getElementById("finalSubtitulo");
        this.finalIcono = document.getElementById("finalIcon");
        this.finalMarcador = document.getElementById("finalMarcador");
        this.finalConfig = document.getElementById("finalConfig");
        this.finalPares = document.getElementById("finalPares");
        this.finalMezclar = document.getElementById("finalMezclarAldeas");
        this.finalError = document.getElementById("finalError");
        this.finalEspera = document.getElementById("finalEspera");
        this.btnRevancha = document.getElementById("btnRevanchaFinal");
        this.btnVolverMenu = document.getElementById("btnVolverMenuFinal");
    }

    cargarPanelSuperior() {
        if (this.movimientos) this.movimientos.textContent = "0";
        if (this.puntaje) this.puntaje.textContent = "0";
    }

    cargarPersonaje(personaje, { nombreEl, avatarEl, avatarSrc, chakraEl, chakraTextoEl, aciertosEl, erroresEl, comboEl }) {
        if (nombreEl) nombreEl.textContent = personaje.nombre;
        if (avatarEl) avatarEl.src = avatarSrc;
        if (chakraEl) chakraEl.style.width = personaje.chakra + "%";
        if (chakraTextoEl) chakraTextoEl.textContent = personaje.chakra + " / " + personaje.constructor.CHAKRA_MAXIMO;
        if (aciertosEl) aciertosEl.textContent = personaje.aciertos;
        if (erroresEl) erroresEl.textContent = personaje.errores;
        if (comboEl) comboEl.textContent = "x" + personaje.combo;
    }

    cargarPanelJugador(jugador) {
        this.cargarPersonaje(jugador, {
            nombreEl: this.nombreJugador, avatarEl: this.avatarJugador, avatarSrc: "assets/img/sasuke.png",
            chakraEl: this.chakraJugador, chakraTextoEl: this.chakraTextoJugador,
            aciertosEl: this.aciertosJugador, erroresEl: this.erroresJugador, comboEl: this.comboJugador,
        });
    }

    cargarPanelRival(rival) {
        this.cargarPersonaje(rival, {
            nombreEl: this.nombreRival, avatarEl: this.avatarRival, avatarSrc: "assets/img/naruto.png",
            chakraEl: this.chakraRival, chakraTextoEl: this.chakraTextoRival,
            aciertosEl: this.aciertosRival, erroresEl: this.erroresRival, comboEl: this.comboRival,
        });
    }

    renderTurno(esTurnoDeSasuke) {
        if (this.turnoSasuke) {
            this.turnoSasuke.textContent = esTurnoDeSasuke ? "TU TURNO" : "";
            this.turnoSasuke.classList.toggle("turno-activo", esTurnoDeSasuke);
        }
        if (this.turnoNaruto) {
            this.turnoNaruto.textContent = !esTurnoDeSasuke ? "TURNO RIVAL" : "";
            this.turnoNaruto.classList.toggle("turno-activo", !esTurnoDeSasuke);
        }
        if (this.estadoPartida) {
            this.estadoPartida.textContent = esTurnoDeSasuke ? "Turno de SASUKE" : "Turno de NARUTO";
        }
    }

    renderTiempos(tiempoSasuke, tiempoNaruto, esTurnoDeSasuke, formatear) {
        if (this.tiempoSasukeEl) this.tiempoSasukeEl.textContent = formatear(tiempoSasuke);
        if (this.tiempoNarutoEl) this.tiempoNarutoEl.textContent = formatear(tiempoNaruto);
        if (this.tiempo) this.tiempo.textContent = formatear(esTurnoDeSasuke ? tiempoSasuke : tiempoNaruto);
    }

    renderPuntaje(puntaje) {
        if (this.puntaje) this.puntaje.textContent = puntaje;
    }

    renderChakra(jugador, rival) {
        if (this.chakraTextoSasuke) this.chakraTextoSasuke.textContent = jugador.chakra + "/" + jugador.constructor.CHAKRA_MAXIMO;
        if (this.chakraBarraSasuke) this.chakraBarraSasuke.style.width = jugador.chakra + "%";
        if (this.chakraTextoNaruto) this.chakraTextoNaruto.textContent = rival.chakra + "/" + rival.constructor.CHAKRA_MAXIMO;
        if (this.chakraBarraNaruto) this.chakraBarraNaruto.style.width = rival.chakra + "%";
    }

    renderVida(jugador, rival) {
        if (this.vidaTextoSasuke) this.vidaTextoSasuke.textContent = jugador.vida + "/" + jugador.constructor.VIDA_MAXIMA;
        if (this.vidaBarraSasuke) this.vidaBarraSasuke.style.width = jugador.vida + "%";
        if (this.vidaTextoNaruto) this.vidaTextoNaruto.textContent = rival.vida + "/" + rival.constructor.VIDA_MAXIMA;
        if (this.vidaBarraNaruto) this.vidaBarraNaruto.style.width = rival.vida + "%";
    }

    renderAciertoJugador(esSasuke, personaje) {
        const el = esSasuke ? this.aciertosJugador : this.aciertosRival;
        if (el) el.textContent = personaje.aciertos;
    }

    renderErrorJugador(esSasuke, personaje) {
        const el = esSasuke ? this.erroresJugador : this.erroresRival;
        if (el) el.textContent = personaje.errores;
    }

    renderCombo(jugador, rival) {
        if (this.comboSasuke) this.comboSasuke.textContent = jugador.combo > 0 ? "COMBO x" + jugador.combo : "";
        if (this.comboNaruto) this.comboNaruto.textContent = rival.combo > 0 ? "COMBO x" + rival.combo : "";
    }

    mostrarComboRoto(esSasuke) {
        const elemento = esSasuke ? this.comboSasuke : this.comboNaruto;
        if (!elemento) return;
        elemento.textContent = "COMBO ROTO";
        elemento.classList.add("combo-roto");
        setTimeout(() => {
            elemento.classList.remove("combo-roto");
            elemento.textContent = "";
        }, 900);
    }

    mostrarBonificacionCombo(combo, chakra) {
        const flash = document.createElement("div");
        flash.className = "combo-flash-overlay";
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 500);

        const mensaje = document.createElement("div");
        mensaje.className = "bonificacion-combo";
        mensaje.innerHTML = `<strong>COMBO x${combo}</strong><span>+${chakra} CHAKRA</span>`;
        document.body.appendChild(mensaje);
        setTimeout(() => mensaje.remove(), 1400);
    }

    mostrarBonoChakraVisual(esSasuke, cantidad) {
        const barraChakra = esSasuke ? this.chakraBarraSasuke : this.chakraBarraNaruto;
        if (!barraChakra) return;
        const panel = barraChakra.closest(".personaje-chakra");
        if (!panel) return;

        const aviso = document.createElement("div");
        aviso.className = "chakra-bono-flotante";
        aviso.textContent = "+" + cantidad + " 🔵 COMBO";
        panel.appendChild(aviso);
        setTimeout(() => aviso.remove(), 1000);
    }

    mostrarAvisoRapido(mensaje, tipo = "error") {
        this._avisoRapidoActual?.remove();
        const aviso = document.createElement("div");
        aviso.className = `aviso-rapido-central aviso-${tipo}`;
        aviso.setAttribute("role", tipo === "error" ? "alert" : "status");
        aviso.textContent = mensaje;
        document.body.appendChild(aviso);
        this._avisoRapidoActual = aviso;
        setTimeout(() => {
            aviso.remove();
            if (this._avisoRapidoActual === aviso) this._avisoRapidoActual = null;
        }, 1200);
    }

    mostrarBannerPoder({ poder = "", titulo = "", detalle = "", icono = "", deRival = false, duracion = 1700 } = {}) {
        const banner = this.bannerPoder;
        if (!banner) return;

        clearTimeout(this._bannerPoderTimeout);
        banner.replaceChildren();
        banner.className = "banner-poder-online";
        if (poder) banner.classList.add(`poder-${poder}`);
        if (deRival) banner.classList.add("es-rival");

        const texto = document.createElement("div");
        texto.className = "banner-poder-texto";
        const tituloEl = document.createElement("strong");
        tituloEl.className = "banner-poder-titulo";
        tituloEl.textContent = titulo;
        const detalleEl = document.createElement("span");
        detalleEl.className = "banner-poder-detalle";
        detalleEl.textContent = detalle;
        texto.append(tituloEl, detalleEl);

        if (icono) {
            const iconoEl = document.createElement("img");
            iconoEl.className = "banner-poder-icono";
            iconoEl.src = icono;
            iconoEl.alt = "";
            iconoEl.setAttribute("aria-hidden", "true");
            banner.append(iconoEl, texto);
        } else {
            banner.append(texto);
        }

        void banner.offsetWidth;
        banner.classList.add("visible");
        this._bannerPoderTimeout = setTimeout(() => {
            banner.classList.remove("visible");
        }, duracion);
    }

    mostrarImpactoBomba({ objetivoEsMio = false, danio = 20 } = {}) {
        const panel = document.querySelector(objetivoEsMio ? ".panel-personaje-lateral" : ".panel-naruto-lateral");
        const board = document.getElementById("boardFrame");

        const flash = document.createElement("div");
        flash.className = "bomba-flash-overlay";
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 700);

        const onda = document.createElement("div");
        onda.className = "bomba-onda-choque";
        document.body.appendChild(onda);
        setTimeout(() => onda.remove(), 900);

        if (board) {
            board.classList.remove("bomba-temblor-pantalla");
            void board.offsetWidth;
            board.classList.add("bomba-temblor-pantalla");
            setTimeout(() => board.classList.remove("bomba-temblor-pantalla"), 550);
        }

        const avatar = panel?.querySelector(".personaje-imagen");
        if (avatar) {
            avatar.classList.remove("bomba-golpe-avatar");
            void avatar.offsetWidth;
            avatar.classList.add("bomba-golpe-avatar");
            setTimeout(() => avatar.classList.remove("bomba-golpe-avatar"), 750);
        }

        const numero = document.createElement("div");
        numero.className = "bomba-numero-dano";
        numero.textContent = `-${danio}`;
        const rect = panel?.getBoundingClientRect();
        if (rect && rect.width) {
            numero.style.left = `${rect.left + rect.width / 2}px`;
            numero.style.top = `${rect.top + rect.height / 2}px`;
        } else {
            numero.style.left = "50%";
            numero.style.top = "50%";
        }
        document.body.appendChild(numero);
        setTimeout(() => numero.remove(), 1100);
    }

    mostrarModalFinal(movimientosFinales, puntajeFinal, jugador, rival, formatearTiempo, tiempoSasuke, tiempoNaruto) {
        if (this.finalStats) {
            this.finalStats.innerHTML =
                `Movimientos: ${movimientosFinales}<br>` +
                `Puntaje: ${puntajeFinal}<br>` +
                `SASUKE — Aciertos: ${jugador.aciertos} / Errores: ${jugador.errores} / Tiempo restante: ${formatearTiempo(tiempoSasuke)}<br>` +
                `NARUTO — Aciertos: ${rival.aciertos} / Errores: ${rival.errores} / Tiempo restante: ${formatearTiempo(tiempoNaruto)}`;
        }
        if (this.modal) this.modal.classList.remove("hidden");
    }

    mostrarModalFinalOnline({ tipo, titulo, subtitulo, icono, marcador, stats, config, esAnfitrion, revanchaDisponible }) {
        if (!this.modalFinal) return;
        this.modalFinalPanel?.classList.remove("es-victoria", "es-derrota", "es-empate");
        this.modalFinalPanel?.classList.add(`es-${tipo}`);
        if (this.finalIcono) this.finalIcono.textContent = icono;
        if (this.finalTitulo) this.finalTitulo.textContent = titulo;
        if (this.finalSubtitulo) this.finalSubtitulo.textContent = subtitulo;

        if (this.finalMarcador) {
            this.finalMarcador.replaceChildren();
            for (const equipo of marcador || []) {
                const bloque = document.createElement("div");
                bloque.className = `marcador-equipo${equipo.ganador ? " ganador" : ""}`;
                const etiqueta = document.createElement("small");
                etiqueta.textContent = equipo.etiqueta;
                const valor = document.createElement("strong");
                valor.textContent = equipo.valor;
                const detalle = document.createElement("span");
                detalle.textContent = equipo.detalle;
                bloque.append(etiqueta, valor, detalle);
                this.finalMarcador.appendChild(bloque);
            }
        }

        if (this.finalStats) {
            this.finalStats.replaceChildren();
            for (const linea of stats || []) {
                const item = document.createElement("span");
                item.textContent = linea;
                this.finalStats.appendChild(item);
            }
        }

        if (this.finalConfig) this.finalConfig.hidden = !esAnfitrion;
        if (this.btnRevancha) this.btnRevancha.hidden = !esAnfitrion || !revanchaDisponible;
        if (this.finalEspera) this.finalEspera.hidden = esAnfitrion || !revanchaDisponible;
        if (this.finalError) this.finalError.hidden = true;

        const pares = Math.min(Math.max(Number(config?.pares) || 8, 8), 16);
        if (this.finalPares) this.finalPares.value = String(pares);
        if (this.finalMezclar) this.finalMezclar.checked = config?.mezclarAldeas !== false;
        this.#actualizarConsistenciaPares();

        this.modalFinal.classList.remove("hidden");
        const foco = esAnfitrion && revanchaDisponible ? this.btnRevancha : this.btnVolverMenu;
        foco?.focus();
    }

    ocultarModalFinal() {
        this.modalFinal?.classList.add("hidden");
    }

    bindModalFinal({ alVolver, alRevancha }) {
        if (this.modalFinalBindings) return;
        this.modalFinalBindings = true;
        this.btnVolverMenu?.addEventListener("click", () => alVolver?.());
        this.btnRevancha?.addEventListener("click", () => alRevancha?.(this.leerConfigRevancha()));
        this.finalMezclar?.addEventListener("change", () => this.#actualizarConsistenciaPares());
        this.modalFinal?.addEventListener("keydown", (event) => {
            if (event.key !== "Tab") return;
            const focos = [...this.modalFinal.querySelectorAll("button:not([hidden]):not(:disabled), select:not(:disabled), input:not(:disabled)")];
            if (focos.length === 0) return;
            const primero = focos[0];
            const ultimo = focos[focos.length - 1];
            if (event.shiftKey && document.activeElement === primero) {
                event.preventDefault();
                ultimo.focus();
            } else if (!event.shiftKey && document.activeElement === ultimo) {
                event.preventDefault();
                primero.focus();
            }
        });
    }

    leerConfigRevancha() {
        return {
            pares: Number(this.finalPares?.value) || 8,
            mezclarAldeas: this.finalMezclar ? this.finalMezclar.checked : true,
        };
    }

    mostrarErrorRevancha(texto) {
        if (!this.finalError) return;
        this.finalError.textContent = texto;
        this.finalError.hidden = false;
    }

    bloquearRevancha(bloqueado, mensaje = "Esperando que el anfitrión inicie la revancha…") {
        if (this.btnRevancha) {
            this.btnRevancha.disabled = bloqueado;
            this.btnRevancha.textContent = bloqueado ? "ESPERANDO…" : "REVANCHA";
        }
        if (this.finalEspera) {
            this.finalEspera.textContent = mensaje;
            this.finalEspera.hidden = !bloqueado;
        }
    }

    #actualizarConsistenciaPares() {
        if (!this.finalPares) return;
        const mezclar = this.finalMezclar ? this.finalMezclar.checked : true;
        if (!mezclar) this.finalPares.value = "8";
        this.finalPares.disabled = !mezclar;
    }

    bindBotonesModal() {
        const botonGuardar = document.getElementById("saveRecord");
        const botonCerrar = document.getElementById("closeModal");
        const cerrar = () => { if (this.modal) this.modal.classList.add("hidden"); };
        if (botonGuardar) botonGuardar.addEventListener("click", cerrar);
        if (botonCerrar) botonCerrar.addEventListener("click", cerrar);
    }
}
