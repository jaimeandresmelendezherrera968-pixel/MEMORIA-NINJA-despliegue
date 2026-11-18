function normalizarUsuario(valor) {
  return String(valor ?? "").trim();
}

function normalizarCorreo(valor) {
  return String(valor ?? "").trim().toLowerCase();
}

module.exports = { normalizarUsuario, normalizarCorreo };
