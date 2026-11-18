const ESTADOS_HTTP = {
  VALIDACION: 400,
  NO_AUTORIZADO: 403,
  NO_ENCONTRADO: 404,
  CONFLICTO: 409,
  YA_AMIGOS: 409,
  SOLICITUD_PENDIENTE: 409,
  SOLICITUD_YA_RESPONDIDA: 409,
  USUARIO_BLOQUEADO: 409,
};

class AmistadController {
  constructor(amistadService) {
    this.amistadService = amistadService;
  }

  #fallar(res, error) {
    const codigo = error?.codigo || "ERROR";
    const estado = ESTADOS_HTTP[codigo] || 500;
    return res.status(estado).json({
      exito: false,
      error: error?.message || "No se pudo completar la operación",
      codigo,
    });
  }

  resumen = async (req, res) => {
    try {
      const resumen = await this.amistadService.resumen(req.usuario.id);
      res.json({ exito: true, ...resumen });
    } catch (error) {
      this.#fallar(res, error);
    }
  };

  buscar = async (req, res) => {
    try {
      const usuarios = await this.amistadService.buscar(req.query.q, req.usuario.id);
      res.json({ exito: true, resultados: usuarios, usuarios });
    } catch (error) {
      this.#fallar(res, error);
    }
  };

  enviarSolicitud = async (req, res) => {
    try {
      const resultado = await this.amistadService.enviarSolicitud({
        emisorId: req.usuario.id,
        termino: req.body?.termino,
      });
      res.status(201).json({ exito: true, ...resultado });
    } catch (error) {
      this.#fallar(res, error);
    }
  };

  aceptar = async (req, res) => {
    try {
      const resultado = await this.amistadService.aceptar({
        usuarioId: req.usuario.id,
        solicitudId: req.params.id,
      });
      res.json({ exito: true, ...resultado });
    } catch (error) {
      this.#fallar(res, error);
    }
  };

  rechazar = async (req, res) => {
    try {
      const resultado = await this.amistadService.rechazar({
        usuarioId: req.usuario.id,
        solicitudId: req.params.id,
      });
      res.json({ exito: true, ...resultado });
    } catch (error) {
      this.#fallar(res, error);
    }
  };

  eliminarAmistad = async (req, res) => {
    try {
      const resultado = await this.amistadService.eliminarAmistad({
        usuarioId: req.usuario.id,
        idAmigo: req.params.idAmigo,
      });
      res.json({ exito: true, ...resultado });
    } catch (error) {
      this.#fallar(res, error);
    }
  };

  cancelarSolicitud = async (req, res) => {
    try {
      const resultado = await this.amistadService.cancelarSolicitud({
        usuarioId: req.usuario.id,
        solicitudId: req.params.id,
      });
      res.json({ exito: true, ...resultado });
    } catch (error) {
      this.#fallar(res, error);
    }
  };

  bloquear = async (req, res) => {
    try {
      const resultado = await this.amistadService.bloquear({
        usuarioId: req.usuario.id,
        idUsuario: req.params.idUsuario,
      });
      res.json({ exito: true, ...resultado });
    } catch (error) {
      this.#fallar(res, error);
    }
  };

  desbloquear = async (req, res) => {
    try {
      const resultado = await this.amistadService.desbloquear({
        usuarioId: req.usuario.id,
        idUsuario: req.params.idUsuario,
      });
      res.json({ exito: true, ...resultado });
    } catch (error) {
      this.#fallar(res, error);
    }
  };
}

module.exports = AmistadController;
