import { ProveedorDatos } from "./ProveedorDatos.js";

// Ruta RELATIVA (mismo origen): funciona servido desde cualquier host/puerto,
// no solo desde localhost:3000. El backend sirve el frontend en el mismo origen.
const URL_BASE = "/api";
const ID_JUGADOR_SASUKE = "sasuke";
const ID_JUGADOR_NARUTO = "naruto";

/**
 * PROVEEDOR DE DATOS REAL (SQLite vía backend)
 *
 * >>> LSP <<<
 * Misma firma que ProveedorDatosSimulado (obtenerDatos()), pero en
 * lugar de devolver el JSON del MockServer, CREA una partida real en el
 * backend (que queda persistida en SQLite con chakra, vida y jugadores)
 * y devuelve su estado inicial con el mismo formato que espera
 * UIManager.renderPlayers(). GestorPartida no se entera del cambio.
 *
 * >>> BEST-EFFORT / GRACEFUL DEGRADATION <<<
 * Si el backend no responde, cae al proveedor simulado: el juego sigue
 * funcionando igual que siempre, offline. Además, al activar un poder
 * el motor avisa al servidor (notificarPoder) para que la partida de
 * SQLite registre el evento y descuente el chakra — sin esperar la
 * respuesta (fire-and-forget), el juego nunca se frena por la red.
 */
export class ProveedorDatosServidor extends ProveedorDatos {
    constructor({ jugador, rival, respaldo }) {
        super();
        this.jugador = jugador;
        this.rival = rival;
        this.respaldo = respaldo;
        this.idPartida = null;
    }

    async obtenerDatos() {
        const fallo = () => this.respaldo.obtenerDatos();
        const controlador = new AbortController();
        const temporizador = setTimeout(() => controlador.abort(), 8000);

        try {
            const respuesta = await fetch(`${URL_BASE}/partida`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                signal: controlador.signal,
                body: JSON.stringify({
                    idJugador1: ID_JUGADOR_SASUKE,
                    nombre1: this.jugador.nombre,
                    idJugador2: ID_JUGADOR_NARUTO,
                    nombre2: this.rival.nombre,
                    chakraInicial1: this.jugador.chakra,
                    chakraInicial2: this.rival.chakra,
                }),
            });

            const cuerpo = await respuesta.json();
            if (respuesta.ok === false || cuerpo.exito !== true) {
                throw new Error(cuerpo.error || `HTTP ${respuesta.status}`);
            }

            this.idPartida = cuerpo.idPartida;
            const [jugador1, jugador2] = cuerpo.jugadores;

            return {
                room: { id: this.idPartida, status: "PLAYING" },
                players: {
                    p1: {
                        name: jugador1.nombre,
                        chakra: jugador1.chakra,
                        score: 0,
                        avatar: "assets/img/sasuke.png",
                    },
                    p2: {
                        name: jugador2.nombre,
                        chakra: jugador2.chakra,
                        score: 0,
                        avatar: "assets/img/naruto.png",
                    },
                },
            };
        } catch (error) {
            console.warn("No se pudo crear la partida en el backend (se usa el proveedor simulado):", error.message);
            return fallo();
        } finally {
            clearTimeout(temporizador);
        }
    }

    /** OPCIONAL (ISP): notifica al backend que un poder se activó. Nunca lanza. */
    async notificarPoder(idPoder, esSasuke) {
        if (!this.idPartida) {
            return { enviado: false, motivo: "sin_partida_en_servidor" };
        }

        const idJugador = esSasuke ? ID_JUGADOR_SASUKE : ID_JUGADOR_NARUTO;

        try {
            const respuesta = await fetch(`${URL_BASE}/poder/activar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ idPartida: this.idPartida, idJugador, idPoder }),
            });
            const cuerpo = await respuesta.json();

            if (cuerpo.exito === false) {
                console.warn("El servidor no aplicó el poder:", cuerpo.motivo || cuerpo.error || cuerpo);
            }
            return { enviado: true, resultado: cuerpo };
        } catch (error) {
            console.warn("No se pudo sincronizar el poder con el backend:", error.message);
            return { enviado: false, error: error.message };
        }
    }
}