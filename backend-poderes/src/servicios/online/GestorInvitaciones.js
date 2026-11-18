const crypto = require("crypto");

class GestorInvitaciones {
  constructor(io, amistadRepository, opciones = {}) {
    this.io = io;
    this.amistadRepository = amistadRepository;
    this.notificador = opciones.notificador || null;
    this.validarSala = opciones.validarSala || null;
    this.tiempoExpiracionMs = opciones.tiempoExpiracionMs || 60000;
    this.invitaciones = new Map();
  }

  registrar(socket) {
    socket.on("amigos:invitar-partida", (datos = {}, callback = () => {}) => {
      this.invitar(socket, datos).then(
        (resultado) => callback(resultado),
        (error) => callback({ exito: false, error: error?.message || "No se pudo enviar la invitación" })
      );
    });
    socket.on("amigos:responder-invitacion", (datos = {}, callback = () => {}) => {
      this.responder(socket, datos).then(
        (resultado) => callback(resultado),
        (error) => callback({ exito: false, error: error?.message || "No se pudo responder la invitación" })
      );
    });
    socket.on("amigos:cancelar-invitacion", (datos = {}, callback = () => {}) => {
      this.cancelar(socket, datos).then(
        (resultado) => callback(resultado),
        (error) => callback({ exito: false, error: error?.message || "No se pudo cancelar la invitación" })
      );
    });
  }

  async #usuarioDe(socket) {
    if (socket.data?.usuarioResuelto) await socket.data.usuarioResuelto;
    return socket.data?.idUsuario || null;
  }

  #publica(invitacion) {
    return {
      id: invitacion.id,
      emisorId: invitacion.emisorId,
      emisor: invitacion.emisor,
      codigoSala: invitacion.codigoSala,
      config: invitacion.config || null,
      creadoEn: invitacion.creadoEn,
    };
  }

  async invitar(socket, datos = {}) {
    const emisorId = await this.#usuarioDe(socket);
    const idAmigo = String(datos.idAmigo || "");
    const codigoSala = String(datos.codigoSala || "").trim();
    if (!emisorId || !idAmigo || !codigoSala) {
      return { exito: false, error: "Faltan datos de la invitación" };
    }
    if (emisorId === idAmigo) {
      return { exito: false, error: "No puedes invitarte a ti mismo" };
    }
    if (typeof this.validarSala === "function" && !this.validarSala(codigoSala)) {
      return { exito: false, error: "La sala ya no existe" };
    }
    if (!await this.amistadRepository.existeAmistad(emisorId, idAmigo)) {
      return { exito: false, error: "Solo puedes invitar a tus amigos" };
    }
    if (await this.amistadRepository.estaBloqueado(emisorId, idAmigo)) {
      return { exito: false, error: "No puedes invitar a ese usuario" };
    }

    const emisor = socket.data?.usuario || { id: emisorId };
    const invitacion = {
      id: crypto.randomUUID(),
      emisorId,
      receptorId: idAmigo,
      emisor: emisor ? { id: emisor.id, usuario: emisor.usuario, codigoAmigo: emisor.codigoAmigo } : { id: emisorId },
      codigoSala,
      config: datos.config || null,
      socketId: socket.id,
      creadoEn: new Date(),
    };
    this.invitaciones.set(invitacion.id, invitacion);
    const temporizador = setTimeout(() => {
      if (this.invitaciones.delete(invitacion.id)) {
        this.io.to("usuario:" + invitacion.emisorId).emit("amigos:invitacion-expirada", { id: invitacion.id });
      }
    }, this.tiempoExpiracionMs);
    if (typeof temporizador.unref === "function") temporizador.unref();
    invitacion.temporizador = temporizador;

    this.io.to("usuario:" + idAmigo).emit("amigos:invitacion-recibida", this.#publica(invitacion));
    return { exito: true, invitacion: this.#publica(invitacion) };
  }

  async responder(socket, datos = {}) {
    const usuarioId = await this.#usuarioDe(socket);
    const id = String(datos.id || "");
    const invitacion = this.invitaciones.get(id);
    if (!usuarioId || !invitacion) {
      return { exito: false, error: "La invitación ya no está disponible" };
    }
    if (invitacion.receptorId !== usuarioId) {
      return { exito: false, error: "No puedes responder esa invitación" };
    }
    clearTimeout(invitacion.temporizador);
    this.invitaciones.delete(id);
    const aceptar = datos.aceptar === true;
    if (aceptar && typeof this.validarSala === "function" && !this.validarSala(invitacion.codigoSala)) {
      this.io.to("usuario:" + invitacion.emisorId).emit("amigos:invitacion-expirada", { id });
      return { exito: false, error: "La sala ya no existe" };
    }
    const evento = aceptar ? "amigos:invitacion-aceptada" : "amigos:invitacion-rechazada";
    this.io.to("usuario:" + invitacion.emisorId).emit(evento, {
      id,
      usuarioId,
      codigoSala: invitacion.codigoSala,
    });
    await this.notificador?.notificarCambio?.([invitacion.emisorId, usuarioId]);
    return { exito: true, aceptar, codigoSala: invitacion.codigoSala };
  }

  async cancelar(socket, datos = {}) {
    const usuarioId = await this.#usuarioDe(socket);
    const id = String(datos.id || "");
    const invitacion = this.invitaciones.get(id);
    if (!usuarioId || !invitacion || invitacion.emisorId !== usuarioId) {
      return { exito: false, error: "No puedes cancelar esa invitación" };
    }
    clearTimeout(invitacion.temporizador);
    this.invitaciones.delete(id);
    this.io.to("usuario:" + invitacion.receptorId).emit("amigos:invitacion-cancelada", { id });
    return { exito: true };
  }

  cancelarPorSocket(socketId) {
    for (const invitacion of [...this.invitaciones.values()]) {
      if (invitacion.socketId !== socketId) continue;
      clearTimeout(invitacion.temporizador);
      this.invitaciones.delete(invitacion.id);
      this.io.to("usuario:" + invitacion.receptorId).emit("amigos:invitacion-cancelada", { id: invitacion.id });
    }
  }
}

module.exports = GestorInvitaciones;
