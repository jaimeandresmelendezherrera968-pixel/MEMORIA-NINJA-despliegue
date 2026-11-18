const { Router } = require("express");

function crearRutasAmistades(amistadController, autorizacion) {
  const router = Router();
  const { requiereSesion } = autorizacion;

  router.get("/resumen", requiereSesion, amistadController.resumen);
  router.get("/buscar", requiereSesion, amistadController.buscar);
  router.post("/solicitudes", requiereSesion, amistadController.enviarSolicitud);
  router.post("/solicitudes/:id/aceptar", requiereSesion, amistadController.aceptar);
  router.post("/solicitudes/:id/rechazar", requiereSesion, amistadController.rechazar);
  router.delete("/solicitudes/:id", requiereSesion, amistadController.cancelarSolicitud);
  router.post("/bloqueos/:idUsuario", requiereSesion, amistadController.bloquear);
  router.delete("/bloqueos/:idUsuario", requiereSesion, amistadController.desbloquear);
  router.delete("/:idAmigo", requiereSesion, amistadController.eliminarAmistad);

  return router;
}

module.exports = crearRutasAmistades;
