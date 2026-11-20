const { Server } = require("socket.io");
const crypto = require("crypto");

const ALDEAS_MEZCLADAS = [
  "akatsuki",
  "arena",
  "niebla",
  "nube",
  "roca",
  "konoha/hyuga",
  "konoha/sarutobi",
  "konoha/uchiha",
  "konoha/uzumaki",
];
const ALIAS_ALDEAS = {
  hyuga: "konoha/hyuga",
  sarutobi: "konoha/sarutobi",
  uchiha: "konoha/uchiha",
  uzumaki: "konoha/uzumaki",
  konoha: "konoha/uchiha",
  otros: "akatsuki",
};
function rngConSemilla(semilla) {
  let estado = semilla >>> 0;
  return function() {
    estado = (estado + 0x6D2B79F5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const REVERSOS_ALDEA = {
  akatsuki: "assets/cartas niveles/carta akatsuki.png",
  arena: "assets/cartas niveles/carta arena.png",
  niebla: "assets/cartas niveles/carta niebla.png",
  nube: "assets/cartas niveles/carta nube.png",
  roca: "assets/cartas niveles/carta roca.png",
  "konoha/hyuga": "assets/cartas niveles/carta hyuga.png",
  "konoha/sarutobi": "assets/cartas niveles/carta sarutobi.png",
  "konoha/uchiha": "assets/cartas niveles/carta uchiha.png",
  "konoha/uzumaki": "assets/cartas niveles/carta uzumaki.png",
};
const REVERSO_NEUTRAL = "assets/cartas niveles/carta arena.png";
const VALORES_CARTA = ["1", "2", "3", "4", "5", "6", "7", "8"];
const USOS_PODER_INICIAL = 2;
const PODERES = ["sustitucion", "byakugan", "robo", "genjutsu", "sello", "bomba"];
const VENTANA_CONTRARRESTO_MS = 5000;
const DURACION_BYAKUGAN_MS = 5000;
const DURACION_SELLO_MS = 8000;
const DURACION_GENJUTSU_MS = 5000;
const CONTRARRESTOS = {
  genjutsu:    { ventanaMs: VENTANA_CONTRARRESTO_MS, permitidos: ["byakugan"] },
  byakugan:    { ventanaMs: VENTANA_CONTRARRESTO_MS, permitidos: ["sello"] },
  bomba:       { ventanaMs: VENTANA_CONTRARRESTO_MS, permitidos: ["sello"] },
  robo:        { ventanaMs: VENTANA_CONTRARRESTO_MS, permitidos: ["sustitucion"] },
  sello:       { ventanaMs: VENTANA_CONTRARRESTO_MS, permitidos: ["byakugan"] },
  sustitucion: { ventanaMs: VENTANA_CONTRARRESTO_MS, permitidos: ["genjutsu"] },
};
const MODOS = new Set(["1v1", "2v2"]);
const CHAKRA_INICIAL = 100;
const CHAKRA_MAXIMO = 100;
const VIDA_INICIAL = 100;
const VIDA_MAXIMA = 100;
const CHAKRA_POR_ACIERTO = 5;
const CHAKRA_BASE_COMBO = 3;
const VIDA_PERDIDA_POR_ERROR = 5;
const TIEMPO_INICIAL = 20;
const COSTOS_PODER = {
  sustitucion: 25,
  byakugan: 30,
  robo: 30,
  genjutsu: 35,
  sello: 30,
  bomba: 50,
};
const NOMBRE_COOKIE_SESION = "memoria_ninja_sesion";

function hashEstado(sala) {
  const base = JSON.stringify({
    estado: sala.estado,
    version: sala.version || 0,
    turno: sala.turno,
    turnoEquipo: sala.turnoEquipo,
    movimientos: sala.movimientos,
    parejas: sala.parejas,
    parejasEquipos: sala.parejasEquipos,
    cartas: (sala.mazo || []).map((c) => (c.emparejada ? 1 : 0)).join(""),
    volteadas: (sala.cartasVolteadas || []).map((c) => c.index).join(","),
    chakra: sala.chakra,
    vida: sala.vida,
    combo: sala.combo,
    aciertos: sala.aciertos,
    errores: sala.errores,
    tiempos: sala.tiempos,
    bloqueada: !!sala.bloqueada,
    poderEnProceso: sala.poderEnProceso,
    ganadorId: sala.ganadorId,
    ganadorEquipo: sala.ganadorEquipo,
    motivo: sala.motivo,
  });
  let h = 0;
  for (let i = 0; i < base.length; i++) {
    h = (Math.imul(31, h) + base.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16);
}
class GestorSalas {
  static esOrigenPermitidoSocket({ origen, host, permitidos = [] } = {}) {
    if (!origen) return true;
    if (origen === "null") return false;
    if (permitidos.includes(origen)) return true;
    let urlOrigen;
    try {
      urlOrigen = new URL(origen);
    } catch {
      return false;
    }
    if (!["http:", "https:"].includes(urlOrigen.protocol)) return false;
    let hostPeticion;
    try {
      hostPeticion = new URL(`http://${host || "localhost"}`);
    } catch {
      return false;
    }
    return urlOrigen.protocol === hostPeticion.protocol && urlOrigen.host === hostPeticion.host;
  }

  constructor(httpServer, opciones = {}) {
    const origenesConfigurados = [
      process.env.CORS_ORIGINS,
      process.env.PUBLIC_FRONTEND_URL,
    ]
      .filter(Boolean)
      .join(",")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    this.origenesPermitidos = origenesConfigurados.length
      ? origenesConfigurados
      : ["http://localhost:3000", "http://127.0.0.1:3000"];
    this.io = new Server(httpServer, {
      cors: {
        origin: this.origenesPermitidos,
        credentials: true,
      },
      allowRequest: (req, callback) => {
        callback(null, GestorSalas.esOrigenPermitidoSocket({
          origen: req?.headers?.origin,
          host: req?.headers?.host,
          permitidos: this.origenesPermitidos,
        }));
      },
    });
    this.salas = new Map();
    this.colasMatchmaking = { "1v1": [], "2v2": [] };
    this.tiempoReconexionMs = opciones.tiempoReconexionMs ?? 15000;
    this.retardoFalloMs = opciones.retardoFalloMs ?? 800;
    this.tiempoInicialSegundos = opciones.tiempoInicialSegundos ?? TIEMPO_INICIAL;
    this.intervaloTiempoMs = opciones.intervaloTiempoMs ?? 1000;
    this.duracionByakuganMs = opciones.duracionByakuganMs ?? DURACION_BYAKUGAN_MS;
    this.duracionSelloMs = opciones.duracionSelloMs ?? DURACION_SELLO_MS;
    this.duracionGenjutsuMs = opciones.duracionGenjutsuMs ?? DURACION_GENJUTSU_MS;
    const ventanaContrarrestoMs = opciones.ventanaContrarrestoMs ?? VENTANA_CONTRARRESTO_MS;
    this.contrarrestos = Object.fromEntries(
      Object.entries(CONTRARRESTOS).map(([poderId, config]) => [
        poderId,
        {
          ...config,
          ventanaMs: Number.isFinite(opciones.contrarrestos?.[poderId]?.ventanaMs)
            ? opciones.contrarrestos[poderId].ventanaMs
            : ventanaContrarrestoMs,
        },
      ]),
    );
    this.intervaloSnapshotMs = opciones.intervaloSnapshotMs ?? 5000;
    this.resolverUsuarioPorCookie = opciones.resolverUsuarioPorCookie || null;
    this.persistirResultado = opciones.persistirResultado || null;
    this.notificadorAmistades = opciones.notificadorAmistades || null;
    this.gestorInvitaciones = opciones.gestorInvitaciones || null;
    this.limitesEventos = opciones.limitesEventos || {
      "crear-sala": { max: 5, ventanaMs: 60000 },
      "unirse-sala": { max: 10, ventanaMs: 60000 },
      "unirse-como-espectador": { max: 10, ventanaMs: 60000 },
      "buscar-partida": { max: 10, ventanaMs: 60000 },
      "revancha-sala": { max: 5, ventanaMs: 60000 },
      "activar-poder": { max: 24, ventanaMs: 10000 },
    };
    this.inicializar();
  }

  generarCodigo() {
    let codigo;
    do {
      codigo = crypto.randomInt(100000, 1000000).toString();
    } while (this.salas.has(codigo));
    return codigo;
  }

  normalizarNombre(nombre) {
    const limpio = String(nombre || "").trim().slice(0, 24);
    return limpio || "Jugador";
  }

  normalizarModo(modo) {
    return MODOS.has(modo) ? modo : "1v1";
  }

  normalizarConfig(config = {}) {
    const modo = this.normalizarModo(config.modo);
    const mezclarAldeas = config.mezclarAldeas !== false;
    const solicitadas = Number(config.pares) || 8;
    const pares = mezclarAldeas ? Math.min(Math.max(solicitadas, 8), 16) : 8;

    let temaReverso = REVERSO_NEUTRAL;
    if (!mezclarAldeas) {
      const solicitada = ALIAS_ALDEAS[config.aldea] || config.aldea;
      const aldea = ALDEAS_MEZCLADAS.includes(solicitada) ? solicitada : "arena";
      temaReverso = REVERSOS_ALDEA[aldea] || REVERSO_NEUTRAL;
    }

    return { ...config, modo, mezclarAldeas, pares, temaReverso };
  }

  capacidadDeSala(sala) {
    return sala.config?.modo === "2v2" ? 4 : 2;
  }

  equipoDeAsiento(asiento) {
    return Number(asiento) < 2 ? "A" : "B";
  }

  primerAsientoLibre(sala) {
    const ocupados = new Set(sala.jugadores.map((j) => Number(j.asiento)));
    const capacidad = this.capacidadDeSala(sala);
    for (let asiento = 0; asiento < capacidad; asiento++) {
      if (!ocupados.has(asiento)) return asiento;
    }
    return sala.jugadores.length;
  }

  #limpiarPoderEnProceso(sala, jugadorId, poderId) {
    if (sala.poderEnProceso?.jugadorId !== jugadorId || sala.poderEnProceso?.poderId !== poderId) return false;
    sala.poderEnProceso = null;
    return true;
  }

  otroEquipo(equipo) {
    return equipo === "A" ? "B" : "A";
  }

  equipoDeJugador(sala, token) {
    return sala.jugadores.find((j) => j.id === token)?.equipo || null;
  }

  jugadoresDeEquipo(sala, equipo) {
    return sala.jugadores.filter((j) => j.equipo === equipo);
  }

  jugadoresDisponiblesDeEquipo(sala, equipo) {
    return this.jugadoresDeEquipo(sala, equipo).filter((j) => j.conectado && !j.abandonado);
  }

  generarMazo(config = {}) {
    const mezclarAldeas = config.mezclarAldeas !== false;
    const solicitadas = Number(config.pares) || 8;
    const pares = Math.min(Math.max(solicitadas, 8), 16);
    const semilla = Number(config.semilla) || Math.floor(Math.random() * 0x7fffffff);
    const rng = rngConSemilla(semilla);

    let combinaciones;
    if (mezclarAldeas) {
      const seleccionadas = Array.isArray(config.aldeasSeleccionadas) ? config.aldeasSeleccionadas.filter(Boolean) : [];
      const pool = seleccionadas.length > 0 ? seleccionadas.filter((a) => ALDEAS_MEZCLADAS.includes(a)) : ALDEAS_MEZCLADAS;
      combinaciones = [];
      for (const aldea of pool) {
        for (const valor of VALORES_CARTA) combinaciones.push({ aldea, valor });
      }
    } else {
      const solicitada = ALIAS_ALDEAS[config.aldea] || config.aldea;
      const aldea = ALDEAS_MEZCLADAS.includes(solicitada) ? solicitada : "arena";
      combinaciones = VALORES_CARTA.map((valor) => ({ aldea, valor }));
    }

    combinaciones.sort(() => rng() - 0.5);
    const elegidas = combinaciones.slice(0, Math.min(pares, combinaciones.length));

    const cartas = [];
    elegidas.forEach(({ aldea, valor }, indice) => {
      const parId = `${aldea}-${valor}-${indice}`;
      cartas.push({ parId, valor, aldea, emparejada: false });
      cartas.push({ parId, valor, aldea, emparejada: false });
    });
    cartas.sort(() => rng() - 0.5);
    return cartas;
  }

  mazoPublico(sala) {
    return sala.mazo.map((carta) => {
      if (carta.emparejada) {
        return { valor: carta.valor, aldea: carta.aldea, emparejada: true };
      }
      return { emparejada: false };
    });
  }

  equiposPublicos(sala) {
    const equipos = { A: [], B: [] };
    for (const jugador of sala.jugadores) {
      const equipo = jugador.equipo === "B" ? "B" : "A";
      equipos[equipo].push({
        id: jugador.id,
        nombre: jugador.nombre,
        asiento: jugador.asiento,
        conectado: !!jugador.conectado,
        abandonado: !!jugador.abandonado,
      });
    }
    return equipos;
  }

  vistaEstado(sala) {
    return {
      codigo: sala.codigo,
      idPartida: sala.idPartida || null,
      estado: sala.estado,
      version: sala.version || 0,
      config: sala.config,
      modo: sala.config?.modo || "1v1",
      capacidad: this.capacidadDeSala(sala),
      turno: sala.turno,
      turnoEquipo: sala.turnoEquipo || null,
      jugadores: sala.jugadores.map((j) => ({
        id: j.id,
        nombre: j.nombre,
        asiento: j.asiento,
        equipo: j.equipo,
        conectado: j.conectado,
        abandonado: !!j.abandonado,
      })),
      equipos: this.equiposPublicos(sala),
      mazo: this.mazoPublico(sala),
      cartasVolteadas: sala.cartasVolteadas.map((c) => ({
        index: c.index,
        valor: c.valor,
        aldea: c.aldea,
        jugadorId: c.jugadorId,
        equipo: c.equipo || null,
      })),
      movimientos: sala.movimientos,
      parejas: { ...sala.parejas },
      parejasEquipos: { A: sala.parejasEquipos?.A || 0, B: sala.parejasEquipos?.B || 0 },
      poderes: this.poderesPublicos(sala),
      chakra: sala.chakra ? { ...sala.chakra } : {},
      vida: sala.vida ? { ...sala.vida } : {},
      combo: sala.combo ? { ...sala.combo } : {},
      aciertos: sala.aciertos ? { ...sala.aciertos } : {},
      errores: sala.errores ? { ...sala.errores } : {},
      tiempos: sala.tiempos ? { ...sala.tiempos } : {},
      turnoTerminaEn: sala.turnoTerminaEn || null,
      sello: this.selloActivo(sala) ? { index: sala.efectos.sello.index, hasta: sala.efectos.sello.hasta } : null,
      sustitucionArmada: sala.defensas?.sustitucion ? { ...sala.defensas.sustitucion } : {},
      bloqueada: !!sala.bloqueada,
      poderEnProceso: sala.poderEnProceso ? { ...sala.poderEnProceso } : null,
      byakugan: sala.efectos?.byakugan ? { ...sala.efectos.byakugan } : {},
      byakuganReveladas: [],
      genjutsu: sala.efectos?.genjutsu ? (({ original, ...resto }) => resto)(sala.efectos.genjutsu) : null,
      duracionByakuganMs: this.duracionByakuganMs,
      duracionSelloMs: this.duracionSelloMs,
      duracionGenjutsuMs: this.duracionGenjutsuMs,
      ventanaContrarrestoMs: this.contrarrestos.byakugan?.ventanaMs ?? VENTANA_CONTRARRESTO_MS,
      accionPendiente: sala.accionPendiente ? {
        idAccion: sala.accionPendiente.idAccion,
        poderId: sala.accionPendiente.poderId,
        atacanteId: sala.accionPendiente.atacanteId,
        objetivoId: sala.accionPendiente.objetivoId,
        estado: sala.accionPendiente.estado,
        venceEn: sala.accionPendiente.venceEn,
      } : null,
      ganadorId: sala.ganadorId || null,
      ganadorEquipo: sala.ganadorEquipo || null,
      motivo: sala.motivo || null,
      hash: hashEstado(sala),
    };
  }

  vistaEstadoPara(sala, jugadorId) {
    const base = this.vistaEstado(sala);
    // Filter byakugan: only show requesting player's own byakugan data
    if (base.byakugan) {
      const filtrado = {};
      if (base.byakugan[jugadorId]) {
        filtrado[jugadorId] = { ...base.byakugan[jugadorId] };
      }
      base.byakugan = filtrado;
    }
    // Filter genjutsu: never send original (card values of shuffled positions)
    if (base.genjutsu && base.genjutsu.original) {
      const { original, ...resto } = base.genjutsu;
      base.genjutsu = resto;
    }
    const sustitucion = sala.defensas?.sustitucion || {};
    base.sustitucionArmada = jugadorId && sustitucion[jugadorId]
      ? { [jugadorId]: { ...sustitucion[jugadorId] } }
      : {};
    // Add byakugan-revealed cards for this player (rejoin rehydration)
    const efectoByakugan = sala.efectos?.byakugan?.[jugadorId];
    if (efectoByakugan && Date.now() < efectoByakugan.hasta && Array.isArray(efectoByakugan.cartas)) {
      base.byakuganReveladas = efectoByakugan.cartas.map((c) => ({ index: c.index, valor: c.valor, aldea: c.aldea }));
    } else {
      base.byakuganReveladas = [];
    }
    return base;
  }

  poderesPublicos(sala) {
    const resultado = {};
    for (const jugador of sala.jugadores) {
      resultado[jugador.id] = { ...(sala.poderes[jugador.id] || {}) };
    }
    return resultado;
  }

  emitirEstadoPoderes(sala) {
    if (!sala || sala.estado !== "jugando") return;
    for (const jugador of sala.jugadores) {
      const socket = this.io.sockets.sockets.get(jugador.socketId);
      if (!socket) continue;
      // Byakugan filtrado: solo datos del jugador solicitante
      const byakuganFiltrado = {};
      if (sala.efectos?.byakugan?.[jugador.id]) {
        byakuganFiltrado[jugador.id] = { ...sala.efectos.byakugan[jugador.id] };
        delete byakuganFiltrado[jugador.id].cartas;
      }
      const efectoByakugan = sala.efectos?.byakugan?.[jugador.id];
      const byakuganReveladas = efectoByakugan && Date.now() < efectoByakugan.hasta && Array.isArray(efectoByakugan.cartas)
        ? efectoByakugan.cartas.map((carta) => ({
            index: carta.index,
            valor: carta.valor,
            aldea: carta.aldea,
          }))
        : [];
      socket.emit("estado-poderes", {
        version: sala.version || 0,
        hash: hashEstado(sala),
        poderes: this.poderesPublicos(sala),
        chakra: sala.chakra ? { ...sala.chakra } : {},
        vida: sala.vida ? { ...sala.vida } : {},
        combo: sala.combo ? { ...sala.combo } : {},
        aciertos: sala.aciertos ? { ...sala.aciertos } : {},
        errores: sala.errores ? { ...sala.errores } : {},
        tiempos: sala.tiempos ? { ...sala.tiempos } : {},
        turnoTerminaEn: sala.turnoTerminaEn,
        bloqueada: !!sala.bloqueada,
        poderEnProceso: sala.poderEnProceso ? { ...sala.poderEnProceso } : null,
        byakugan: byakuganFiltrado,
        byakuganReveladas,
        duracionByakuganMs: this.duracionByakuganMs,
        ventanaContrarrestoMs: this.contrarrestos.byakugan?.ventanaMs ?? VENTANA_CONTRARRESTO_MS,
        genjutsu: sala.efectos?.genjutsu ? (({ original, ...resto }) => resto)(sala.efectos.genjutsu) : null,
        sello: this.selloActivo(sala) ? { index: sala.efectos.sello.index, hasta: sala.efectos.sello.hasta } : null,
        sustitucionArmada: sala.defensas?.sustitucion?.[jugador.id]
          ? { [jugador.id]: { ...sala.defensas.sustitucion[jugador.id] } }
          : {},
      });
    }
  }

  vistaPublica(sala) {
    const capacidad = this.capacidadDeSala(sala);
    return {
      codigo: sala.codigo,
      anfitrion: sala.anfitrion,
      jugadores: sala.jugadores.length,
      capacidad,
      faltan: Math.max(0, capacidad - sala.jugadores.length),
      modo: sala.config?.modo || "1v1",
      config: sala.config,
      publica: sala.publica,
      conContrasena: !!sala.contrasena,
      equipos: this.equiposPublicos(sala),
      espectadores: (sala.espectadores || []).length,
    };
  }

  vistaEspectador(sala) {
    const vista = this.vistaEstadoPara(sala, null);
    vista.espectador = true;
    vista.espectadores = (sala.espectadores || []).length;
    vista.sustitucionArmada = {};
    vista.accionPendiente = null;
    vista.byakugan = {};
    vista.byakuganReveladas = [];
    return vista;
  }

  agregarEspectador(sala, socket, nombre) {
    if (!Array.isArray(sala.espectadores)) sala.espectadores = [];
    const existente = sala.espectadores.find((e) => e.socketId === socket.id);
    if (existente) {
      existente.nombre = nombre;
    } else {
      sala.espectadores.push({
        id: socket.data.token,
        socketId: socket.id,
        nombre,
      });
    }
    socket.join(sala.codigo);
    socket.data.codigoSala = sala.codigo;
    socket.data.espectador = true;
    this.emitirEspectadores(sala, socket);
  }

  quitarEspectador(sala, socket) {
    if (!Array.isArray(sala.espectadores)) return false;
    const cantidad = sala.espectadores.length;
    sala.espectadores = sala.espectadores.filter((e) => e.socketId !== socket.id);
    if (sala.espectadores.length === cantidad) return false;
    socket.leave(sala.codigo);
    socket.data.codigoSala = null;
    socket.data.espectador = false;
    this.emitirEspectadores(sala, socket);
    this.io.to(sala.codigo).emit("sala-actualizada", this.vistaPublica(sala));
    return true;
  }

  emitirEspectadores(sala, socketQueCambia = null) {
    const datos = {
      codigo: sala.codigo,
      cantidad: (sala.espectadores || []).length,
    };
    if (socketQueCambia) {
      socketQueCambia.to(sala.codigo).emit("espectadores-actualizados", datos);
      socketQueCambia.emit("espectadores-actualizados", datos);
      return;
    }
    this.io.to(sala.codigo).emit("espectadores-actualizados", datos);
  }

  inicializarEstadoSala(sala) {
    this.limpiarTemporizadorPartida(sala);
    sala.jugadores.forEach((jugador, indice) => {
      if (!Number.isInteger(jugador.asiento)) jugador.asiento = indice;
      if (!jugador.equipo) jugador.equipo = this.equipoDeAsiento(jugador.asiento);
      jugador.abandonado = false;
    });

    sala.mazo = this.generarMazo({ ...(sala.config || {}), semilla: sala.seed });
    sala.cartasVolteadas = [];
    sala.movimientos = 0;
    sala.bloqueada = false;
    sala.parejas = {};
    sala.parejasEquipos = { A: 0, B: 0 };
    sala.poderes = {};
    sala.chakra = {};
    sala.vida = {};
    sala.combo = {};
    sala.aciertos = {};
    sala.errores = {};
    sala.tiempos = {};
    sala.defensas = { sustitucion: {} };
    sala.efectos = { byakugan: {}, sello: null, genjutsu: null };
    sala.accionPendiente = null;
    sala.poderEnProceso = null;
    for (const jugador of sala.jugadores) {
      sala.parejas[jugador.id] = 0;
      sala.poderes[jugador.id] = {};
      sala.chakra[jugador.id] = CHAKRA_INICIAL;
      sala.vida[jugador.id] = VIDA_INICIAL;
      sala.combo[jugador.id] = 0;
      sala.aciertos[jugador.id] = 0;
      sala.errores[jugador.id] = 0;
      sala.tiempos[jugador.id] = this.tiempoInicialSegundos;
      sala.defensas.sustitucion[jugador.id] = { activa: false };
      for (const poder of PODERES) sala.poderes[jugador.id][poder] = USOS_PODER_INICIAL;
    }
    sala.turno = sala.jugadores[0]?.id || null;
    sala.turnoEquipo = sala.jugadores[0]?.equipo || null;
    sala.idPartida = crypto.randomUUID();
    sala.turnoTerminaEn = null;
    sala.seed = Number(sala.config?.semilla) || Math.floor(Math.random() * 0x7fffffff);
    if (!sala.config) sala.config = {};
    sala.config.semilla = sala.seed;
    sala.ganadorId = null;
    sala.ganadorEquipo = null;
    sala.motivo = null;
    sala.estado = "jugando";
    sala.version = (sala.version || 0) + 1;
    this.limpiarTimersReaccion(sala);
    this.limpiarTimersPoderes(sala);
    sala.timersPoderes = [];
    this.limpiarTemporizadorLimpieza(sala);
    this.limpiarSnapshot(sala);
  }

  iniciarPartida(sala, codigo) {
    this.inicializarEstadoSala(sala);
    if (sala.turno) sala.turnoTerminaEn = Date.now() + (sala.tiempos[sala.turno] || TIEMPO_INICIAL) * 1000;
    sala.version = (sala.version || 0) + 1; this.salas.set(codigo, sala);
    for (const jugador of sala.jugadores) {
      const socket = this.io.sockets.sockets.get(jugador.socketId);
      if (socket) socket.emit("partida-iniciada", this.vistaEstadoPara(sala, jugador.id));
    }
    for (const espectador of sala.espectadores || []) {
      const socket = this.io.sockets.sockets.get(espectador.socketId);
      if (socket) socket.emit("partida-iniciada", this.vistaEspectador(sala));
    }
    this.iniciarTemporizador(sala);
    this.iniciarSnapshot(sala, codigo);
    this.io.emit("lista-salas-actualizada", this.obtenerListaSalasPublicas());
  }

  iniciarSnapshot(sala, codigo) {
    this.limpiarSnapshot(sala);
    sala.temporizadorSnapshot = setInterval(() => this.emitirSnapshot(codigo), this.intervaloSnapshotMs);
    sala.temporizadorSnapshot.unref?.();
  }

  limpiarSnapshot(sala) {
    if (sala?.temporizadorSnapshot) {
      clearInterval(sala.temporizadorSnapshot);
      sala.temporizadorSnapshot = null;
    }
  }

  emitirSnapshot(codigo) {
    const sala = this.salas.get(codigo);
    if (!sala || sala.estado !== "jugando") {
      if (sala) this.limpiarSnapshot(sala);
      return;
    }
    for (const jugador of sala.jugadores) {
      const socket = this.io.sockets.sockets.get(jugador.socketId);
      if (socket) socket.emit("estado-completo", this.vistaEstadoPara(sala, jugador.id));
    }
    for (const espectador of sala.espectadores || []) {
      const socket = this.io.sockets.sockets.get(espectador.socketId);
      if (socket) socket.emit("estado-completo", this.vistaEspectador(sala));
    }
  }

  iniciarTemporizador(sala) {
    this.limpiarTemporizadorPartida(sala);
    if (sala.config?.modo === "2v2") return;
    sala.temporizadorPartida = setInterval(() => this.tickTemporizador(sala.codigo), this.intervaloTiempoMs);
    sala.temporizadorPartida.unref?.();
  }

  tickTemporizador(codigo) {
    const sala = this.salas.get(codigo);
    if (!sala || sala.estado !== "jugando") {
      if (sala) this.limpiarTemporizadorPartida(sala);
      return;
    }
    if (sala.config?.modo === "2v2") return;

    const turno = sala.turno;
    if (!turno) return;
    if (!sala.turnoTerminaEn) sala.turnoTerminaEn = Date.now() + (sala.tiempos?.[turno] || TIEMPO_INICIAL) * 1000;

    const restanteMs = sala.turnoTerminaEn - Date.now();
    const restanteSeg = Math.max(0, Math.ceil(restanteMs / 1000));
    if (typeof sala.tiempos?.[turno] === "number") sala.tiempos[turno] = restanteSeg;

    sala.version = (sala.version || 0) + 1; this.salas.set(codigo, sala);
    this.io.to(codigo).emit("tiempo-actualizado", {
      version: sala.version || 0,
      hash: hashEstado(sala),
      turnoTerminaEn: sala.turnoTerminaEn,
      turno,
      tiempos: { ...sala.tiempos },
    });
    // AFK warning at 10s remaining
    if (restanteSeg === 10) {
      this.io.to(codigo).emit("afk-aviso", { jugadorId: turno, segundos: 10 });
    }

    if (restanteMs <= 0) {
      const ganador = this.otroJugador(sala, turno)?.id || null;
      this.terminarPartida(sala, ganador, "tiempo");
    }
  }

  limpiarTemporizadorPartida(sala) {
    if (sala?.temporizadorPartida) {
      clearInterval(sala.temporizadorPartida);
      sala.temporizadorPartida = null;
    }
  }

  jugadorPorToken(sala, token) {
    return sala.jugadores.find((j) => j.id === token);
  }

  jugadorPorSocket(sala, socketId) {
    return sala.jugadores.find((j) => j.socketId === socketId);
  }

  eventoPermitido(socket, evento) {
    const limite = this.limitesEventos[evento];
    if (!limite) return true;
    if (!socket.data.limitesEventos) socket.data.limitesEventos = new Map();
    const ahora = Date.now();
    const registro = socket.data.limitesEventos.get(evento) || { inicio: ahora, cantidad: 0 };
    if (ahora - registro.inicio >= limite.ventanaMs) {
      registro.inicio = ahora;
      registro.cantidad = 0;
    }
    if (registro.cantidad >= limite.max) return false;
    registro.cantidad += 1;
    socket.data.limitesEventos.set(evento, registro);
    return true;
  }

  tokenSesionDelHandshake(socket) {
    const cabecera = socket?.handshake?.headers?.cookie;
    if (typeof cabecera !== "string" || cabecera === "") return null;
    for (const parte of cabecera.split(";")) {
      const posicion = parte.indexOf("=");
      if (posicion < 0) continue;
      if (parte.slice(0, posicion).trim() !== NOMBRE_COOKIE_SESION) continue;
      const valor = parte.slice(posicion + 1).trim();
      try {
        return decodeURIComponent(valor) || null;
      } catch (error) {
        return valor || null;
      }
    }
    return null;
  }

  vincularUsuarioAutenticado(socket) {
    const salirSalasAmigos = (id) => {
      if (!id || typeof socket.leave !== "function") return;
      socket.leave("amigos:activos");
      socket.leave("usuario:" + id);
    };
    socket.data.usuarioResuelto = Promise.resolve();
    if (typeof this.resolverUsuarioPorCookie !== "function") {
      salirSalasAmigos(socket.data.idUsuario);
      socket.data.idUsuario = null;
      socket.data.usuario = null;
      return socket.data.usuarioResuelto;
    }
    const tokenSesion = this.tokenSesionDelHandshake(socket);
    if (!tokenSesion) {
      salirSalasAmigos(socket.data.idUsuario);
      socket.data.idUsuario = null;
      socket.data.usuario = null;
      return socket.data.usuarioResuelto;
    }
    socket.data.usuarioResuelto = Promise.resolve()
      .then(() => this.resolverUsuarioPorCookie(tokenSesion))
      .then((usuario) => {
        const idAnterior = socket.data.idUsuario;
        const idNuevo = usuario?.id || null;
        if (idAnterior && idAnterior !== idNuevo) salirSalasAmigos(idAnterior);
        socket.data.idUsuario = idNuevo;
        socket.data.usuario = usuario ? usuario.publico?.() || { id: usuario.id, usuario: usuario.usuario, codigoAmigo: usuario.codigoAmigo } : null;
        if (idNuevo && typeof socket.join === "function") {
          socket.join("amigos:activos");
          socket.join("usuario:" + idNuevo);
        }
        for (const sala of this.salas.values()) {
          const jugador = this.jugadorPorToken(sala, socket.data.token);
          if (jugador) jugador.idUsuario = socket.data.idUsuario;
        }
      })
      .catch(() => {});
    return socket.data.usuarioResuelto;
  }

  persistirResultadoOnline(sala, resultado) {
    if (typeof this.persistirResultado !== "function") return;
    const snapshot = {
      idPartida: sala.idPartida,
      modo: sala.config?.modo || "1v1",
      motivo: resultado.motivo,
      ganadorId: resultado.ganadorId,
      ganadorEquipo: resultado.ganadorEquipo,
      puntaje: resultado.puntaje,
      parejas: { ...sala.parejas },
      parejasEquipos: { ...resultado.parejasEquipos },
      jugadores: sala.jugadores.map((j) => ({
        id: j.id,
        nombre: j.nombre,
        equipo: j.equipo,
        socketId: j.socketId,
        idUsuario: j.idUsuario || null,
      })),
    };
    const conTiempoLimite = (promesa) => {
      let temporizador;
      const resultadoPromesa = Promise.race([
        Promise.resolve(promesa).catch(() => null),
        new Promise((resolve) => {
          temporizador = setTimeout(() => resolve(null), 3000);
          temporizador.unref?.();
        }),
      ]);
      return resultadoPromesa.finally(() => clearTimeout(temporizador));
    };

    Promise.resolve()
      .then(() => Promise.all(snapshot.jugadores.map((j) => {
        const socket = this.io.sockets.sockets.get(j.socketId);
        return conTiempoLimite(socket?.data?.usuarioResuelto);
      })))
      .then(() => {
        const jugadores = snapshot.jugadores.map(({ socketId, ...jugador }) => {
          const socket = this.io.sockets.sockets.get(socketId);
          return {
            ...jugador,
            idUsuario: jugador.idUsuario || socket?.data?.idUsuario || null,
          };
        });
        if (!jugadores.some((j) => j.idUsuario)) return;
        return this.persistirResultado({
          idPartida: snapshot.idPartida,
          modo: snapshot.modo,
          zona: "online",
          motivo: snapshot.motivo,
          ganadorId: snapshot.ganadorId,
          ganadorEquipo: snapshot.ganadorEquipo,
          puntaje: snapshot.puntaje,
          parejas: snapshot.parejas,
          parejasEquipos: snapshot.parejasEquipos,
          jugadores,
        });
      })
      .catch((error) => {
        console.error("[GestorSalas] No se pudo persistir el resultado online:", error?.message || error);
      });
  }

  otroJugador(sala, token) {
    return sala.jugadores.find((j) => j.id !== token);
  }

  limpiarTemporizadorAbandono(sala, jugador = null) {
    if (jugador) {
      if (jugador.temporizadorAbandono) {
        clearTimeout(jugador.temporizadorAbandono);
        jugador.temporizadorAbandono = null;
      }
      return;
    }
    for (const actual of sala.jugadores) {
      if (actual.temporizadorAbandono) {
        clearTimeout(actual.temporizadorAbandono);
        actual.temporizadorAbandono = null;
      }
    }
    if (sala.temporizadorAbandono) {
      clearTimeout(sala.temporizadorAbandono);
      sala.temporizadorAbandono = null;
    }
  }

  limpiarTemporizadorLimpieza(sala) {
    if (sala.temporizadorLimpieza) {
      clearTimeout(sala.temporizadorLimpieza);
      sala.temporizadorLimpieza = null;
    }
  }

  terminarPartida(sala, ganador, motivo) {
    if (!sala || sala.estado === "terminada") return;
    this.limpiarTemporizadorAbandono(sala);
    this.limpiarTemporizadorPartida(sala);
    this.limpiarSnapshot(sala);
    this.limpiarTimersReaccion(sala);
    this.limpiarTimersPoderes(sala);
    sala.estado = "terminada";
    sala.motivo = motivo;

    const es2v2 = sala.config?.modo === "2v2";
    let ganadorId = null;
    let perdedorId = null;
    let ganadorEquipo = null;
    let perdedorEquipo = null;

    if (es2v2) {
      ganadorEquipo = ganador === "A" || ganador === "B" ? ganador : this.equipoDeJugador(sala, ganador);
      perdedorEquipo = ganadorEquipo ? this.otroEquipo(ganadorEquipo) : null;
      ganadorId = ganadorEquipo ? this.jugadoresDeEquipo(sala, ganadorEquipo)[0]?.id || null : null;
      perdedorId = perdedorEquipo ? this.jugadoresDeEquipo(sala, perdedorEquipo)[0]?.id || null : null;
    } else {
      ganadorId = ganador || null;
      perdedorId = ganadorId ? this.otroJugador(sala, ganadorId)?.id || null : null;
      ganadorEquipo = ganadorId ? this.equipoDeJugador(sala, ganadorId) : null;
      perdedorEquipo = perdedorId ? this.equipoDeJugador(sala, perdedorId) : null;
    }

    sala.ganadorId = ganadorId;
    sala.ganadorEquipo = ganadorEquipo;
    sala.version = (sala.version || 0) + 1;
    this.salas.set(sala.codigo, sala);

    const parejasEquipos = { A: sala.parejasEquipos?.A || 0, B: sala.parejasEquipos?.B || 0 };
    const puntaje = es2v2
      ? ganadorEquipo
        ? parejasEquipos[ganadorEquipo] * 10
        : 0
      : ganadorId
        ? (sala.parejas[ganadorId] || 0) * 10
        : 0;

    this.io.to(sala.codigo).emit("partida-terminada", {
      version: sala.version || 0,
      hash: hashEstado(sala),
      codigo: sala.codigo,
      idPartida: sala.idPartida,
      modo: sala.config?.modo || "1v1",
      ganadorId,
      perdedorId,
      ganadorEquipo,
      perdedorEquipo,
      motivo,
      movimientos: sala.movimientos,
      parejas: { ...sala.parejas },
      parejasEquipos,
      puntaje,
      chakra: { ...sala.chakra },
      vida: { ...sala.vida },
      combo: { ...sala.combo },
      aciertos: { ...sala.aciertos },
      errores: { ...sala.errores },
      tiempos: { ...sala.tiempos },
      jugadores: sala.jugadores.map((j) => ({
        id: j.id,
        nombre: j.nombre,
        equipo: j.equipo,
        asiento: j.asiento,
      })),
      config: sala.config,
    });

    this.persistirResultadoOnline(sala, {
      motivo,
      ganadorId,
      ganadorEquipo,
      puntaje,
      parejasEquipos,
    });

    this.limpiarTemporizadorLimpieza(sala);
    sala.temporizadorLimpieza = setTimeout(() => this.salas.delete(sala.codigo), 30000);
    sala.temporizadorLimpieza.unref?.();
  }

  ganadorPorParejas(sala) {
    if (sala.config?.modo === "2v2") {
      const parejasA = sala.parejasEquipos?.A || 0;
      const parejasB = sala.parejasEquipos?.B || 0;
      if (parejasA === parejasB) return null;
      return parejasA > parejasB ? "A" : "B";
    }

    const [a, b] = sala.jugadores;
    if (!a || !b) return null;
    const parejasA = sala.parejas[a.id] || 0;
    const parejasB = sala.parejas[b.id] || 0;
    if (parejasA === parejasB) return null;
    return parejasA > parejasB ? a.id : b.id;
  }

  siguienteTurno(sala) {
    if (sala.config?.modo === "2v2") {
      const equipo = this.otroEquipo(sala.turnoEquipo);
      const disponibles = this.jugadoresDisponiblesDeEquipo(sala, equipo);
      const siguiente = disponibles[0] || this.jugadoresDeEquipo(sala, equipo)[0] || null;
      sala.turnoEquipo = siguiente?.equipo || equipo;
      sala.turno = siguiente?.id || null;
      if (siguiente) {
        sala.tiempos[siguiente.id] = TIEMPO_INICIAL;
        sala.turnoTerminaEn = Date.now() + TIEMPO_INICIAL * 1000;
      }
      return;
    }

    const siguiente = this.otroJugador(sala, sala.turno);
    sala.turno = siguiente?.id || null;
    sala.turnoEquipo = siguiente?.equipo || null;
    if (siguiente) {
      sala.tiempos[siguiente.id] = TIEMPO_INICIAL;
      sala.turnoTerminaEn = Date.now() + TIEMPO_INICIAL * 1000;
    }
  }

  sacarDeSala(socket, motivo = "salida") {
    const codigo = socket.data.codigoSala;
    socket.data.codigoSala = null;
    if (!codigo) return;
    const sala = this.salas.get(codigo);
    if (!sala) return;
    if (socket.data.espectador) {
      this.quitarEspectador(sala, socket);
      return;
    }
    socket.leave(codigo);
    const jugador = this.jugadorPorSocket(sala, socket.id);
    if (!jugador) return;

    if (sala.estado === "jugando") {
      if (sala.config?.modo === "2v2") {
        this.terminarPartida(sala, this.otroEquipo(jugador.equipo), motivo);
      } else {
        this.terminarPartida(sala, this.otroJugador(sala, jugador.id)?.id || null, motivo);
      }
      return;
    }

    sala.jugadores = sala.jugadores.filter((j) => j.id !== jugador.id);
    if (sala.jugadores.length === 0) {
      this.limpiarTemporizadorLimpieza(sala);
      this.salas.delete(codigo);
    } else {
      if (sala.creador === jugador.id) sala.creador = sala.jugadores[0].id;
      if (sala.estado !== "terminada") sala.estado = "esperando";
      sala.version = (sala.version || 0) + 1; this.salas.set(codigo, sala);
      this.io.to(codigo).emit("sala-actualizada", this.vistaPublica(sala));
    }
    this.io.emit("lista-salas-actualizada", this.obtenerListaSalasPublicas());
  }

  unirseSala(socket, datos = {}, callback = () => {}) {
    try {
      if (!this.eventoPermitido(socket, "unirse-sala")) {
        return callback({ exito: false, error: "Demasiados intentos de entrada. Intenta en unos segundos." });
      }
      const codigo = String(datos.codigo || "").toUpperCase();
      const token = socket.data.token;
      const sala = this.salas.get(codigo);
      if (!sala) return callback({ exito: false, error: "Sala no encontrada" });
      if (sala.estado !== "esperando") return callback({ exito: false, error: "Partida ya iniciada" });
      if (sala.contrasena && sala.contrasena !== datos.contrasena) {
        return callback({ exito: false, error: "Contraseña incorrecta" });
      }
      if (socket.data.codigoSala && socket.data.codigoSala !== codigo) {
        this.sacarDeSala(socket, "salida");
      }

      const existente = this.jugadorPorToken(sala, token);
      if (existente) {
        existente.socketId = socket.id;
        existente.conectado = true;
        existente.abandonado = false;
        existente.idUsuario = socket.data.idUsuario || existente.idUsuario || null;
        socket.join(codigo);
        socket.data.codigoSala = codigo;
        callback({ exito: true, codigo, sala: this.vistaPublica(sala), reincorporado: true });
        this.io.to(codigo).emit("sala-actualizada", this.vistaPublica(sala));
        return;
      }

      if (sala.jugadores.length >= this.capacidadDeSala(sala)) {
        return callback({ exito: false, error: "Sala llena" });
      }

      const asiento = this.primerAsientoLibre(sala);
      const nombre = this.normalizarNombre(datos.nombre || socket.data.usuario?.usuario);
      sala.jugadores.push({
        id: token,
        socketId: socket.id,
        nombre,
        listo: true,
        conectado: true,
        asiento,
        equipo: this.equipoDeAsiento(asiento),
        abandonado: false,
        idUsuario: socket.data.idUsuario || null,
      });

      socket.join(codigo);
      socket.data.codigoSala = codigo;
      sala.version = (sala.version || 0) + 1; this.salas.set(codigo, sala);
      callback({ exito: true, codigo, sala: this.vistaPublica(sala) });
      this.io.to(codigo).emit("sala-actualizada", this.vistaPublica(sala));

      if (sala.jugadores.length === this.capacidadDeSala(sala)) {
        this.iniciarPartida(sala, codigo);
      } else {
        this.io.emit("lista-salas-actualizada", this.obtenerListaSalasPublicas());
      }
    } catch (error) {
      callback({ exito: false, error: "Error al unirse a sala" });
    }
  }

  inicializar() {
    this.io.on("connection", (socket) => {
      const token = socket.handshake.auth?.token;
      if (typeof token !== "string" || token.length < 8 || token.length > 128) {
        socket.emit("error-sesion", { error: "Token de jugador inválido" });
        socket.disconnect(true);
        return;
      }
      socket.data.token = token;
      this.vincularUsuarioAutenticado(socket);
      this.gestorInvitaciones?.registrar(socket);
      socket.data.usuarioResuelto.then(() => {
        const idUsuario = socket.data.idUsuario;
        if (!idUsuario || !socket.connected) return;
        this.notificadorAmistades?.registrarConexion(idUsuario, socket);
        this.notificadorAmistades?.notificarPresencia(idUsuario, "online");
        this.notificadorAmistades?.notificarSnapshotPresencia(socket, idUsuario);
      }).catch(() => {});

      socket.on("crear-sala", (datos = {}, callback = () => {}) => {
        try {
          if (!this.eventoPermitido(socket, "crear-sala")) {
            return callback({ exito: false, error: "Demasiadas salas creadas. Intenta en unos segundos." });
          }
          this.sacarDeSala(socket, "salida");
          const config = this.normalizarConfig(datos.config || {});
          const codigo = this.generarCodigo();
          const nombre = this.normalizarNombre(datos.nombre);
          const sala = {
            codigo,
            jugadores: [
              {
                id: token,
                socketId: socket.id,
                nombre,
                listo: true,
                conectado: true,
                asiento: 0,
                equipo: "A",
                 abandonado: false,
                 idUsuario: socket.data.idUsuario || null,
               },
              ],

            estado: "esperando",
            espectadores: [],
            mazo: [],

            cartasVolteadas: [],
            movimientos: 0,
            parejas: {},
            parejasEquipos: { A: 0, B: 0 },
            poderes: {},
            turno: null,
            turnoEquipo: null,
            bloqueada: false,
            creador: token,
            anfitrion: nombre,
            creadoEn: Date.now(),
            publica: datos.publica !== false,
            contrasena: datos.contrasena || null,
            config,
            temporizadorAbandono: null,
          };
          sala.version = (sala.version || 0) + 1; this.salas.set(codigo, sala);
          socket.join(codigo);
          socket.data.codigoSala = codigo;
          callback({ exito: true, codigo, sala: this.vistaPublica(sala) });
          this.io.to(codigo).emit("sala-actualizada", this.vistaPublica(sala));
          this.io.emit("lista-salas-actualizada", this.obtenerListaSalasPublicas());
        } catch (error) {
          callback({ exito: false, error: "Error al crear sala" });
        }
      });

      socket.on("unirse-sala", (datos = {}, callback = () => {}) => {
        this.unirseSala(socket, datos, callback);
      });

      socket.on("marcar-listo", (datos, callback = () => {}) => {
        try {
          if (typeof datos === "function") callback = datos;
          const sala = this.salas.get(socket.data.codigoSala);
          if (!sala) return callback({ exito: false, error: "Sala no encontrada" });
          if (sala.estado !== "esperando") return callback({ exito: false, error: "La partida ya está en curso" });
          const jugador = this.jugadorPorSocket(sala, socket.id);
          if (!jugador) return callback({ exito: false, error: "No perteneces a esta sala" });
          jugador.listo = !jugador.listo;
          this.io.to(sala.codigo).emit("sala-actualizada", this.vistaPublica(sala));
          if (
            sala.jugadores.length === this.capacidadDeSala(sala) &&
            sala.jugadores.every((j) => j.listo)
          ) {
            this.iniciarPartida(sala, sala.codigo);
          }
          callback({ exito: true, sala: this.vistaPublica(sala) });
        } catch (error) {
          callback({ exito: false, error: "Error" });
        }
      });

      socket.on("reincorporarse-sala", (datos = {}, callback = () => {}) => {
        try {
          const codigo = String(datos.codigo || "").toUpperCase();
          const sala = this.salas.get(codigo);
          if (!sala) return callback({ exito: false, error: "La sala ya no existe" });
          const jugador = this.jugadorPorToken(sala, token);
          if (!jugador) return callback({ exito: false, error: "No perteneces a esta sala" });

          this.limpiarTemporizadorAbandono(sala, jugador);
          jugador.socketId = socket.id;
           jugador.conectado = true;
           jugador.abandonado = false;
           jugador.idUsuario = socket.data.idUsuario || jugador.idUsuario || null;
           socket.join(codigo);

          socket.data.codigoSala = codigo;
          sala.version = (sala.version || 0) + 1; this.salas.set(codigo, sala);
          this.io.to(codigo).emit("jugador-reconectado", {
            codigo,
            jugadorId: jugador.id,
            nombre: jugador.nombre,
          });
          callback({ exito: true, estado: this.vistaEstadoPara(sala, jugador.id) });
        } catch (error) {
          callback({ exito: false, error: "Error al reincorporarse" });
        }
      });

      socket.on("chat-mensaje", (datos = {}, callback = () => {}) => {
        try {
          if (typeof datos === "function") callback = datos;
          const sala = this.salas.get(socket.data.codigoSala);
          if (!sala) return callback({ exito: false, error: "Sala no encontrada" });
          const jugador = this.jugadorPorSocket(sala, socket.id);
          if (!jugador || jugador.abandonado) {
            return callback({ exito: false, error: "No perteneces a la sala" });
          }
          const texto = String(datos?.texto || "")
            .replace(/[<>\x00-\x1f]/g, "")
            .trim()
            .slice(0, 200);
          if (!texto) return callback({ exito: false, error: "Mensaje vacío" });
          const ahora = Date.now();
          if (ahora - (jugador.ultimoChatEn || 0) < 1000) {
            return callback({ exito: false, error: "Espera un segundo antes de escribir" });
          }
          jugador.ultimoChatEn = ahora;
          const mensaje = {
            codigo: sala.codigo,
            jugadorId: jugador.id,
            nombre: jugador.nombre,
            texto,
            momento: new Date(ahora).toISOString(),
          };
          this.io.to(sala.codigo).emit("chat-mensaje", mensaje);
          callback({ exito: true, mensaje });
        } catch (error) {
          callback({ exito: false, error: "No se pudo enviar el mensaje" });
        }
      });

      socket.on("voltear-carta", (datos = {}) => {
        const nonce = datos?.nonce ?? null;
        const sala = this.salas.get(socket.data.codigoSala);
        if (!sala || sala.estado !== "jugando") {
          socket.emit("accion-rechazada", { motivo: "partida_no_activa", mensaje: "La partida no está activa", nonce });
          return;
        }
        if (sala.poderEnProceso) {
          socket.emit("accion-rechazada", { motivo: "poder_en_proceso", mensaje: "Hay un poder en proceso", nonce });
          return;
        }
        const index = Number(datos.index);
        if (this.selloActivo(sala) && sala.efectos.sello.index === index) {
          socket.emit("accion-rechazada", { motivo: "carta_sellada", mensaje: "Esa carta está sellada", nonce });
          return;
        }
        const jugador = this.jugadorPorSocket(sala, socket.id);
        if (!jugador || jugador.abandonado) {
          socket.emit("accion-rechazada", { motivo: "jugador_invalido", mensaje: "No puedes voltear cartas", nonce });
          return;
        }

        const es2v2 = sala.config?.modo === "2v2";
        const tieneTurno = es2v2
          ? jugador.equipo === sala.turnoEquipo
          : sala.turno === jugador.id;
        if (!tieneTurno) {
          socket.emit("accion-rechazada", { motivo: "sin_turno", mensaje: "No es tu turno", nonce });
          return;
        }
        if (sala.bloqueada) {
          socket.emit("accion-rechazada", { motivo: "tablero_bloqueado", mensaje: "Espera a que termine la jugada", nonce });
          return;
        }
        if (!Number.isInteger(index) || !sala.mazo[index]) {
          socket.emit("accion-rechazada", { motivo: "indice_invalido", mensaje: "Carta inválida", nonce });
          return;
        }
        const carta = sala.mazo[index];
        if (carta.emparejada) {
          socket.emit("accion-rechazada", { motivo: "ya_emparejada", mensaje: "Esa carta ya está emparejada", nonce });
          return;
        }
        if (sala.cartasVolteadas.length >= 2) {
          socket.emit("accion-rechazada", { motivo: "jugada_en_curso", mensaje: "Ya hay dos cartas volteadas", nonce });
          return;
        }
        if (sala.cartasVolteadas.some((c) => c.index === index)) {
          socket.emit("accion-rechazada", { motivo: "ya_volteada", mensaje: "Esa carta ya está volteada", nonce });
          return;
        }

        sala.cartasVolteadas.push({
          index,
          valor: carta.valor,
          aldea: carta.aldea,
          jugadorId: jugador.id,
          equipo: jugador.equipo,
        });
        sala.version = (sala.version || 0) + 1; this.salas.set(sala.codigo, sala);
        this.io.to(sala.codigo).emit("carta-volteada", {
          version: sala.version || 0,
          hash: hashEstado(sala),
          nonce,
          jugadorId: jugador.id,
          equipo: jugador.equipo,
          index,
          valor: carta.valor,
          aldea: carta.aldea,
        });

        if (sala.cartasVolteadas.length === 2) {
          this.resolverPareja(sala);
        }
      });

      socket.on("activar-poder", (datos = {}) => {
        try {
          if (!this.eventoPermitido(socket, "activar-poder")) {
            socket.emit("poder-rechazado", { motivo: "limite", mensaje: "Demasiados poderes. Intenta en unos segundos." });
            return;
          }
          const sala = this.salas.get(socket.data.codigoSala);
          if (!sala || sala.estado !== "jugando") return;
          const jugador = this.jugadorPorSocket(sala, socket.id);
          if (!jugador || jugador.abandonado) return;
          const poderId = datos.poderId || datos.poder;
          if (!poderId || !PODERES.includes(poderId)) {
            socket.emit("poder-rechazado", { motivo: "invalido", mensaje: "Poder inválido" });
            return;
          }
          if (!sala.poderes) sala.poderes = {};
          if (!sala.poderes[jugador.id]) sala.poderes[jugador.id] = {};
          for (const p of PODERES) {
            if (typeof sala.poderes[jugador.id][p] !== "number") sala.poderes[jugador.id][p] = USOS_PODER_INICIAL;
          }
          if (!sala.chakra) sala.chakra = {};
          if (!sala.vida) sala.vida = {};
          if (!sala.combo) sala.combo = {};
          if (!sala.aciertos) sala.aciertos = {};
          if (!sala.errores) sala.errores = {};
          if (!sala.tiempos) sala.tiempos = {};
          if (typeof sala.chakra[jugador.id] !== "number") sala.chakra[jugador.id] = CHAKRA_INICIAL;
          if (typeof sala.vida[jugador.id] !== "number") sala.vida[jugador.id] = VIDA_INICIAL;
          if (!sala.defensas) sala.defensas = { sustitucion: {} };
          if (!sala.defensas.sustitucion) sala.defensas.sustitucion = {};
          if (!sala.defensas.sustitucion[jugador.id]) sala.defensas.sustitucion[jugador.id] = { activa: false };

          const es2v2 = sala.config?.modo === "2v2";
          const accionReaccion = this.puedeReaccionar(sala, jugador.id, poderId);
          const esReaccion = !!accionReaccion
            && (this.contrarrestos[accionReaccion.poderId]?.permitidos || []).includes(poderId);
          if (esReaccion) {
            if (sala.poderes[jugador.id][poderId] <= 0) {
              socket.emit("poder-rechazado", { motivo: "sin_usos", mensaje: "Sin usos" });
              return;
            }
            sala.poderes[jugador.id][poderId] -= 1;
            const resuelta = this.resolverAccion(sala, accionReaccion.idAccion, true);
            if (!resuelta) return;
            this.#limpiarPoderEnProceso(sala, accionReaccion.atacanteId, accionReaccion.poderId);
            sala.version = (sala.version || 0) + 1; this.salas.set(sala.codigo, sala);
            this.io.to(sala.codigo).emit("poder-activado", {
              version: sala.version || 0,
              jugadorId: jugador.id,
              nombre: jugador.nombre,
              equipo: jugador.equipo,
              poderId,
              usosRestantes: sala.poderes[jugador.id][poderId],
              chakra: sala.chakra[jugador.id],
              contrarresto: true,
              poderContrarrestado: accionReaccion.poderId,
            });
            this.emitirEstadoPoderes(sala);
            this.io.to(sala.codigo).emit("poder-efecto", {
              version: sala.version || 0,
              tipo: "contrarresto",
              idAccion: accionReaccion.idAccion,
              poderId: accionReaccion.poderId,
              contrapoderId: poderId,
              contrarrestadoPor: jugador.id,
              jugadorId: accionReaccion.atacanteId,
              objetivoId: jugador.id,
              equipo: jugador.equipo,
              mensaje: `${poderId} contrarrestó ${accionReaccion.poderId}`,
            });
            return;
          }
          if (sala.poderEnProceso) {
            socket.emit("poder-rechazado", { motivo: "en_proceso", mensaje: "Hay un poder en proceso" });
            return;
          }
          if (!sala.efectos) sala.efectos = { byakugan: {}, sello: null, genjutsu: null };
          if (poderId === "byakugan" && this.indicesDisponibles(sala).length < 2) {
            socket.emit("poder-rechazado", { motivo: "sin_cartas", mensaje: "No hay cartas disponibles" });
            return;
          }
          if (poderId === "sello" && this.selloActivo(sala)) {
            socket.emit("poder-rechazado", { motivo: "sello_activo", mensaje: "Ya hay un sello activo" });
            return;
          }
          if (poderId === "sello" && this.indicesDisponibles(sala, { excluirSelladas: true }).length === 0) {
            socket.emit("poder-rechazado", { motivo: "sin_cartas", mensaje: "No hay cartas disponibles" });
            return;
          }
          if (poderId === "genjutsu" && this.indicesDisponibles(sala).length < 3) {
            socket.emit("poder-rechazado", { motivo: "sin_cartas", mensaje: "No hay cartas disponibles" });
            return;
          }
          if (sala.poderes[jugador.id][poderId] <= 0) {
            socket.emit("poder-rechazado", { motivo: "sin_usos", mensaje: "Sin usos" });
            return;
          }

          if (sala.accionPendiente && ["anunciada", "ventana"].includes(sala.accionPendiente.estado)) {
            socket.emit("poder-rechazado", { motivo: "accion_pendiente", mensaje: "Ya hay una accion pendiente" });
            return;
          }

          const costo = COSTOS_PODER[poderId] || 0;
          if (costo > 0 && sala.chakra[jugador.id] < costo) {
            socket.emit("poder-rechazado", { motivo: "sin_chakra", mensaje: "Chakra insuficiente" });
            return;
          }

          sala.poderes[jugador.id][poderId]--;
          if (costo > 0) sala.chakra[jugador.id] -= costo;

          sala.poderEnProceso = { jugadorId: jugador.id, poderId, equipo: jugador.equipo, hasta: Date.now() + (this.contrarrestos[poderId]?.ventanaMs || 900) };
          sala.version = (sala.version || 0) + 1; this.salas.set(sala.codigo, sala);

          this.io.to(sala.codigo).emit("poder-activado", {
            version: sala.version || 0,
            jugadorId: jugador.id,
            nombre: jugador.nombre,
            equipo: jugador.equipo,
            poderId,
            usosRestantes: sala.poderes[jugador.id][poderId],
            chakra: sala.chakra[jugador.id],
          });
          this.emitirEstadoPoderes(sala);

          if (poderId === "sustitucion") {
            const rivalJugadores = sala.jugadores.filter((j) => j.id !== jugador.id);
            const objetivo = es2v2
              ? sala.jugadores.find((j) => j.equipo !== jugador.equipo && !j.abandonado)
              : rivalJugadores[0];
            const accion = this.crearAccion(sala, "sustitucion", jugador.id, objetivo?.id || null, {});
            if (!accion) {
              this.revertirConsumoPoder(sala, jugador.id, poderId, costo);
              socket.emit("poder-rechazado", { motivo: "accion_pendiente", mensaje: "Ya hay una accion pendiente" });
              return;
            }
            this.abrirVentana(sala, accion);
            sala.poderEnProceso = { jugadorId: jugador.id, poderId, equipo: jugador.equipo, hasta: accion.venceEn };
            this.io.to(sala.codigo).emit("poder-efecto", {
              version: sala.version || 0,
              tipo: "ventana-contrarresto",
              poderId,
              contrapoderId: this.contrarrestos[poderId].permitidos[0],
              contrapoderesPermitidos: [...this.contrarrestos[poderId].permitidos],
              idAccion: accion.idAccion,
              jugadorId: jugador.id,
              equipo: jugador.equipo,
              objetivoId: objetivo?.id || null,
              objetivoEquipo: objetivo?.equipo || null,
              duracion: accion.ventanaMs,
              venceEn: accion.venceEn,
            });
            this.programarExpiracionAccion(sala, accion, () => {
              const actual = this.salas.get(sala.codigo);
              if (!actual || !actual.accionPendiente || actual.accionPendiente.idAccion !== accion.idAccion) return;
              if (actual.accionPendiente.estado !== "ventana") return;
              if (!actual.defensas) actual.defensas = { sustitucion: {} };
              actual.defensas.sustitucion[jugador.id] = { activa: true, desde: Date.now() };
              this.#limpiarPoderEnProceso(actual, jugador.id, poderId);
              this.resolverAccion(actual, accion.idAccion, false);
              actual.version = (actual.version || 0) + 1; this.salas.set(actual.codigo, actual);
              this.io.to(actual.codigo).emit("poder-efecto", {
                version: actual.version || 0,
                tipo: "defensa",
                poderId,
                jugadorId: jugador.id,
                equipo: jugador.equipo,
                defensa: "sustitucion",
                activa: true,
              });
              this.registrarTimerPoder(actual, () => {
                const vigente = this.salas.get(actual.codigo);
                if (!vigente || vigente.estado !== "jugando") return;
                if (vigente.defensas?.sustitucion?.[jugador.id]?.activa) {
                  vigente.defensas.sustitucion[jugador.id] = { activa: false };
                  vigente.version = (vigente.version || 0) + 1; this.salas.set(vigente.codigo, vigente);
                  this.io.to(vigente.codigo).emit("poder-efecto", {
                    version: vigente.version || 0,
                    tipo: "defensa_expira",
                    poderId: "sustitucion",
                    jugadorId: jugador.id,
                    equipo: jugador.equipo,
                    defensa: "sustitucion",
                    activa: false,
                  });
                }
              }, 8000);
            });
          } else if (poderId === "bomba") {
            const rivalJugadores = sala.jugadores.filter((j) => j.id !== jugador.id);
            const objetivo = es2v2
              ? sala.jugadores.find((j) => j.equipo !== jugador.equipo && !j.abandonado)
              : rivalJugadores[0];
            if (objetivo) {
              // Compute damage but DON'T apply yet (deferred to window expiry)
              const danioBase = 20;

              // Create generic action
              const accion = this.crearAccion(sala, "bomba", jugador.id, objetivo.id, {
                objetivoId: objetivo.id,
                objetivoEquipo: objetivo.equipo,
                danioBase,
              });
              if (!accion) {
                this.revertirConsumoPoder(sala, jugador.id, poderId, COSTOS_PODER[poderId] || 0);
                socket.emit("poder-rechazado", { motivo: "accion_pendiente", mensaje: "Ya hay una accion pendiente" });
                return;
              }

              // Open reaction window for Sello
              this.abrirVentana(sala, accion);

              sala.poderEnProceso = { jugadorId: jugador.id, poderId, equipo: jugador.equipo, hasta: accion.venceEn };

              this.io.to(sala.codigo).emit("poder-activado", {
                version: sala.version || 0,
                jugadorId: jugador.id,
                nombre: jugador.nombre,
                equipo: jugador.equipo,
                poderId,
                usosRestantes: sala.poderes[jugador.id][poderId],
                chakra: sala.chakra[jugador.id],
              });
              this.emitirEstadoPoderes(sala);

              this.io.to(sala.codigo).emit("poder-efecto", {
                version: sala.version || 0,
                tipo: "ventana-contrarresto",
                poderId: "bomba",
                contrapoderId: this.contrarrestos[poderId].permitidos[0],
                contrapoderesPermitidos: [...this.contrarrestos[poderId].permitidos],
                idAccion: accion.idAccion,
                jugadorId: jugador.id,
                equipo: jugador.equipo,
                objetivoId: objetivo.id,
                objetivoEquipo: objetivo.equipo,
                danio: danioBase,
                duracion: accion.ventanaMs,
                venceEn: accion.venceEn,
              });

              // After window expires, apply or cancel
              this.programarExpiracionAccion(sala, accion, () => {
                const actual = this.salas.get(sala.codigo);
                if (!actual || !actual.accionPendiente || actual.accionPendiente.idAccion !== accion.idAccion) return;
                if (actual.accionPendiente.estado !== "ventana") return;

                const payload = accion.payload;
                const objetivoActual = actual.jugadores.find((j) => j.id === payload.objetivoId);
                if (!objetivoActual || objetivoActual.abandonado) {
                  actual.poderEnProceso = null;
                  this.resolverAccion(actual, accion.idAccion, false);
                  return;
                }

                // Apply damage (recompute sustitucion at resolution time)
                let consumidoSustitucion = false;
                const sustitucionActivaAhora = !!actual.defensas?.sustitucion?.[payload.objetivoId]?.activa;
                let danioFinal = payload.danioBase ?? 20;
                if (sustitucionActivaAhora) {
                  danioFinal = 10;
                  consumidoSustitucion = true;
                  actual.defensas.sustitucion[payload.objetivoId] = { activa: false };
                }
                actual.vida[payload.objetivoId] = Math.max(0,
                  (typeof actual.vida[payload.objetivoId] === "number" ? actual.vida[payload.objetivoId] : VIDA_INICIAL) - danioFinal
                );
                actual.poderEnProceso = null;
                this.resolverAccion(actual, accion.idAccion, false);
                this.io.to(actual.codigo).emit("poder-efecto", {
                  version: actual.version || 0,
                  tipo: "danio",
                  idAccion: accion.idAccion,
                  poderId: "bomba",
                  jugadorId: jugador.id,
                  equipo: jugador.equipo,
                  objetivoId: payload.objetivoId,
                  objetivoEquipo: payload.objetivoEquipo,
                  danio: danioFinal,
                  consumidoSustitucion,
                  vida: { ...actual.vida },
                });
                if (actual.vida[payload.objetivoId] <= 0) {
                  const ganador = es2v2 ? jugador.equipo : jugador.id;
                  this.terminarPartida(actual, ganador, "vida");
                }
              });
          }
        } else if (poderId === "robo") {
            const rivalJugadores = sala.jugadores.filter((j) => j.id !== jugador.id);
            const objetivo = es2v2
              ? sala.jugadores.find((j) => j.equipo !== jugador.equipo && !j.abandonado)
              : rivalJugadores[0];
            const accion = this.crearAccion(sala, "robo", jugador.id, objetivo?.id || null, {
              objetivoId: objetivo?.id || null,
              objetivoEquipo: objetivo?.equipo || null,
            });
            if (!accion) {
              this.revertirConsumoPoder(sala, jugador.id, poderId, costo);
              socket.emit("poder-rechazado", { motivo: "accion_pendiente", mensaje: "Ya hay una accion pendiente" });
              return;
            }
            this.abrirVentana(sala, accion);
            sala.poderEnProceso = { jugadorId: jugador.id, poderId, equipo: jugador.equipo, hasta: accion.venceEn };
            this.io.to(sala.codigo).emit("poder-efecto", {
              version: sala.version || 0,
              tipo: "ventana-contrarresto",
              idAccion: accion.idAccion,
              poderId,
              contrapoderId: this.contrarrestos[poderId].permitidos[0],
              contrapoderesPermitidos: [...this.contrarrestos[poderId].permitidos],
              jugadorId: jugador.id,
              equipo: jugador.equipo,
              objetivoId: objetivo?.id || null,
              objetivoEquipo: objetivo?.equipo || null,
              duracion: accion.ventanaMs,
              venceEn: accion.venceEn,
            });
            this.programarExpiracionAccion(sala, accion, () => {
              const actual = this.salas.get(sala.codigo);
              if (!actual || !actual.accionPendiente || actual.accionPendiente.idAccion !== accion.idAccion) return;
              if (actual.accionPendiente.estado !== "ventana") return;
              const objetivoActual = actual.jugadores.find((j) => j.id === accion.payload.objetivoId);
              if (!objetivoActual || objetivoActual.abandonado) {
                this.#limpiarPoderEnProceso(actual, jugador.id, poderId);
                this.resolverAccion(actual, accion.idAccion, false);
                return;
              }
              if (actual.defensas?.sustitucion?.[objetivoActual.id]?.activa) {
                actual.defensas.sustitucion[objetivoActual.id] = { activa: false };
                this.#limpiarPoderEnProceso(actual, jugador.id, poderId);
                this.resolverAccion(actual, accion.idAccion, false);
                this.io.to(actual.codigo).emit("poder-efecto", {
                  version: actual.version || 0,
                  tipo: "evadido",
                  poderId,
                  jugadorId: jugador.id,
                  equipo: jugador.equipo,
                  objetivoId: objetivoActual.id,
                  objetivoEquipo: objetivoActual.equipo,
                  consumidoSustitucion: true,
                });
                return;
              }
              const robado = Math.min(20, typeof actual.chakra[objetivoActual.id] === "number" ? actual.chakra[objetivoActual.id] : 0);
              if (robado > 0) {
                actual.chakra[objetivoActual.id] -= robado;
                actual.chakra[jugador.id] = (actual.chakra[jugador.id] || 0) + robado;
              }
              this.#limpiarPoderEnProceso(actual, jugador.id, poderId);
              this.resolverAccion(actual, accion.idAccion, false);
              this.io.to(actual.codigo).emit("poder-efecto", {
                version: actual.version || 0,
                tipo: "robo",
                poderId,
                jugadorId: jugador.id,
                equipo: jugador.equipo,
                objetivoId: objetivoActual.id,
                objetivoEquipo: objetivoActual.equipo,
                robado,
                chakraAtacante: actual.chakra[jugador.id],
                chakraObjetivo: actual.chakra[objetivoActual.id],
              });
              this.emitirEstadoPoderes(actual);
            });
          } else if (poderId === "byakugan") {
            const rivalJugadores = sala.jugadores.filter((j) => j.id !== jugador.id);
            const objetivo = es2v2
              ? sala.jugadores.find((j) => j.equipo !== jugador.equipo && !j.abandonado)
              : rivalJugadores[0];

            const indices = this.elegirIndices(sala, 2);
            if (!indices) {
              socket.emit("poder-rechazado", { motivo: "sin_cartas", mensaje: "No hay cartas disponibles" });
              return;
            }

            // Crear acción genérica
            const accion = this.crearAccion(sala, "byakugan", jugador.id, objetivo?.id || rivalJugadores[0]?.id || null, { indices });
            if (!accion) {
              this.revertirConsumoPoder(sala, jugador.id, poderId, COSTOS_PODER[poderId] || 0);
              socket.emit("poder-rechazado", { motivo: "accion_pendiente", mensaje: "Ya hay una accion pendiente" });
              return;
            }

            // Abrir ventana para Sello
            this.abrirVentana(sala, accion);

            sala.poderEnProceso = { jugadorId: jugador.id, poderId, equipo: jugador.equipo, hasta: accion.venceEn };

            this.io.to(sala.codigo).emit("poder-activado", {
              version: sala.version || 0,
              jugadorId: jugador.id,
              nombre: jugador.nombre,
              equipo: jugador.equipo,
              poderId,
              usosRestantes: sala.poderes[jugador.id][poderId],
              chakra: sala.chakra[jugador.id],
            });
            this.emitirEstadoPoderes(sala);

            this.io.to(sala.codigo).emit("poder-efecto", {
              version: sala.version || 0,
              tipo: "ventana-contrarresto",
              poderId: "byakugan",
              contrapoderId: this.contrarrestos[poderId].permitidos[0],
              contrapoderesPermitidos: [...this.contrarrestos[poderId].permitidos],
              idAccion: accion.idAccion,
              jugadorId: jugador.id,
              equipo: jugador.equipo,
              objetivoId: objetivo?.id || rivalJugadores[0]?.id || null,
              duracion: accion.ventanaMs,
              venceEn: accion.venceEn,
            });

            // After window expires, reveal or cancel
            this.programarExpiracionAccion(sala, accion, () => {
              const actual = this.salas.get(sala.codigo);
              if (!actual || !actual.accionPendiente || actual.accionPendiente.idAccion !== accion.idAccion) return;
              if (actual.accionPendiente.estado !== "ventana") return;

              // Reveal cards to caster
              const cartas = indices.map((index) => ({
                index,
                valor: actual.mazo[index].valor,
                aldea: actual.mazo[index].aldea,
              }));
              actual.efectos.byakugan[jugador.id] = {
                hasta: Date.now() + this.duracionByakuganMs,
                cartas: cartas.map((carta) => ({ ...carta })),
              };
              actual.poderEnProceso = null;
              this.resolverAccion(actual, accion.idAccion, false);
              // Reveal only to caster
              const jugadorActual = actual.jugadores.find((j) => j.id === jugador.id) || jugador;
              const socketActual = this.io.sockets.sockets.get(jugadorActual.socketId);
              if (socketActual) {
                socketActual.emit("poder-efecto", {
                  version: actual.version || 0,
                  tipo: "byakugan",
                  idAccion: accion.idAccion,
                  poderId,
                  jugadorId: jugador.id,
                  equipo: jugador.equipo,
                  cartas,
                  duracion: this.duracionByakuganMs,
                });
              }
              this.io.to(actual.codigo).emit("poder-efecto", {
                version: actual.version || 0,
                  tipo: "byakugan-revelado",
                  idAccion: accion.idAccion,
                  poderId,
                  jugadorId: jugador.id,
                  equipo: jugador.equipo,
                  indices,
                  duracion: this.duracionByakuganMs,
              });
            });
          } else if (poderId === "sello") {
            const rivalJugadores = sala.jugadores.filter((j) => j.id !== jugador.id);
            const objetivo = es2v2
              ? sala.jugadores.find((j) => j.equipo !== jugador.equipo && !j.abandonado)
              : rivalJugadores[0];
            const accion = this.crearAccion(sala, "sello", jugador.id, objetivo?.id || null, {
              objetivoId: objetivo?.id || null,
              objetivoEquipo: objetivo?.equipo || null,
            });
            if (!accion) {
              this.revertirConsumoPoder(sala, jugador.id, poderId, costo);
              socket.emit("poder-rechazado", { motivo: "accion_pendiente", mensaje: "Ya hay una accion pendiente" });
              return;
            }
            this.abrirVentana(sala, accion);
            sala.poderEnProceso = { jugadorId: jugador.id, poderId, equipo: jugador.equipo, hasta: accion.venceEn };
            this.io.to(sala.codigo).emit("poder-efecto", {
              version: sala.version || 0,
              tipo: "ventana-contrarresto",
              idAccion: accion.idAccion,
              poderId,
              contrapoderId: this.contrarrestos[poderId].permitidos[0],
              contrapoderesPermitidos: [...this.contrarrestos[poderId].permitidos],
              jugadorId: jugador.id,
              equipo: jugador.equipo,
              objetivoId: objetivo?.id || null,
              objetivoEquipo: objetivo?.equipo || null,
              duracion: accion.ventanaMs,
              venceEn: accion.venceEn,
            });
            this.programarExpiracionAccion(sala, accion, () => {
              const actual = this.salas.get(sala.codigo);
              if (!actual || !actual.accionPendiente || actual.accionPendiente.idAccion !== accion.idAccion) return;
              if (actual.accionPendiente.estado !== "ventana") return;
              const objetivoActual = actual.jugadores.find((j) => j.id === accion.payload.objetivoId);
              if (!objetivoActual || objetivoActual.abandonado) {
                this.#limpiarPoderEnProceso(actual, jugador.id, poderId);
                this.resolverAccion(actual, accion.idAccion, false);
                return;
              }
              if (actual.defensas?.sustitucion?.[objetivoActual.id]?.activa) {
                actual.defensas.sustitucion[objetivoActual.id] = { activa: false };
                this.#limpiarPoderEnProceso(actual, jugador.id, poderId);
                this.resolverAccion(actual, accion.idAccion, false);
                this.io.to(actual.codigo).emit("poder-efecto", {
                  version: actual.version || 0,
                  tipo: "evadido",
                  poderId,
                  jugadorId: jugador.id,
                  equipo: jugador.equipo,
                  objetivoId: objetivoActual.id,
                  objetivoEquipo: objetivoActual.equipo,
                  consumidoSustitucion: true,
                });
                return;
              }
              const indices = this.elegirIndices(actual, 1, { excluirSelladas: true });
              if (indices) {
                const index = indices[0];
                const hasta = Date.now() + this.duracionSelloMs;
                actual.efectos.sello = { index, hasta, jugadorId: jugador.id, objetivoId: objetivoActual.id };
                this.#limpiarPoderEnProceso(actual, jugador.id, poderId);
                this.resolverAccion(actual, accion.idAccion, false);
                actual.version = (actual.version || 0) + 1; this.salas.set(actual.codigo, actual);
                this.io.to(actual.codigo).emit("poder-efecto", {
                  version: actual.version || 0,
                  tipo: "sello",
                  poderId,
                  jugadorId: jugador.id,
                  equipo: jugador.equipo,
                  objetivoId: objetivoActual.id,
                  objetivoEquipo: objetivoActual.equipo,
                  index,
                  hasta,
                  duracion: this.duracionSelloMs,
                });
                this.registrarTimerPoder(actual, () => {
                  const vigente = this.salas.get(actual.codigo);
                  if (!vigente || vigente.estado !== "jugando") return;
                  if (vigente.efectos?.sello?.index !== index) return;
                  vigente.efectos.sello = null;
                  vigente.version = (vigente.version || 0) + 1; this.salas.set(vigente.codigo, vigente);
                  this.io.to(vigente.codigo).emit("poder-efecto", {
                    version: vigente.version || 0,
                    tipo: "sello_expirado",
                    poderId: "sello",
                    index,
                  });
                }, this.duracionSelloMs);
              } else {
                this.#limpiarPoderEnProceso(actual, jugador.id, poderId);
                this.resolverAccion(actual, accion.idAccion, false);
              }
            });
          } else if (poderId === "genjutsu") {
            const rivalJugadores = sala.jugadores.filter((j) => j.id !== jugador.id);
            const objetivo = es2v2
              ? sala.jugadores.find((j) => j.equipo !== jugador.equipo && !j.abandonado)
              : rivalJugadores[0];

            // Instant counter if byakugan already active
            if (objetivo && this.byakuganActivo(sala, objetivo.id)) {
              this.#limpiarPoderEnProceso(sala, jugador.id, poderId);
              sala.version = (sala.version || 0) + 1; this.salas.set(sala.codigo, sala);
              this.io.to(sala.codigo).emit("poder-efecto", {
                version: sala.version || 0,
                tipo: "contrarresto",
                poderId,
                contrapoderId: "byakugan",
                contrarrestadoPor: objetivo.id,
                jugadorId: jugador.id,
                equipo: jugador.equipo,
                objetivoId: objetivo.id,
                objetivoEquipo: objetivo.equipo,
                mensaje: "Byakugan detecto el Genjutsu",
              });
              return;
            }

            // Choose indices but DON'T shuffle yet
            const indices = this.elegirIndices(sala, 3);
            if (!indices) {
              socket.emit("poder-rechazado", { motivo: "sin_cartas", mensaje: "No hay cartas disponibles" });
              return;
            }

            // Create generic action
            const accion = this.crearAccion(sala, "genjutsu", jugador.id, objetivo?.id || null, { indices });
            if (!accion) {
              this.revertirConsumoPoder(sala, jugador.id, poderId, COSTOS_PODER[poderId] || 0);
              socket.emit("poder-rechazado", { motivo: "accion_pendiente", mensaje: "Ya hay una accion pendiente" });
              return;
            }

            // Open reaction window
            this.abrirVentana(sala, accion);

            sala.poderEnProceso = { jugadorId: jugador.id, poderId, equipo: jugador.equipo, hasta: accion.venceEn };

            this.io.to(sala.codigo).emit("poder-activado", {
              version: sala.version || 0,
              jugadorId: jugador.id,
              nombre: jugador.nombre,
              equipo: jugador.equipo,
              poderId,
              usosRestantes: sala.poderes[jugador.id][poderId],
              chakra: sala.chakra[jugador.id],
            });
            this.emitirEstadoPoderes(sala);

            this.io.to(sala.codigo).emit("poder-efecto", {
              version: sala.version || 0,
              tipo: "ventana-contrarresto",
              idAccion: accion.idAccion,
              poderId: "genjutsu",
              contrapoderId: this.contrarrestos[poderId].permitidos[0],
              contrapoderesPermitidos: [...this.contrarrestos[poderId].permitidos],
              jugadorId: jugador.id,
              equipo: jugador.equipo,
              objetivoId: objetivo?.id || null,
              objetivoEquipo: objetivo?.equipo || null,
              duracion: accion.ventanaMs,
              venceEn: accion.venceEn,
            });

            // After window expires, apply or cancel
            this.programarExpiracionAccion(sala, accion, () => {
              const actual = this.salas.get(sala.codigo);
              if (!actual || !actual.accionPendiente || actual.accionPendiente.idAccion !== accion.idAccion) return;
              if (actual.accionPendiente.estado !== "ventana") return;

              // Apply shuffle now
              const mezcla = this.mezclarTresCartasConIndices(actual, accion.payload.indices);
              if (mezcla) {
                const efecto = {
                  jugadorId: accion.atacanteId,
                  objetivoId: accion.objetivoId,
                  hasta: Date.now() + this.duracionGenjutsuMs,
                  original: mezcla.original,
                  movimientos: mezcla.movimientos.map((movimiento) => ({ ...movimiento })),
                };
                actual.efectos.genjutsu = efecto;
                actual.poderEnProceso = null;
                this.resolverAccion(actual, accion.idAccion, false);
                this.io.to(actual.codigo).emit("poder-efecto", {
                  version: actual.version || 0,
                  tipo: "mezcla",
                  idAccion: accion.idAccion,
                  poderId: "genjutsu",
                  jugadorId: accion.atacanteId,
                  equipo: jugador.equipo,
                  objetivoId: accion.objetivoId,
                  cartas: mezcla.cartas.map((c) => ({ index: c.index })),
                  movimientos: mezcla.movimientos.map((movimiento) => ({ ...movimiento })),
                  duracion: this.duracionGenjutsuMs,
                });
                // Timer for genjutsu expiry
                this.registrarTimerPoder(actual, () => {
                  const a = this.salas.get(actual.codigo);
                  if (!a || a.estado !== "jugando") return;
                  if (a.efectos?.genjutsu?.jugadorId !== accion.atacanteId) return;
                  this.#limpiarPoderEnProceso(a, accion.atacanteId, "genjutsu");
                  a.efectos.genjutsu = null;
                  a.version = (a.version || 0) + 1; this.salas.set(a.codigo, a);
                  this.io.to(a.codigo).emit("poder-efecto", {
                    version: a.version || 0,
                    tipo: "genjutsu_expirado",
                    poderId: "genjutsu",
                  });
                }, this.duracionGenjutsuMs);
              } else {
                actual.poderEnProceso = null;
                this.resolverAccion(actual, accion.idAccion, false);
              }
            });
          }
        } catch (error) {
          socket.emit("poder-rechazado", { motivo: "error", mensaje: "No se pudo activar el poder" });
        }
      });

      socket.on("revancha-sala", (datos = {}, callback = () => {}) => {
        try {
          if (!this.eventoPermitido(socket, "revancha-sala")) {
            return callback({ exito: false, error: "Demasiadas revanchas. Intenta en unos segundos." });
          }
          const sala = this.salas.get(socket.data.codigoSala);
          if (!sala) return callback({ exito: false, error: "Sala no encontrada" });
          if (sala.estado !== "terminada") {
            return callback({ exito: false, error: "La partida todavía no terminó" });
          }
          if (sala.creador !== token) {
            return callback({ exito: false, error: "Solo el anfitrión puede iniciar la revancha" });
          }

          const conectados = sala.jugadores.filter((j) => j.conectado && !j.abandonado);
          if (conectados.length < this.capacidadDeSala(sala)) {
            return callback({ exito: false, error: "Faltan jugadores para iniciar la revancha" });
          }

          const config = this.normalizarConfig({
            ...sala.config,
            ...(datos.config || {}),
            modo: sala.config?.modo,
          });
          sala.config = config;
          this.iniciarPartida(sala, sala.codigo);
          callback({ exito: true, estado: this.vistaEstadoPara(sala, token) });
        } catch (error) {
          callback({ exito: false, error: "No se pudo iniciar la revancha" });
        }
      });

      socket.on("abandonar-sala", () => this.sacarDeSala(socket, "abandono"));

      socket.on("unirse-como-espectador", (datos = {}, callback = () => {}) => {
        try {
          if (typeof datos === "function") callback = datos;
          if (!this.eventoPermitido(socket, "unirse-como-espectador")) {
            return callback({ exito: false, error: "Demasiados intentos para observar. Intenta en unos segundos." });
          }
          const salaActual = this.salas.get(socket.data.codigoSala);
          if (salaActual && this.jugadorPorToken(salaActual, token)) {
            return callback({ exito: false, error: "Ya estás jugando en una sala" });
          }
          const codigo = String(datos.codigo || "").toUpperCase();
          const sala = this.salas.get(codigo);
          if (!sala) return callback({ exito: false, error: "Sala no encontrada" });
          if (sala.estado === "terminada") {
            return callback({ exito: false, error: "La partida ya terminó" });
          }
          if (sala.contrasena && sala.contrasena !== datos.contrasena) {
            return callback({ exito: false, error: "Contraseña incorrecta" });
          }
          if (salaActual && salaActual !== sala) this.quitarEspectador(salaActual, socket);
          this.agregarEspectador(sala, socket, this.normalizarNombre(datos.nombre || "Espectador"));
          callback({ exito: true, codigo, estado: this.vistaEspectador(sala) });
          this.io.to(codigo).emit("sala-actualizada", this.vistaPublica(sala));
        } catch (error) {
          callback({ exito: false, error: "No se pudo observar la sala" });
        }
      });

      socket.on("salir-como-espectador", () => {
        const sala = this.salas.get(socket.data.codigoSala);
        if (sala) this.quitarEspectador(sala, socket);
      });

      socket.on("listar-salas", (datos, callback = () => {}) => {
        try {
          if (typeof datos === "function") callback = datos;
          callback({ exito: true, salas: this.obtenerListaSalasPublicas() });
        } catch (error) {
          callback({ exito: false, error: "Error" });
        }
      });

      socket.on("buscar-sala-por-codigo", (datos = {}, callback = () => {}) => {
        try {
          const codigo = String(datos.codigo || "").toUpperCase();
          const sala = this.salas.get(codigo);
          if (!sala) return callback({ exito: false, error: "Sala no encontrada" });
          if (sala.estado !== "esperando" || sala.jugadores.length >= this.capacidadDeSala(sala)) {
            return callback({ exito: false, error: "Sala no disponible" });
          }
          callback({ exito: true, sala: this.vistaPublica(sala) });
        } catch (error) {
          callback({ exito: false, error: "Error" });
        }
      });

      socket.on("buscar-partida", (datos = {}, callback = () => {}) => {
        try {
          if (!this.eventoPermitido(socket, "buscar-partida")) {
            return callback({ exito: false, error: "Demasiadas búsquedas. Intenta en unos segundos." });
          }
          const modo = this.normalizarModo(datos.modo);
          const requeridos = modo === "2v2" ? 4 : 2;
          const nombre = this.normalizarNombre(datos.nombre);
          const cola = this.colasMatchmaking[modo];
          const filtrada = cola.filter((c) => c.token !== token);
          filtrada.push({
            token,
            nombre,
            socketId: socket.id,
            modo,
            idUsuario: socket.data?.idUsuario || null,
          });
          this.colasMatchmaking[modo] = filtrada;

          if (filtrada.length < requeridos) {
            return callback({ exito: true, emparejado: false, esperando: true, modo });
          }

          const elegidos = filtrada.splice(0, requeridos);
          const sockets = elegidos.map((p) => this.io.sockets.sockets.get(p.socketId));
          if (sockets.some((s) => !s)) {
            this.colasMatchmaking[modo] = [...elegidos, ...filtrada];
            return callback({ exito: true, emparejado: false, esperando: true, modo });
          }

          const codigo = this.generarCodigo();
          const sala = {
            codigo,
            jugadores: elegidos.map((p, indice) => ({
              id: p.token,
              socketId: p.socketId,
              idUsuario:
                p.idUsuario ||
                this.io.sockets.sockets.get(p.socketId)?.data?.idUsuario ||
                null,
              nombre: p.nombre,
              listo: true,
              conectado: true,
              asiento: indice,
              equipo: this.equipoDeAsiento(indice),
              abandonado: false,
            })),
            estado: "esperando",
            mazo: [],
            cartasVolteadas: [],
            movimientos: 0,
            parejas: {},
            parejasEquipos: { A: 0, B: 0 },
            poderes: {},
            turno: null,
            turnoEquipo: null,
            bloqueada: false,
            creador: elegidos[0].token,
            anfitrion: elegidos[0].nombre,
            creadoEn: Date.now(),
            publica: false,
            contrasena: null,
            config: this.normalizarConfig({ mezclarAldeas: true, pares: modo === "2v2" ? 12 : 10, modo }),
            temporizadorAbandono: null,
          };
          sala.version = (sala.version || 0) + 1; this.salas.set(codigo, sala);
          sockets.forEach((sock) => sock.join(codigo));
          sockets.forEach((sock, indice) => {
            sock.data.codigoSala = codigo;
          });
          this.iniciarPartida(sala, codigo);
          callback({ exito: true, emparejado: true, codigo, modo });
        } catch (error) {
          callback({ exito: false, error: "Error" });
        }
      });

      socket.on("cancelar-busqueda", () => {
        for (const modo of Object.keys(this.colasMatchmaking)) {
          this.colasMatchmaking[modo] = this.colasMatchmaking[modo].filter((c) => c.token !== token);
        }
      });

      socket.on("disconnect", () => {
        this.notificadorAmistades?.registrarDesconexion(socket.data.idUsuario, socket.id);
        this.gestorInvitaciones?.cancelarPorSocket(socket.id);
        for (const modo of Object.keys(this.colasMatchmaking)) {
          this.colasMatchmaking[modo] = this.colasMatchmaking[modo].filter(
            (c) => c.socketId !== socket.id
          );
        }
        const codigo = socket.data.codigoSala;
        const sala = codigo ? this.salas.get(codigo) : null;
        if (!sala) {
          this.io.emit("lista-salas-actualizada", this.obtenerListaSalasPublicas());
          return;
        }
        if ((sala.espectadores || []).some((e) => e.socketId === socket.id)) {
          this.quitarEspectador(sala, socket);
          return;
        }
        const jugador = this.jugadorPorSocket(sala, socket.id);
        if (!jugador) return;

        if (sala.estado === "jugando") {
          jugador.conectado = false;
          this.io.to(codigo).emit("jugador-desconectado", {
            codigo,
            jugadorId: jugador.id,
            nombre: jugador.nombre,
            equipo: jugador.equipo,
            segundos: Math.round(this.tiempoReconexionMs / 1000),
          });
          this.limpiarTemporizadorAbandono(sala, jugador);
          jugador.temporizadorAbandono = setTimeout(() => {
            const actual = this.salas.get(codigo);
            if (!actual || actual.estado !== "jugando") return;
            const jugadorActual = this.jugadorPorToken(actual, jugador.id);
            if (!jugadorActual || jugadorActual.conectado) return;

            jugadorActual.abandonado = true;
            if (actual.config?.modo === "2v2") {
              const companero = this.jugadoresDisponiblesDeEquipo(actual, jugadorActual.equipo).find(
                (j) => j.id !== jugadorActual.id
              );
              if (companero) {
                if (actual.turno === jugadorActual.id) {
                  actual.turno = companero.id;
                  actual.turnoEquipo = companero.equipo;
                  this.io.to(actual.codigo).emit("turno-cambiado", {
                    turno: actual.turno,
                    turnoEquipo: actual.turnoEquipo,
                  });
                }
                return;
              }
              this.terminarPartida(actual, this.otroEquipo(jugadorActual.equipo), "abandono");
              return;
            }

            this.terminarPartida(actual, this.otroJugador(actual, jugadorActual.id)?.id || null, "abandono");
          }, this.tiempoReconexionMs);
          jugador.temporizadorAbandono.unref?.();
          return;
        }

        sala.jugadores = sala.jugadores.filter((j) => j.id !== jugador.id);
        if (sala.jugadores.length === 0) {
          this.limpiarTemporizadorLimpieza(sala);
          this.salas.delete(codigo);
        } else {
          if (sala.creador === jugador.id) sala.creador = sala.jugadores[0].id;
          if (sala.estado !== "terminada") sala.estado = "esperando";
          sala.version = (sala.version || 0) + 1; this.salas.set(codigo, sala);
          this.io.to(codigo).emit("sala-actualizada", this.vistaPublica(sala));
        }
        this.io.emit("lista-salas-actualizada", this.obtenerListaSalasPublicas());
      });
    });
  }

  indicesDisponibles(sala, { excluirSelladas = false } = {}) {
    const volteadas = new Set((sala.cartasVolteadas || []).map((carta) => carta.index));
    return sala.mazo
      .map((carta, index) => ({ carta, index }))
      .filter(({ carta, index }) => {
        if (carta.emparejada || volteadas.has(index)) return false;
        if (excluirSelladas && this.selloActivo(sala) && sala.efectos.sello.index === index) return false;
        return true;
      })
      .map(({ index }) => index);
  }

  elegirIndices(sala, cantidad, opciones = {}) {
    const indices = this.indicesDisponibles(sala, opciones);
    if (indices.length < cantidad) return null;
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, cantidad);
  }

  puedeReaccionar(sala, jugadorId, poderId) {
    const accion = sala?.accionPendiente;
    if (!accion) return null;
    if (accion.estado !== "ventana") return null;
    if (Date.now() >= accion.venceEn) return null;
    if (!this.esObjetivoOCompanero(sala, jugadorId, accion.objetivoId)) return null;
    if (!Array.isArray(accion.contraataquesPermitidos)) return null;
    if (!accion.contraataquesPermitidos.includes(poderId)) return null;
    return accion;
  }

  crearAccion(sala, poderId, atacanteId, objetivoId, payload = {}) {
    if (!sala) return null;
    // Bloquear si ya hay acción en estado "anunciada" o "ventana"
    if (sala.accionPendiente && ["anunciada", "ventana"].includes(sala.accionPendiente.estado)) {
      return null;
    }
    const contrarrestos = this.contrarrestos[poderId];
    const accion = {
      idAccion: crypto.randomUUID(),
      poderId,
      atacanteId,
      objetivoId,
      estado: "anunciada",
      venceEn: null,
      contraataquesPermitidos: contrarrestos ? contrarrestos.permitidos : [],
      ventanaMs: contrarrestos ? contrarrestos.ventanaMs : 0,
      payload: payload || {},
      timer: null,
    };
    sala.accionPendiente = accion;
    return accion;
  }

  abrirVentana(sala, accion) {
    if (!accion || accion.estado !== "anunciada") return false;
    accion.estado = "ventana";
    accion.venceEn = Date.now() + accion.ventanaMs;
    sala.accionPendiente = accion;
    return true;
  }

  programarExpiracionAccion(sala, accion, alExpirar) {
    if (!accion || accion.estado !== "ventana" || typeof alExpirar !== "function") return false;
    accion.resolver = alExpirar;
    accion.timer = setTimeout(() => alExpirar(), accion.ventanaMs);
    accion.timer.unref?.();
    return true;
  }

  resolverAccion(sala, idAccion, contrarrestada) {
    const accion = sala?.accionPendiente;
    if (!accion || accion.idAccion !== idAccion) return null;
    if (accion.estado !== "ventana") return null; // idempotencia
    accion.estado = contrarrestada ? "contrarrestada" : "resuelta";
    if (accion.timer) {
      clearTimeout(accion.timer);
      accion.timer = null;
    }
    sala.accionPendiente = null;
    sala.version = (sala.version || 0) + 1;
    this.salas.set(sala.codigo, sala);
    return accion;
  }

  revertirConsumoPoder(sala, jugadorId, poderId, costo) {
    if (!sala || !jugadorId || !poderId) return;
    if (sala.poderes?.[jugadorId]?.[poderId] !== undefined) sala.poderes[jugadorId][poderId] += 1;
    if (costo > 0 && typeof sala.chakra?.[jugadorId] === "number") sala.chakra[jugadorId] += costo;
    sala.poderEnProceso = null;
    sala.version = (sala.version || 0) + 1;
    this.salas.set(sala.codigo, sala);
    this.emitirEstadoPoderes(sala);
  }

  registrarTimerPoder(sala, callback, ms) {
    if (!sala) return;
    if (!Array.isArray(sala.timersPoderes)) sala.timersPoderes = [];
    const timer = setTimeout(() => {
      sala.timersPoderes = sala.timersPoderes.filter((t) => t !== timer);
      callback();
    }, ms);
    timer.unref?.();
    sala.timersPoderes.push(timer);
  }

  limpiarTimersPoderes(sala) {
    if (!Array.isArray(sala.timersPoderes)) return;
    for (const timer of sala.timersPoderes) clearTimeout(timer);
    sala.timersPoderes = [];
  }

  limpiarTimersReaccion(sala) {
    if (sala?.accionPendiente?.timer) {
      clearTimeout(sala.accionPendiente.timer);
      sala.accionPendiente.timer = null;
    }
    sala.accionPendiente = null;
  }

  esObjetivoOCompanero(sala, jugadorId, objetivoId) {
    if (jugadorId === objetivoId) return true;
    if (sala?.config?.modo === "2v2") {
      const jugador = sala.jugadores.find((j) => j.id === jugadorId);
      const objetivo = sala.jugadores.find((j) => j.id === objetivoId);
      return !!jugador && !!objetivo && jugador.equipo === objetivo.equipo;
    }
    return false;
  }

  selloActivo(sala) {
    return !!sala?.efectos?.sello && Date.now() < sala.efectos.sello.hasta;
  }

  byakuganActivo(sala, jugadorId) {
    const efecto = sala?.efectos?.byakugan?.[jugadorId];
    return !!efecto && Date.now() < efecto.hasta;
  }

  mezclarTresCartas(sala) {
    const indices = this.elegirIndices(sala, 3);
    if (!indices) return null;
    const original = indices.map((index) => {
      const carta = sala.mazo[index];
      return { index, valor: carta.valor, aldea: carta.aldea, parId: carta.parId };
    });
    const mezcladas = original.map((carta) => ({ ...carta }));
    for (let i = mezcladas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mezcladas[i], mezcladas[j]] = [mezcladas[j], mezcladas[i]];
    }
    mezcladas.forEach((carta, posicion) => {
      const destino = sala.mazo[indices[posicion]];
      destino.valor = carta.valor;
      destino.aldea = carta.aldea;
      destino.parId = carta.parId;
    });
    const movimientos = mezcladas.map((carta, posicion) => ({
      index: carta.index,
      destino: indices[posicion],
    }));
    return {
      indices,
      original,
      cartas: indices.map((index) => ({
        index,
      })),
      movimientos,
    };
  }

  mezclarTresCartasConIndices(sala, indices) {
    if (!indices || indices.length < 3) return null;
    const original = indices.map((index) => {
      const carta = sala.mazo[index];
      return { index, valor: carta.valor, aldea: carta.aldea, parId: carta.parId };
    });
    const mezcladas = original.map((carta) => ({ ...carta }));
    for (let i = mezcladas.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mezcladas[i], mezcladas[j]] = [mezcladas[j], mezcladas[i]];
    }
    mezcladas.forEach((carta, posicion) => {
      const destino = sala.mazo[indices[posicion]];
      destino.valor = carta.valor;
      destino.aldea = carta.aldea;
      destino.parId = carta.parId;
    });
    const movimientos = mezcladas.map((carta, posicion) => ({
      index: carta.index,
      destino: indices[posicion],
    }));
    return {
      indices,
      original,
      cartas: indices.map((index) => ({ index })),
      movimientos,
    };
  }

  restaurarCartasDesdePendiente(sala, pendiente) {
    // The shuffle hasn't been applied yet (it's pending), so nothing to restore
    return [];
  }

  restaurarCartas(sala, original) {
    const restauradas = [];
    for (const carta of original || []) {
      const actual = sala.mazo[carta.index];
      if (!actual || actual.emparejada) continue;
      actual.valor = carta.valor;
      actual.aldea = carta.aldea;
      actual.parId = carta.parId;
      restauradas.push({ index: carta.index, valor: actual.valor, aldea: actual.aldea });
    }
    return restauradas;
  }

  resolverPareja(sala) {
    sala.movimientos++;
    const [c1, c2] = sala.cartasVolteadas;
    const actorId = c1.jugadorId;
    const actor = sala.jugadores.find((j) => j.id === actorId) || null;
    const equipo = actor?.equipo || c1.equipo || sala.turnoEquipo;

    if (c1.valor === c2.valor && c1.aldea === c2.aldea) {
      sala.mazo[c1.index].emparejada = true;
      sala.mazo[c2.index].emparejada = true;
      sala.cartasVolteadas = [];
      this.acreditarAcierto(sala, actorId, equipo);
      sala.turno = actorId;
      sala.turnoEquipo = equipo;
      sala.version = (sala.version || 0) + 1; this.salas.set(sala.codigo, sala);
      this.emitirEstadoPoderes(sala);
      this.io.to(sala.codigo).emit("acierto", {
        version: sala.version || 0,
        hash: hashEstado(sala),
        index1: c1.index,
        index2: c2.index,
        jugadorId: actorId,
        equipo,
        turno: sala.turno,
        turnoEquipo: equipo,
        movimientos: sala.movimientos,
        parejas: { ...sala.parejas },
        parejasEquipos: { ...sala.parejasEquipos },
        chakra: { ...sala.chakra },
        vida: { ...sala.vida },
        combo: { ...sala.combo },
        aciertos: { ...sala.aciertos },
        errores: { ...sala.errores },
        tiempos: { ...sala.tiempos },
      });

      if (sala.mazo.every((carta) => carta.emparejada)) {
        const ganador = this.ganadorPorParejas(sala);
        this.terminarPartida(sala, ganador, "completada");
      }
      return;
    }

    const sustitucionActiva = !!sala.defensas?.sustitucion?.[actorId]?.activa;
    if (sustitucionActiva) {
      sala.defensas.sustitucion[actorId] = { activa: false };
    } else {
      sala.errores[actorId] = (sala.errores[actorId] || 0) + 1;
      sala.combo[actorId] = 0;
      sala.vida[actorId] = Math.max(0, (sala.vida[actorId] || VIDA_INICIAL) - VIDA_PERDIDA_POR_ERROR);
    }

    sala.bloqueada = true;
    sala.version = (sala.version || 0) + 1; this.salas.set(sala.codigo, sala);
    this.emitirEstadoPoderes(sala);
    this.io.to(sala.codigo).emit("fallo", {
      version: sala.version || 0,
      hash: hashEstado(sala),
      index1: c1.index,
      index2: c2.index,
      jugadorId: actorId,
      equipo,
      sustitucion: sustitucionActiva,
      chakra: { ...sala.chakra },
      vida: { ...sala.vida },
      combo: { ...sala.combo },
      aciertos: { ...sala.aciertos },
      errores: { ...sala.errores },
      tiempos: { ...sala.tiempos },
    });

    const debeTerminar = !sustitucionActiva && sala.vida[actorId] <= 0;
    const idPartida = sala.idPartida;
    this.registrarTimerPoder(sala, () => {
      const actual = this.salas.get(sala.codigo);
      if (!actual || actual.estado !== "jugando" || actual.idPartida !== idPartida) return;
      actual.cartasVolteadas = [];
      actual.bloqueada = false;
      if (debeTerminar) {
        const ganador = actual.config?.modo === "2v2"
          ? this.otroEquipo(equipo)
          : this.otroJugador(actual, actorId)?.id || null;
        this.terminarPartida(actual, ganador, "vida");
        return;
      }
      if (!sustitucionActiva) this.siguienteTurno(actual);
      actual.version = (actual.version || 0) + 1; this.salas.set(actual.codigo, actual);
      this.io.to(actual.codigo).emit("turno-cambiado", {
        version: actual.version || 0,
        hash: hashEstado(actual),
        turnoTerminaEn: actual.turnoTerminaEn,
        turno: actual.turno,
        turnoEquipo: actual.turnoEquipo,
        sustitucion: sustitucionActiva,
      });
    }, this.retardoFalloMs);
  }

  acreditarAcierto(sala, jugadorId, equipo) {
    sala.parejas[jugadorId] = (sala.parejas[jugadorId] || 0) + 1;
    if (equipo === "A" || equipo === "B") {
      sala.parejasEquipos[equipo] = (sala.parejasEquipos[equipo] || 0) + 1;
    }
    sala.aciertos[jugadorId] = (sala.aciertos[jugadorId] || 0) + 1;
    sala.combo[jugadorId] = (sala.combo[jugadorId] || 0) + 1;
    this.sumarChakra(sala, jugadorId, CHAKRA_POR_ACIERTO);
    if (sala.combo[jugadorId] >= 2) {
      this.sumarChakra(sala, jugadorId, CHAKRA_BASE_COMBO * sala.combo[jugadorId]);
    }
    // Comeback: chakra extra si va perdiendo por 2+ parejas
    const es2v2 = sala.config?.modo === "2v2";
    let misParejas, rivalParejas;
    if (es2v2) {
      const otroEquipo = equipo === "A" ? "B" : "A";
      misParejas = sala.parejasEquipos[equipo] || 0;
      rivalParejas = sala.parejasEquipos[otroEquipo] || 0;
    } else {
      const rival = sala.jugadores.find((j) => j.id !== jugadorId);
      misParejas = sala.parejas[jugadorId] || 0;
      rivalParejas = rival ? (sala.parejas[rival.id] || 0) : 0;
    }
    if (rivalParejas - misParejas >= 2) {
      this.sumarChakra(sala, jugadorId, 5);
    }
  }

  sumarChakra(sala, jugadorId, cantidad) {
    const actual = typeof sala.chakra[jugadorId] === "number" ? sala.chakra[jugadorId] : CHAKRA_INICIAL;
    sala.chakra[jugadorId] = Math.min(CHAKRA_MAXIMO, actual + cantidad);
  }

  obtenerListaSalasPublicas() {
    const lista = [];
    for (const sala of this.salas.values()) {
      if (
        sala.publica &&
        sala.estado === "esperando" &&
        sala.jugadores.length < this.capacidadDeSala(sala)
      ) {
        lista.push(this.vistaPublica(sala));
      }
    }
    return lista;
  }

  cerrar() {
    for (const sala of this.salas.values()) {
      this.limpiarTemporizadorAbandono(sala);
      this.limpiarTemporizadorPartida(sala);
      this.limpiarTemporizadorLimpieza(sala);
      this.limpiarSnapshot(sala);
      this.limpiarTimersPoderes(sala);
      this.limpiarTimersReaccion(sala);
    }
    this.salas.clear();
    this.colasMatchmaking = { "1v1": [], "2v2": [] };
    this.io.close();
  }
}

module.exports = GestorSalas;
