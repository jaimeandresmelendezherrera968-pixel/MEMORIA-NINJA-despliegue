const crypto = require("crypto");
const { errorConCodigo } = require("../utils/errores");

class AmistadService {
  constructor(amistadRepository, usuarioRepository, database = null, notificador = null) {
    this.amistadRepository = amistadRepository;
    this.usuarioRepository = usuarioRepository;
    this.database = database;
    this.notificador = notificador;
  }

  async perfil(idUsuario) {
    const usuario = await this.usuarioRepository.buscarPorId(idUsuario);
    if (!usuario) return null;
    return {
      id: usuario.id,
      usuario: usuario.usuario,
      codigoAmigo: usuario.codigoAmigo,
    };
  }

  async buscar(termino, idUsuario = null) {
    const limpio = String(termino ?? "").trim();
    if (!limpio) return [];
    let usuarios;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(limpio) && typeof this.usuarioRepository.buscarPorId === "function") {
      const usuario = await this.usuarioRepository.buscarPorId(limpio);
      usuarios = usuario ? [usuario] : [];
    } else {
      usuarios = await this.usuarioRepository.buscarPorNombreOCodigo(limpio);
    }
    if (idUsuario) usuarios = await this.#filtrarBloqueados(usuarios, idUsuario);
    return usuarios.map((usuario) => this.#aPerfil(usuario));
  }

  #aPerfil(usuario) {
    if (!usuario) return null;
    return {
      id: usuario.id,
      usuario: usuario.usuario,
      codigoAmigo: usuario.codigoAmigo,
    };
  }

  async #filtrarBloqueados(usuarios, idUsuario) {
    const permitidos = await Promise.all(
      usuarios.map(async (usuario) => {
        if (usuario.id === idUsuario) return true;
        return !(await this.amistadRepository.estaBloqueado(idUsuario, usuario.id));
      })
    );
    return usuarios.filter((_, indice) => permitidos[indice]);
  }

  async #resolverDestinatario(termino, emisorId = null) {
    const limpio = String(termino ?? "").trim();
    let usuario = null;
    if (/^NJ-[0-9A-F]{8}$/i.test(limpio) && typeof this.usuarioRepository.buscarPorCodigoAmigo === "function") {
      usuario = await this.usuarioRepository.buscarPorCodigoAmigo(limpio.toUpperCase());
    } else if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(limpio) && typeof this.usuarioRepository.buscarPorId === "function") {
      usuario = await this.usuarioRepository.buscarPorId(limpio);
    } else if (typeof this.usuarioRepository.buscarPorUsuario === "function") {
      usuario = await this.usuarioRepository.buscarPorUsuario(limpio);
      if (!usuario) {
        const [resultado] = await this.usuarioRepository.buscarPorNombreOCodigo(limpio);
        usuario = resultado || null;
      }
    }
    if (!usuario) {
      const [resultado] = await this.buscar(limpio, emisorId);
      return resultado || null;
    }
    if (emisorId && await this.amistadRepository.estaBloqueado(emisorId, usuario.id)) return null;
    return this.#aPerfil(usuario);
  }

  async resumen(idUsuario) {
    const [perfil, amigos, solicitudesRecibidas, solicitudesEnviadas, bloqueados] = await Promise.all([
      this.perfil(idUsuario),
      this.amistadRepository.listarAmigos(idUsuario),
      this.amistadRepository.listarSolicitudesRecibidas(idUsuario),
      this.amistadRepository.listarSolicitudesEnviadas(idUsuario),
      this.amistadRepository.listarBloqueados(idUsuario),
    ]);
    const ids = amigos.map((amigo) => amigo.id);
    const presencia = this.notificador?.presenciaDeAmigos
      ? await this.notificador.presenciaDeAmigos(ids)
      : {};
    return { perfil, amigos, solicitudesRecibidas, solicitudesEnviadas, bloqueados, presencia };
  }

  async enviarSolicitud({ emisorId, termino }) {
    const limpio = String(termino ?? "").trim();
    if (!emisorId || !limpio) {
      throw errorConCodigo("El destinatario es obligatorio", "VALIDACION");
    }

    const emisor = await this.perfil(emisorId);
    if (!emisor) {
      throw errorConCodigo("El usuario emisor no existe", "NO_ENCONTRADO");
    }

    const receptor = await this.#resolverDestinatario(limpio, emisorId);
    if (!receptor) {
      throw errorConCodigo("No encontramos ese usuario o código", "NO_ENCONTRADO");
    }
    if (receptor.id === emisorId) {
      throw errorConCodigo("No puedes enviarte una solicitud a ti mismo", "VALIDACION");
    }

    if (await this.amistadRepository.existeAmistad(emisorId, receptor.id)) {
      throw errorConCodigo("Ya son amigos", "YA_AMIGOS");
    }
    if (await this.amistadRepository.buscarSolicitudPendiente(emisorId, receptor.id)) {
      throw errorConCodigo("Ya hay una solicitud pendiente", "SOLICITUD_PENDIENTE");
    }

    const creadoEn = new Date();
    const solicitud = {
      id: crypto.randomUUID(),
      emisorId,
      receptorId: receptor.id,
      creadoEn,
    };
    const aplicar = (db) => this.amistadRepository.crearSolicitud(solicitud, db);

    let guardada;
    try {
      guardada = this.database
        ? await this.database.transaccion(aplicar)
        : await aplicar(null);
    } catch (error) {
      if (error?.code === "23505") {
        throw errorConCodigo("Ya hay una solicitud pendiente", "SOLICITUD_PENDIENTE");
      }
      throw error;
    }

    await this.notificador?.notificarSolicitud?.(receptor.id, {
      id: guardada.id,
      emisor,
      creadoEn: guardada.creadoEn,
    });

    return { solicitud: guardada, receptor };
  }

  async responder({ usuarioId, solicitudId, estado }) {
    if (!usuarioId || !solicitudId) {
      throw errorConCodigo("La solicitud es obligatoria", "VALIDACION");
    }

    const solicitud = await this.amistadRepository.buscarSolicitudPorId(solicitudId);
    if (!solicitud) {
      throw errorConCodigo("La solicitud no existe", "NO_ENCONTRADO");
    }
    if (solicitud.estado !== "PENDIENTE") {
      throw errorConCodigo("La solicitud ya fue respondida", "SOLICITUD_YA_RESPONDIDA");
    }
    if (solicitud.receptorId !== usuarioId) {
      throw errorConCodigo("No puedes responder una solicitud ajena", "NO_AUTORIZADO");
    }

    const por = await this.perfil(usuarioId);
    const aplicar = async (db) => {
      const respondida = await this.amistadRepository.actualizarEstadoSolicitud(
        solicitudId,
        estado,
        db
      );
      if (!respondida) {
        throw errorConCodigo("La solicitud ya fue respondida", "SOLICITUD_YA_RESPONDIDA");
      }
      const [usuarioA, usuarioB] = [solicitud.emisorId, solicitud.receptorId].sort();
      const amistad = estado === "ACEPTADA"
        ? await this.amistadRepository.crearAmistad(usuarioA, usuarioB, db)
        : null;
      return { respondida, amistad };
    };

    const resultado = this.database
      ? await this.database.transaccion(aplicar)
      : await aplicar(null);

    await this.notificador?.notificarRespuesta?.(solicitud.emisorId, {
      solicitudId,
      estado,
      por,
    });

    return { solicitud: resultado.respondida, amistad: resultado.amistad };
  }

  async aceptar({ usuarioId, solicitudId }) {
    return this.responder({ usuarioId, solicitudId, estado: "ACEPTADA" });
  }

  async rechazar({ usuarioId, solicitudId }) {
    return this.responder({ usuarioId, solicitudId, estado: "RECHAZADA" });
  }

  async eliminarAmistad({ usuarioId, idAmigo }) {
    if (!usuarioId || !idAmigo) {
      throw errorConCodigo("La amistad es obligatoria", "VALIDACION");
    }

    const amistad = await this.amistadRepository.existeAmistad(usuarioId, idAmigo);
    if (!amistad) {
      throw errorConCodigo("La amistad no existe", "NO_ENCONTRADO");
    }

    const eliminada = await this.amistadRepository.eliminarAmistad(amistad.id, usuarioId);
    if (!eliminada) {
      throw errorConCodigo("No puedes eliminar una amistad ajena", "NO_AUTORIZADO");
    }
    await this.notificador?.notificarAmistadEliminada?.(usuarioId, idAmigo, {
      usuarioId,
      idAmigo,
    });
    return { eliminada: true };
  }

  async cancelarSolicitud({ usuarioId, solicitudId }) {
    if (!usuarioId || !solicitudId) {
      throw errorConCodigo("La solicitud es obligatoria", "VALIDACION");
    }
    const solicitud = await this.amistadRepository.buscarSolicitudPorId(solicitudId);
    if (!solicitud) {
      throw errorConCodigo("La solicitud no existe", "NO_ENCONTRADO");
    }
    if (solicitud.estado !== "PENDIENTE") {
      throw errorConCodigo("La solicitud ya fue respondida", "SOLICITUD_YA_RESPONDIDA");
    }
    if (solicitud.emisorId !== usuarioId) {
      throw errorConCodigo("No puedes cancelar una solicitud ajena", "NO_AUTORIZADO");
    }
    const cancelada = await this.amistadRepository.cancelarSolicitud(solicitudId, usuarioId);
    if (!cancelada) {
      throw errorConCodigo("La solicitud ya fue respondida", "SOLICITUD_YA_RESPONDIDA");
    }
    await this.notificador?.notificarSolicitudCancelada?.(solicitud.receptorId, {
      solicitudId,
      emisorId: usuarioId,
    });
    await this.notificador?.notificarCambio?.([usuarioId, solicitud.receptorId]);
    return { cancelada: true };
  }

  async bloquear({ usuarioId, idUsuario }) {
    if (!usuarioId || !idUsuario) {
      throw errorConCodigo("El usuario es obligatorio", "VALIDACION");
    }
    if (usuarioId === idUsuario) {
      throw errorConCodigo("No puedes bloquearte a ti mismo", "VALIDACION");
    }
    const objetivo = await this.perfil(idUsuario);
    if (!objetivo) {
      throw errorConCodigo("El usuario no existe", "NO_ENCONTRADO");
    }

    const aplicar = async (db) => {
      await this.amistadRepository.bloquear(usuarioId, idUsuario, db);
      const solicitudes = await this.amistadRepository.eliminarSolicitudesPendientes(
        usuarioId,
        idUsuario,
        db
      );
      const amistad = await this.amistadRepository.existeAmistad(usuarioId, idUsuario);
      if (amistad) await this.amistadRepository.eliminarAmistad(amistad.id, usuarioId, db);
      return { solicitudes, eliminoAmistad: Boolean(amistad) };
    };

    const resultado = this.database
      ? await this.database.transaccion(aplicar)
      : await aplicar(null);
    await this.notificador?.notificarCambio?.([usuarioId, idUsuario]);
    return { bloqueado: true, ...resultado };
  }

  async desbloquear({ usuarioId, idUsuario }) {
    if (!usuarioId || !idUsuario) {
      throw errorConCodigo("El usuario es obligatorio", "VALIDACION");
    }
    const desbloqueado = await this.amistadRepository.desbloquear(usuarioId, idUsuario);
    if (desbloqueado) await this.notificador?.notificarCambio?.([usuarioId]);
    return { desbloqueado };
  }
}

module.exports = AmistadService;
