/**
 * ABSTRACCIÓN: CodigoVerificacionRepository
 *
 * Contrato de persistencia de los códigos de verificación de 1 solo uso.
 * Implementación actual: PostgreSQL (tabla codigos_verificacion, ENUM
 * tipo_codigo y función fn_confirmar_codigo ACID).
 */
class CodigoVerificacionRepository {
  guardar(datos) {
    throw new Error("guardar() no implementado");
  }

  buscarActivo(datos) {
    throw new Error("buscarActivo() no implementado");
  }

  aumentarIntento(id) {
    throw new Error("aumentarIntento() no implementado");
  }

  confirmarCon(ejecutor, datos) {
    throw new Error("confirmarCon() no implementado");
  }
}

module.exports = CodigoVerificacionRepository;