/**
 * SERVICIO: VistaService
 *
 * >>> SRP <<<
 * Expone las consultas de las VISTAS de la BD al resto de la aplicación.
 * No conoce HTTP (eso es del Controller) ni el motor SQL concreto: solo
 * llama al repositorio que lee las vistas.
 */
class VistaService {
  constructor(vistaRepository) {
    this.vistaRepository = vistaRepository;
  }

  partidasRecientes() {
    return this.vistaRepository.partidasRecientes();
  }

  historialDetallado() {
    return this.vistaRepository.historialDetallado();
  }

  rankingMejorPuntaje() {
    return this.vistaRepository.rankingMejorPuntaje();
  }

  usuariosResumen() {
    return this.vistaRepository.usuariosResumen();
  }
}

module.exports = VistaService;
