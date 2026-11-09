/**
 * CLASE ABSTRACTA: Poder — Patrón Template Method
 *
 * Reemplaza el patrón que se repetía 6 veces en game-online.js
 * (usarByakugan, usarSustitucion, usarRobo, usarGenjutsu, usarSello,
 * usarBomba): todas hacían las MISMAS validaciones en el mismo orden.
 * Ese patrón repetido es justo lo que la Herencia y el Polimorfismo
 * están para eliminar.
 *
 * >>> ABSTRACCIÓN <<< new.target === Poder bloquea "new Poder()" directo.
 * >>> ENCAPSULAMIENTO <<< usa jugador.gastarChakra()/tieneChakraPara(),
 * nunca toca jugador.chakra directo (ver entidades/Personaje.js).
 */
export class Poder {
    constructor({ id, nombre, costoChakra, usosIniciales, botonId, contadorId }) {
        if (new.target === Poder) {
            throw new Error("Poder es abstracta: no se puede instanciar directamente");
        }
        this.id = id;
        this.nombre = nombre;
        this.costoChakra = costoChakra;
        this._usos = { sasuke: usosIniciales, naruto: usosIniciales };
        this.boton = botonId ? document.getElementById(botonId) : null;
        this.contador = contadorId ? document.getElementById(contadorId) : null;

        if (this.boton) {
            this.boton.addEventListener("click", () => this.activar());
        }
    }

    /** El GestorPartida llama esto una sola vez al armar todo (DIP: inyección de dependencias). */
    inyectarContexto(contexto) {
        this.contexto = contexto;
    }

    usosRestantes(esSasuke) {
        return esSasuke ? this._usos.sasuke : this._usos.naruto;
    }

    _consumirUso(esSasuke) {
        if (esSasuke) { this._usos.sasuke--; } else { this._usos.naruto--; }
    }

    _actualizarUsosUI(esSasuke) {
        const usos = this.usosRestantes(esSasuke);
        if (this.contador) this.contador.textContent = usos;
        if (this.boton) this.boton.classList.toggle("poder-agotado", usos <= 0);
    }

    mostrarMensaje(mensaje) {
        console.log(this.nombre.toUpperCase() + ":", mensaje);
        this.contexto.mostrarAvisoRapido(mensaje);
    }

    /** >>> EL ESQUELETO FIJO (Template Method) <<< */
    activar() {
        const contexto = this.contexto;

        if (contexto.esOnline) {
            if (typeof contexto.activarPoderOnline === "function") {
                contexto.activarPoderOnline(this.id);
                return;
            }
            this.mostrarMensaje("LOS PODERES NO SE PUEDEN ACTIVAR AHORA");
            return;
        }

        if (this.estaBloqueado(contexto)) return;

        if (!contexto.esMiTurno()) {
            this.mostrarMensaje("NO ES TU TURNO");
            return;
        }

        const esSasuke = contexto.esTurnoDeSasuke();
        const jugador = contexto.jugadorActivo();

        if (this.usosRestantes(esSasuke) <= 0) {
            this.mostrarMensaje("SIN USOS");
            return;
        }

        if (!jugador.tieneChakraPara(this.costoChakra)) {
            this.mostrarMensaje("CHAKRA INSUFICIENTE");
            return;
        }

        if (!this.validarCondicionesExtra(contexto)) return;

        jugador.gastarChakra(this.costoChakra);
        contexto.actualizarChakra();

        this._consumirUso(esSasuke);
        this._actualizarUsosUI(esSasuke);

        this.efecto(contexto, esSasuke, jugador);

        // Sincronización BEST-EFFORT con el backend: se avisa al servidor
        // para que registre el poder en la partida de SQLite (chakra,
        // eventos). Hook OPCIONAL (ISP) — si el contexto no lo expone o el
        // servidor no está, aquí simplemente no pasa nada. Nunca bloquea el juego.
        const notificar = contexto.notificarPoderAlServidor;
        if (typeof notificar === "function") {
            const promesa = notificar(this.id, esSasuke);
            if (promesa && typeof promesa.catch === "function") promesa.catch(() => {});
        }
    }

    /** Hook OPCIONAL (ISP: el poder que no lo necesita, no lo toca). */
    estaBloqueado(contexto) {
        return false;
    }

    /** Hook OPCIONAL. */
    validarCondicionesExtra(contexto) {
        return true;
    }

    /** Contrato OBLIGATORIO. */
    efecto(contexto, esSasuke, jugador) {
        throw new Error(`El poder "${this.nombre}" no implementó efecto()`);
    }
}
