const express = require("express");

/**
 * RUTAS: consultas a las VISTAS de la base de datos
 *
 * GET /api/vistas/partidas-recientes      -> vw_partidas_recientes
 * GET /api/vistas/historial-detallado     -> vw_historial_detallado
 * GET /api/vistas/ranking                 -> vw_ranking_mejor_puntaje
 * GET /api/vistas/usuarios-resumen        -> vw_usuarios_resumen
 *
 * Parte 4: el ranking queda PUBLICO (cultura arcade: se ve sin cuenta, y el
 * menú ya bloquea el modal al invitado); las otras tres vistas exponen datos
 * de muchas cuentas y no las usa ningun frontend, asi que exigen sesion.
 */
function crearRutasVistas(vistaController, autorizacion) {
  const router = express.Router();
  const { requiereSesion } = autorizacion;

  router.get("/vistas/ranking", vistaController.rankingMejorPuntaje);
  router.get("/vistas/partidas-recientes", requiereSesion, vistaController.partidasRecientes);
  router.get("/vistas/historial-detallado", requiereSesion, vistaController.historialDetallado);
  router.get("/vistas/usuarios-resumen", requiereSesion, vistaController.usuariosResumen);

  return router;
}

module.exports = crearRutasVistas;
