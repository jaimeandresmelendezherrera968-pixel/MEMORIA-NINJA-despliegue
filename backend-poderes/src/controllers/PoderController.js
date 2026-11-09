/**
 * CONTROLADOR: PoderController
 *
 * >>> SRP <<<
 * Solo sabe leer el request, llamar al Service y devolver una response.
 * NO tiene ninguna regla de negocio acá (nada de chakra, contraataques,
 * etc.) — eso vive en PoderService.
 */
class PoderController {
  constructor(poderService) {
    this.poderService = poderService;
  }

  activarPoder = async (req, res) => {
    try {
      const { idPartida, idJugador, idPoder } = req.body;
      const resultado = await this.poderService.activarPoder({ idPartida, idJugador, idPoder });
      res.json(resultado);
    } catch (error) {
      res.status(400).json({ exito: false, error: error.message });
    }
  };
}

module.exports = PoderController;
