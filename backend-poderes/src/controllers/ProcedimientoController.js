/**
 * CONTROLADOR: ProcedimientoController
 *
 * >>> SRP <<< Solo traduce HTTP <-> ProcedimientoService.
 */
class ProcedimientoController {
  constructor(procedimientoService) {
    this.procedimientoService = procedimientoService;
  }

  registrarResultado = async (req, res) => {
    try {
      const { idUsuario, zona, puntaje, modo, ganador } = req.body;
      await this.procedimientoService.registrarResultado({
        idUsuario,
        zona,
        puntaje,
        modo,
        ganador,
      });
      res.status(201).json({ exito: true, mensaje: "Resultado registrado por procedimiento almacenado" });
    } catch (error) {
      res.status(400).json({ exito: false, error: error.message });
    }
  };
}

module.exports = ProcedimientoController;
