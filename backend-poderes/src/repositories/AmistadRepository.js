class AmistadRepository {
  listarAmigos(idUsuario) {
    throw new Error("listarAmigos() no implementado");
  }

  listarSolicitudesRecibidas(idUsuario) {
    throw new Error("listarSolicitudesRecibidas() no implementado");
  }

  listarSolicitudesEnviadas(idUsuario) {
    throw new Error("listarSolicitudesEnviadas() no implementado");
  }

  buscarSolicitudPorId(id) {
    throw new Error("buscarSolicitudPorId() no implementado");
  }

  buscarSolicitudPendiente(emisorId, receptorId) {
    throw new Error("buscarSolicitudPendiente() no implementado");
  }

  crearSolicitud(solicitud, ejecutor = null) {
    throw new Error("crearSolicitud() no implementado");
  }

  actualizarEstadoSolicitud(id, estado, ejecutor = null) {
    throw new Error("actualizarEstadoSolicitud() no implementado");
  }

  cancelarSolicitud(id, emisorId, ejecutor = null) {
    throw new Error("cancelarSolicitud() no implementado");
  }

  eliminarSolicitudesPendientes(usuarioA, usuarioB, ejecutor = null) {
    throw new Error("eliminarSolicitudesPendientes() no implementado");
  }

  crearAmistad(usuarioA, usuarioB, ejecutor = null) {
    throw new Error("crearAmistad() no implementado");
  }

  existeAmistad(usuarioA, usuarioB) {
    throw new Error("existeAmistad() no implementado");
  }

  eliminarAmistad(idAmistad, idUsuario, ejecutor = null) {
    throw new Error("eliminarAmistad() no implementado");
  }

  estaBloqueado(usuarioA, usuarioB) {
    throw new Error("estaBloqueado() no implementado");
  }

  bloquear(usuarioId, bloqueadoId, ejecutor = null) {
    throw new Error("bloquear() no implementado");
  }

  desbloquear(usuarioId, bloqueadoId, ejecutor = null) {
    throw new Error("desbloquear() no implementado");
  }

  listarBloqueados(usuarioId) {
    throw new Error("listarBloqueados() no implementado");
  }
}

module.exports = AmistadRepository;
