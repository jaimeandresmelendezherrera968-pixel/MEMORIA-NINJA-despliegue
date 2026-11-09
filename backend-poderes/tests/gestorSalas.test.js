const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const { io } = require("socket.io-client");

const GestorSalas = require(path.join(__dirname, "..", "src", "servicios", "online", "GestorSalas.js"));

const RETARDO_FALLO_MS = 20;
const TIEMPO_RECONEXION_MS = 250;

function mazoFijo(pares = 8) {
  const cartas = [];
  for (let i = 0; i < pares; i++) {
    const valor = String(i + 1);
    cartas.push({ parId: `par-${i}`, valor, aldea: "arena", emparejada: false });
    cartas.push({ parId: `par-${i}`, valor, aldea: "arena", emparejada: false });
  }
  return cartas;
}

function esperarEvento(socket, evento, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const temporizador = setTimeout(() => {
      socket.off(evento, alRecibir);
      reject(new Error(`No llegó el evento "${evento}" en ${timeout}ms`));
    }, timeout);
    const alRecibir = (datos) => {
      clearTimeout(temporizador);
      resolve(datos);
    };
    socket.once(evento, alRecibir);
  });
}

function emitir(socket, evento, datos = {}) {
  return new Promise((resolve, reject) => {
    const temporizador = setTimeout(() => reject(new Error(`Sin respuesta a "${evento}"`)), 2000);
    socket.emit(evento, datos, (respuesta) => {
      clearTimeout(temporizador);
      resolve(respuesta);
    });
  });
}

function pausa(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function conectar(url, token) {
  return new Promise((resolve, reject) => {
    const socket = io(url, {
      auth: { token },
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });
    const temporizador = setTimeout(() => reject(new Error("No conectó")), 2000);
    socket.once("connect", () => {
      clearTimeout(temporizador);
      resolve(socket);
    });
    socket.once("connect_error", (error) => {
      clearTimeout(temporizador);
      reject(error);
    });
  });
}

describe("GestorSalas (multijugador online real)", () => {
  let servidor;
  let gestor;
  let url;
  let clientes;

  beforeEach(async () => {
    servidor = http.createServer();
    gestor = new GestorSalas(servidor, {
      tiempoReconexionMs: TIEMPO_RECONEXION_MS,
      retardoFalloMs: RETARDO_FALLO_MS,
    });
    gestor.generarMazo = () => mazoFijo(8);
    clientes = [];
    await new Promise((resolve) => servidor.listen(0, "127.0.0.1", resolve));
    url = `http://127.0.0.1:${servidor.address().port}`;
  });

  afterEach(async () => {
    for (const cliente of clientes) cliente.disconnect();
    gestor.cerrar();
    if (servidor.listening) await new Promise((resolve) => servidor.close(resolve));
  });

  async function cliente(token) {
    const socket = await conectar(url, token);
    clientes.push(socket);
    return socket;
  }

  async function salaIniciada() {
    const uno = await cliente("token-jugador-uno");
    const dos = await cliente("token-jugador-dos");

    const creada = await emitir(uno, "crear-sala", { nombre: "Uno", config: { mezclarAldeas: true, pares: 8 } });
    assert.equal(creada.exito, true);

    const inicioUno = esperarEvento(uno, "partida-iniciada");
    const inicioDos = esperarEvento(dos, "partida-iniciada");
    const unida = await emitir(dos, "unirse-sala", { codigo: creada.codigo, nombre: "Dos" });
    assert.equal(unida.exito, true);

    return {
      uno,
      dos,
      codigo: creada.codigo,
      estadoUno: await inicioUno,
      estadoDos: await inicioDos,
    };
  }

  it("crea una sala publica con un ID numerico de 10 digitos y la lista", async () => {
    const uno = await cliente("token-jugador-uno");
    const creada = await emitir(uno, "crear-sala", { nombre: "Uno", config: { mezclarAldeas: true, pares: 8 } });

    assert.equal(creada.exito, true);
    assert.match(creada.codigo, /^\d{10}$/);

    const segunda = await emitir(uno, "crear-sala", { nombre: "Uno", config: { mezclarAldeas: true, pares: 8 } });
    assert.equal(segunda.exito, true);
    assert.match(segunda.codigo, /^\d{10}$/);
    assert.notEqual(segunda.codigo, creada.codigo);

    const lista = await emitir(uno, "listar-salas");
    assert.equal(lista.exito, true);
    assert.equal(lista.salas.length, 1);
    assert.equal(lista.salas[0].anfitrion, "Uno");
    assert.equal(lista.salas[0].jugadores, 1);
  });

  it("inicia la partida automáticamente cuando entra el segundo jugador", async () => {
    const { estadoUno, estadoDos } = await salaIniciada();

    for (const estado of [estadoUno, estadoDos]) {
      assert.equal(estado.estado, "jugando");
      assert.equal(estado.mazo.length, 16);
      assert.equal(estado.turno, "token-jugador-uno");
      assert.equal(estado.jugadores.length, 2);
    }
  });

  it("no filtra los valores de las cartas al iniciar la partida", async () => {
    const { estadoUno } = await salaIniciada();
    assert.equal(estadoUno.mazo[0].valor, undefined);
    assert.equal(estadoUno.mazo[0].emparejada, false);
  });

  it("solo deja voltear cartas al jugador con el turno", async () => {
    const { uno, dos } = await salaIniciada();
    const recibidas = [];
    uno.on("carta-volteada", (datos) => recibidas.push(datos));

    dos.emit("voltear-carta", { index: 0 });
    await pausa(100);
    assert.equal(recibidas.length, 0);

    const revelada = esperarEvento(uno, "carta-volteada");
    uno.emit("voltear-carta", { index: 0 });
    const datos = await revelada;
    assert.equal(datos.index, 0);
    assert.equal(datos.valor, "1");
    assert.equal(datos.aldea, "arena");
  });

  it("un acierto suma pareja y conserva el turno; un fallo cambia el turno", async () => {
    const { uno, dos } = await salaIniciada();

    const acierto = esperarEvento(uno, "acierto");
    uno.emit("voltear-carta", { index: 0 });
    uno.emit("voltear-carta", { index: 1 });
    const datosAcierto = await acierto;
    assert.equal(datosAcierto.parejas["token-jugador-uno"], 1);
    assert.equal(datosAcierto.turno, "token-jugador-uno");

    const fallo = esperarEvento(uno, "fallo");
    const cambio = esperarEvento(uno, "turno-cambiado");
    uno.emit("voltear-carta", { index: 2 });
    uno.emit("voltear-carta", { index: 4 });
    await fallo;
    const datosTurno = await cambio;
    assert.equal(datosTurno.turno, "token-jugador-dos");
  });

  it("inicia con chakra, vida, combo y tiempos autoritativos", async () => {
    const { estadoUno } = await salaIniciada();

    assert.equal(estadoUno.chakra["token-jugador-uno"], 100);
    assert.equal(estadoUno.vida["token-jugador-uno"], 100);
    assert.equal(estadoUno.combo["token-jugador-uno"], 0);
    assert.equal(estadoUno.aciertos["token-jugador-uno"], 0);
    assert.equal(estadoUno.errores["token-jugador-uno"], 0);
    assert.equal(estadoUno.tiempos["token-jugador-uno"], 180);
    assert.equal(estadoUno.tiempos["token-jugador-dos"], 180);
    assert.equal(estadoUno.poderes["token-jugador-uno"].sello, 2);
  });

  it("un acierto suma chakra con bonus de combo y conserva el turno", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    sala.chakra["token-jugador-uno"] = 80;

    const primerAcierto = esperarEvento(uno, "acierto");
    uno.emit("voltear-carta", { index: 0 });
    uno.emit("voltear-carta", { index: 1 });
    const primero = await primerAcierto;
    assert.equal(primero.combo["token-jugador-uno"], 1);
    assert.equal(primero.chakra["token-jugador-uno"], 85);
    assert.equal(primero.aciertos["token-jugador-uno"], 1);

    const segundoAcierto = esperarEvento(uno, "acierto");
    uno.emit("voltear-carta", { index: 2 });
    uno.emit("voltear-carta", { index: 3 });
    const segundo = await segundoAcierto;
    assert.equal(segundo.combo["token-jugador-uno"], 2);
    assert.equal(segundo.chakra["token-jugador-uno"], 96);
    assert.equal(segundo.turno, "token-jugador-uno");
  });

  it("un fallo resta vida, rompe el combo y cambia el turno", async () => {
    const { uno, dos, codigo } = await salaIniciada();

    const acierto = esperarEvento(uno, "acierto");
    uno.emit("voltear-carta", { index: 0 });
    uno.emit("voltear-carta", { index: 1 });
    await acierto;

    const fallo = esperarEvento(uno, "fallo");
    const cambio = esperarEvento(uno, "turno-cambiado");
    uno.emit("voltear-carta", { index: 2 });
    uno.emit("voltear-carta", { index: 4 });
    const datosFallo = await fallo;
    const datosTurno = await cambio;

    assert.equal(datosFallo.vida["token-jugador-uno"], 95);
    assert.equal(datosFallo.combo["token-jugador-uno"], 0);
    assert.equal(datosFallo.errores["token-jugador-uno"], 1);
    assert.equal(datosFallo.sustitucion, false);
    assert.equal(datosTurno.turno, "token-jugador-dos");
    assert.equal(gestor.salas.get(codigo).vida["token-jugador-uno"], 95);
  });

  it("Sustitución salva el fallo, no resta vida y conserva el turno", async () => {
    const { uno, codigo } = await salaIniciada();
    const activado = esperarEvento(uno, "poder-activado");
    uno.emit("activar-poder", { poderId: "sustitucion" });
    await activado;
    const sala = gestor.salas.get(codigo);
    sala.poderEnProceso = null;

    const fallo = esperarEvento(uno, "fallo");
    const cambio = esperarEvento(uno, "turno-cambiado");
    uno.emit("voltear-carta", { index: 2 });
    uno.emit("voltear-carta", { index: 4 });
    const datosFallo = await fallo;
    const datosTurno = await cambio;

    assert.equal(datosFallo.sustitucion, true);
    assert.equal(datosFallo.vida["token-jugador-uno"], 100);
    assert.equal(datosFallo.errores["token-jugador-uno"], 0);
    assert.equal(datosTurno.turno, "token-jugador-uno");
    assert.equal(datosTurno.sustitucion, true);
    assert.equal(sala.defensas.sustitucion["token-jugador-uno"].activa, false);
  });

  it("Byakugan revela dos cartas solo al jugador que lo activa", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const efectoUno = esperarEvento(uno, "poder-efecto");
    const efectoDos = esperarEvento(dos, "poder-efecto", 250).catch(() => null);

    uno.emit("activar-poder", { poderId: "byakugan" });
    const datos = await efectoUno;
    assert.equal(datos.tipo, "byakugan");
    assert.equal(datos.cartas.length, 2);
    for (const carta of datos.cartas) {
      assert.equal(typeof carta.valor, "string");
      assert.equal(typeof carta.aldea, "string");
    }
    assert.equal(await efectoDos, null);
    assert.equal(gestor.salas.get(codigo).chakra["token-jugador-uno"], 70);
  });

  it("Sello bloquea una carta oculta y no deja voltearla", async () => {
    const { uno, codigo } = await salaIniciada();
    const efecto = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "sello" });
    const datos = await efecto;
    assert.equal(datos.tipo, "sello");

    const sala = gestor.salas.get(codigo);
    sala.poderEnProceso = null;
    const recibidas = [];
    uno.on("carta-volteada", (carta) => recibidas.push(carta));
    uno.emit("voltear-carta", { index: datos.index });
    await pausa(60);

    assert.equal(recibidas.length, 0);
    assert.equal(sala.efectos.sello.index, datos.index);
    assert.equal(sala.chakra["token-jugador-uno"], 70);
  });

  it("Genjutsu mezcla tres cartas ocultas y registra el efecto activo", async () => {
    const { uno, codigo } = await salaIniciada();
    const efecto = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "genjutsu" });
    const datos = await efecto;

    assert.equal(datos.tipo, "mezcla");
    assert.equal(datos.cartas.length, 3);
    const sala = gestor.salas.get(codigo);
    for (const carta of datos.cartas) {
      assert.equal(sala.mazo[carta.index].valor, carta.valor);
      assert.equal(sala.mazo[carta.index].aldea, carta.aldea);
    }
    assert.equal(sala.efectos.genjutsu.jugadorId, "token-jugador-uno");
  });

  it("Genjutsu se anula si el rival tiene Byakugan activo", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    sala.efectos.byakugan["token-jugador-dos"] = { hasta: Date.now() + 3000 };

    const efecto = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "genjutsu" });
    const datos = await efecto;

    assert.equal(datos.tipo, "contrarresto");
    assert.equal(datos.poderId, "genjutsu");
    assert.equal(sala.efectos.genjutsu, null);
  });

  it("Sello se evade si el rival tiene Sustitución activa", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    sala.defensas.sustitucion["token-jugador-dos"] = { activa: true };

    const efecto = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "sello" });
    const datos = await efecto;

    assert.equal(datos.tipo, "evadido");
    assert.equal(datos.poderId, "sello");
    assert.equal(sala.efectos.sello, null);
    assert.equal(sala.defensas.sustitucion["token-jugador-dos"].activa, false);
  });

  it("Bomba resta 20 de vida al rival", async () => {
    const { uno, codigo } = await salaIniciada();
    const efecto = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    const datos = await efecto;

    assert.equal(datos.tipo, "danio");
    assert.equal(datos.danio, 20);
    assert.equal(gestor.salas.get(codigo).vida["token-jugador-dos"], 80);
  });

  it("Bomba mitigada por Sustitución resta 10 y consume la defensa", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    sala.defensas.sustitucion["token-jugador-dos"] = { activa: true };

    const efecto = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    const datos = await efecto;

    assert.equal(datos.tipo, "danio");
    assert.equal(datos.danio, 10);
    assert.equal(sala.vida["token-jugador-dos"], 90);
    assert.equal(sala.defensas.sustitucion["token-jugador-dos"].activa, false);
  });

  it("Robo se evade con Sustitución sin mover chakra", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    sala.defensas.sustitucion["token-jugador-dos"] = { activa: true };

    const efecto = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "robo" });
    const datos = await efecto;

    assert.equal(datos.tipo, "evadido");
    assert.equal(datos.poderId, "robo");
    assert.equal(sala.chakra["token-jugador-dos"], 100);
    assert.equal(sala.defensas.sustitucion["token-jugador-dos"].activa, false);
  });

  it("un poder se agota después de dos usos", async () => {
    const { uno, codigo } = await salaIniciada();
    for (let i = 0; i < 2; i++) {
      const efecto = esperarEvento(uno, "poder-efecto");
      uno.emit("activar-poder", { poderId: "byakugan" });
      await efecto;
      gestor.salas.get(codigo).poderEnProceso = null;
    }

    const rechazo = esperarEvento(uno, "poder-rechazado");
    uno.emit("activar-poder", { poderId: "byakugan" });
    const datos = await rechazo;
    assert.equal(datos.motivo, "sin_usos");
  });

  it("termina por tiempo cuando el reloj del jugador del turno llega a cero", async () => {
    gestor.tiempoInicialSegundos = 1;
    const { uno, codigo } = await salaIniciada();
    const terminada = esperarEvento(uno, "partida-terminada", 3000);

    const datos = await terminada;
    assert.equal(datos.motivo, "tiempo");
    assert.equal(datos.ganadorId, "token-jugador-dos");
    assert.equal(datos.perdedorId, "token-jugador-uno");
    assert.equal(datos.tiempos["token-jugador-uno"], 0);
    assert.equal(gestor.salas.get(codigo).estado, "terminada");
  });

  it("termina cuando se emparejan todas las cartas y declara ganador por parejas", async () => {
    const { uno, codigo } = await salaIniciada();
    const terminada = esperarEvento(uno, "partida-terminada", 4000);

    for (let par = 0; par < 8; par++) {
      const acierto = esperarEvento(uno, "acierto");
      uno.emit("voltear-carta", { index: par * 2 });
      uno.emit("voltear-carta", { index: par * 2 + 1 });
      await acierto;
    }

    const datos = await terminada;
    assert.equal(datos.motivo, "completada");
    assert.equal(datos.ganadorId, "token-jugador-uno");
    assert.equal(datos.parejas["token-jugador-uno"], 8);
    assert.equal(datos.movimientos, 8);
    assert.equal(datos.codigo, codigo);
  });

  it("permite reconectarse a mitad de partida con el mismo token", async () => {
    const { uno, dos, codigo } = await salaIniciada();

    const aviso = esperarEvento(uno, "jugador-desconectado");
    dos.disconnect();
    const avisoDatos = await aviso;
    assert.equal(avisoDatos.jugadorId, "token-jugador-dos");
    assert.equal(avisoDatos.segundos, Math.round(TIEMPO_RECONEXION_MS / 1000));

    const dosNuevo = await cliente("token-jugador-dos");
    const reconectado = esperarEvento(uno, "jugador-reconectado");
    const estado = await emitir(dosNuevo, "reincorporarse-sala", { codigo });
    assert.equal(estado.exito, true);
    assert.equal(estado.estado.turno, "token-jugador-uno");
    assert.equal(estado.estado.jugadores.length, 2);
    assert.equal(estado.estado.mazo.length, 16);

    const datosReconexion = await reconectado;
    assert.equal(datosReconexion.jugadorId, "token-jugador-dos");
  });

  it("declara abandono si el jugador no vuelve dentro del plazo", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const terminada = esperarEvento(uno, "partida-terminada", 2000);

    dos.disconnect();
    const datos = await terminada;

    assert.equal(datos.motivo, "abandono");
    assert.equal(datos.ganadorId, "token-jugador-uno");
    assert.equal(datos.perdedorId, "token-jugador-dos");
    assert.equal(gestor.salas.get(codigo).estado, "terminada");
  });

  it("exige la contraseña en salas privadas", async () => {
    const uno = await cliente("token-jugador-uno");
    const dos = await cliente("token-jugador-dos");

    const creada = await emitir(uno, "crear-sala", {
      nombre: "Uno",
      publica: false,
      contrasena: "clave",
      config: { mezclarAldeas: true, pares: 8 },
    });

    const mala = await emitir(dos, "unirse-sala", { codigo: creada.codigo, nombre: "Dos", contrasena: "otra" });
    assert.equal(mala.exito, false);
    assert.equal(mala.error, "Contraseña incorrecta");

    const inicioUno = esperarEvento(uno, "partida-iniciada");
    const inicioDos = esperarEvento(dos, "partida-iniciada");
    const buena = await emitir(dos, "unirse-sala", { codigo: creada.codigo, nombre: "Dos", contrasena: "clave" });
    assert.equal(buena.exito, true);
    await Promise.all([inicioUno, inicioDos]);
  });

  it("empareja por partida rápida y avisa a ambos jugadores", async () => {
    gestor.generarMazo = GestorSalas.prototype.generarMazo;
    const uno = await cliente("token-jugador-uno");
    const dos = await cliente("token-jugador-dos");

    const inicioUno = esperarEvento(uno, "partida-iniciada");
    const inicioDos = esperarEvento(dos, "partida-iniciada");

    const primero = await emitir(uno, "buscar-partida", { nombre: "Uno" });
    assert.equal(primero.emparejado, false);

    const segundo = await emitir(dos, "buscar-partida", { nombre: "Dos" });
    assert.equal(segundo.emparejado, true);
    assert.match(segundo.codigo, /^\d{10}$/);

    const [estadoUno, estadoDos] = await Promise.all([inicioUno, inicioDos]);
    assert.equal(estadoUno.mazo.length, 20);
    assert.equal(estadoDos.config.pares, 10);
    assert.equal(estadoUno.turno, "token-jugador-uno");
  });

  it("genera un mazo con aldeas y valores que existen en assets", async () => {
    gestor.generarMazo = GestorSalas.prototype.generarMazo;
    const raizAssets = path.join(__dirname, "..", "..", "assets", "img", "cards", "aldeas");

    for (const config of [{ mezclarAldeas: true, pares: 16 }, { mezclarAldeas: false, aldea: "uchiha", pares: 8 }]) {
      const mazo = gestor.generarMazo(config);
      assert.equal(mazo.length, (config.pares || 8) * 2);
      for (const carta of mazo) {
        const archivo = path.join(raizAssets, carta.aldea, `${carta.valor}.png`);
        assert.equal(fs.existsSync(archivo), true, `Falta la imagen ${carta.aldea}/${carta.valor}.png`);
      }
    }
  });

  it("rechaza la reincorporación de un token ajeno a la sala", async () => {
    const { codigo } = await salaIniciada();
    const intruso = await cliente("token-intruso-123");
    const respuesta = await emitir(intruso, "reincorporarse-sala", { codigo });
    assert.equal(respuesta.exito, false);
    assert.equal(respuesta.error, "No perteneces a esta sala");
  });

  async function sala2v2Iniciada() {
    const uno = await cliente("token-2v2-uno");
    const dos = await cliente("token-2v2-dos");
    const tres = await cliente("token-2v2-tres");
    const cuatro = await cliente("token-2v2-cuatro");

    const creada = await emitir(uno, "crear-sala", {
      nombre: "Uno",
      config: { modo: "2v2", mezclarAldeas: true, pares: 8 },
    });
    assert.equal(creada.exito, true);
    assert.equal(creada.sala.capacidad, 4);

    await emitir(dos, "unirse-sala", { codigo: creada.codigo, nombre: "Dos" });
    await emitir(tres, "unirse-sala", { codigo: creada.codigo, nombre: "Tres" });

    const inicios = [uno, dos, tres, cuatro].map((socket) => esperarEvento(socket, "partida-iniciada"));
    const unida = await emitir(cuatro, "unirse-sala", { codigo: creada.codigo, nombre: "Cuatro" });
    assert.equal(unida.exito, true);

    const estados = await Promise.all(inicios);
    return { uno, dos, tres, cuatro, codigo: creada.codigo, estados };
  }

  function ganarTodosLosPares(socket, cantidad, evento = "acierto") {
    const promesas = [];
    for (let par = 0; par < cantidad; par++) {
      promesas.push(esperarEvento(socket, evento));
      socket.emit("voltear-carta", { index: par * 2 });
      socket.emit("voltear-carta", { index: par * 2 + 1 });
    }
    return Promise.all(promesas);
  }

  it("inicia 2v2 con cuatro jugadores, dos equipos y turno compartido", async () => {
    const { uno, dos, tres, estados } = await sala2v2Iniciada();

    for (const estado of estados) {
      assert.equal(estado.estado, "jugando");
      assert.equal(estado.modo, "2v2");
      assert.equal(estado.capacidad, 4);
      assert.equal(estado.jugadores.length, 4);
      assert.equal(estado.turno, "token-2v2-uno");
      assert.equal(estado.turnoEquipo, "A");
      assert.deepEqual(estado.jugadores.map((j) => j.equipo), ["A", "A", "B", "B"]);
    }

    const recibidas = [];
    uno.on("carta-volteada", (datos) => recibidas.push(datos));

    tres.emit("voltear-carta", { index: 0 });
    await pausa(80);
    assert.equal(recibidas.length, 0, "el equipo B no puede voltear en turno A");

    const revelada = esperarEvento(uno, "carta-volteada");
    dos.emit("voltear-carta", { index: 0 });
    assert.equal((await revelada).equipo, "A", "el compañero de equipo sí puede voltear");
  });

  it("acredita las parejas al equipo y cambia el turno al equipo rival", async () => {
    const { uno, dos, tres, codigo } = await sala2v2Iniciada();
    const estado = gestor.salas.get(codigo);

    const acierto = esperarEvento(uno, "acierto");
    uno.emit("voltear-carta", { index: 0 });
    uno.emit("voltear-carta", { index: 1 });
    const datosAcierto = await acierto;
    assert.equal(datosAcierto.parejasEquipos.A, 1);
    assert.equal(datosAcierto.turnoEquipo, "A");
    assert.equal(estado.turnoEquipo, "A");

    const fallo = esperarEvento(uno, "fallo");
    const cambio = esperarEvento(uno, "turno-cambiado");
    uno.emit("voltear-carta", { index: 2 });
    uno.emit("voltear-carta", { index: 4 });
    await fallo;
    const datosTurno = await cambio;
    assert.equal(datosTurno.turnoEquipo, "B");
    assert.equal(datosTurno.turno, "token-2v2-tres");

    const reveladaB = esperarEvento(uno, "carta-volteada");
    tres.emit("voltear-carta", { index: 2 });
    assert.equal((await reveladaB).equipo, "B");
  });

  it("termina 2v2 cuando un equipo completa todos los pares", async () => {
    const { uno, codigo } = await sala2v2Iniciada();
    const terminada = esperarEvento(uno, "partida-terminada", 4000);

    await ganarTodosLosPares(uno, 8);
    const datos = await terminada;

    assert.equal(datos.modo, "2v2");
    assert.equal(datos.motivo, "completada");
    assert.equal(datos.ganadorEquipo, "A");
    assert.equal(datos.perdedorEquipo, "B");
    assert.equal(datos.ganadorId, "token-2v2-uno");
    assert.equal(datos.parejasEquipos.A, 8);
    assert.equal(datos.parejasEquipos.B, 0);
    assert.equal(gestor.salas.get(codigo).estado, "terminada");
  });

  it("el abandono explícito de un integrante hace perder a su equipo", async () => {
    const { uno, dos } = await sala2v2Iniciada();
    const terminada = esperarEvento(uno, "partida-terminada", 2000);

    dos.emit("abandonar-sala");
    const datos = await terminada;

    assert.equal(datos.motivo, "abandono");
    assert.equal(datos.ganadorEquipo, "B");
    assert.equal(datos.perdedorEquipo, "A");
  });

  it("si un jugador 2v2 se desconecta, su equipo sigue si queda un compañero", async () => {
    const { tres, codigo } = await sala2v2Iniciada();

    tres.disconnect();
    await pausa(TIEMPO_RECONEXION_MS + 120);

    const estado = gestor.salas.get(codigo);
    assert.equal(estado.estado, "jugando");
    assert.equal(estado.jugadores.find((j) => j.id === "token-2v2-tres").abandonado, true);
  });

  it("empareja 2v2 por partida rápida con cuatro jugadores", async () => {
    gestor.generarMazo = GestorSalas.prototype.generarMazo;
    const clientes = [];
    for (let i = 1; i <= 4; i++) clientes.push(await cliente(`token-rapido-2v2-${i}`));

    const inicios = clientes.map((socket) => esperarEvento(socket, "partida-iniciada"));
    for (let i = 0; i < 3; i++) {
      const respuesta = await emitir(clientes[i], "buscar-partida", {
        nombre: `Jugador ${i + 1}`,
        modo: "2v2",
      });
      assert.equal(respuesta.emparejado, false);
    }

    const cuarto = await emitir(clientes[3], "buscar-partida", {
      nombre: "Jugador 4",
      modo: "2v2",
    });
    assert.equal(cuarto.emparejado, true);
    assert.equal(cuarto.modo, "2v2");

    const estados = await Promise.all(inicios);
    assert.equal(estados[0].modo, "2v2");
    assert.equal(estados[0].jugadores.length, 4);
    assert.equal(estados[0].mazo.length, 24);
    assert.equal(estados[0].turnoEquipo, "A");
  });

  it("permite al anfitrión iniciar una revancha 2v2 con otra configuración", async () => {
    const { uno, dos, tres, cuatro, codigo } = await sala2v2Iniciada();
    const terminada = esperarEvento(uno, "partida-terminada", 4000);
    await ganarTodosLosPares(uno, 8);
    const finalizada = await terminada;
    const idPartidaAnterior = finalizada.idPartida;

    gestor.generarMazo = () => mazoFijo(10);
    const inicios = [uno, dos, tres, cuatro].map((socket) => esperarEvento(socket, "partida-iniciada"));
    const respuesta = await emitir(uno, "revancha-sala", {
      config: { mezclarAldeas: true, pares: 10 },
    });
    assert.equal(respuesta.exito, true);

    const estados = await Promise.all(inicios);
    for (const estado of estados) {
      assert.equal(estado.estado, "jugando");
      assert.equal(estado.config.pares, 10);
      assert.equal(estado.mazo.length, 20);
      assert.notEqual(estado.idPartida, undefined);
    }
    assert.notEqual(gestor.salas.get(codigo).idPartida, idPartidaAnterior);
  });

  it("solo el anfitrión puede iniciar la revancha", async () => {
    const { uno, dos, codigo } = await sala2v2Iniciada();
    const terminada = esperarEvento(uno, "partida-terminada", 4000);
    await ganarTodosLosPares(uno, 8);
    await terminada;

    const respuesta = await emitir(dos, "revancha-sala", { config: { pares: 10 } });
    assert.equal(respuesta.exito, false);
    assert.equal(respuesta.error, "Solo el anfitrión puede iniciar la revancha");
    assert.equal(gestor.salas.get(codigo).estado, "terminada");
  });

  it("desconecta sockets sin token válido", async () => {
    const socket = io(url, {
      auth: { token: "x" },
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });
    clientes.push(socket);
    const desconectado = esperarEvento(socket, "disconnect");
    const error = await esperarEvento(socket, "error-sesion");
    assert.equal(error.error, "Token de jugador inválido");
    await desconectado;
  });
});
