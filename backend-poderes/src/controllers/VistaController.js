/**
 * CONTROLADOR: VistaController
 *
 * >>> SRP <<<
 * Solo traduce HTTP <-> VistaService: responde con el contenido de cada
 * vista de la BD. Sin lógica de negocio.
 */
class VistaController {
  constructor(vistaService) {
    this.vistaService = vistaService;
  }

  partidasRecientes = async (req, res) => {
    try {
      res.json({ exito: true, partidas: await this.vistaService.partidasRecientes() });
    } catch (error) {
      res.status(500).json({ exito: false, error: error.message });
    }
  };

  historialDetallado = async (req, res) => {
    try {
      res.json({ exito: true, historial: await this.vistaService.historialDetallado() });
    } catch (error) {
      res.status(500).json({ exito: false, error: error.message });
    }
  };

  rankingMejorPuntaje = async (req, res) => {
    try {
      res.json({ exito: true, ranking: await this.vistaService.rankingMejorPuntaje() });
    } catch (error) {
      res.status(500).json({ exito: false, error: error.message });
    }
  };

  usuariosResumen = async (req, res) => {
    try {
      res.json({ exito: true, usuarios: await this.vistaService.usuariosResumen() });
    } catch (error) {
      res.status(500).json({ exito: false, error: error.message });
    }
  };
}

module.exports = VistaController;
