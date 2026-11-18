class NotificadorAmistades {
  #io = null;
  #amistadRepository = null;
  #conectados = new Map();

  usar(io, amistadRepository = null) {
    this.#io = io;
    if (amistadRepository) this.#amistadRepository = amistadRepository;
  }

  async #esperarIdentidades() {
    if (!this.#io) return;
    const promesas = [];
    for (const socket of this.#io.sockets?.sockets?.values?.() || []) {
      if (socket.data?.usuarioResuelto) {
        promesas.push(socket.data.usuarioResuelto.catch(() => {}));
      }
    }
    await Promise.all(promesas);
  }

  registrarConexion(usuarioId, socket) {
    if (!usuarioId || !socket) return;
    let entrada = this.#conectados.get(usuarioId);
    if (!entrada) {
      entrada = new Set();
      this.#conectados.set(usuarioId, entrada);
    }
    entrada.add(socket.id);
    socket.join("amigos:activos");
  }

  registrarDesconexion(usuarioId, socketId) {
    if (!usuarioId) return;
    const entrada = this.#conectados.get(usuarioId);
    if (!entrada) return;
    entrada.delete(socketId);
    if (entrada.size > 0) return;
    this.#conectados.delete(usuarioId);
    this.notificarPresencia(usuarioId, "offline");
  }

  estadoPresencia(usuarioId) {
    return this.#conectados.has(usuarioId) ? "online" : "offline";
  }

  async presenciaDeAmigos(ids = []) {
    const respuesta = {};
    for (const id of ids) respuesta[id] = this.estadoPresencia(id);
    return respuesta;
  }

  async notificarPresencia(usuarioId, estado = this.estadoPresencia(usuarioId)) {
    if (!this.#io || !this.#amistadRepository) return;
    await this.#esperarIdentidades();
    const amigos = await this.#amistadRepository.listarAmigos(usuarioId);
    const payload = { idUsuario: usuarioId, estado };
    for (const amigo of amigos) {
      this.#io.to("usuario:" + amigo.id).emit("amigos:presencia", payload);
    }
  }

  async notificarSnapshotPresencia(socket, usuarioId) {
    if (!socket || !this.#io || !this.#amistadRepository) return;
    const amigos = await this.#amistadRepository.listarAmigos(usuarioId);
    socket.emit(
      "amigos:presencia-snapshot",
      await this.presenciaDeAmigos(amigos.map((amigo) => amigo.id))
    );
  }

  async notificarSolicitud(idReceptor, payload) {
    if (!this.#io) return;
    await this.#esperarIdentidades();
    this.#io.to("usuario:" + idReceptor).emit("amigos:solicitud-recibida", payload);
  }

  async notificarRespuesta(idEmisor, payload) {
    if (!this.#io) return;
    await this.#esperarIdentidades();
    this.#io.to("usuario:" + idEmisor).emit("amigos:solicitud-respondida", payload);
  }

  async notificarCambio(ids = []) {
    if (!this.#io) return;
    await this.#esperarIdentidades();
    for (const id of new Set(ids.filter(Boolean))) {
      this.#io.to("usuario:" + id).emit("amigos:cambios");
    }
  }

  async notificarSolicitudCancelada(idReceptor, payload) {
    if (!this.#io) return;
    await this.#esperarIdentidades();
    this.#io.to("usuario:" + idReceptor).emit("amigos:solicitud-cancelada", payload);
  }

  async notificarPerfil(perfil) {
    if (!this.#io) return;
    await this.#esperarIdentidades();
    this.#io.to("usuario:" + perfil.id).emit("amigos:perfil-actualizado", perfil);
    if (!this.#amistadRepository) return;
    try {
      const amigos = await this.#amistadRepository.listarAmigos(perfil.id);
      for (const amigo of amigos) {
        this.#io.to("usuario:" + amigo.id).emit("amigos:perfil-actualizado", perfil);
      }
    } catch (error) {}
  }

  async notificarAmistadEliminada(usuarioId, idAmigo, payload) {
    if (!this.#io) return;
    await this.#esperarIdentidades();
    this.#io
      .to("usuario:" + usuarioId)
      .to("usuario:" + idAmigo)
      .emit("amigos:amistad-eliminada", payload);
  }
}

module.exports = NotificadorAmistades;
