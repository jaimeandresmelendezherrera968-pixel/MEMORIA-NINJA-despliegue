const { Router } = require("express");

function crearRutasEstado(estadoController) {
  const router = Router();

  router.get("/estado", estadoController.estado);

  return router;
}

module.exports = crearRutasEstado;
