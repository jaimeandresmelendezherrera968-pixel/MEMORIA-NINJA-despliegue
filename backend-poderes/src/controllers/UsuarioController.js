/**
 * CONTROLADOR: UsuarioController
 *
 * >>> SRP <<<
 * Solo traduce HTTP <-> Service: lee el body, llama al Service y arma
 * la respuesta con el status que corresponde. No tiene ninguna regla de
 * negocio (validaciones, hash, unicidad) — eso vive en UsuarioService.
 */
class UsuarioController {
  constructor(usuarioService) {
    this.usuarioService = usuarioService;
  }

  registrar = async (req, res) => {
    try {
      const { usuario, correo, nacimiento, password } = req.body;
      const creado = await this.usuarioService.registrar({ usuario, correo, nacimiento, password });
      res.status(201).json({ exito: true, usuario: creado });
    } catch (error) {
      res.status(400).json({ exito: false, error: error.message });
    }
  };

  iniciarSesion = async (req, res) => {
    try {
      const { usuario, password } = req.body;
      const sesion = await this.usuarioService.iniciarSesion({ usuario, password });
      res.json({ exito: true, usuario: sesion });
    } catch (error) {
      res.status(401).json({ exito: false, error: error.message });
    }
  };

  registrarResultado = async (req, res) => {
    try {
      const { idUsuario } = req.params;
      const { idPartida, zona, puntaje, modo, ganador } = req.body;
      await this.usuarioService.guardarResultadoPartida({
        idUsuario,
        idPartida,
        zona,
        puntaje,
        modo,
        ganador,
      });
      res.status(201).json({ exito: true, mensaje: "Resultado guardado" });
    } catch (error) {
      res.status(400).json({ exito: false, error: error.message });
    }
  };

  obtenerHistorial = async (req, res) => {
    try {
      const { idUsuario } = req.params;
      const historial = await this.usuarioService.obtenerHistorial(idUsuario);
      res.json({ exito: true, historial });
    } catch (error) {
      res.status(400).json({ exito: false, error: error.message });
    }
  };

  // SUB-PARTE 3.5: el guard de la ruta ya validó que la cookie de sesión
  // corresponde a :idUsuario; acá solo se traduce HTTP <-> Service.
  importarProgreso = async (req, res) => {
    try {
      const { idUsuario } = req.params;
      const { historial, perfil } = req.body;
      const resultado = await this.usuarioService.importarProgresoInvitado({
        idUsuario,
        historial,
        perfil,
      });
      res.status(201).json({ exito: true, ...resultado });
    } catch (error) {
      res.status(400).json({ exito: false, error: error.message });
    }
  };

  obtenerPerfil = async (req, res) => {
    try {
      const { idUsuario } = req.params;
      const perfil = await this.usuarioService.obtenerPerfil(idUsuario);
      if (!perfil) {
        return res
          .status(404)
          .json({ exito: false, error: `El usuario ${idUsuario} no existe` });
      }
      res.json({ exito: true, perfil });
    } catch (error) {
      res.status(400).json({ exito: false, error: error.message });
    }
  };

  actualizarPerfil = async (req, res) => {
    try {
      const { idUsuario } = req.params;
      const { victoria, puntaje } = req.body;
      const perfil = await this.usuarioService.registrarFinPartidaPerfil({
        idUsuario,
        victoria,
        puntaje,
      });
      res.json({ exito: true, perfil });
    } catch (error) {
      res.status(400).json({ exito: false, error: error.message });
    }
  };

  obtenerTodos = async (req, res) => {
    try {
      res.json({ exito: true, usuarios: await this.usuarioService.obtenerTodos() });
    } catch (error) {
      res.status(500).json({ exito: false, error: error.message });
    }
  };

  buscarPorCorreo = async (req, res) => {
    try {
      const { correo } = req.params;
      const usuario = await this.usuarioService.buscarPorCorreo(correo);
      res.json({ exito: true, usuario });
    } catch (error) {
      res.status(400).json({ exito: false, error: error.message });
    }
  };
}

module.exports = UsuarioController;