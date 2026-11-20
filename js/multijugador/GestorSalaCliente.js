import { clienteMultijugador } from "./ClienteMultijugador.js";
import { BoardManager } from "../board-manager.js";
import {
  reproducirAcierto,
  reproducirContrarresto,
  reproducirDanio,
  reproducirError,
  reproducirPoder,
  reproducirVentana,
} from "../services/ConfiguracionAudio.js";

export class GestorSalaCliente {
  constructor() {
    this.codigoSala = null;
    this.miId = null;
    this.miNombre = "Jugador";
    this.miEquipo = null;
    this.miAsiento = null;
    this.rivalNombre = "Rival";
    this.estado = null;
    this.esMiTurno = false;
    this.iniciado = false;
    this.listenersRegistrados = false;
    this.promesaPartida = null;
    this.resolverPartida = null;
    this.partidaTerminada = false;
    this.version = 0;
    this.turnoTerminaEn = null;
    this.terminadaNotificadaPara = null;
    this.colaIntenciones = [];
    this.ultimaIntencion = null;
    this.nonceIntencion = 0;
    this.intencionPendiente = null; // { nonce, index, turno, version }
    this.espectador = false;
    this.reaccionActiva = null;
    this.reaccionTimer = null;
  }

  get es2v2() {
    return this.estado?.modo === "2v2" || this.estado?.capacidad === 4;
  }

  get esAnfitrion() {
    if (this.espectador) return false;
    const yo = this.estado?.jugadores?.find((j) => j.id === this.miId);
    const primero = this.estado?.jugadores?.[0];
    return !!yo && !!primero && yo.id === primero.id;
  }

  async iniciar(opciones = {}) {
    if (this.iniciado) return this.estado;

    const params = new URLSearchParams(window.location.search);
    this.codigoSala = (opciones.codigoSala || params.get("codigo") || "").toUpperCase();
    if (!this.codigoSala) {
      this.iniciado = true;
      return null;
    }

    await clienteMultijugador.conectar();
    this.espectador = opciones.espectador === true;
    this.miId = this.espectador ? null : clienteMultijugador.token;
    this.registrarEventos();

    const respuesta = this.espectador
      ? await clienteMultijugador.observarSala(this.codigoSala)
      : await clienteMultijugador.reincorporarseSala(this.codigoSala);
    if (!respuesta?.exito) {
      this.iniciado = true;
      this.mostrarErrorSala(respuesta?.error || "No se pudo entrar a la sala.");
      return null;
    }
    if (this.espectador) this.mostrarDistintivoEspectador();

    this.aplicarEstado(respuesta.estado);
    this.iniciado = true;
    this.partidaTerminada = this.estado?.estado === "terminada";

    if (this.estado?.estado === "jugando") return this.estado;
    if (this.estado?.estado === "terminada") return this.estado;

    this.esperandoInicio();
    return this.promesaPartida;
  }

  mostrarDistintivoEspectador() {
    if (document.getElementById("distintivoEspectador")) return;
    const distintivo = document.createElement("div");
    distintivo.id = "distintivoEspectador";
    distintivo.className = "distintivo-espectador";
    distintivo.setAttribute("role", "status");
    distintivo.setAttribute("aria-live", "polite");
    distintivo.setAttribute("aria-atomic", "true");
    distintivo.textContent = "OBSERVANDO PARTIDA";
    document.body.appendChild(distintivo);
  }

  esperandoInicio() {
    if (!this.promesaPartida) {
      this.promesaPartida = new Promise((resolve, reject) => {
        this.resolverPartida = resolve;
        this.temporizadorInicio = setTimeout(() => {
          reject(new Error("La partida no comenzó. El rival no se unió a tiempo."));
        }, 120000);
      });
    }
    return this.promesaPartida;
  }

  registrarEventos() {
    if (this.listenersRegistrados) return;
    this.listenersRegistrados = true;

    clienteMultijugador.on("partida-iniciada", (estado) => {
      if (this.partidaTerminada) {
        window.location.reload();
        return;
      }
      if (estado?.version) this.version = Number(estado.version);
      this.aplicarEstado(estado);
      if (this.resolverPartida) {
        clearTimeout(this.temporizadorInicio);
        const resolver = this.resolverPartida;
        this.resolverPartida = null;
        this.promesaPartida = null;
        resolver(this.estado);
      }
    });

    clienteMultijugador.on("accion-rechazada", (datos) => {
      const motivo = datos?.motivo || "";
      // Rollback optimista: quitar pendiente del intento actual (solo si nonce coincide)
      if (this.intencionPendiente && (datos?.nonce == null || this.intencionPendiente.nonce === datos.nonce)) {
        BoardManager.quitarPendiente(this.intencionPendiente.index);
        this.intencionPendiente = null;
        this.ultimaIntencion = null;
      }
      // Encolar intenciones rechazadas temporalmente (tablero bloqueado o jugada en curso)
      if (motivo === "tablero_bloqueado" || motivo === "jugada_en_curso" || motivo === "poder_en_proceso") {
        if (this.ultimaIntencion) {
          this.colaIntenciones.push({ ...this.ultimaIntencion });
        }
      }
      window.dispatchEvent(new CustomEvent("accion-rechazada-online", { detail: datos || {} }));
    });

    clienteMultijugador.on("carta-volteada", (datos) => {
      if (datos?.version && this.version > 0 && Number(datos.version) < this.version) return;
      if (datos?.version) this.version = Number(datos.version);
      // Confirmar solo si el nonce coincide (evitar confirmar accion vieja)
      if (this.intencionPendiente && this.intencionPendiente.nonce === datos.nonce && this.intencionPendiente.index === datos.index) {
        this.intencionPendiente = null;
        this.ultimaIntencion = null;
      }
      BoardManager.quitarPendiente(datos.index);
      BoardManager.revelarCartaRemota(datos.index, datos.valor, datos.aldea);
      if (this.estado) this.renderizarEstado(this.estado);
    });

    clienteMultijugador.on("acierto", (datos) => {
      if (datos?.version && this.version > 0 && Number(datos.version) < this.version) return;
      if (datos?.version) this.version = Number(datos.version);
      reproducirAcierto();
      BoardManager.marcarEmparejadas(datos.index1, datos.index2);
      if (this.estado) {
        this.estado.movimientos = datos.movimientos;
        this.estado.parejas = datos.parejas || this.estado.parejas;
        this.estado.parejasEquipos = datos.parejasEquipos || this.estado.parejasEquipos;
        this.estado.turno = datos.turno;
        this.estado.turnoEquipo = datos.turnoEquipo || this.estado.turnoEquipo;
        this.#aplicarEstadoJugadores(datos);
      }
      this.refrescarMarcadores();
      this.refrescarEquipos();
      this.renderizarEstado(this.estado);
    });

    clienteMultijugador.on("fallo", (datos) => {
      if (datos?.version && this.version > 0 && Number(datos.version) < this.version) return;
      if (datos?.version) this.version = Number(datos.version);
      reproducirError();
      BoardManager.bloquearTablero(true);
      BoardManager.ocultarCartasRemotas(datos.index1, datos.index2, 800);
      if (this.estado) this.#aplicarEstadoJugadores(datos);
      this.renderizarEstado(this.estado);
      if (datos.sustitucion) {
        window.dispatchEvent(new CustomEvent("sustitucion-usada-online", { detail: datos }));
      }
    });

    clienteMultijugador.on("turno-cambiado", (datos) => {
      if (datos?.turnoTerminaEn) this.turnoTerminaEn = datos.turnoTerminaEn;
      if (datos?.version && this.version > 0 && Number(datos.version) < this.version) return;
      if (datos?.version) this.version = Number(datos.version);
      if (this.estado) {
        this.estado.turno = datos.turno;
        this.estado.turnoEquipo = datos.turnoEquipo || this.estado.turnoEquipo;
      }
      this.renderizarEstado(this.estado);
      this.procesarColaIntenciones();
    });

    clienteMultijugador.on("tiempo-actualizado", (datos) => {
      if (datos?.turnoTerminaEn) this.turnoTerminaEn = datos.turnoTerminaEn;
      if (datos?.version && this.version > 0 && Number(datos.version) < this.version) return;
      if (datos?.version) this.version = Number(datos.version);
      if (!this.estado) return;
      this.estado.tiempos = datos.tiempos || this.estado.tiempos;
      this.renderizarEstado(this.estado);
    });

    clienteMultijugador.on("afk-aviso", (datos) => {
      if (datos?.jugadorId === this.miId) {
        window.dispatchEvent(new CustomEvent("afk-aviso-online", { detail: datos }));
      }
    });

    clienteMultijugador.on("partida-terminada", (datos) => {
      if (datos?.version && this.version > 0 && Number(datos.version) < this.version) return;
      if (datos?.version) this.version = Number(datos.version);
      if (this.terminadaNotificadaPara === datos?.idPartida) return;
      if (datos?.idPartida) this.terminadaNotificadaPara = datos.idPartida;
      if (this.estado) {
        this.estado.estado = "terminada";
        this.#aplicarEstadoJugadores(datos);
      }
      this.partidaTerminada = true;
      this.#limpiarReaccion();
      if (this.espectador) clienteMultijugador.limpiarContrasenaEspectador(this.codigoSala);
      BoardManager.bloquearTablero(true);
      this.renderizarEstado(this.estado);
      window.dispatchEvent(new CustomEvent("partida-terminada-online", { detail: datos }));
    });

    clienteMultijugador.on("estado-completo", (estado) => {
      if (!estado) return;
      // Snapshot periódico: aplicar estado completo (idempotente)
      this.renderizarEstado(estado);
    });

    clienteMultijugador.on("jugador-desconectado", (datos) => {
      BoardManager.bloquearTablero(true);
      window.dispatchEvent(new CustomEvent("jugador-desconectado-online", { detail: datos }));
    });

    clienteMultijugador.on("jugador-reconectado", (datos) => {
      BoardManager.bloquearTablero(!this.esMiTurno);
      window.dispatchEvent(new CustomEvent("jugador-reconectado-online", { detail: datos }));
    });

    clienteMultijugador.on("poder-activado", (datos) => {
      if (datos?.poderId) reproducirPoder(datos.poderId);
      if (this.estado) {
        if (datos?.jugadorId && datos.poderId) {
          if (!this.estado.poderes) this.estado.poderes = {};
          if (!this.estado.poderes[datos.jugadorId]) this.estado.poderes[datos.jugadorId] = {};
          this.estado.poderes[datos.jugadorId][datos.poderId] = datos.usosRestantes ?? this.estado.poderes[datos.jugadorId][datos.poderId];
        }
        if (typeof datos?.chakra === "number" && datos.jugadorId) {
          if (!this.estado.chakra) this.estado.chakra = {};
          this.estado.chakra[datos.jugadorId] = datos.chakra;
        }
      }
      this.actualizarEstadoJugadoresUI();
      this.actualizarPoderesUI(datos);
      window.dispatchEvent(new CustomEvent("poder-activado-online", { detail: datos }));
    });

    clienteMultijugador.on("poder-rechazado", (datos) => {
      window.dispatchEvent(new CustomEvent("poder-rechazado-online", { detail: datos }));
    });

    clienteMultijugador.on("poder-efecto", (datos) => {
      if (datos?.version && this.version > 0 && Number(datos.version) < this.version) return;
      if (datos?.version) this.version = Number(datos.version);
      if (datos?.tipo === "danio") reproducirDanio();
      if (this.estado) {
        if (datos?.vida !== undefined) this.estado.vida = datos.vida;
        if (datos?.tipo === "robo") {
          if (!this.estado.chakra) this.estado.chakra = {};
          if (datos.jugadorId) this.estado.chakra[datos.jugadorId] = datos.chakraAtacante;
          if (datos.objetivoId) this.estado.chakra[datos.objetivoId] = datos.chakraObjetivo;
        }
        if (datos?.tipo === "defensa") {
          if (!this.estado.sustitucionArmada) this.estado.sustitucionArmada = {};
          this.estado.sustitucionArmada[datos.jugadorId] = { activa: true };
        }
        if (datos?.tipo === "defensa_expira" || datos?.tipo === "evadido") {
          if (!this.estado.sustitucionArmada) this.estado.sustitucionArmada = {};
          this.estado.sustitucionArmada[datos.objetivoId || datos.jugadorId] = { activa: false };
        }
      }
      if (datos?.tipo === "byakugan") {
        if (datos.jugadorId === this.miId) {
          const duracion = datos.duracion || this.estado?.duracionByakuganMs || 5000;
          for (const carta of datos.cartas || []) {
            BoardManager.revelarTemporal(carta.index, carta.valor, carta.aldea, duracion);
          }
        }
      } else if (datos?.tipo === "byakugan-revelado") {
        if (datos.jugadorId !== this.miId) {
          BoardManager.resaltarIndicesByakugan(datos.indices, datos.duracion);
        }
      } else if (datos?.tipo === "sello") {
        if (this.estado) this.estado.sello = { index: datos.index, hasta: datos.hasta };
        BoardManager.sellarCarta(datos.index, datos.duracion);
      } else if (datos?.tipo === "sello_expirado") {
        if (this.estado) this.estado.sello = null;
        BoardManager.quitarSello(datos.index);
      } else if (datos?.tipo === "ventana-contrarresto") {
        const permitidos = Array.isArray(datos.contrapoderesPermitidos) && datos.contrapoderesPermitidos.length
          ? [...datos.contrapoderesPermitidos]
          : datos.contrapoderId ? [datos.contrapoderId] : [];
        const esMiObjetivo = datos.objetivoId === this.miId
          || (this.es2v2 && !!datos.objetivoEquipo && datos.objetivoEquipo === this.miEquipo);
        if (!this.espectador && esMiObjetivo && permitidos.length) {
          this.#limpiarReaccion();
          const duracion = Number(datos.duracion)
            || Number(datos.ventanaContrarrestoMs)
            || Number(this.estado?.ventanaContrarrestoMs)
            || 5000;
          this.reaccionActiva = {
            permitidos,
            duracion,
            venceEn: datos.venceEn || Date.now() + duracion,
          };
          document.body.classList.add("contrarresto-disponible");
          document.documentElement.style.setProperty("--ventana-contrarresto-ms", `${duracion}ms`);
          reproducirVentana();
          const restante = Math.max(0, this.reaccionActiva.venceEn - Date.now());
          this.reaccionTimer = setTimeout(() => this.#limpiarReaccion(), restante);
          this.reaccionTimer?.unref?.();
        }
        this.actualizarPoderesUI();
        window.dispatchEvent(new CustomEvent("ventana-contrarresto-online", {
          detail: { ...datos, contrapoderesPermitidos: permitidos, puedoContrarrestar: esMiObjetivo },
        }));
      } else if (datos?.tipo === "mezcla") {
        BoardManager.aplicarMezcla(datos.movimientos || datos.cartas);
        this.#activarIlusionGenjutsu(datos.duracion);
      } else if (datos?.tipo === "genjutsu_expirado") {
        this.#desactivarIlusionGenjutsu();
      } else if (datos?.tipo === "contrarresto") {
        reproducirContrarresto();
        this.#limpiarReaccion();
        if (datos.movimientos || datos.cartas) BoardManager.aplicarMezcla(datos.movimientos || datos.cartas);
        this.#desactivarIlusionGenjutsu();
      }
      this.actualizarEstadoJugadoresUI();
      this.actualizarPoderesUI();
      window.dispatchEvent(new CustomEvent("poder-efecto-online", { detail: datos }));
    });

    clienteMultijugador.on("estado-poderes", (datos) => {
      if (datos?.version && this.version > 0 && Number(datos.version) < this.version) return;
      if (datos?.version) this.version = Number(datos.version);
      if (this.estado && datos) {
        if (datos.poderes) this.estado.poderes = datos.poderes;
        if (datos.chakra !== undefined) this.estado.chakra = datos.chakra;
        if (datos.vida !== undefined) this.estado.vida = datos.vida;
        if (datos.combo !== undefined) this.estado.combo = datos.combo;
        if (datos.aciertos !== undefined) this.estado.aciertos = datos.aciertos;
        if (datos.errores !== undefined) this.estado.errores = datos.errores;
        if (datos.tiempos !== undefined) this.estado.tiempos = datos.tiempos;
        if (datos.sustitucionArmada) {
          if (!this.estado.sustitucionArmada) this.estado.sustitucionArmada = {};
          Object.assign(this.estado.sustitucionArmada, datos.sustitucionArmada);
        }
        if (Array.isArray(datos.byakuganReveladas) && datos.byakuganReveladas.length) {
          const duracion = Number(datos.duracionByakuganMs) || 5000;
          for (const carta of datos.byakuganReveladas) {
            BoardManager.revelarTemporal(carta.index, carta.valor, carta.aldea, duracion);
          }
        }
      }
      this.actualizarEstadoJugadoresUI();
      this.actualizarTiemposUI();
      this.actualizarPoderesUI();
      window.dispatchEvent(new CustomEvent("estado-poderes-online", { detail: datos }));
    });

    clienteMultijugador.on("error-sesion", (datos) => {
      this.mostrarErrorSala(datos?.error || "Sesión de sala inválida.");
    });

    window.addEventListener("desconectado", () => {
      this.actualizarEstadoConexion("SIN CONEXIÓN · reintentando...");
      BoardManager.bloquearTablero(true);
    });

    window.addEventListener("reconectado", () => {
      if (!this.codigoSala) return;
      this.actualizarEstadoConexion();
      const solicitud = this.espectador
        ? clienteMultijugador.observarSala(this.codigoSala)
        : clienteMultijugador.reincorporarseSala(this.codigoSala);
      solicitud
        .then((respuesta) => {
          if (respuesta?.exito) {
            this.aplicarEstado(respuesta.estado);
            if (this.estado?.cartasVolteadas?.length) {
              for (const carta of this.estado.cartasVolteadas) {
                BoardManager.revelarCartaRemota(carta.index, carta.valor, carta.aldea);
              }
            }
            if (this.estado?.estado === "terminada") {
              window.dispatchEvent(new CustomEvent("partida-terminada-online", { detail: this.estado }));
            }
          }
        })
        .catch((error) => {
          window.dispatchEvent(new CustomEvent("sala-error-online", { detail: { mensaje: "No se pudo rehidratar la sala: " + (error?.message || "") } }));
        });
    });

  }

  aplicarEstado(estado) {
    if (!estado) return;
    const versionEntrante = Number(estado.version || 0);
    if (versionEntrante > 0 && this.version > 0 && versionEntrante < this.version) return;
    if (versionEntrante > 0) this.version = versionEntrante;
    // Limpiar estado optimista incompatible con snapshot autoritativo (después de validar versión)
    if (this.intencionPendiente) {
      BoardManager.quitarPendiente(this.intencionPendiente.index);
      this.intencionPendiente = null;
    }
    if (estado.turnoTerminaEn) this.turnoTerminaEn = estado.turnoTerminaEn;
    if (Array.isArray(estado.byakuganReveladas)) {
      const duracion = Number(estado.duracionByakuganMs) || 5000;
      for (const carta of estado.byakuganReveladas) {
        BoardManager.revelarTemporal(carta.index, carta.valor, carta.aldea, duracion);
      }
    }
    this.estado = estado;
    this.codigoSala = estado.codigo || this.codigoSala;

    const { yo, rival } = this.#lados(estado);
    if (this.espectador) this.miId = yo?.id || null;
    this.miNombre = yo?.nombre || "Jugador";
    this.miEquipo = yo?.equipo || this.miEquipo;
    this.miAsiento = yo?.asiento ?? this.miAsiento;
    this.rivalNombre = rival?.nombre || "Rival";
    this.esMiTurno = this.#esTurnoDeMiEquipo(estado.turnoEquipo, estado.turno);

    window.dispatchEvent(new CustomEvent("sala-lista-online", { detail: estado }));
    this.renderizarEstado(this.estado);
  }

  renderizarEstado(estado) {
    if (!estado) return;
    const versionEntrante = Number(estado.version || 0);
    if (versionEntrante > 0 && this.version > 0 && versionEntrante < this.version) return;
    if (versionEntrante > 0) this.version = versionEntrante;
    // Limpiar estado optimista incompatible con snapshot autoritativo (después de validar versión)
    if (this.intencionPendiente) {
      BoardManager.quitarPendiente(this.intencionPendiente.index);
      this.intencionPendiente = null;
    }
    if (estado.turnoTerminaEn) this.turnoTerminaEn = estado.turnoTerminaEn;
    // Rehidratar sello
    if (estado.sello && Number.isInteger(estado.sello.index)) {
      BoardManager.sellarCarta(estado.sello.index, Math.max(0, (estado.sello.hasta || 0) - Date.now()));
    }
    // Rehidratar genjutsu (mezcla persistente + ilusión visual)
    if (estado.genjutsu) {
      if (Array.isArray(estado.genjutsu.movimientos)) {
        BoardManager.aplicarMezcla(estado.genjutsu.movimientos);
      }
      if (estado.genjutsu.hasta) {
        const restante = Math.max(0, estado.genjutsu.hasta - Date.now());
        if (restante > 0) this.#activarIlusionGenjutsu(restante);
      }
    }

    this.estado = estado;
    this.codigoSala = estado.codigo || this.codigoSala;

    const { yo, rival } = this.#lados(estado);
    if (this.espectador) this.miId = yo?.id || null;
    this.miNombre = yo?.nombre || this.miNombre;
    this.miEquipo = yo?.equipo || this.miEquipo;
    this.miAsiento = yo?.asiento ?? this.miAsiento;
    this.rivalNombre = rival?.nombre || this.rivalNombre;
    this.esMiTurno = this.#esTurnoDeMiEquipo(estado.turnoEquipo, estado.turno);

    // Rehidratar cartas volteadas sin duplicar
    if (Array.isArray(estado.cartasVolteadas)) {
      for (const carta of estado.cartasVolteadas) {
        BoardManager.revelarCartaRemota(carta.index, carta.valor, carta.aldea);
      }
    }

    // Rehidratar byakugan se hace en aplicarEstado (una sola vez)
    // Rehidratar sello
    if (estado.sello && Number.isInteger(estado.sello.index)) {
      BoardManager.sellarCarta(estado.sello.index, Math.max(0, (estado.sello.hasta || 0) - Date.now()));
    }

    this.refrescarUI();
    this.actualizarEstadoJugadoresUI();
    this.actualizarTiemposUI();
    this.actualizarPoderesUI();
    this.refrescarMarcadores();
    this.refrescarEquipos();
    this.actualizarTurno(estado.turno);
    if (this.espectador) BoardManager.bloquearTablero(true);

    if (estado.estado === "terminada") {
      this.partidaTerminada = true;
      BoardManager.bloquearTablero(true);
      if (this.terminadaNotificadaPara !== estado.idPartida) {
        this.terminadaNotificadaPara = estado.idPartida || null;
        window.dispatchEvent(new CustomEvent("partida-terminada-online", { detail: estado }));
      }
    }
  }

  #esTurnoDeMiEquipo(turnoEquipo, turnoId) {
    if (turnoEquipo) return turnoEquipo === this.miEquipo;
    return turnoId === this.miId;
  }

  #lados(estado = this.estado) {
    const jugadores = estado?.jugadores || [];
    if (this.espectador) {
      const yo = jugadores.find((j) => j.equipo === "A") || jugadores[0] || null;
      const rival = jugadores.find((j) => j.equipo === "B") || jugadores[1] || null;
      return { yo, rival };
    }
    const yo = jugadores.find((j) => j.id === this.miId) || null;
    const rival = jugadores.find((j) => this.miEquipo && j.equipo && j.equipo !== this.miEquipo)
      || jugadores.find((j) => j.id !== this.miId)
      || null;
    return { yo, rival };
  }

  #aplicarEstadoJugadores(datos = {}) {
    if (!this.estado || !datos) return;
    if (datos.chakra !== undefined) this.estado.chakra = datos.chakra;
    if (datos.vida !== undefined) this.estado.vida = datos.vida;
    if (datos.combo !== undefined) this.estado.combo = datos.combo;
    if (datos.aciertos !== undefined) this.estado.aciertos = datos.aciertos;
    if (datos.errores !== undefined) this.estado.errores = datos.errores;
    if (datos.tiempos !== undefined) this.estado.tiempos = datos.tiempos;
  }

  #activarIlusionGenjutsu(duracion = 5000) {
    const frame = document.getElementById("boardFrame");
    if (frame) frame.classList.add("genjutsu-ilusion");
    clearTimeout(this._genjutsuTimeout);
    this._genjutsuTimeout = setTimeout(() => this.#desactivarIlusionGenjutsu(), duracion);
  }

  #desactivarIlusionGenjutsu() {
    document.getElementById("boardFrame")?.classList.remove("genjutsu-ilusion");
    clearTimeout(this._genjutsuTimeout);
    this._genjutsuTimeout = null;
  }

  #parejasDeMiEquipo() {
    if (this.es2v2) return this.estado?.parejasEquipos?.[this.miEquipo] || 0;
    return this.estado?.parejas?.[this.miId] || 0;
  }

  refrescarUI() {
    const estado = this.estado;
    if (!estado) return;

    const nombres = document.querySelectorAll(
      ".panel-personaje-lateral .nombre-personaje, .panel-naruto-lateral .nombre-personaje"
    );
    if (nombres[0]) nombres[0].textContent = this.miNombre;
    if (nombres[1]) nombres[1].textContent = this.rivalNombre;

    this.refrescarMarcadores();
    this.refrescarEquipos();
    this.actualizarEstadoConexion();
    this.actualizarTurno(estado.turno);
    this.actualizarEstadoJugadoresUI();
    this.actualizarTiemposUI();
    this.actualizarPoderesUI();

    if (Array.isArray(estado.mazo)) {
      estado.mazo.forEach((carta, index) => {
        if (carta?.emparejada && carta.valor) {
          BoardManager.revelarCartaRemota(index, carta.valor, carta.aldea, true);
        }
      });
    }
    if (Array.isArray(estado.cartasVolteadas)) {
      for (const carta of estado.cartasVolteadas) {
        BoardManager.revelarCartaRemota(carta.index, carta.valor, carta.aldea);
      }
    }
    BoardManager.aplicarEstadoSello(estado.sello);
  }

  refrescarMarcadores() {
    if (!this.estado) return;
    const movimientos = document.getElementById("moves");
    const puntaje = document.getElementById("score");
    if (movimientos) movimientos.textContent = this.estado.movimientos ?? 0;
    if (puntaje) puntaje.textContent = this.#parejasDeMiEquipo() * 10;
  }

  refrescarEquipos() {
    const contenedor = document.getElementById("equiposOnline");
    if (!contenedor) return;
    const estado = this.estado;
    if (!estado || !this.es2v2) {
      contenedor.hidden = true;
      contenedor.replaceChildren();
      return;
    }

    contenedor.hidden = false;
    contenedor.replaceChildren();

    const renderEquipo = (clave) => {
      const jugadores = estado.equipos?.[clave] || [];
      const activo = estado.turnoEquipo === clave;
      const equipo = document.createElement("div");
      equipo.className = `equipo-online${activo ? " activo" : ""}`;
      equipo.dataset.equipo = clave;

      const titulo = document.createElement("div");
      titulo.className = "equipo-online-titulo";
      const nombreEquipo = document.createElement("span");
      nombreEquipo.textContent = `EQUIPO ${clave}`;
      const parejas = document.createElement("strong");
      parejas.textContent = `+${estado.parejasEquipos?.[clave] || 0}`;
      titulo.append(nombreEquipo, parejas);

      const lista = document.createElement("div");
      lista.className = "equipo-online-jugadores";
      for (const jugador of jugadores) {
        const chip = document.createElement("span");
        chip.className = "jugador-online";
        if (jugador.id === this.miId) chip.classList.add("es-yo");
        if (!jugador.conectado || jugador.abandonado) chip.classList.add("desconectado");
        chip.textContent = jugador.id === this.miId ? `${jugador.nombre} (tú)` : jugador.nombre;
        lista.appendChild(chip);
      }
      equipo.append(titulo, lista);
      return equipo;
    };

    const separador = document.createElement("span");
    separador.className = "equipo-online-separador";
    separador.textContent = "VS";
    contenedor.append(renderEquipo("A"), separador, renderEquipo("B"));
  }

  actualizarEstadoJugadoresUI() {
    const estado = this.estado;
    if (!estado) return;
    const rivalId = this.rivalId();
    this.#actualizarJugadorUI(this.miId, {
      chakraTexto: "chakraTextoSasuke",
      chakraBarra: "chakraBarraSasuke",
      vidaTexto: "vidaTextoSasuke",
      vidaBarra: "vidaBarraSasuke",
      vidaFantasma: "vidaFantasmaSasuke",
      comboLateral: "comboSasuke",
      aciertos: "playerHits",
      errores: "playerErrors",
      combo: "playerCombo",
    });
    this.#actualizarJugadorUI(rivalId, {
      chakraTexto: "chakraTextoNaruto",
      chakraBarra: "chakraBarraNaruto",
      vidaTexto: "vidaTextoNaruto",
      vidaBarra: "vidaBarraNaruto",
      vidaFantasma: "vidaFantasmaNaruto",
      comboLateral: "comboNaruto",
      aciertos: "enemyHits",
      errores: "enemyErrors",
      combo: "enemyCombo",
    });
    this.actualizarSustitucionUI();
  }

  #actualizarJugadorUI(jugadorId, ids) {
    if (!jugadorId) return;
    const estado = this.estado;
    const chakra = estado.chakra?.[jugadorId];
    const vida = estado.vida?.[jugadorId];
    const combo = estado.combo?.[jugadorId] || 0;
    const aciertos = estado.aciertos?.[jugadorId];
    const errores = estado.errores?.[jugadorId];

    if (typeof chakra === "number") {
      const texto = document.getElementById(ids.chakraTexto);
      const barra = document.getElementById(ids.chakraBarra);
      if (texto) texto.textContent = `${chakra} / 100`;
      if (barra) barra.style.width = `${Math.max(0, Math.min(100, chakra))}%`;
    }
    if (typeof vida === "number") {
      const actual = Math.max(0, Math.min(100, vida));
      const texto = document.getElementById(ids.vidaTexto);
      const barra = document.getElementById(ids.vidaBarra);
      const fantasma = ids.vidaFantasma ? document.getElementById(ids.vidaFantasma) : null;
      if (!this._vidaAnterior) this._vidaAnterior = {};
      const anterior = Number.isFinite(this._vidaAnterior[jugadorId]) ? this._vidaAnterior[jugadorId] : actual;
      if (texto) texto.textContent = `${actual}/100`;
      if (fantasma) {
        if (actual < anterior) {
          fantasma.style.transition = "none";
          fantasma.style.width = `${anterior}%`;
          void fantasma.offsetWidth;
          fantasma.style.transition = "width .75s ease .12s";
          fantasma.style.width = `${actual}%`;
        } else if (actual > anterior) {
          fantasma.style.transition = "none";
          fantasma.style.width = `${actual}%`;
        } else if (!fantasma.style.width) {
          fantasma.style.width = `${actual}%`;
        }
      }
      if (barra) barra.style.width = `${actual}%`;
      this._vidaAnterior[jugadorId] = actual;
    }
    const comboLateral = document.getElementById(ids.comboLateral);
    if (comboLateral) comboLateral.textContent = combo > 0 ? `COMBO x${combo}` : "";
    const comboEl = document.getElementById(ids.combo);
    if (comboEl) comboEl.textContent = `x${combo}`;
    const aciertosEl = document.getElementById(ids.aciertos);
    if (aciertosEl && typeof aciertos === "number") aciertosEl.textContent = aciertos;
    const erroresEl = document.getElementById(ids.errores);
    if (erroresEl && typeof errores === "number") erroresEl.textContent = errores;
  }

  actualizarTiemposUI() {
    const estado = this.estado;
    if (!estado) return;
    const formatear = (segundos) => {
      const total = Math.max(0, Math.floor(Number(segundos) || 0));
      const minutos = String(Math.floor(total / 60)).padStart(2, "0");
      const resto = String(total % 60).padStart(2, "0");
      return `${minutos}:${resto}`;
    };
    const tiempos = estado.tiempos || {};
    const miTiempo = tiempos[this.miId];
    const rivalTiempo = tiempos[this.rivalId()];
    const tiempoSasuke = document.getElementById("tiempoSasuke");
    const tiempoNaruto = document.getElementById("tiempoNaruto");
    const tiempo = document.getElementById("timer");
    if (tiempoSasuke) tiempoSasuke.textContent = formatear(miTiempo);
    if (tiempoNaruto) tiempoNaruto.textContent = formatear(rivalTiempo);
    if (tiempo) tiempo.textContent = formatear(tiempos[estado.turno] ?? miTiempo);
  }

  actualizarSustitucionUI() {
    const el = document.getElementById("sustitucionEstado");
    if (!el) return;
    const mia = !!this.estado?.sustitucionArmada?.[this.miId]?.activa;
    const rival = !!this.estado?.sustitucionArmada?.[this.rivalId()]?.activa;
    el.textContent = mia ? "SUSTITUCIÓN ARMADA" : rival ? "RIVAL CON SUSTITUCIÓN" : "";
    el.classList.toggle("sustitucion-activa", mia);
    el.classList.toggle("sustitucion-rival", rival && !mia);
  }

  actualizarPoderesUI(datos = null) {
    const estado = this.estado;
    if (!estado) return;
    const poderesYo = estado.poderes?.[this.miId] || {};
    const map = [
      ["sustitucion", "usosSustitucion", "btnSustitucion"],
      ["byakugan", "usosByakugan", "btnByakugan"],
      ["robo", "usosRobo", "btnRobo"],
      ["genjutsu", "usosGenjutsu", "btnGenjutsu"],
      ["sello", "usosSello", "btnSello"],
      ["bomba", "usosBomba", "btnBomba"],
    ];
    for (const [id, usosId, btnId] of map) {
      const usosEl = document.getElementById(usosId);
      if (usosEl && typeof poderesYo[id] === "number") {
        usosEl.textContent = poderesYo[id];
      }
      const btn = document.getElementById(btnId);
      if (btn && typeof poderesYo[id] === "number") {
        btn.classList.toggle("poder-agotado", poderesYo[id] <= 0);
        btn.classList.toggle(
          "poder-reaccion",
          !!this.reaccionActiva?.permitidos?.includes(id) && poderesYo[id] > 0,
        );
      }
    }
    if (datos?.poderId) {
      const btn = document.getElementById(`btn${datos.poderId === "robo" ? "Robo" : datos.poderId.charAt(0).toUpperCase() + datos.poderId.slice(1)}`);
      if (datos.poderId === "sustitucion") {
        const b = document.getElementById("btnSustitucion");
        if (b) {
          b.classList.add("poder-usado");
          setTimeout(() => b.classList.remove("poder-usado"), 900);
        }
      } else if (datos.poderId === "bomba") {
        const b = document.getElementById("btnBomba");
        if (b) { b.classList.add("poder-usado"); setTimeout(() => b.classList.remove("poder-usado"), 900); }
      } else if (datos.poderId === "robo") {
        const b = document.getElementById("btnRobo");
        if (b) { b.classList.add("poder-usado"); setTimeout(() => b.classList.remove("poder-usado"), 900); }
      } else if (datos.poderId === "byakugan") {
        const b = document.getElementById("btnByakugan");
        if (b) { b.classList.add("poder-usado"); setTimeout(() => b.classList.remove("poder-usado"), 900); }
      } else if (datos.poderId === "genjutsu") {
        const b = document.getElementById("btnGenjutsu");
        if (b) { b.classList.add("poder-usado"); setTimeout(() => b.classList.remove("poder-usado"), 900); }
      } else if (datos.poderId === "sello") {
        const b = document.getElementById("btnSello");
        if (b) { b.classList.add("poder-usado"); setTimeout(() => b.classList.remove("poder-usado"), 900); }
      }
    }
  }

  actualizarEstadoConexion(texto) {
    const el = document.getElementById("onlineEstado");
    if (!el) return;
    el.hidden = false;
    const marcador = this.es2v2
      ? `EQUIPO A ${this.estado?.parejasEquipos?.A || 0} · EQUIPO B ${this.estado?.parejasEquipos?.B || 0}`
      : `PAREJAS ${this.estado?.parejas?.[this.miId] || 0} - ${this.estado?.parejas?.[this.rivalId()] || 0}`;
    el.textContent =
      texto ||
      `SALA ${this.codigoSala} · ${this.es2v2 ? "2 VS 2" : `${this.miNombre} vs ${this.rivalNombre}`} · ${marcador}`;
  }

  rivalId() {
    return this.#lados().rival?.id || null;
  }

  actualizarTurno(turnoId) {
    const estado = this.estado;
    if (!estado) return;
    this.esMiTurno = this.#esTurnoDeMiEquipo(estado.turnoEquipo, turnoId || estado.turno);
    const turnoSasuke = document.getElementById("turnoSasuke");
    const turnoNaruto = document.getElementById("turnoNaruto");
    if (this.espectador) {
      const equipoActivo = estado.turnoEquipo || (estado.turno === this.miId ? "A" : "B");
      if (turnoSasuke) {
        turnoSasuke.textContent = equipoActivo === "A" ? "TURNO EQUIPO A" : "";
        turnoSasuke.classList.toggle("turno-activo", equipoActivo === "A");
      }
      if (turnoNaruto) {
        turnoNaruto.textContent = equipoActivo === "B" ? "TURNO EQUIPO B" : "";
        turnoNaruto.classList.toggle("turno-activo", equipoActivo === "B");
      }
      return;
    }
    const compañeroActivo = this.es2v2 && this.esMiTurno && estado.turno !== this.miId;
    if (turnoSasuke) {
      turnoSasuke.textContent = compañeroActivo ? "TURNO DE TU EQUIPO" : this.esMiTurno ? "TU TURNO" : "";
      turnoSasuke.classList.toggle("turno-activo", this.esMiTurno);
    }
    if (turnoNaruto) {
      turnoNaruto.textContent = !this.esMiTurno ? "TURNO RIVAL" : "";
      turnoNaruto.classList.toggle("turno-activo", !this.esMiTurno);
    }
    BoardManager.bloquearTablero(!this.esMiTurno);
  }

  async solicitarRevancha(config = {}) {
    if (this.espectador) return { exito: false, error: "Un espectador no puede pedir revancha." };
    return clienteMultijugador.solicitarRevancha(config);
  }

  voltearCarta(index) {
    if (this.espectador) return false;
    if (!this.estado || this.estado.estado !== "jugando") return false;
    if (!this.esMiTurno) return false;
    // Evitar doble clic sobre la misma carta ya pendiente
    if (this.intencionPendiente && this.intencionPendiente.index === index) return false;
    this.nonceIntencion++;
    const nonce = this.nonceIntencion;
    this.intencionPendiente = { nonce, accion: "voltear", index, turno: this.estado.turno, version: this.version };
    BoardManager.marcarPendiente(index);
    this.ultimaIntencion = this.intencionPendiente;
    clienteMultijugador.voltearCarta(index, this.intencionPendiente?.nonce ?? null);
    return true;
  }

  procesarColaIntenciones() {
    if (this.espectador) {
      this.colaIntenciones = [];
      return;
    }
    if (!this.estado || this.estado.estado !== "jugando") {
      this.colaIntenciones = [];
      return;
    }
    const turnoActual = this.estado.turno;
    const versionActual = this.version;
    // Procesar solo UNA intención a la vez (esperar confirmación/rechazo)
    const intento = this.colaIntenciones.shift();
    if (!intento) return;
    // Descartar si el turno o la versión cambió
    if (intento.turno !== turnoActual) return;
    if (intento.version > 0 && intento.version < versionActual) return;
    if (!this.esMiTurno) return;
    if (intento.accion === "voltear") {
      this.nonceIntencion++;
      this.intencionPendiente = { nonce: this.nonceIntencion, ...intento };
      this.ultimaIntencion = this.intencionPendiente;
      BoardManager.marcarPendiente(intento.index);
      clienteMultijugador.voltearCarta(intento.index, this.intencionPendiente.nonce);
    }
  }

  #limpiarReaccion() {
    if (this.reaccionTimer) {
      clearTimeout(this.reaccionTimer);
      this.reaccionTimer = null;
    }
    if (!this.reaccionActiva) return;
    this.reaccionActiva = null;
    document.body.classList.remove("contrarresto-disponible");
    document.documentElement.style.removeProperty("--ventana-contrarresto-ms");
    this.actualizarPoderesUI();
  }

  mostrarErrorSala(mensaje) {
    const el = document.getElementById("onlineEstado");
    if (el) {
      el.hidden = false;
      el.textContent = `ERROR DE SALA · ${mensaje}`;
    }
    window.dispatchEvent(new CustomEvent("sala-error-online", { detail: { mensaje } }));
  }

  abandonar() {
    if (this.espectador) clienteMultijugador.salirDeObservacion();
    else clienteMultijugador.abandonarSala();
  }
}

export const gestorSalaCliente = new GestorSalaCliente();
