const crypto = require("crypto");

/**
 * INFRAESTRUCTURA: PasswordHasher
 *
 * Encapsula el algoritmo de hash de contraseñas (scrypt, nativo de
 * Node) detrás de un contrato mínimo: generarHash/verificar.
 *
 * >>> DIP <<<
 * UsuarioService no sabe (ni le importa) el algoritmo: recibe la
 * implementación concreta ya armada desde server.js. Si la sustentación
 * pide cambiar a bcrypt o argon2, se crea otro hasher que cumpla el
 * mismo contrato y se inyecta sin tocar el Service.
 *
 * >>> SEGURIDAD <<<
 * - scrypt es una función de derivación lenta, resistente a fuerza
 *   bruta (a diferencia de MD5/SHA1).
 * - Cada hash es único: se genera una SAL aleatoria de 16 bytes por
 *   contraseña y se guarda junto al hash derivado ("sal:hash").
 * - La comparación usa timingSafeEqual para no filtrar información
 *   por el tiempo de respuesta.
 */
class PasswordHasher {
  generarHash(password) {
    const sal = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, sal, 64).toString("hex");
    return `${sal}:${hash}`;
  }

  verificar(password, hashAlmacenado) {
    const [sal, hashEsperado] = String(hashAlmacenado ?? "").split(":");
    if (!sal || !hashEsperado) return false;

    const hashCalculado = crypto.scryptSync(password, sal, 64);
    const esperado = Buffer.from(hashEsperado, "hex");

    return (
      hashCalculado.length === esperado.length &&
      crypto.timingSafeEqual(hashCalculado, esperado)
    );
  }
}

module.exports = PasswordHasher;