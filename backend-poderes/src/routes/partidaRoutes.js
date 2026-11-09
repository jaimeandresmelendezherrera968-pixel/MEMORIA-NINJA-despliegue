const { Router } = require("express");

/**
 * RUTAS: partidas
 *
 * Parte 4: crear una partida escribe en la BD y alimenta los poderes,
 * así que exige sesión. Sin sesión el motor usa el proveedor simulado.
 */
function crearRutasPartidas(partidaController, autorizacion) {
  const router = Router();
  router.post("/partida", autorizacion.requiereSesion, partidaController.crearPartida);
  return router;
}

module.exports = crearRutasPartidas;
