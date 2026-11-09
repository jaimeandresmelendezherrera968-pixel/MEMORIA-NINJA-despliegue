import { clienteMultijugador } from "./ClienteMultijugador.js";
import { BoardManager } from "../board-manager.js";

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
  }

  get es2v2() {
    return this.estado?.modo === "2v2" || this.estado?.capacidad === 4;
  }

  get esAnfitrion() {
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
    this.miId = clienteMultijugador.token;
    this.registrarEventos();

    const respuesta = await clienteMultijugador.reincorporarseSala(this.codigoSala);
    if (!respuesta?.exito) {
      this.iniciado = true;
      this.mostrarErrorSala(respuesta?.error || "No se pudo entrar a la sala.");
      return null;
    }

    this.aplicarEstado(respuesta.estado);
    this.iniciado = true;
    this.partidaTerminada = this.estado?.estado === "terminada";

    if (this.estado?.estado === "jugando") return this.estado;
    if (this.estado?.estado === "terminada") return this.estado;

    this.esperandoInicio();
    return this.promesaPartida;
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
      this.aplicarEstado(estado);
      if (this.resolverPartida) {
        clearTimeout(this.temporizadorInicio);
        const resolver = this.resolverPartida;
        this.resolverPartida = null;
        this.promesaPartida = null;
        resolver(this.estado);
      }
    });

    clienteMultijugador.on("carta-volteada", (datos) => {
      BoardManager.revelarCartaRemota(datos.index, datos.valor, datos.aldea);
    });

    clienteMultijugador.on("acierto", (datos) => {
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
      this.actualizarTurno(datos.turno);
      this.actualizarEstadoJugadoresUI();
      this.actualizarTiemposUI();
      this.actualizarPoderesUI();
    });

    clienteMultijugador.on("fallo", (datos) => {
      BoardManager.bloquearTablero(true);
      BoardManager.ocultarCartasRemotas(datos.index1, datos.index2, 800);
      if (this.estado) this.#aplicarEstadoJugadores(datos);
      this.actualizarEstadoJugadoresUI();
      this.actualizarTiemposUI();
      if (datos.sustitucion) {
        window.dispatchEvent(new CustomEvent("sustitucion-usada-online", { detail: datos }));
      }
    });

    clienteMultijugador.on("turno-cambiado", (datos) => {
      if (this.estado) {
        this.estado.turno = datos.turno;
        this.estado.turnoEquipo = datos.turnoEquipo || this.estado.turnoEquipo;
      }
      this.actualizarTurno(datos.turno);
      this.actualizarTiemposUI();
      this.refrescarEquipos();
    });

    clienteMultijugador.on("tiempo-actualizado", (datos) => {
      if (!this.estado) return;
      this.estado.tiempos = datos.tiempos || this.estado.tiempos;
      this.actualizarTiemposUI();
    });

    clienteMultijugador.on("partida-terminada", (datos) => {
      if (this.estado) {
        this.estado.estado = "terminada";
        this.#aplicarEstadoJugadores(datos);
      }
      this.partidaTerminada = true;
      BoardManager.bloquearTablero(true);
      this.actualizarEstadoJugadoresUI();
      this.actualizarTiemposUI();
      window.dispatchEvent(new CustomEvent("partida-terminada-online", { detail: datos }));
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
        for (const carta of datos.cartas || []) {
          BoardManager.revelarTemporal(carta.index, carta.valor, carta.aldea, datos.duracion);
        }
      } else if (datos?.tipo === "sello") {
        if (this.estado) this.estado.sello = { index: datos.index, hasta: datos.hasta };
        BoardManager.sellarCarta(datos.index, datos.duracion);
      } else if (datos?.tipo === "sello_expirado") {
        if (this.estado) this.estado.sello = null;
        BoardManager.quitarSello(datos.index);
      } else if (datos?.tipo === "mezcla") {
        BoardManager.aplicarMezcla(datos.cartas);
        this.#activarIlusionGenjutsu(datos.duracion);
      } else if (datos?.tipo === "genjutsu_expirado") {
        this.#desactivarIlusionGenjutsu();
      } else if (datos?.tipo === "contrarresto") {
        if (datos.cartas) BoardManager.aplicarMezcla(datos.cartas);
        this.#desactivarIlusionGenjutsu();
      }
      this.actualizarEstadoJugadoresUI();
      this.actualizarPoderesUI();
      window.dispatchEvent(new CustomEvent("poder-efecto-online", { detail: datos }));
    });

    clienteMultijugador.on("estado-poderes", (datos) => {
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
      clienteMultijugador
        .reincorporarseSala(this.codigoSala)
        .then((respuesta) => {
          if (respuesta?.exito) {
            this.aplicarEstado(respuesta.estado);
            if (this.estado?.cartasVolteadas?.length) {
              for (const carta of this.estado.cartasVolteadas) {
                BoardManager.revelarCartaRemota(carta.index, carta.valor, carta.aldea);
              }
            }
          }
        })
        .catch(() => {});
    });

  }

  aplicarEstado(estado) {
    if (!estado) return;
    this.estado = estado;
    this.codigoSala = estado.codigo || this.codigoSala;

    const yo = estado.jugadores.find((j) => j.id === this.miId);
    const rival = estado.jugadores.find((j) => j.id !== this.miId);
    this.miNombre = yo?.nombre || "Jugador";
    this.miEquipo = yo?.equipo || null;
    this.miAsiento = yo?.asiento ?? null;
    this.rivalNombre = rival?.nombre || "Rival";
    this.esMiTurno = this.#esTurnoDeMiEquipo(estado.turnoEquipo, estado.turno);

    window.dispatchEvent(new CustomEvent("sala-lista-online", { detail: estado }));
    this.refrescarUI();
  }

  #esTurnoDeMiEquipo(turnoEquipo, turnoId) {
    if (turnoEquipo) return turnoEquipo === this.miEquipo;
    return turnoId === this.miId;
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
      const texto = document.getElementById(ids.vidaTexto);
      const barra = document.getElementById(ids.vidaBarra);
      if (texto) texto.textContent = `${vida}/100`;
      if (barra) barra.style.width = `${Math.max(0, Math.min(100, vida))}%`;
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
    return this.estado?.jugadores?.find((j) => j.id !== this.miId)?.id || null;
  }

  actualizarTurno(turnoId) {
    const estado = this.estado;
    if (!estado) return;
    this.esMiTurno = this.#esTurnoDeMiEquipo(estado.turnoEquipo, turnoId || estado.turno);
    const turnoSasuke = document.getElementById("turnoSasuke");
    const turnoNaruto = document.getElementById("turnoNaruto");
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
    return clienteMultijugador.solicitarRevancha(config);
  }

  voltearCarta(index) {
    if (!this.estado || this.estado.estado !== "jugando") return false;
    if (!this.esMiTurno) return false;
    clienteMultijugador.voltearCarta(index);
    return true;
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
    clienteMultijugador.abandonarSala();
  }
}

export const gestorSalaCliente = new GestorSalaCliente();
