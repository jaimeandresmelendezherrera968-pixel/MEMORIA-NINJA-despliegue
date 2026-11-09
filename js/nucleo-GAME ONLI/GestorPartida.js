import { Personaje } from "./entidades/Personaje.js";
import { GestorTurno } from "./GestorTurno.js";
import { GestorTiempo } from "./GestorTiempo.js";
import { VistaPartida } from "./vista/VistaPartida.js";
import { GestorPoderes } from "./poderes/GestorPoderes.js";
import { ProveedorDatosSimulado } from "./datos/ProveedorDatosSimulado.js";
import { ProveedorDatosServidor } from "./datos/ProveedorDatosServidor.js";
import { UIManager } from "../ui-manager.js";
import { BoardManager } from "../board-manager.js";
import { historialApi } from "../infraestructura/repositorios/HttpHistorialRepositorio.js";
import { clienteMultijugador } from "../multijugador/ClienteMultijugador.js";

const TIEMPO_INICIAL = 180;
const CHAKRA_POR_ACIERTO = 5;
const CHAKRA_BASE_COMBO = 3;
const VIDA_PERDIDA_POR_ERROR = 5;

const PODERES_ONLINE = {
    sustitucion: {
        nombre: "SUSTITUCIÓN",
        clase: "sustitucion",
        icono: "Agrupar/img/online%20-%20juts-sustit.png",
    },
    byakugan: {
        nombre: "BYAKUGAN",
        clase: "byakugan",
        icono: "Agrupar/img/logo-online-byakugan.png",
    },
    robo: {
        nombre: "ROBO DE CHAKRA",
        clase: "robo",
        icono: "Agrupar/img/robo-chakra.png",
    },
    genjutsu: {
        nombre: "GENJUTSU",
        clase: "genjutsu",
        icono: "Agrupar/img/logo-genyugsu%20online.png",
    },
    sello: {
        nombre: "SELLO DE BLOQUEO",
        clase: "sello",
        icono: "Agrupar/img/logo%20-sllo%20bloq.png",
    },
    bomba: {
        nombre: "BOMBA EXPLOSIVA",
        clase: "bomba",
        icono: "Agrupar/img/logo%20-online-%20bomba%20.png",
    },
};

const MODO_PRUEBA_LOCAL = true;
const MI_PERSONAJE_ES_SASUKE = true;

/**
 * GESTOR DE PARTIDA — raíz de composición del motor del juego.
 *
 * >>> DIP <<< Este es el ÚNICO lugar de todo el motor donde se hace
 * "new" de las clases concretas (Personaje, GestorTurno, GestorTiempo,
 * VistaPartida, GestorPoderes, ProveedorDatosSimulado). Todo lo demás
 * recibe sus dependencias por constructor o por el objeto "contexto",
 * nunca las crea por su cuenta.
 *
 * >>> SRP a nivel orquestador <<< esta clase no contiene NINGUNA regla
 * de negocio de un poder puntual, ni maneja el DOM directamente para
 * animaciones — solo conecta las piezas y reacciona a los eventos del
 * tablero (aciertos/errores) y del turno.
 */
export class GestorPartida {
    constructor() {
        const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
        this.esSalaOnline = !!params?.get("codigo");
        this.mazoOnline = null;
        this.gestorSala = null;
        this.iniciado = false;

        this.jugador = new Personaje({ nombre: "SASUKE", nivel: 18, chakraInicial: 70 });
        this.rival = new Personaje({ nombre: "NARUTO", nivel: 20, chakraInicial: 65 });

        this.gestorTurno = new GestorTurno({
            modoPruebaLocal: MODO_PRUEBA_LOCAL,
            miPersonajeEsSasuke: MI_PERSONAJE_ES_SASUKE,
        });

        this.gestorTiempo = new GestorTiempo(TIEMPO_INICIAL);
        this.vista = new VistaPartida();

        // >>> LSP en vivo <<< El proveedor de datos real crea y persiste
        // la partida en el backend (SQLite). Si el servidor no responde,
        // ProveedorDatosServidor cae solo al simulado: el juego no se rompe.
        this.proveedorDatos = new ProveedorDatosServidor({
            jugador: this.jugador,
            rival: this.rival,
            respaldo: new ProveedorDatosSimulado(),
        });

        this.puntajeActual = 0;
        this.partidaFinalizada = false;
        this.historialOnlineGuardado = false;

        const contexto = {
            esOnline: this.esSalaOnline,
            esMiTurno: () => {
                if (this.esSalaOnline && this.gestorSala) return this.gestorSala.esMiTurno;
                return this.gestorTurno.esMiTurno();
            },
            esTurnoDeSasuke: () => {
                if (this.esSalaOnline && this.gestorSala) {
                    const esMiTurno = this.gestorSala.esMiTurno;
                    const miEquipo = this.gestorSala.miEquipo;
                    if (miEquipo === "A") return !!esMiTurno;
                    if (miEquipo === "B") return false;
                    return this.gestorSala.es2v2 ? false : !!esMiTurno;
                }
                return this.gestorTurno.esTurnoDeSasuke();
            },
            jugadorActivo: () => (this.gestorTurno.esTurnoDeSasuke() ? this.jugador : this.rival),
            obtenerRivalDe: (esSasuke) => (esSasuke ? this.rival : this.jugador),
            actualizarChakra: () => this.vista.renderChakra(this.jugador, this.rival),
            perderVida: (esSasukeObjetivo, cantidad) => {
                const objetivo = esSasukeObjetivo ? this.jugador : this.rival;
                objetivo.recibirDanio(cantidad);
                this.vista.renderVida(this.jugador, this.rival);
            },
            mostrarAvisoRapido: (mensaje) => this.vista.mostrarAvisoRapido(mensaje),
            BoardManager,
            // Hook OPCIONAL que avisa al backend cada vez que un poder se
            // activa. Con proveedores simulados no hace nada.
            notificarPoderAlServidor: (idPoder, esSasuke) =>
                this.proveedorDatos.notificarPoder(idPoder, esSasuke),
            activarPoderOnline: (idPoder) => {
                try {
                    if (this.esSalaOnline) {
                        clienteMultijugador?.activarPoder?.(idPoder);
                        return;
                    }
                } catch (e) {}
                try {
                    import('../multijugador/ClienteMultijugador.js').then((mod) => {
                        try { mod.clienteMultijugador?.activarPoder?.(idPoder); } catch (e) {}
                    }).catch(() => {});
                } catch (e) {}
            },
        };

        this.gestorPoderes = new GestorPoderes(contexto);

        this.gestorTurno.alCambiarTurno((esTurnoDeSasuke) => {
            this.vista.renderTurno(esTurnoDeSasuke);
            this.gestorPoderes.poderes.forEach((poder) => poder._actualizarUsosUI(esTurnoDeSasuke));
        });
    }

    async iniciar(opciones = {}) {
        if (this.iniciado) return;
        this.iniciado = true;

        const esSalaOnline = opciones.esSalaOnline ?? this.esSalaOnline;
        this.esSalaOnline = esSalaOnline;
        let estadoInicial = null;

        if (esSalaOnline) {
            this.activarEventosOnline();
            try {
                const mod = await import('../multijugador/GestorSalaCliente.js');
                this.gestorSala = mod.gestorSalaCliente;
                estadoInicial = await this.gestorSala.iniciar({ codigoSala: opciones.codigoSala });
            } catch (error) {
                this.mostrarErrorConexion(error.message);
                return;
            }
            if (!estadoInicial) return;
            this.mazoOnline = estadoInicial.mazo;
        }

        BoardManager.renderBoard(
            (esAcierto, puntajeTotal) => {
                if (esSalaOnline) return;
                this.procesarResultado(esAcierto, puntajeTotal);
            },
            (movimientos, puntaje) => {
                if (esSalaOnline) return;
                this.mostrarModalFinal(movimientos, puntaje);
            },
            () => {
                if (esSalaOnline && this.gestorSala) return this.gestorSala.esMiTurno;
                return this.gestorTurno.esMiTurno();
            },
            esSalaOnline ? this.mazoOnline : opciones.mazo || this.mazoExterno
        );

        if (esSalaOnline) {
            BoardManager.habilitarModoOnline({
                alVoltear: (index) => this.gestorSala?.voltearCarta(index),
            });
            this.vista.cargarPanelSuperior();
            this.gestorSala.refrescarUI();
            this.vista.bindModalFinal({
                alVolver: () => {
                    this.gestorSala?.abandonar();
                    window.location.href = "menu.html";
                },
                alRevancha: (config) => this.solicitarRevancha(config),
            });
            document.querySelector('a.boton[href="menu.html"]')
                ?.addEventListener('click', () => this.gestorSala?.abandonar());
            console.log(`Partida online iniciada en la sala ${this.gestorSala.codigoSala}.`);
            return;
        }

        try {
            const data = await this.proveedorDatos.obtenerDatos();
            UIManager.renderPlayers(data.players);
        } catch (error) {
            console.warn("No se pudieron cargar los datos del proveedor (no afecta al tablero):", error);
        }

        this.vista.cargarPanelSuperior();
        this.vista.cargarPanelJugador(this.jugador);
        this.vista.cargarPanelRival(this.rival);
        this.vista.bindBotonesModal();

        this.gestorTiempo.iniciar((tiempoSasuke, tiempoNaruto) => {
            if (this.partidaFinalizada) return;

            const seAgotoElTiempo = this.gestorTiempo.descontarSegundo(this.gestorTurno.esTurnoDeSasuke());
            this.vista.renderTiempos(this.gestorTiempo.tiempoSasuke, this.gestorTiempo.tiempoNaruto, this.gestorTurno.esTurnoDeSasuke(), GestorTiempo.formatear);

            if (seAgotoElTiempo) this.gestorTiempo.detener();
        });

        this.vista.renderTurno(this.gestorTurno.esTurnoDeSasuke());
        this.vista.renderVida(this.jugador, this.rival);

        console.log("Motor de partida iniciado correctamente.");
    }

    activarEventosOnline() {
        if (this.eventosOnlineActivos) return;
        this.eventosOnlineActivos = true;

        window.addEventListener('partida-terminada-online', (ev) => {
            this.mostrarModalFinalOnline(ev.detail || {});
        });

        window.addEventListener('jugador-desconectado-online', (ev) => {
            const detalle = ev.detail || {};
            const espera = detalle.segundos ? `${detalle.segundos}s` : "unos segundos";
            const quien = detalle.jugadorId === this.gestorSala?.miId ? "Tu conexión" : `${detalle.nombre || "El rival"}`;
            this.vista.mostrarAvisoRapido(`${quien} se desconectó. Esperando ${espera}...`, "info");
            BoardManager.bloquearTablero(true);
        });

        window.addEventListener('jugador-reconectado-online', (ev) => {
            this.vista.mostrarAvisoRapido(`${ev.detail?.nombre || "El rival"} se reconectó.`, "info");
        });

        window.addEventListener('sala-error-online', (ev) => {
            this.mostrarErrorConexion(ev.detail?.mensaje);
        });

        window.addEventListener('poder-activado-online', (ev) => {
            const datos = ev.detail || {};
            const poder = PODERES_ONLINE[datos.poderId];
            if (!poder) return;

            const miId = this.gestorSala?.miId;
            const miEquipo = this.gestorSala?.miEquipo;
            const esMio = datos.jugadorId === miId;
            const esAliado = !esMio && !!miEquipo && datos.equipo === miEquipo;
            const autor = datos.nombre || (esAliado ? "TU COMPAÑERO" : "EL RIVAL");

            this.vista.mostrarBannerPoder({
                poder: poder.clase,
                titulo: poder.nombre,
                detalle: esMio ? "ACTIVADO POR TI" : `${autor} LO ACTIVÓ`,
                icono: poder.icono,
                deRival: !esMio && !esAliado,
            });
        });

        window.addEventListener('poder-rechazado-online', (ev) => {
            const mensaje = ev.detail?.mensaje || "No se pudo activar el poder.";
            this.vista.mostrarAvisoRapido(mensaje.toUpperCase(), "error");
        });

        window.addEventListener('poder-efecto-online', (ev) => {
            const datos = ev.detail || {};
            const miId = this.gestorSala?.miId;
            if (datos.tipo === 'danio') {
                this.vista.mostrarImpactoBomba({
                    objetivoEsMio: datos.objetivoId === miId,
                    danio: datos.danio,
                });
                const mitigado = datos.consumidoSustitucion ? " (mitigado)" : "";
                this.vista.mostrarAvisoRapido(`BOMBA: ${datos.danio} de daño${mitigado}`, "poder");
            } else if (datos.tipo === 'robo') {
                this.vista.mostrarAvisoRapido(`ROBO: ${datos.robado} de chakra`, "poder");
            } else if (datos.tipo === 'evadido') {
                this.vista.mostrarAvisoRapido('SUSTITUCIÓN: poder evadido', "info");
            } else if (datos.tipo === 'contrarresto') {
                this.vista.mostrarAvisoRapido('BYAKUGAN: Genjutsu anulado', "info");
            } else if (datos.tipo === 'byakugan' && datos.jugadorId === miId) {
                this.vista.mostrarAvisoRapido('BYAKUGAN: cartas reveladas', "info");
            } else if (datos.tipo === 'sello') {
                this.vista.mostrarAvisoRapido('SELLO: carta bloqueada', "poder");
            } else if (datos.tipo === 'mezcla') {
                this.vista.mostrarAvisoRapido('GENJUTSU: tablero alterado', "poder");
            }
        });

        window.addEventListener('sustitucion-usada-online', () => {
            this.vista.mostrarAvisoRapido('SUSTITUCIÓN: el fallo no cuenta', "info");
        });
    }

    mostrarErrorConexion(mensaje) {
        const texto = mensaje || "No se pudo conectar con la sala.";
        document.getElementById("onlineEstado")?.removeAttribute("hidden");
        const estado = document.getElementById("onlineEstado");
        if (estado) estado.textContent = `ERROR DE SALA · ${texto}`;
        this.vista.mostrarAvisoRapido(texto);
    }

    procesarResultado(esAcierto, puntajeTotal) {
        this.puntajeActual = puntajeTotal;
        this.vista.renderPuntaje(this.puntajeActual);

        const esSasuke = this.gestorTurno.esTurnoDeSasuke();
        const actor = esSasuke ? this.jugador : this.rival;

        if (esAcierto) {
            actor.registrarAcierto();
            this.vista.renderAciertoJugador(esSasuke, actor);
            this.vista.renderCombo(this.jugador, this.rival);

            actor.ganarChakra(CHAKRA_POR_ACIERTO);
            this.vista.renderChakra(this.jugador, this.rival);

            if (actor.combo >= 2) this._ganarChakraPorCombo(esSasuke, actor);
        } else {
            if (this.gestorPoderes.sustitucion.estaArmada(esSasuke)) {
                this.gestorPoderes.sustitucion.desarmar(esSasuke);
                this.gestorPoderes.sustitucion.notificarUsoDefensivo();
            } else {
                const teniaCombo = actor.registrarError();
                this.vista.renderErrorJugador(esSasuke, actor);
                if (teniaCombo) this.vista.mostrarComboRoto(esSasuke);

                this._perderVida(esSasuke, VIDA_PERDIDA_POR_ERROR);
                this.gestorTurno.cambiar();
            }
        }
    }

    _perderVida(esSasukeObjetivo, cantidad) {
        const objetivo = esSasukeObjetivo ? this.jugador : this.rival;
        objetivo.recibirDanio(cantidad);
        this.vista.renderVida(this.jugador, this.rival);
    }

    _ganarChakraPorCombo(esSasuke, actor) {
        const bono = CHAKRA_BASE_COMBO * actor.combo;
        actor.ganarChakra(bono);
        this.vista.renderChakra(this.jugador, this.rival);
        this.vista.mostrarBonoChakraVisual(esSasuke, bono);
        this.vista.mostrarBonificacionCombo(actor.combo, bono);
    }

    mostrarModalFinal(movimientosFinales, puntajeFinal) {
        if (this.partidaFinalizada) return;
        this.partidaFinalizada = true;
        try { this.gestorTiempo.detener(); } catch (e) {}
        this.vista.mostrarModalFinal(
            movimientosFinales, puntajeFinal, this.jugador, this.rival,
            GestorTiempo.formatear, this.gestorTiempo.tiempoSasuke, this.gestorTiempo.tiempoNaruto
        );
    }

    mostrarModalFinalOnline(datos = {}) {
        if (this.partidaFinalizada) return;
        this.partidaFinalizada = true;
        try { this.gestorTiempo.detener(); } catch (e) {}
        BoardManager.bloquearTablero(true);

        const es2v2 = datos.modo === "2v2" || datos.config?.modo === "2v2";
        const miId = this.gestorSala?.miId;
        const miEquipo = this.gestorSala?.miEquipo;
        const miNombre = this.gestorSala?.miNombre || "Jugador";
        const ganadorEquipo = datos.ganadorEquipo || null;
        const empate = es2v2 ? !ganadorEquipo && !datos.ganadorId : !datos.ganadorId;
        const soyGanador = es2v2 ? ganadorEquipo === miEquipo : datos.ganadorId === miId;
        const tipo = empate ? "empate" : soyGanador ? "victoria" : "derrota";
        const titulo = empate ? "EMPATE" : soyGanador ? "¡VICTORIA!" : "DERROTA";
        const icono = empate ? "🤝" : soyGanador ? "🏆" : "💥";

        const parejas = datos.parejas || {};
        const parejasEquipos = datos.parejasEquipos || { A: 0, B: 0 };
        const misParejas = es2v2 ? parejasEquipos[miEquipo] || 0 : parejas[miId] || 0;
        const puntajeMio = misParejas * 10;
        const motivo =
            datos.motivo === "abandono" ? "Un jugador abandonó la sala." :
            datos.motivo === "tiempo" ? "Se agotó el tiempo de un jugador." :
            datos.motivo === "vida" ? "Un jugador se quedó sin vida." : "";

        const jugadores = datos.jugadores || [];
        const nombresDe = (equipo) => jugadores
            .filter((j) => j.equipo === equipo)
            .map((j) => j.nombre)
            .join(" / ") || `Equipo ${equipo}`;

        let marcador;
        if (es2v2) {
            marcador = ["A", "B"].map((equipo) => ({
                etiqueta: `EQUIPO ${equipo}`,
                valor: `+${parejasEquipos[equipo] || 0}`,
                detalle: nombresDe(equipo),
                ganador: ganadorEquipo === equipo,
            }));
        } else {
            const rivalId = this.gestorSala?.rivalId();
            marcador = [
                { etiqueta: "TÚ", valor: `+${misParejas}`, detalle: miNombre, ganador: soyGanador && !empate },
                {
                    etiqueta: "RIVAL",
                    valor: `+${rivalId ? parejas[rivalId] || 0 : 0}`,
                    detalle: this.gestorSala?.rivalNombre || "Rival",
                    ganador: !soyGanador && !empate,
                },
            ];
        }

        this.vista.mostrarModalFinalOnline({
            tipo,
            titulo,
            icono,
            subtitulo: [motivo, es2v2 ? "Duelo por equipos" : "Duelo online"].filter(Boolean).join(" · "),
            marcador,
            stats: [
                `Movimientos: ${datos.movimientos ?? 0}`,
                `Tus parejas: ${misParejas}`,
                `Sala: ${datos.codigo || this.gestorSala?.codigoSala || "--"}`,
            ],
            config: datos.config || {},
            esAnfitrion: this.gestorSala?.esAnfitrion === true,
            revanchaDisponible: datos.motivo !== "abandono",
        });

        this.#guardarHistorialOnline({ datos, es2v2, empate, soyGanador, puntaje: puntajeMio });
    }

    async solicitarRevancha(config = {}) {
        if (!this.gestorSala) return;
        this.vista.bloquearRevancha(true, "Iniciando revancha…");
        try {
            const respuesta = await this.gestorSala.solicitarRevancha(config);
            if (!respuesta?.exito) {
                this.vista.bloquearRevancha(false);
                this.vista.mostrarErrorRevancha(respuesta?.error || "No se pudo iniciar la revancha.");
            }
        } catch (error) {
            this.vista.bloquearRevancha(false);
            this.vista.mostrarErrorRevancha(error.message || "No se pudo iniciar la revancha.");
        }
    }

    #guardarHistorialOnline({ datos, es2v2, empate, soyGanador, puntaje }) {
        if (this.historialOnlineGuardado) return;
        this.historialOnlineGuardado = true;

        const ganador = empate
            ? "empate"
            : soyGanador
                ? (this.gestorSala?.miNombre || "Jugador")
                : "ninguno";
        const idPartida = datos.idPartida ||
            `online-${datos.codigo || this.gestorSala?.codigoSala || "sala"}-${Date.now()}`;

        historialApi.guardar({
            zona: "online",
            puntaje,
            modo: es2v2 ? "online-2v2" : "online-1v1",
            ganador,
            idPartida,
        }).catch((error) => {
            console.warn("No se pudo guardar el historial online:", error);
        });
    }
}
