const { Router } = require("express");

/**
 * RUTAS: poderes
 *
 * Parte 4: activar un poder toca el estado de una partida en la BD,
 * así que exige sesión. El motor del frontend (invitado/sin sesión)
 * cae al simulador local que ya trae el fallback.
 */
function crearRutasPoderes(poderController, autorizacion) {
  const router = Router();
  router.post("/poder/activar", autorizacion.requiereSesion, poderController.activarPoder);
  return router;
}

module.exports = crearRutasPoderes;
