const express = require("express");

/**
 * RUTAS: procedimientos almacenados
 *
 * POST /api/procedimientos/registrar-partida -> CALL sp_registrar_partida(...)
 *
 * Parte 4: escribe resultados en la BD del usuario -> exige sesión.
 */
function crearRutasProcedimientos(procedimientoController, autorizacion) {
  const router = express.Router();

  router.post(
    "/procedimientos/registrar-partida",
    autorizacion.requiereSesion,
    procedimientoController.registrarResultado
  );

  return router;
}

module.exports = crearRutasProcedimientos;
