/**
 * CONTROLADOR: RecuperacionController
 *
 * Solo traduce HTTP <-> RecuperacionService (solicitar/restablecer).
 */
class RecuperacionController {
  constructor(recuperacionService) {
    this.recuperacionService = recuperacionService;
  }

  solicitar = async (req, res) => {
    try {
      const { correo } = req.body;
      const resultado = await this.recuperacionService.solicitar({ correo });
      res.json({ exito: true, aviso: resultado.aviso });
    } catch (error) {
      res.status(error.codigo === "NO_CUENTA" ? 404 : 400).json({
        exito: false,
        error: error.message,
      });
    }
  };

  verificar = async (req, res) => {
    try {
      const { correo, codigo } = req.body;
      const resultado = await this.recuperacionService.verificar({ correo, codigo });
      res.json({ exito: true, aviso: resultado.aviso });
    } catch (error) {
      res.status(error.codigo === "NO_CUENTA" ? 404 : 400).json({
        exito: false,
        error: error.message,
      });
    }
  };

  restablecer = async (req, res) => {
    try {
      const { correo, codigo, nuevaPassword } = req.body;
      const resultado = await this.recuperacionService.restablecer({ correo, codigo, nuevaPassword });
      res.json({ exito: true, aviso: resultado.aviso });
    } catch (error) {
      res.status(error.codigo === "NO_CUENTA" ? 404 : 400).json({
        exito: false,
        error: error.message,
      });
    }
  };
}

module.exports = RecuperacionController;