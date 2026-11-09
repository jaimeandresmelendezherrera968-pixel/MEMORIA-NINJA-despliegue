/**
 * CONTROLADOR: PartidaController
 *
 * >>> SRP <<<
 * Solo traduce HTTP <-> Service: lee el body, llama a PartidaService y
 * responde JSON. No hay reglas de negocio acá (esas viven en el service).
 */
class PartidaController {
  constructor(partidaService) {
    this.partidaService = partidaService;
  }

  crearPartida = async (req, res) => {
    try {
      const partida = await this.partidaService.crearPartida(req.body || {});
      res.status(201).json({ exito: true, ...partida });
    } catch (error) {
      res.status(400).json({ exito: false, error: error.message });
    }
  };
}

module.exports = PartidaController;