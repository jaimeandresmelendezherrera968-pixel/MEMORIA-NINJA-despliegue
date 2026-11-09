/**
 * CONTROLADOR: VerificacionController
 *
 * Solo traduce HTTP <-> VerificacionService (enviar/confirmar código).
 */
class VerificacionController {
  constructor(verificacionService) {
    this.verificacionService = verificacionService;
  }

  enviar = async (req, res) => {
    try {
      const { correo } = req.body;
      const resultado = await this.verificacionService.enviar({ correo });
      res.json({ exito: true, aviso: resultado.aviso });
    } catch (error) {
      res.status(error.codigo === "NO_CUENTA" ? 404 : 400).json({
        exito: false,
        error: error.message,
      });
    }
  };

  confirmar = async (req, res) => {
    try {
      const { correo, codigo } = req.body;
      const resultado = await this.verificacionService.confirmar({ correo, codigo });
      res.json({ exito: true, aviso: resultado.aviso });
    } catch (error) {
      res.status(error.codigo === "NO_CUENTA" ? 404 : 400).json({
        exito: false,
        error: error.message,
      });
    }
  };
}

module.exports = VerificacionController;