const { NOMBRE_COOKIE } = require("../controllers/AuthController");

/**
 * MIDDLEWARES DE AUTORIZACIÓN (Parte 4)
 *
 * Se componen en server.js (raíz de composición) con el authService real y
 * se inyectan a los routers como cualquier otra dependencia.
 *
 * - requiereSesion: valida la cookie httpOnly de sesión contra la BD
 *   (authService.obtenerUsuarioPorToken). Si es válida deja el usuario en
 *   req.usuario; si no, responde 401 y no sigue.
 * - esPropietario: va DESPUÉS de requiereSesion y compara req.usuario.id
 *   con el :idUsuario de la ruta. Cuenta ajena -> 403 (401 = no sabemos
 *   quién sos; 403 = sos alguien pero no el dueño).
 *
 * Reemplaza el mini-guard provisional de la sub-parte 3.5.
 */
function crearMiddlewaresDeAutorizacion(authService) {
  const obtenerUsuarioDeCookie = async (req) => {
    const token = req.cookies?.[NOMBRE_COOKIE];
    if (!token) return null;
    const encontrado = await authService.obtenerUsuarioPorToken(token);
    return encontrado?.usuario ?? null;
  };

  const requiereSesion = async (req, res, next) => {
    const usuario = await obtenerUsuarioDeCookie(req);
    if (!usuario) {
      return res.status(401).json({ exito: false, error: "Se requiere iniciar sesión" });
    }
    req.usuario = usuario;
    next();
  };

  const esPropietario = (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ exito: false, error: "Se requiere iniciar sesión" });
    }
    if (req.usuario.id !== req.params.idUsuario) {
      return res
        .status(403)
        .json({ exito: false, error: "No puedes operar sobre una cuenta ajena" });
    }
    next();
  };

  return { requiereSesion, esPropietario };
}

module.exports = crearMiddlewaresDeAutorizacion;
