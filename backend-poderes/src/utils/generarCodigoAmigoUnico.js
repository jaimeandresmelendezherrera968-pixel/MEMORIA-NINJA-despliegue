const generarCodigoAmigo = require("./generarCodigoAmigo");

async function generarCodigoAmigoUnico(usuarioRepository, intentos = 3) {
  for (let indice = 0; indice < intentos; indice += 1) {
    const codigo = generarCodigoAmigo();
    if (typeof usuarioRepository?.buscarPorCodigoAmigo !== "function") return codigo;
    const existente = await usuarioRepository.buscarPorCodigoAmigo(codigo);
    if (!existente) return codigo;
  }
  throw new Error("No se pudo generar un ID publico unico");
}

module.exports = generarCodigoAmigoUnico;
