const crypto = require("crypto");

/**
 * INFRAESTRUCTURA: CodigoHasher
 *
 * Hash DETERMINISTA para códigos de verificación de 1 solo uso.
 *
 * ¿Por qué NO scrypt como las contraseñas? Porque scrypt usa una sal
 * aleatoria y el hash solo se puede verificar con la MISMA sal. La función
 * ACID fn_confirmar_codigo compara el hash que llega con el almacenado,
 * así que necesita un hash reproducible: sha256 del código.
 *
 * La seguridad del código NO se apoya en el hash (es de 6 dígitos y vence
 * en minutos): se apoya en que es de 1 SOLO uso, con límite de intentos
 * (5) y rate-limit por IP. El hash garantiza que nunca aparezca en claro
 * en la base.
 */
class CodigoHasher {
  hash(codigo) {
    return crypto.createHash("sha256").update(String(codigo)).digest("hex");
  }
}

module.exports = CodigoHasher;