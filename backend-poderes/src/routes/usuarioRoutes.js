const { Router } = require("express");

/**
 * RUTAS: usuarios, historial, perfil e importación
 *
 * Parte 4: las rutas de datos de una cuenta (:idUsuario) exigen sesión
 * PROPIA (requiereSesion + esPropietario). Siguen públicas las de
 * pre-sesión: registro, login legacy y la búsqueda por correo que usa
 * el formulario de registro para duplicados.
 */
function crearRutasUsuarios(usuarioController, autorizacion) {
  const router = Router();
  const { requiereSesion, esPropietario } = autorizacion;

  router.post("/usuarios/registro", usuarioController.registrar);
  router.post("/usuarios/login", usuarioController.iniciarSesion);

  // Listado de cuentas: expone correos, solo con sesión.
  router.get("/usuarios", requiereSesion, usuarioController.obtenerTodos);

  // Público: el registro (sin sesión) verifica si el correo ya existe.
  router.get("/usuarios/por-correo/:correo", usuarioController.buscarPorCorreo);

  router.get(
    "/usuarios/:idUsuario/historial",
    requiereSesion,
    esPropietario,
    usuarioController.obtenerHistorial
  );
  router.post(
    "/usuarios/:idUsuario/historial",
    requiereSesion,
    esPropietario,
    usuarioController.registrarResultado
  );
  router.post(
    "/usuarios/:idUsuario/importar",
    requiereSesion,
    esPropietario,
    usuarioController.importarProgreso
  );

  // Perfil de juego (XP y estadísticas de la cuenta)
  router.get(
    "/usuarios/:idUsuario/perfil",
    requiereSesion,
    esPropietario,
    usuarioController.obtenerPerfil
  );
  router.post(
    "/usuarios/:idUsuario/perfil",
    requiereSesion,
    esPropietario,
    usuarioController.actualizarPerfil
  );

  return router;
}

module.exports = crearRutasUsuarios;
