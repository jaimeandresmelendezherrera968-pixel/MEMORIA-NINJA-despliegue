/**
 * ABSTRACCIÓN: CodigoGenerador
 *
 * Contrato para crear códigos de verificación. Permite inyectar
 * generadores deterministas en los tests (DIP).
 */
class CodigoGenerador {
  generar() {
    throw new Error("generar() no implementado");
  }
}

module.exports = CodigoGenerador;