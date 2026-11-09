/**
 * ENTIDAD: Usuario (backend)
 *
 * >>> ENCAPSULAMIENTO <<<
 * Igual que en el frontend (core/entities/Usuario.js), los campos son
 * privados (#). El passwordHash NUNCA sale por toJSON()/publico():
 * solo el repositorio lo lee (getter passwordHash) para persistir, y
 * la verificación real la hace PasswordHasher desde el Service.
 */
class Usuario {
  #id;
  #usuario;
  #correo;
  #nacimiento;
  #passwordHash;
  #xp;
  #victorias;
  #derrotas;
  #racha;
  #puntajeMax;
  #correoVerificado;
  #intentosFallidos;
  #bloqueadoHasta;

  constructor({
    id,
    usuario,
    correo,
    nacimiento,
    passwordHash,
    xp,
    victorias,
    derrotas,
    racha,
    puntajeMax,
    correoVerificado,
    intentosFallidos,
    bloqueadoHasta,
  }) {
    this.#id = id;
    this.#usuario = usuario;
    this.#correo = correo;
    this.#nacimiento = nacimiento ?? null;
    this.#passwordHash = passwordHash;
    // Toda cuenta nueva (o migrada desde una base sin perfil) nace con
    // 500 XP y el resto de las estadísticas en 0.
    this.#xp = xp ?? 500;
    this.#victorias = victorias ?? 0;
    this.#derrotas = derrotas ?? 0;
    this.#racha = racha ?? 0;
    this.#puntajeMax = puntajeMax ?? 0;
    // Seguridad de cuenta (módulo de autenticación real).
    this.#correoVerificado = correoVerificado ?? false;
    this.#intentosFallidos = intentosFallidos ?? 0;
    this.#bloqueadoHasta = bloqueadoHasta ?? null;
  }

  get id() {
    return this.#id;
  }

  get usuario() {
    return this.#usuario;
  }

  get correo() {
    return this.#correo;
  }

  get nacimiento() {
    return this.#nacimiento;
  }

  /** Solo lo usa UsuarioRepositorySQL para persistir el hash. */
  get passwordHash() {
    return this.#passwordHash;
  }

  get xp() {
    return this.#xp;
  }

  get victorias() {
    return this.#victorias;
  }

  get derrotas() {
    return this.#derrotas;
  }

  get racha() {
    return this.#racha;
  }

  get puntajeMax() {
    return this.#puntajeMax;
  }

  get correoVerificado() {
    return this.#correoVerificado;
  }

  get intentosFallidos() {
    return this.#intentosFallidos;
  }

  get bloqueadoHasta() {
    return this.#bloqueadoHasta;
  }

  /**
   * Único punto de entrada para modificar el progreso de juego.
   * El Service calcula los valores (XP, racha, etc.) y acá solo se
   * aplican — el estado interno nunca se toca desde afuera.
   */
  actualizarPerfil({ xp, victorias, derrotas, racha, puntajeMax }) {
    this.#xp = xp;
    this.#victorias = victorias;
    this.#derrotas = derrotas;
    this.#racha = racha;
    this.#puntajeMax = puntajeMax;
  }

  /**
   * Representación pública: seguro para enviar al frontend.
   * Jamás incluye el passwordHash.
   */
  publico() {
    return {
      id: this.#id,
      usuario: this.#usuario,
      correo: this.#correo,
      nacimiento: this.#nacimiento,
      xp: this.#xp,
      victorias: this.#victorias,
      derrotas: this.#derrotas,
      racha: this.#racha,
      puntajeMax: this.#puntajeMax,
      correoVerificado: this.#correoVerificado,
    };
  }

  /** Alias para el frontend: lo que devuelven los endpoints. */
  toJSON() {
    return this.publico();
  }
}

module.exports = Usuario;