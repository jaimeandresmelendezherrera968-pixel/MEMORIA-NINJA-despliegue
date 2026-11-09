const { Router } = require("express");

/**
 * Rutas del módulo de autenticación real (registro con código de correo,
 * login con cookie httpOnly, recuperación). Todas bajo /api/auth.
 */
function crearRutasAuth(authController, verificacionController, recuperacionController) {
  const router = Router();

  router.post("/auth/registro", authController.registrar);
  router.post("/auth/login", authController.iniciarSesion);
  router.post("/auth/logout", authController.cerrarSesion);
  router.get("/auth/me", authController.obtenerSesionActiva);

  router.post("/auth/verificacion/enviar", verificacionController.enviar);
  router.post("/auth/verificacion/confirmar", verificacionController.confirmar);

  router.post("/auth/recuperacion/solicitar", recuperacionController.solicitar);
  router.post("/auth/recuperacion/verificar", recuperacionController.verificar);
  router.post("/auth/recuperacion/restablecer", recuperacionController.restablecer);

  return router;
}

module.exports = crearRutasAuth;