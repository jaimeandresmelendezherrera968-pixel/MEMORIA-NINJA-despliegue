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

function esperarEfecto(socket, tipo, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const temporizador = setTimeout(() => {
      socket.off("poder-efecto", alRecibir);
      reject(new Error(`No llegó el efecto "${tipo}" en ${timeout}ms`));
    }, timeout);
    const alRecibir = (datos) => {
      if (datos?.tipo !== tipo) return;
      clearTimeout(temporizador);
      socket.off("poder-efecto", alRecibir);
      resolve(datos);
    };
    socket.on("poder-efecto", alRecibir);
  });
}

function emitir(socket, evento, datos = {}, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const temporizador = setTimeout(() => reject(new Error(`Sin respuesta a "${evento}"`)), timeout);
    socket.emit(evento, datos, (respuesta) => {
      clearTimeout(temporizador);
      resolve(respuesta);
    });
  });
}

function pausa(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function esperarCondicion(condicion, ms = 1000) {
  const inicio = Date.now();
  while (!condicion()) {
    if (Date.now() - inicio > ms) throw new Error("La condición no se cumplió a tiempo");
    await pausa(10);
  }
}

function conectar(url, token, headers = {}) {
  return new Promise((resolve, reject) => {
    const socket = io(url, {
      auth: { token },
      extraHeaders: headers,
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
      ventanaContrarrestoMs: 200,
      duracionByakuganMs: 5000,
      duracionSelloMs: 5000,
      duracionGenjutsuMs: 5000,
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

  async function cliente(token, headers = {}) {
    const socket = await conectar(url, token, headers);
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

  it("crea una sala publica con un ID numerico de 6 digitos y la lista", async () => {
    const uno = await cliente("token-jugador-uno");
    const creada = await emitir(uno, "crear-sala", { nombre: "Uno", config: { mezclarAldeas: true, pares: 8 } });

    assert.equal(creada.exito, true);
    assert.match(creada.codigo, /^\d{6}$/);

    const segunda = await emitir(uno, "crear-sala", { nombre: "Uno", config: { mezclarAldeas: true, pares: 8 } });
    assert.equal(segunda.exito, true);
    assert.match(segunda.codigo, /^\d{6}$/g);
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
    assert.equal(estadoUno.tiempos["token-jugador-uno"], 20);
    assert.equal(estadoUno.tiempos["token-jugador-dos"], 20);
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
    uno.emit("activar-poder", { poderId: "sustitucion" });
    await esperarEfecto(uno, "defensa");
    const sala = gestor.salas.get(codigo);

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

  it("marcar-listo después de iniciada la partida responde error", async () => {
    const { uno } = await salaIniciada();
    const respuesta = await emitir(uno, "marcar-listo", { listo: true });
    assert.equal(respuesta.exito, false);
    assert.equal(respuesta.error, "La partida ya está en curso");
  });

  it("reincorporarse no revela la Sustitución del otro jugador", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    uno.emit("activar-poder", { poderId: "sustitucion" });
    await esperarEfecto(uno, "defensa");

    const reincorporadoDos = await emitir(dos, "reincorporarse-sala", { codigo });
    assert.equal(reincorporadoDos.exito, true);
    assert.deepEqual(Object.keys(reincorporadoDos.estado.sustitucionArmada), ["token-jugador-dos"]);
    assert.equal(reincorporadoDos.estado.sustitucionArmada["token-jugador-uno"], undefined);

    const reincorporadoUno = await emitir(uno, "reincorporarse-sala", { codigo });
    assert.equal(reincorporadoUno.exito, true);
    assert.deepEqual(Object.keys(reincorporadoUno.estado.sustitucionArmada), ["token-jugador-uno"]);
    assert.equal(reincorporadoUno.estado.sustitucionArmada["token-jugador-uno"].activa, true);
    assert.equal(reincorporadoUno.estado.sustitucionArmada["token-jugador-dos"], undefined);
  });

  it("Byakugan revela dos cartas solo al jugador que lo activa", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    const eventosDos = [];
    const alEventoDos = (evento) => eventosDos.push(evento);
    dos.on("poder-efecto", alEventoDos);

    uno.emit("activar-poder", { poderId: "byakugan" });
    const v = await ventana;
    assert.equal(v.tipo, "ventana-contrarresto");
    assert.equal(v.contrapoderId, "sello");

    const efectoUno = esperarEvento(uno, "poder-efecto", 5000);
    const datos = await efectoUno;
    assert.equal(datos.tipo, "byakugan");
    assert.equal(datos.cartas.length, 2);
    for (const carta of datos.cartas) {
      assert.equal(typeof carta.valor, "string");
      assert.equal(typeof carta.aldea, "string");
    }

    await pausa(50);
    dos.off("poder-efecto", alEventoDos);
    const publico = eventosDos.find((evento) => evento.tipo === "byakugan-revelado");
    assert.ok(publico, "El rival debe recibir el aviso público de Byakugan");
    assert.equal(publico.indices.length, 2);
    assert.equal(publico.cartas, undefined);
    assert.ok(eventosDos.every((evento) => !evento.cartas), "El rival nunca recibe valores de cartas");
    assert.equal(gestor.salas.get(codigo).chakra["token-jugador-uno"], 70);
  });

  it("Sello bloquea una carta oculta y no deja voltearla", async () => {
    const { uno, codigo } = await salaIniciada();
    uno.emit("activar-poder", { poderId: "sello" });
    const datos = await esperarEfecto(uno, "sello");

    const sala = gestor.salas.get(codigo);
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
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "genjutsu" });
    const datosVentana = await ventana;
    assert.equal(datosVentana.tipo, "ventana-contrarresto");

    const mezcla = esperarEvento(uno, "poder-efecto", 5000);
    const datos = await mezcla;
    assert.equal(datos.tipo, "mezcla");
    const sala = gestor.salas.get(codigo);
    for (const carta of datos.cartas) {
      assert.equal(typeof carta.index, "number");
      assert.ok(sala.mazo[carta.index]);
    }
    assert.ok(Array.isArray(datos.movimientos) && datos.movimientos.length === 3);
    for (const movimiento of datos.movimientos) {
      assert.equal(typeof movimiento.index, "number");
      assert.equal(typeof movimiento.destino, "number");
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

    uno.emit("activar-poder", { poderId: "sello" });
    const datos = await esperarEfecto(uno, "evadido");

    assert.equal(datos.tipo, "evadido");
    assert.equal(datos.poderId, "sello");
    assert.equal(sala.efectos.sello, null);
    assert.equal(sala.defensas.sustitucion["token-jugador-dos"].activa, false);
  });

  it("Bomba resta 20 de vida al rival", async () => {
    const { uno, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    const v = await ventana;
    assert.equal(v.tipo, "ventana-contrarresto");

    const danio = esperarEvento(uno, "poder-efecto", 5000);
    const datos = await danio;
    assert.equal(datos.tipo, "danio");
    assert.equal(datos.danio, 20);
    assert.equal(gestor.salas.get(codigo).vida["token-jugador-dos"], 80);
  });

  it("Bomba mitigada por Sustitución resta 10 y consume la defensa", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    sala.defensas.sustitucion["token-jugador-dos"] = { activa: true };

    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    const v = await ventana;
    assert.equal(v.tipo, "ventana-contrarresto");

    const danio = esperarEvento(uno, "poder-efecto", 5000);
    const datos = await danio;
    assert.equal(datos.tipo, "danio");
    assert.equal(datos.danio, 10);
    assert.equal(sala.vida["token-jugador-dos"], 90);
    assert.equal(sala.defensas.sustitucion["token-jugador-dos"].activa, false);
  });

  it("Robo se evade con Sustitución sin mover chakra", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    sala.defensas.sustitucion["token-jugador-dos"] = { activa: true };

    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "robo" });
    const datosVentana = await ventana;
    assert.equal(datosVentana.tipo, "ventana-contrarresto");

    const datos = await esperarEfecto(uno, "evadido");
    assert.equal(datos.tipo, "evadido");
    assert.equal(datos.poderId, "robo");
    assert.equal(sala.chakra["token-jugador-dos"], 100);
    assert.equal(sala.defensas.sustitucion["token-jugador-dos"].activa, false);
  });

  it("un poder se agota después de dos usos", async () => {
    const { uno, codigo } = await salaIniciada();
    for (let i = 0; i < 2; i++) {
      const ventana = esperarEvento(uno, "poder-efecto");
      uno.emit("activar-poder", { poderId: "byakugan" });
      await ventana;
      const efecto = esperarEvento(uno, "poder-efecto", 5000);
      await efecto;
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
    assert.match(segundo.codigo, /^\d{6}$/);

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

  it("incluye temaReverso oficial en la config y el estado inicial", async () => {
    const uno = await cliente("token-tema-uno");
    const dos = await cliente("token-tema-dos");

    const creada = await emitir(uno, "crear-sala", {
      nombre: "Uno",
      config: { mezclarAldeas: false, aldea: "niebla", pares: 8 },
    });
    assert.equal(creada.exito, true);
    assert.equal(creada.sala.config.temaReverso, "assets/cartas niveles/carta niebla.png");

    const inicio = esperarEvento(uno, "partida-iniciada");
    await emitir(dos, "unirse-sala", { codigo: creada.codigo, nombre: "Dos" });
    const estado = await inicio;
    assert.equal(estado.config.temaReverso, "assets/cartas niveles/carta niebla.png");
  });

  it("rechaza voltear-carta fuera de turno con accion-rechazada y motivo", async () => {
    const { dos } = await salaIniciada();
    const rechazado = esperarEvento(dos, "accion-rechazada");
    dos.emit("voltear-carta", { index: 0 });
    const datos = await rechazado;
    assert.equal(datos.motivo, "sin_turno");
    assert.equal(typeof datos.mensaje, "string");
  });

  it("permite reincorporarse a una partida terminada y devuelve el resultado", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const terminada = esperarEvento(uno, "partida-terminada", 4000);
    await ganarTodosLosPares(uno, 8);
    const final = await terminada;
    assert.equal(final.motivo, "completada");

    const reincorporado = await emitir(dos, "reincorporarse-sala", { codigo });
    assert.equal(reincorporado.exito, true);
    assert.equal(reincorporado.estado.estado, "terminada");
    assert.equal(reincorporado.estado.ganadorId, "token-jugador-uno");
    assert.equal(reincorporado.estado.motivo, "completada");
    assert.equal(reincorporado.estado.codigo, codigo);
  });

  it("termina 2v2 por vida y declara ganador al equipo rival", async () => {
    const { uno, codigo } = await sala2v2Iniciada();
    const sala = gestor.salas.get(codigo);
    sala.vida["token-2v2-uno"] = 5;
    gestor.salas.set(codigo, sala);

    const terminada = esperarEvento(uno, "partida-terminada", 2000);
    uno.emit("voltear-carta", { index: 0 });
    uno.emit("voltear-carta", { index: 2 });
    const datos = await terminada;

    assert.equal(datos.motivo, "vida");
    assert.equal(datos.ganadorEquipo, "B");
    assert.equal(datos.perdedorEquipo, "A");
    assert.equal(gestor.salas.get(codigo).estado, "terminada");
  });



  it("eventos de estado incluyen version y hash", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    const versionInicial = sala.version;

    // carta-volteada
    const cv = esperarEvento(uno, "carta-volteada");
    uno.emit("voltear-carta", { index: 0 });
    const datosCv = await cv;
    assert.equal(typeof datosCv.version, "number");
    assert.ok(datosCv.version >= versionInicial);
    assert.equal(typeof datosCv.hash, "string");

    // acierto
    const acierto = esperarEvento(uno, "acierto");
    uno.emit("voltear-carta", { index: 1 });
    const datosAcierto = await acierto;
    assert.equal(typeof datosAcierto.version, "number");
    assert.equal(typeof datosAcierto.hash, "string");

    // fallo + turno-cambiado
    const fallo = esperarEvento(uno, "fallo");
    const turno = esperarEvento(uno, "turno-cambiado");
    uno.emit("voltear-carta", { index: 2 });
    uno.emit("voltear-carta", { index: 4 });
    const datosFallo = await fallo;
    const datosTurno = await turno;
    assert.equal(typeof datosFallo.version, "number");
    assert.equal(typeof datosFallo.hash, "string");
    assert.equal(typeof datosTurno.version, "number");
    assert.equal(typeof datosTurno.hash, "string");

    // poder-efecto (fresh game, no flips needed - chakra sufficient)
    // skip poder-efecto version check here; covered by existing power tests

    // tiempo-actualizado (wait for tick)
    const tiempo = esperarEvento(uno, "tiempo-actualizado");
    const datosTiempo = await tiempo;
    assert.equal(typeof datosTiempo.version, "number");
    assert.equal(typeof datosTiempo.hash, "string");

    // rejoin returns version and hash
    const reincorporado = await emitir(uno, "reincorporarse-sala", { codigo });
    assert.equal(reincorporado.exito, true);
    assert.equal(typeof reincorporado.estado.version, "number");
    assert.equal(typeof reincorporado.estado.hash, "string");
  });

  it("rejoin a partida terminada devuelve version y hash", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const terminada = esperarEvento(uno, "partida-terminada", 4000);
    await ganarTodosLosPares(uno, 8);
    const final = await terminada;
    assert.equal(typeof final.version, "number");
    assert.equal(typeof final.hash, "string");

    const reincorporado = await emitir(dos, "reincorporarse-sala", { codigo });
    assert.equal(reincorporado.exito, true);
    assert.equal(reincorporado.estado.estado, "terminada");
    assert.equal(typeof reincorporado.estado.version, "number");
    assert.equal(typeof reincorporado.estado.hash, "string");
    assert.ok(reincorporado.estado.version >= final.version);
  });


  it("rejoin con tiempo parcialmente consumido no reinicia a 20s", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    // Simular 5 segundos restantes
    sala.turnoTerminaEn = Date.now() + 5000;
    sala.tiempos[sala.turno] = 5;
    gestor.salas.set(codigo, sala);

    const reincorporado = await emitir(dos, "reincorporarse-sala", { codigo });
    assert.equal(reincorporado.exito, true);
    assert.equal(reincorporado.estado.turnoTerminaEn > 0, true);
    assert.equal(reincorporado.estado.tiempos["token-jugador-uno"], 5);
    assert.notEqual(reincorporado.estado.tiempos["token-jugador-uno"], 20);
  });


  it("Genjutsu mezcla no filtra valores ocultos a ningun cliente", async () => {
    const { uno, dos } = await salaIniciada();
    const ventanaUno = esperarEvento(uno, "poder-efecto");
    const ventanaDos = esperarEvento(dos, "poder-efecto");
    uno.emit("activar-poder", { poderId: "genjutsu" });
    const vUno = await ventanaUno;
    const vDos = await ventanaDos;
    assert.equal(vUno.tipo, "ventana-contrarresto");
    assert.equal(vDos.tipo, "ventana-contrarresto");

    const mezclaUno = esperarEvento(uno, "poder-efecto", 5000);
    const mezclaDos = esperarEvento(dos, "poder-efecto", 5000);
    const datosUno = await mezclaUno;
    const datosDos = await mezclaDos;
    assert.equal(datosUno.tipo, "mezcla");
    assert.equal(datosDos.tipo, "mezcla");
    for (const carta of datosUno.cartas) {
      assert.equal(typeof carta.index, "number");
      assert.equal(carta.valor, undefined);
      assert.equal(carta.aldea, undefined);
      assert.equal(carta.parId, undefined);
    }
    for (const carta of datosDos.cartas) {
      assert.equal(typeof carta.index, "number");
      assert.equal(carta.valor, undefined);
      assert.equal(carta.aldea, undefined);
      assert.equal(carta.parId, undefined);
    }
  });

  it("rejoin durante Genjutsu no revela valores ocultos", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const efecto = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "genjutsu" });
    await efecto;

    const reincorporado = await emitir(dos, "reincorporarse-sala", { codigo });
    assert.equal(reincorporado.exito, true);
    // vistaEstadoPara no debe incluir original ni valores ocultos
    assert.equal(reincorporado.estado.genjutsu?.original, undefined);
    // mazoPublico ya oculta valores de cartas no emparejadas
    for (const carta of reincorporado.estado.mazo) {
      if (!carta.emparejada) {
        assert.equal(carta.valor, undefined);
        assert.equal(carta.aldea, undefined);
      }
    }
  });


  it("estado-poderes no filtra Byakugan del otro jugador", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    // Uno activa byakugan
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "byakugan" });
    await ventana;
    const efecto = esperarEvento(uno, "poder-efecto", 5000);
    await efecto;

    // Trigger emitirEstadoPoderes via acierto
    const espDos = esperarEvento(dos, "estado-poderes", 5000);
    uno.emit("voltear-carta", { index: 0 });
    uno.emit("voltear-carta", { index: 1 });
    const esp = await espDos;

    // dos should not see uno's byakugan data
    assert.equal(esp.byakugan?.["token-jugador-uno"], undefined);
  });


  it("rechaza voltear-carta con indice invalido con motivo", async () => {
    const { uno } = await salaIniciada();
    const rechazado = esperarEvento(uno, "accion-rechazada");
    uno.emit("voltear-carta", { index: 999 });
    const datos = await rechazado;
    assert.equal(datos.motivo, "indice_invalido");
    assert.equal(typeof datos.mensaje, "string");
  });

  it("rechaza voltear-carta ya emparejada con motivo", async () => {
    const { uno, codigo } = await salaIniciada();
    // Emparejar la primera pareja
    const acierto = esperarEvento(uno, "acierto");
    uno.emit("voltear-carta", { index: 0 });
    uno.emit("voltear-carta", { index: 1 });
    await acierto;
    // Intentar voltear una carta ya emparejada
    const rechazado = esperarEvento(uno, "accion-rechazada");
    uno.emit("voltear-carta", { index: 0 });
    const datos = await rechazado;
    assert.equal(datos.motivo, "ya_emparejada");
  });

  it("rechaza voltear-carta sellada con motivo", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    sala.efectos.sello = { index: 3, hasta: Date.now() + 5000 };
    gestor.salas.set(codigo, sala);
    const rechazado = esperarEvento(uno, "accion-rechazada");
    uno.emit("voltear-carta", { index: 3 });
    const datos = await rechazado;
    assert.equal(datos.motivo, "carta_sellada");
  });


  it("carta-volteada propaga nonce del cliente", async () => {
    const { uno } = await salaIniciada();
    const cv = esperarEvento(uno, "carta-volteada");
    uno.emit("voltear-carta", { index: 0, nonce: "test-nonce-123" });
    const datos = await cv;
    assert.equal(datos.nonce, "test-nonce-123");
  });

  it("accion-rechazada propaga nonce del cliente", async () => {
    const { dos } = await salaIniciada();
    const rechazado = esperarEvento(dos, "accion-rechazada");
    dos.emit("voltear-carta", { index: 0, nonce: "test-nonce-456" });
    const datos = await rechazado;
    assert.equal(datos.nonce, "test-nonce-456");
    assert.equal(datos.motivo, "sin_turno");
  });


  it("emite estado-completo periodicamente a ambos clientes", async () => {
    const { uno, dos } = await salaIniciada();
    const snap = esperarEvento(uno, "estado-completo", 7000);
    // Wait for snapshot interval (default 5000ms, but tests use default)
    // Use a shorter wait by checking the event arrives
    const datos = await snap;
    assert.equal(datos.estado, "jugando");
    assert.equal(typeof datos.version, "number");
    assert.equal(typeof datos.hash, "string");
  });


  it("infra: crearAccion crea accion con estado anunciada", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    const accion = gestor.crearAccion(sala, "genjutsu", "token-jugador-uno", "token-jugador-dos", { indices: [0,1,2] });
    assert.ok(accion);
    assert.equal(accion.estado, "anunciada");
    assert.equal(typeof accion.idAccion, "string");
    assert.equal(sala.accionPendiente.idAccion, accion.idAccion);
    assert.deepEqual(accion.contraataquesPermitidos, ["byakugan"]);
  });

  it("infra: abrirVentana cambia estado a ventana con venceEn", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    const accion = gestor.crearAccion(sala, "genjutsu", "token-jugador-uno", "token-jugador-dos", {});
    assert.equal(gestor.abrirVentana(sala, accion), true);
    assert.equal(sala.accionPendiente.estado, "ventana");
    assert.ok(sala.accionPendiente.venceEn > Date.now());
  });

  it("infra: rechaza doble accion si ya hay anunciada o ventana", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    const accion1 = gestor.crearAccion(sala, "genjutsu", "token-jugador-uno", "token-jugador-dos", {});
    assert.ok(accion1);
    // crear segunda mientras la primera esta en "anunciada"
    const accion2 = gestor.crearAccion(sala, "bomba", "token-jugador-uno", "token-jugador-dos", {});
    assert.equal(accion2, null);
    // abrir ventana y intentar otra
    gestor.abrirVentana(sala, accion1);
    const accion3 = gestor.crearAccion(sala, "bomba", "token-jugador-uno", "token-jugador-dos", {});
    assert.equal(accion3, null);
  });

  it("infra: puedeReaccionar acepta reaccion valida", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    const accion = gestor.crearAccion(sala, "genjutsu", "token-jugador-uno", "token-jugador-dos", {});
    gestor.abrirVentana(sala, accion);
    const ventana = gestor.puedeReaccionar(sala, "token-jugador-dos", "byakugan");
    assert.ok(ventana);
    assert.equal(ventana.idAccion, accion.idAccion);
  });

  it("infra: puedeReaccionar ignora reaccion tardia", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    const accion = gestor.crearAccion(sala, "genjutsu", "token-jugador-uno", "token-jugador-dos", {});
    gestor.abrirVentana(sala, accion);
    accion.venceEn = Date.now() - 1;
    const ventana = gestor.puedeReaccionar(sala, "token-jugador-dos", "byakugan");
    assert.equal(ventana, null);
  });

  it("infra: resolverAccion es idempotente", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    const accion = gestor.crearAccion(sala, "genjutsu", "token-jugador-uno", "token-jugador-dos", {});
    gestor.abrirVentana(sala, accion);
    const r1 = gestor.resolverAccion(sala, accion.idAccion, true);
    assert.ok(r1);
    assert.equal(r1.estado, "contrarrestada");
    assert.equal(sala.accionPendiente, null);
    const r2 = gestor.resolverAccion(sala, accion.idAccion, true);
    assert.equal(r2, null);
  });

  it("infra: resolverAccion por expiracion", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    const accion = gestor.crearAccion(sala, "genjutsu", "token-jugador-uno", "token-jugador-dos", {});
    gestor.abrirVentana(sala, accion);
    const r = gestor.resolverAccion(sala, accion.idAccion, false);
    assert.ok(r);
    assert.equal(r.estado, "resuelta");
  });

  it("infra: rejoin incluye accionPendiente sanitizada", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    const accion = gestor.crearAccion(sala, "genjutsu", "token-jugador-uno", "token-jugador-dos", { indices: [0,1,2] });
    gestor.abrirVentana(sala, accion);
    gestor.salas.set(codigo, sala);

    const reincorporado = await emitir(dos, "reincorporarse-sala", { codigo });
    assert.equal(reincorporado.exito, true);
    assert.ok(reincorporado.estado.accionPendiente);
    assert.equal(reincorporado.estado.accionPendiente.idAccion, accion.idAccion);
    assert.equal(reincorporado.estado.accionPendiente.estado, "ventana");
    // Sanitizado: sin payload, sin timer
    assert.equal(reincorporado.estado.accionPendiente.payload, undefined);
    assert.equal(reincorporado.estado.accionPendiente.timer, undefined);
  });

  it("infra: limpiarTimersReaccion cancela timer y limpia accion", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    const accion = gestor.crearAccion(sala, "genjutsu", "token-jugador-uno", "token-jugador-dos", {});
    gestor.abrirVentana(sala, accion);
    // Timer is set by the caller (power handler), not by abrirVentana
    accion.timer = setTimeout(() => {}, 1000);
    assert.ok(sala.accionPendiente.timer);
    gestor.limpiarTimersReaccion(sala);
    assert.equal(sala.accionPendiente, null);
  });


  it("Genjutsu: rival contrarresta con Byakugan durante la ventana", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    // Uno activa genjutsu
    const ventanaUno = esperarEvento(uno, "poder-efecto");
    const ventanaDos = esperarEvento(dos, "poder-efecto");
    uno.emit("activar-poder", { poderId: "genjutsu" });
    const vUno = await ventanaUno;
    const vDos = await ventanaDos;
    assert.equal(vUno.tipo, "ventana-contrarresto");
    assert.equal(vDos.tipo, "ventana-contrarresto");
    assert.equal(vUno.idAccion, vDos.idAccion);

    // Dos activa byakugan durante la ventana (3s)
    const contrarresto = esperarEvento(uno, "poder-efecto");
    dos.emit("activar-poder", { poderId: "byakugan" });
    const cUno = await contrarresto;
    assert.equal(cUno.tipo, "contrarresto");
    assert.equal(cUno.idAccion, vUno.idAccion);

    // Verificar que NO se emite mezcla después
    let mezclaEmitida = false;
    const mezclaPromise = esperarEvento(uno, "poder-efecto", 4000).then(() => { mezclaEmitida = true; }).catch(() => {});
    await pausa(3500);
    assert.equal(mezclaEmitida, false, "No debe emitirse mezcla después del contrarresto");

    // Verificar estado final
    const sala = gestor.salas.get(codigo);
    assert.equal(sala.efectos.genjutsu, null, "Genjutsu debe estar cancelado");
    assert.equal(sala.accionPendiente, null, "Accion debe estar resuelta");
  });

  it("Genjutsu: sin respuesta, mezcla se aplica después de 3s", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "genjutsu" });
    const v = await ventana;
    assert.equal(v.tipo, "ventana-contrarresto");

    // Esperar la mezcla (3s + margen)
    const mezcla = esperarEvento(uno, "poder-efecto", 5000);
    const datos = await mezcla;
    assert.equal(datos.tipo, "mezcla");
    assert.equal(datos.idAccion, v.idAccion);

    const sala = gestor.salas.get(codigo);
    assert.ok(sala.efectos.genjutsu, "Genjutsu debe estar activo");
    assert.equal(sala.accionPendiente, null, "Accion debe estar resuelta");
  });

  it("Genjutsu: chakra y usos consumidos exactamente una vez", async () => {
    const { uno, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    const chakraAntes = sala.chakra["token-jugador-uno"];
    const usosAntes = sala.poderes["token-jugador-uno"].genjutsu;

    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "genjutsu" });
    await ventana;

    // Esperar resolución
    await esperarEvento(uno, "poder-efecto", 5000);

    const salaDespues = gestor.salas.get(codigo);
    assert.equal(salaDespues.poderes["token-jugador-uno"].genjutsu, usosAntes - 1);
    assert.equal(salaDespues.chakra["token-jugador-uno"], chakraAntes - 35);
  });

  it("Genjutsu: respuesta tardía activa un Byakugan normal fuera de turno", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "genjutsu" });
    await ventana;

    await pausa(3500);

    const nuevaVentana = esperarEfecto(dos, "ventana-contrarresto");
    dos.emit("activar-poder", { poderId: "byakugan" });
    const datos = await nuevaVentana;
    assert.equal(datos.poderId, "byakugan");
    assert.equal(datos.jugadorId, "token-jugador-dos");
    assert.equal(gestor.salas.get(codigo).accionPendiente.poderId, "byakugan");
  });


  it("Bomba: Sello contrarresta y no reduce vida", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    // Dos tiene sello disponible (por defecto 2 usos)
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    const v = await ventana;
    assert.equal(v.tipo, "ventana-contrarresto");

    // Dos activa sello como contraataque
    const contrarresto = esperarEvento(uno, "poder-efecto");
    dos.emit("activar-poder", { poderId: "sello", modo: "contraataque" });
    const cUno = await contrarresto;
    assert.equal(cUno.tipo, "contrarresto");

    // Verificar que NO se emite danio después
    let danioEmitido = false;
    esperarEvento(uno, "poder-efecto", 4000).then(() => { danioEmitido = true; }).catch(() => {});
    await pausa(3500);
    assert.equal(danioEmitido, false, "No debe emitirse danio después del contrarresto");

    const sala = gestor.salas.get(codigo);
    assert.equal(sala.vida["token-jugador-dos"], 100, "Vida no debe reducirse");
    assert.equal(sala.accionPendiente, null, "Accion debe estar resuelta");
  });

  it("Bomba: Sello contrarresta no consume Sustitucion", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    sala.defensas.sustitucion["token-jugador-dos"] = { activa: true };
    gestor.salas.set(codigo, sala);

    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    const v = await ventana;
    assert.equal(v.tipo, "ventana-contrarresto");

    const contrarresto = esperarEvento(uno, "poder-efecto");
    dos.emit("activar-poder", { poderId: "sello", modo: "contraataque" });
    await contrarresto;

    const salaDespues = gestor.salas.get(codigo);
    assert.equal(salaDespues.defensas.sustitucion["token-jugador-dos"].activa, true, "Sustitucion no debe consumirse");
    assert.equal(salaDespues.vida["token-jugador-dos"], 100, "Vida no debe reducirse");
  });

  it("Bomba: respuesta tardía activa un Sello normal fuera de turno", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    await ventana;

    await pausa(3500);

    const nuevaVentana = esperarEfecto(dos, "ventana-contrarresto");
    dos.emit("activar-poder", { poderId: "sello", modo: "contraataque" });
    const datos = await nuevaVentana;
    assert.equal(datos.poderId, "sello");
    assert.equal(datos.jugadorId, "token-jugador-dos");
    assert.equal(gestor.salas.get(codigo).accionPendiente.poderId, "sello");
  });


  it("Bomba: sin respuesta aplica danio al expirar", async () => {
    const { uno, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    const v = await ventana;
    assert.equal(v.tipo, "ventana-contrarresto");

    // Esperar que la ventana expire y se aplique danio
    const danio = esperarEvento(uno, "poder-efecto", 5000);
    const datos = await danio;
    assert.equal(datos.tipo, "danio");
    assert.equal(datos.danio, 20);
    assert.equal(gestor.salas.get(codigo).vida["token-jugador-dos"], 80);
  });

  it("Bomba: doble respuesta convierte la segunda en Sello normal", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    const v = await ventana;
    assert.equal(v.tipo, "ventana-contrarresto");

    const contrarresto = esperarEfecto(uno, "contrarresto");
    dos.emit("activar-poder", { poderId: "sello", modo: "contraataque" });
    const c = await contrarresto;
    assert.equal(c.tipo, "contrarresto");

    const nuevaVentana = esperarEfecto(dos, "ventana-contrarresto");
    dos.emit("activar-poder", { poderId: "sello", modo: "contraataque" });
    const r = await nuevaVentana;
    assert.equal(r.poderId, "sello");
    assert.equal(gestor.salas.get(codigo).accionPendiente.poderId, "sello");
  });

  function dejarCartasDisponibles(sala, cantidad) {
    sala.mazo.forEach((carta, index) => { carta.emparejada = index >= cantidad; });
    gestor.salas.set(sala.codigo, sala);
  }

  it("Sello contrarresta Byakugan y no revela cartas", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "byakugan" });
    assert.equal((await ventana).tipo, "ventana-contrarresto");

    const contrarresto = esperarEvento(uno, "poder-efecto");
    dos.emit("activar-poder", { poderId: "sello", modo: "contraataque" });
    const datos = await contrarresto;
    assert.equal(datos.tipo, "contrarresto");
    assert.equal(datos.contrapoderId, "sello");
    assert.equal(gestor.salas.get(codigo).accionPendiente, null);
  });

  it("Sello contrarresta Bomba aunque no queden cartas disponibles", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    dejarCartasDisponibles(gestor.salas.get(codigo), 0);
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    await ventana;

    const contrarresto = esperarEvento(uno, "poder-efecto");
    dos.emit("activar-poder", { poderId: "sello", modo: "contraataque" });
    assert.equal((await contrarresto).tipo, "contrarresto");
    assert.equal(gestor.salas.get(codigo).vida["token-jugador-dos"], 100);
  });

  it("Sello normal se rechaza sin cartas disponibles", async () => {
    const { uno, codigo } = await salaIniciada();
    dejarCartasDisponibles(gestor.salas.get(codigo), 0);
    const rechazo = esperarEvento(uno, "poder-rechazado");
    uno.emit("activar-poder", { poderId: "sello" });
    assert.equal((await rechazo).motivo, "sin_cartas");
  });

  it("Segundo Sello sobre la misma ventana activa un Sello normal", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "byakugan" });
    await ventana;

    const contrarresto = esperarEfecto(uno, "contrarresto");
    dos.emit("activar-poder", { poderId: "sello", modo: "contraataque" });
    await contrarresto;

    const nuevaVentana = esperarEfecto(dos, "ventana-contrarresto");
    dos.emit("activar-poder", { poderId: "sello", modo: "contraataque" });
    const r = await nuevaVentana;
    assert.equal(r.poderId, "sello");
    assert.equal(gestor.salas.get(codigo).accionPendiente.poderId, "sello");
  });

  it("Bomba con Sustitución activada durante la ventana hace 10 y la consume", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    await ventana;

    const sala = gestor.salas.get(codigo);
    sala.defensas.sustitucion["token-jugador-dos"] = { activa: true };
    gestor.salas.set(codigo, sala);

    const danio = esperarEvento(uno, "poder-efecto", 5000);
    const datos = await danio;
    assert.equal(datos.tipo, "danio");
    assert.equal(datos.danio, 10);
    assert.equal(datos.consumidoSustitucion, true);
    assert.equal(gestor.salas.get(codigo).defensas.sustitucion["token-jugador-dos"].activa, false);
  });

  it("Bomba con Sustitución caída antes de resolver hace 20", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const sala = gestor.salas.get(codigo);
    sala.defensas.sustitucion["token-jugador-dos"] = { activa: true };
    gestor.salas.set(codigo, sala);

    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    await ventana;

    const actual = gestor.salas.get(codigo);
    actual.defensas.sustitucion["token-jugador-dos"] = { activa: false };
    gestor.salas.set(codigo, actual);

    const datos = await esperarEvento(uno, "poder-efecto", 5000);
    assert.equal(datos.tipo, "danio");
    assert.equal(datos.danio, 20);
    assert.equal(datos.consumidoSustitucion, false);
  });

  it("Byakugan contrarresta Genjutsu aunque quede menos de dos cartas", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    dejarCartasDisponibles(gestor.salas.get(codigo), 3);

    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "genjutsu" });
    await ventana;

    dejarCartasDisponibles(gestor.salas.get(codigo), 1);
    const contrarresto = esperarEvento(uno, "poder-efecto");
    dos.emit("activar-poder", { poderId: "byakugan" });
    const datos = await contrarresto;
    assert.equal(datos.tipo, "contrarresto");
    assert.equal(datos.contrapoderId, "byakugan");
    assert.equal(gestor.salas.get(codigo).accionPendiente, null);
  });

  it("Robo: Sustitución contrarresta y no mueve chakra", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "robo" });
    assert.equal((await ventana).tipo, "ventana-contrarresto");

    const contrarresto = esperarEfecto(uno, "contrarresto");
    dos.emit("activar-poder", { poderId: "sustitucion" });
    const datos = await contrarresto;
    assert.equal(datos.poderId, "robo");
    assert.equal(datos.contrapoderId, "sustitucion");
    assert.equal(gestor.salas.get(codigo).chakra["token-jugador-uno"], 70);
    assert.equal(gestor.salas.get(codigo).chakra["token-jugador-dos"], 100);
  });

  it("Sello: Byakugan contrarresta y no sella cartas", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "sello" });
    assert.equal((await ventana).tipo, "ventana-contrarresto");

    const contrarresto = esperarEfecto(uno, "contrarresto");
    dos.emit("activar-poder", { poderId: "byakugan" });
    const datos = await contrarresto;
    assert.equal(datos.poderId, "sello");
    assert.equal(datos.contrapoderId, "byakugan");
    assert.equal(gestor.salas.get(codigo).efectos.sello, null);
  });

  it("Sustitución: Genjutsu contrarresta y no arma defensa", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "sustitucion" });
    assert.equal((await ventana).tipo, "ventana-contrarresto");

    const contrarresto = esperarEfecto(uno, "contrarresto");
    dos.emit("activar-poder", { poderId: "genjutsu" });
    const datos = await contrarresto;
    assert.equal(datos.poderId, "sustitucion");
    assert.equal(datos.contrapoderId, "genjutsu");
    await pausa(3200);
    assert.notEqual(gestor.salas.get(codigo).defensas.sustitucion["token-jugador-uno"]?.activa, true);
  });

  it("cualquier jugador activa poderes fuera de turno y afecta al rival", async () => {
    const { dos, codigo } = await salaIniciada();
    const ventana = esperarEfecto(dos, "ventana-contrarresto");
    dos.emit("activar-poder", { poderId: "robo" });
    const datosVentana = await ventana;
    assert.equal(datosVentana.poderId, "robo");
    assert.equal(datosVentana.jugadorId, "token-jugador-dos");

    const robo = esperarEfecto(dos, "robo");
    const datos = await robo;
    assert.equal(datos.robado, 20);
    assert.equal(gestor.salas.get(codigo).chakra["token-jugador-uno"], 80);
    assert.equal(gestor.salas.get(codigo).chakra["token-jugador-dos"], 90);
  });

  it("En 2v2 el compañero del objetivo contrarresta Bomba", async () => {
    const { uno, cuatro, codigo } = await sala2v2Iniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    await ventana;

    const contrarresto = esperarEvento(uno, "poder-efecto");
    cuatro.emit("activar-poder", { poderId: "sello", modo: "contraataque" });
    assert.equal((await contrarresto).tipo, "contrarresto");
    assert.equal(gestor.salas.get(codigo).vida["token-2v2-tres"], 100);
    assert.equal(gestor.salas.get(codigo).accionPendiente, null);
  });

  it("Reconexión durante ventana conserva la acción pendiente sanitizada", async () => {
    gestor.tiempoReconexionMs = 5000;
    const { uno, dos, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    const datosVentana = await ventana;

    dos.disconnect();
    await pausa(50);
    const reconectado = await cliente("token-jugador-dos");
    const estado = await emitir(reconectado, "reincorporarse-sala", { codigo }, 5000);

    assert.equal(estado.exito, true);
    assert.equal(estado.estado.accionPendiente.idAccion, datosVentana.idAccion);
    assert.equal(estado.estado.accionPendiente.payload, undefined);
    assert.equal(estado.estado.accionPendiente.timer, undefined);
  });

  it("Abandono durante ventana cancela el daño pendiente", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    await ventana;

    const terminada = esperarEvento(uno, "partida-terminada", 4000);
    dos.emit("abandonar-sala");
    await terminada;
    await pausa(3400);

    assert.equal(gestor.salas.get(codigo).vida["token-jugador-dos"], 100);
    assert.equal(gestor.salas.get(codigo).accionPendiente, null);
  });

  it("Revancha después de una ventana no deja timers colgantes", async () => {
    const { uno, dos, codigo } = await salaIniciada();
    const ventana = esperarEvento(uno, "poder-efecto");
    uno.emit("activar-poder", { poderId: "bomba" });
    await ventana;
    const contrarresto = esperarEvento(uno, "poder-efecto");
    dos.emit("activar-poder", { poderId: "sello", modo: "contraataque" });
    await contrarresto;
    await pausa(1000);

    const terminada = esperarEvento(uno, "partida-terminada", 4000);
    const inicioRevancha = esperarEvento(uno, "partida-iniciada");
    await ganarTodosLosPares(uno, 8);
    await terminada;

    const respuesta = await emitir(uno, "revancha-sala", { config: { pares: 8 } });
    assert.equal(respuesta.exito, true);
    await inicioRevancha;

    const sala = gestor.salas.get(codigo);
    assert.equal(sala.accionPendiente, null);
    assert.equal(sala.poderEnProceso, null);
    assert.equal(sala.timersPoderes.length, 0);
  });

  it("una revancha inmediata no recibe el timer de fallo de la partida anterior", async () => {
    gestor.retardoFalloMs = 300;
    const { uno, dos, codigo } = await salaIniciada();
    const idPartidaAnterior = gestor.salas.get(codigo).idPartida;

    const fallo = esperarEvento(uno, "fallo");
    uno.emit("voltear-carta", { index: 2 });
    uno.emit("voltear-carta", { index: 4 });
    await fallo;

    const terminada = esperarEvento(uno, "partida-terminada");
    dos.emit("abandonar-sala");
    await terminada;

    let turnosTrasRevancha = 0;
    let terminadasTrasRevancha = 0;
    uno.on("turno-cambiado", () => { turnosTrasRevancha += 1; });
    uno.on("partida-terminada", () => { terminadasTrasRevancha += 1; });

    const inicioRevancha = esperarEvento(uno, "partida-iniciada");
    const respuesta = await emitir(uno, "revancha-sala", { config: { pares: 8 } });
    assert.equal(respuesta.exito, true);
    const estadoRevancha = await inicioRevancha;

    await pausa(360);

    assert.notEqual(estadoRevancha.idPartida, idPartidaAnterior);
    assert.equal(gestor.salas.get(codigo).idPartida, estadoRevancha.idPartida);
    assert.equal(turnosTrasRevancha, 0);
    assert.equal(terminadasTrasRevancha, 0);
  });

  it("poderEnProceso se limpia solo tras Sustitución y Robo", async () => {
    const { uno, codigo } = await salaIniciada();

    uno.emit("activar-poder", { poderId: "sustitucion" });
    await esperarEfecto(uno, "defensa");
    assert.equal(gestor.salas.get(codigo).poderEnProceso, null);

    uno.emit("activar-poder", { poderId: "robo" });
    await esperarEfecto(uno, "robo");
    assert.equal(gestor.salas.get(codigo).poderEnProceso, null);
  });

  it("chat de sala difunde mensajes sanitizados a todos los jugadores", async () => {
    const { uno, dos, codigo } = await salaIniciada();

    const mensajeEsperado = esperarEvento(dos, "chat-mensaje");
    const respuesta = await emitir(uno, "chat-mensaje", { texto: "  <b>Hola</b> sala  " });
    assert.equal(respuesta.exito, true);

    const mensaje = await mensajeEsperado;
    assert.equal(mensaje.codigo, codigo);
    assert.equal(mensaje.jugadorId, "token-jugador-uno");
    assert.equal(mensaje.nombre, "Uno");
    assert.equal(mensaje.texto, "bHola/b sala");
  });

  it("chat rechaza mensajes vacíos y limita el ritmo a un mensaje por segundo", async () => {
    const { uno } = await salaIniciada();

    const vacio = await emitir(uno, "chat-mensaje", { texto: "   " });
    assert.equal(vacio.exito, false);

    const primero = await emitir(uno, "chat-mensaje", { texto: "uno" });
    assert.equal(primero.exito, true);

    const segundo = await emitir(uno, "chat-mensaje", { texto: "dos" });
    assert.equal(segundo.exito, false);
    assert.match(segundo.error, /Espera/);
  });

  it("rechaza conexiones con un origen no permitido", async () => {
    const socket = io(url, {
      auth: { token: "token-origen-malicioso" },
      extraHeaders: { Origin: "https://ejemplo-malicioso.invalid" },
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
    });
    clientes.push(socket);

    const error = await new Promise((resolve, reject) => {
      const temporizador = setTimeout(() => reject(new Error("No rechazó el origen")), 2000);
      socket.once("connect_error", (fallo) => {
        clearTimeout(temporizador);
        resolve(fallo);
      });
      socket.once("connect", () => {
        clearTimeout(temporizador);
        reject(new Error("Aceptó un origen no permitido"));
      });
    });

    assert.ok(error);
    assert.equal(socket.connected, false);
    assert.equal(GestorSalas.esOrigenPermitidoSocket({
      origen: "https://ejemplo-malicioso.invalid",
      host: "127.0.0.1:3000",
    }), false);
  });

  it("acepta orígenes LAN con el mismo host y rechaza Origin: null", () => {
    const permitidos = ["https://memoria-ninja-despliegue.vercel.app"];
    assert.equal(GestorSalas.esOrigenPermitidoSocket({ origen: undefined, host: "192.168.1.50:3000", permitidos }), true);
    assert.equal(GestorSalas.esOrigenPermitidoSocket({ origen: "null", host: "192.168.1.50:3000", permitidos }), false);
    assert.equal(GestorSalas.esOrigenPermitidoSocket({ origen: permitidos[0], host: "127.0.0.1:3000", permitidos }), true);
    assert.equal(GestorSalas.esOrigenPermitidoSocket({ origen: "http://192.168.1.50:3000", host: "192.168.1.50:3000", permitidos }), true);
    assert.equal(GestorSalas.esOrigenPermitidoSocket({ origen: "http://[::1]:3000", host: "[::1]:3000", permitidos }), true);
    assert.equal(GestorSalas.esOrigenPermitidoSocket({ origen: "http://192.168.1.51:3000", host: "192.168.1.50:3000", permitidos }), false);
    assert.equal(GestorSalas.esOrigenPermitidoSocket({ origen: "http://192.168.1.50:4000", host: "192.168.1.50:3000", permitidos }), false);
    assert.equal(GestorSalas.esOrigenPermitidoSocket({ origen: "https://192.168.1.50:3000", host: "192.168.1.50:3000", permitidos }), false);
    assert.equal(GestorSalas.esOrigenPermitidoSocket({ origen: "https://ejemplo-malicioso.invalid", host: "192.168.1.50:3000", permitidos }), false);
  });

  it("limita la creación repetida de salas por socket", async () => {
    const uno = await cliente("token-limite-salas");
    for (let intento = 0; intento < 5; intento++) {
      const respuesta = await emitir(uno, "crear-sala", { nombre: "Uno" });
      assert.equal(respuesta.exito, true);
    }

    const excedido = await emitir(uno, "crear-sala", { nombre: "Uno" });
    assert.equal(excedido.exito, false);
    assert.match(excedido.error, /Demasiadas salas/);
  });

  it("permite observar una partida en curso sin revelar cartas ni ocupar asiento", async () => {
    const { codigo } = await salaIniciada();
    const espectador = await cliente("token-espectador-uno");
    const actualizacion = esperarEvento(espectador, "espectadores-actualizados", 2000);

    const respuesta = await emitir(espectador, "unirse-como-espectador", {
      codigo,
      nombre: "Maestro observe",
    });
    const conteo = await actualizacion;

    assert.equal(respuesta.exito, true);
    assert.equal(respuesta.estado.espectador, true);
    assert.equal(respuesta.estado.jugadores.length, 2);
    assert.ok(respuesta.estado.mazo.every((carta) => carta.valor === undefined));
    assert.deepEqual(respuesta.estado.byakugan, {});
    assert.deepEqual(respuesta.estado.byakuganReveladas, []);
    assert.deepEqual(respuesta.estado.sustitucionArmada, {});
    assert.equal(conteo.cantidad, 1);
    assert.equal(gestor.salas.get(codigo).jugadores.length, 2);

    const salida = esperarEvento(espectador, "espectadores-actualizados", 2000);
    espectador.emit("salir-como-espectador");
    assert.equal((await salida).cantidad, 0);
  });

  it("unirse-como-espectador exige la contraseña de una sala privada", async () => {
    const uno = await cliente("token-privado-uno");
    const dos = await cliente("token-privado-dos");
    const creada = await emitir(uno, "crear-sala", {
      nombre: "Uno",
      publica: false,
      contrasena: "clave",
      config: { mezclarAldeas: true, pares: 8 },
    });
    const inicioUno = esperarEvento(uno, "partida-iniciada");
    const inicioDos = esperarEvento(dos, "partida-iniciada");
    const buenaEntrada = await emitir(dos, "unirse-sala", {
      codigo: creada.codigo,
      nombre: "Dos",
      contrasena: "clave",
    });
    assert.equal(buenaEntrada.exito, true);
    await Promise.all([inicioUno, inicioDos]);

    const espectador = await cliente("token-espectador-privado");
    const mala = await emitir(espectador, "unirse-como-espectador", {
      codigo: creada.codigo,
      nombre: "Observe",
      contrasena: "otra",
    });
    assert.equal(mala.exito, false);
    assert.equal(mala.error, "Contraseña incorrecta");

    const buena = await emitir(espectador, "unirse-como-espectador", {
      codigo: creada.codigo,
      nombre: "Observe",
      contrasena: "clave",
    });
    assert.equal(buena.exito, true);
    assert.equal(buena.estado.espectador, true);
  });

  it("limita los intentos de observar una sala privada", async () => {
    const uno = await cliente("token-privado-limite");
    const espectador = await cliente("token-espectador-limite");
    const creada = await emitir(uno, "crear-sala", {
      nombre: "Uno",
      publica: false,
      contrasena: "clave",
      config: { pares: 8 },
    });

    for (let intento = 0; intento < 10; intento++) {
      const respuesta = await emitir(espectador, "unirse-como-espectador", {
        codigo: creada.codigo,
        contrasena: "incorrecta",
      });
      assert.equal(respuesta.exito, false);
      assert.equal(respuesta.error, "Contraseña incorrecta");
    }

    const excedido = await emitir(espectador, "unirse-como-espectador", {
      codigo: creada.codigo,
      contrasena: "clave",
    });
    assert.equal(excedido.exito, false);
    assert.match(excedido.error, /Demasiados intentos/);
  });

  it("persiste el resultado online solo para jugadores con sesión válida", async () => {
    const persistidos = [];
    gestor.resolverUsuarioPorCookie = (token) =>
      Promise.resolve(token === "sesion-valida" ? { id: "usuario-1" } : null);
    gestor.persistirResultado = (datos) => {
      persistidos.push(datos);
      return Promise.resolve();
    };

    const uno = await cliente("token-auth", {
      Cookie: "memoria_ninja_sesion=sesion-valida; tema=oscuro",
    });
    const dos = await cliente("token-invitado", { Cookie: "otra=cosa" });
    await pausa(10);

    const creada = await emitir(uno, "crear-sala", { nombre: "Uno", config: { pares: 8 } });
    const terminada = esperarEvento(uno, "partida-terminada", 2000);
    await emitir(dos, "unirse-sala", { codigo: creada.codigo, nombre: "Dos" });
    dos.emit("abandonar-sala");
    await terminada;
    await esperarCondicion(() => persistidos.length === 1);

    assert.equal(persistidos.length, 1);
    const datos = persistidos[0];
    assert.equal(datos.zona, "online");
    assert.equal(datos.modo, "1v1");
    assert.equal(datos.idPartida, gestor.salas.get(creada.codigo).idPartida);
    assert.equal(datos.ganadorId, "token-auth");
    assert.deepEqual(datos.jugadores.map((j) => j.idUsuario), ["usuario-1", null]);
  });

  it("espera a resolver la sesión antes de persistir el resultado online", async () => {
    const persistidos = [];
    let resolverSesion;
    gestor.resolverUsuarioPorCookie = () => new Promise((resolve) => {
      resolverSesion = () => resolve({ id: "usuario-lento" });
    });
    gestor.persistirResultado = (datos) => {
      persistidos.push(datos);
      return Promise.resolve();
    };

    const uno = await cliente("token-auth-lento", {
      Cookie: "memoria_ninja_sesion=sesion-lenta",
    });
    const dos = await cliente("token-invitado-lento");
    const creada = await emitir(uno, "crear-sala", { nombre: "Uno", config: { pares: 8 } });
    const terminada = esperarEvento(uno, "partida-terminada", 2000);
    await emitir(dos, "unirse-sala", { codigo: creada.codigo, nombre: "Dos" });
    dos.emit("abandonar-sala");
    await terminada;
    await pausa(10);

    assert.equal(persistidos.length, 0);
    assert.equal(typeof resolverSesion, "function");
    resolverSesion();
    await esperarCondicion(() => persistidos.length === 1);

    assert.equal(persistidos.length, 1);
    assert.equal(persistidos[0].jugadores[0].idUsuario, "usuario-lento");
  });

  it("una revancha antes de resolver la sesión no cambia el resultado persistido", async () => {
    const persistidos = [];
    let resolverSesion;
    gestor.resolverUsuarioPorCookie = () => new Promise((resolve) => {
      resolverSesion = () => resolve({ id: "usuario-carrera" });
    });
    gestor.persistirResultado = (datos) => {
      persistidos.push(datos);
      return Promise.resolve();
    };

    const uno = await cliente("token-carrera", {
      Cookie: "memoria_ninja_sesion=carrera",
    });
    const dos = await cliente("token-carrera-invitado");
    const creada = await emitir(uno, "crear-sala", { nombre: "Uno", config: { pares: 8 } });
    const terminada = esperarEvento(uno, "partida-terminada", 2000);
    await emitir(dos, "unirse-sala", { codigo: creada.codigo, nombre: "Dos" });
    const idPartidaAnterior = gestor.salas.get(creada.codigo).idPartida;
    dos.emit("abandonar-sala");
    await terminada;

    const inicioRevancha = esperarEvento(uno, "partida-iniciada");
    const revancha = await emitir(uno, "revancha-sala", { config: { pares: 4 } });
    await inicioRevancha;
    assert.equal(revancha.exito, true);

    resolverSesion();
    await esperarCondicion(() => persistidos.length === 1);

    assert.equal(persistidos.length, 1);
    assert.equal(persistidos[0].idPartida, idPartidaAnterior);
    assert.notEqual(gestor.salas.get(creada.codigo).idPartida, idPartidaAnterior);
  });

  it("limpia el idUsuario cuando la cookie deja de ser válida", async () => {
    const socket = await cliente("token-cookie-cambiante", {
      Cookie: "memoria_ninja_sesion=valida",
    });
    const socketServidor = () => gestor.io.sockets.sockets.get(socket.id);
    gestor.resolverUsuarioPorCookie = (token) =>
      Promise.resolve(token === "valida" ? { id: "usuario-valido" } : null);
    gestor.vincularUsuarioAutenticado(socketServidor());
    await esperarCondicion(() => socketServidor()?.data.idUsuario === "usuario-valido");
    assert.equal(socketServidor().data.idUsuario, "usuario-valido");

    socketServidor().handshake.headers.cookie = "memoria_ninja_sesion=invalida";
    gestor.vincularUsuarioAutenticado(socketServidor());
    await esperarCondicion(() => socketServidor()?.data.idUsuario === null);
    assert.equal(socketServidor().data.idUsuario, null);
  });

  it("el fallo del persistidor no rompe el evento de fin de partida", async () => {
    gestor.resolverUsuarioPorCookie = () => Promise.resolve({ id: "usuario-1" });
    gestor.persistirResultado = () => {
      throw new Error("BD caída");
    };

    const { uno, dos } = await salaIniciada();
    const terminada = esperarEvento(uno, "partida-terminada", 2000);
    dos.emit("abandonar-sala");
    const datos = await terminada;

    assert.equal(datos.motivo, "abandono");
  });
});
