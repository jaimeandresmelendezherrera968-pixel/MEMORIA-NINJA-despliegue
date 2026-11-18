const crypto = require("crypto");

function generarCodigoAmigo() {
  return "NJ-" + crypto.randomBytes(4).toString("hex").toUpperCase();
}

module.exports = generarCodigoAmigo;
