/**
 * ABSTRACCIÓN: UsuarioRepository
 *
 * >>> ISP + DIP <<<
 * Define SOLO los métodos que UsuarioService necesita para trabajar con
 * usuarios. Cualquier implementación concreta (hoy: SQL; mañana: Mongo,
 * API remota, etc.) que cumpla este contrato puede inyectarse en el
 * Service sin que este cambie una línea.
 */
class UsuarioRepository {
  buscarPorUsuario(usuario) {
    throw new Error("buscarPorUsuario() no implementado");
  }

  buscarPorCorreo(correo) {
    throw new Error("buscarPorCorreo() no implementado");
  }

  buscarPorId(id) {
    throw new Error("buscarPorId() no implementado");
  }

  buscarPorCodigoAmigo(codigo) {
    throw new Error("buscarPorCodigoAmigo() no implementado");
  }

  buscarPorNombreOCodigo(termino) {
    throw new Error("buscarPorNombreOCodigo() no implementado");
  }

  actualizarNombre(id, nombre) {
    throw new Error("actualizarNombre() no implementado");
  }

  obtenerTodos() {
    throw new Error("obtenerTodos() no implementado");
  }

  guardar(usuario) {
    throw new Error("guardar() no implementado");
  }

  actualizarPerfil(id, perfil) {
    throw new Error("actualizarPerfil() no implementado");
  }

  // ------ Seguridad de cuenta (módulo de autenticación real) ------
  markCorreoVerificado(id) {
    throw new Error("marcarCorreoVerificado() no implementado");
  }

  sumarIntentoFallido(id) {
    throw new Error("sumarIntentoFallido() no implementado");
  }

  marcarBloqueado(id, hasta) {
    throw new Error("marcarBloqueado() no implementado");
  }

  limpiarIntentosFallidos(id) {
    throw new Error("limpiarIntentosFallidos() no implementado");
  }

  actualizarPassword(id, nuevoHash) {
    throw new Error("actualizarPassword() no implementado");
  }

  actualizarCorreoCon(ejecutor, id, correo) {
    throw new Error("actualizarCorreoCon() no implementado");
  }
}

module.exports = UsuarioRepository;