const CLAVE_TOKEN = "memoriaNinjaTokenJugador";

// En local/LAN/túnel el socket va al mismo origen que sirve la página.
// En producción (Vercel) va directo a Render, porque Vercel no mantiene
// WebSockets. La URL se define en js/config.js.
const HOST = typeof window !== "undefined" ? window.location.hostname : "";
const ES_HOST_LOCAL =
  HOST === "localhost" ||
  HOST === "127.0.0.1" ||
  HOST === "::1" ||
  /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(HOST) ||
  HOST.endsWith(".devtunnels.ms");
const URL_BACKEND_CONFIGURADA = String(
  (typeof globalThis !== "undefined" && globalThis.MEMORIA_NINJA_BACKEND_URL) || ""
).trim();
const ES_PLACEHOLDER =
  !URL_BACKEND_CONFIGURADA || URL_BACKEND_CONFIGURADA.includes("TU-BACKEND");
const URL_BACKEND =
  ES_HOST_LOCAL || ES_PLACEHOLDER
    ? (typeof window !== "undefined" ? window.location.origin : "")
    : URL_BACKEND_CONFIGURADA;

function generarToken() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch (error) {}
  return `jugador-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function leerToken() {
  try {
    const guardado = sessionStorage.getItem(CLAVE_TOKEN);
    if (guardado) return guardado;
    const nuevo = generarToken();
    sessionStorage.setItem(CLAVE_TOKEN, nuevo);
    return nuevo;
  } catch (error) {
    if (!this.tokenMemoria) this.tokenMemoria = generarToken();
    return this.tokenMemoria;
  }
}

export class ClienteMultijugador {
  constructor() {
    this.socket = null;
    this.conectado = false;
    this.codigoSala = null;
    this.token = leerToken.call(this);
    this.oyentes = new Map();
    this.promesaConexion = null;
    this.ultimoError = null;
  }

  async conectar() {
    if (this.socket?.connected) return this.socket;
    if (this.promesaConexion) return this.promesaConexion;

    this.promesaConexion = (async () => {
      let io;
      try {
        const modulo = await import("../vendor/socket.io.esm.min.js");
        io = modulo.io;
      } catch (error) {
        throw new Error("No se pudo cargar el cliente de multijugador.");
      }

      this.socket = io(URL_BACKEND, {
        auth: { token: this.token },
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 500,
      });

      await new Promise((resolve, reject) => {
        const temporizador = setTimeout(() => {
          this.ultimoError = "Tiempo de espera agotado al conectar con el servidor.";
          reject(new Error(this.ultimoError));
        }, 30000);

        this.socket.once("connect", () => {
          clearTimeout(temporizador);
          this.conectado = true;
          this.ultimoError = null;
          this.adjuntarOyentes();
          resolve();
        });
        this.socket.once("connect_error", (error) => {
          clearTimeout(temporizador);
          this.conectado = false;
          this.ultimoError = error?.message || "No se pudo conectar con el servidor.";
          reject(new Error(this.ultimoError));
        });
      });

      this.socket.on("disconnect", (motivo) => {
        this.conectado = false;
        this.dispatchLocal("desconectado", { motivo });
      });
      this.socket.on("connect", () => {
        this.conectado = true;
        this.adjuntarOyentes();
        this.dispatchLocal("reconectado", {});
      });

      return this.socket;
    })();

    try {
      return await this.promesaConexion;
    } catch (error) {
      this.promesaConexion = null;
      throw error;
    }
  }

  adjuntarOyentes() {
    if (!this.socket) return;
    for (const [evento, callbacks] of this.oyentes.entries()) {
      for (const callback of callbacks) {
        this.socket.off(evento, callback);
        this.socket.on(evento, callback);
      }
    }
  }

  dispatchLocal(evento, detalle) {
    if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") return;
    window.dispatchEvent(new CustomEvent(evento, { detail: detalle }));
  }

  on(evento, callback) {
    if (!this.oyentes.has(evento)) this.oyentes.set(evento, new Set());
    this.oyentes.get(evento).add(callback);
    if (this.socket) {
      this.socket.off(evento, callback);
      this.socket.on(evento, callback);
    }
    return () => this.off(evento, callback);
  }

  off(evento, callback) {
    if (!callback) {
      this.oyentes.delete(evento);
      this.socket?.removeAllListeners(evento);
      return;
    }
    this.oyentes.get(evento)?.delete(callback);
    this.socket?.off(evento, callback);
  }

  emitir(evento, datos) {
    if (!this.socket?.connected) {
      return Promise.reject(new Error("Sin conexión con el servidor de salas."));
    }
    return new Promise((resolve, reject) => {
      const temporizador = setTimeout(() => reject(new Error("El servidor no respondió.")), 8000);
      const respuesta = (valor) => {
        clearTimeout(temporizador);
        resolve(valor);
      };
      if (datos === undefined) this.socket.emit(evento, respuesta);
      else this.socket.emit(evento, datos, respuesta);
    });
  }

  nombreLocal() {
    try {
      const usuario = JSON.parse(localStorage.getItem("usuarioActivo") || "{}");
      return String(usuario?.nombre || usuario?.usuario || "Jugador").slice(0, 24) || "Jugador";
    } catch (error) {
      return "Jugador";
    }
  }

  async crearSala(config = {}) {
    await this.conectar();
    const respuesta = await this.emitir("crear-sala", {
      nombre: this.nombreLocal(),
      ...config,
    });
    if (respuesta?.exito) this.codigoSala = respuesta.codigo;
    return respuesta;
  }

  async unirseSala(codigo, nombre, contrasena = null) {
    await this.conectar();
    const respuesta = await this.emitir("unirse-sala", {
      codigo,
      nombre: nombre || this.nombreLocal(),
      contrasena,
    });
    if (respuesta?.exito) this.codigoSala = String(codigo).toUpperCase();
    return respuesta;
  }

  async reincorporarseSala(codigo) {
    await this.conectar();
    return this.emitir("reincorporarse-sala", {
      codigo,
      nombre: this.nombreLocal(),
    });
  }

  async listarSalas() {
    await this.conectar();
    return this.emitir("listar-salas");
  }

  async buscarSalaPorCodigo(codigo) {
    await this.conectar();
    return this.emitir("buscar-sala-por-codigo", { codigo });
  }

  async buscarPartidaRapida(modo = "1v1") {
    await this.conectar();
    const respuesta = await this.emitir("buscar-partida", {
      nombre: this.nombreLocal(),
      modo: modo === "2v2" ? "2v2" : "1v1",
    });
    if (respuesta?.codigo) this.codigoSala = respuesta.codigo;
    return respuesta;
  }

  async solicitarRevancha(config = {}) {
    return this.emitir("revancha-sala", { config });
  }

  cancelarBusqueda() {
    this.socket?.emit("cancelar-busqueda");
  }

  marcarListo() {
    return this.emitir("marcar-listo");
  }

  voltearCarta(index) {
    this.socket?.emit("voltear-carta", { index });
  }

  activarPoder(poderId) {
    if (!this.socket?.connected) return;
    this.socket.emit("activar-poder", { poderId });
  }

  abandonarSala() {
    this.socket?.emit("abandonar-sala");
    this.codigoSala = null;
  }
}

export const clienteMultijugador = new ClienteMultijugador();
