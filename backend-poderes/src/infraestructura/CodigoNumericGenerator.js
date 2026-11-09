const crypto = require("crypto");
const CodigoGenerador = require("./CodigoGenerador");

/**
 * Generador numérico de 6 dígitos usando criptografía segura
 * (crypto.randomInt), no Math.random().
 */
class CodigoNumericGenerator extends CodigoGenerador {
  generar() {
    return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  }
}

module.exports = CodigoNumericGenerator;