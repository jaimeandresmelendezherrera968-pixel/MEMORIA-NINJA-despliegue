/**
 * ABSTRACCIÓN: SesionRepository
 *
 * Contrato de persistencia de sesiones. La sesión da al frontend la
 * cookie httpOnly; en la base solo se guarda el HASH del token.
 */
class SesionRepository {
  crear(datos) {
    throw new Error("crear() no implementado");
  }

  buscarPorTokenHash(tokenHash) {
    throw new Error("buscarPorTokenHash() no implementado");
  }

  revocar(tokenHash) {
    throw new Error("revocar() no implementado");
  }

  revocarTodasPorUsuario(usuarioId) {
    throw new Error("revocarTodasPorUsuario() no implementado");
  }
}

module.exports = SesionRepository;