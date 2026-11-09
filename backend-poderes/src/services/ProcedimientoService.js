/**
 * SERVICIO: ProcedimientoService
 *
 * >>> SRP <<<
 * Valida los datos y delega la ejecución del procedimiento almacenado al
 * repositorio. No conoce HTTP (Controller) ni el motor de BD (Repository).
 */
class ProcedimientoService {
  constructor(procedimientoRepository) {
    this.procedimientoRepository = procedimientoRepository;
  }

  async registrarResultado({ idUsuario, zona, puntaje, modo, ganador }) {
    if (!idUsuario) {
      throw new Error("Se requiere el identificador del usuario");
    }
    if (puntaje === undefined || puntaje === null || Number.isNaN(Number(puntaje))) {
      throw new Error("El puntaje debe ser un número");
    }

    return this.procedimientoRepository.registrarResultado({
      idUsuario,
      zona,
      puntaje: Number(puntaje),
      modo,
      ganador,
    });
  }
}

module.exports = ProcedimientoService;
