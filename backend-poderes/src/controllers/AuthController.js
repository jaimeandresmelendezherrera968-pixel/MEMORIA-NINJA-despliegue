const NOMBRE_COOKIE = "memoria_ninja_sesion";

/**
 * CONTROLADOR: AuthController
 *
 * >>> SRP <<<
 * Traduce HTTP <-> AuthService: lee body/cookie, llama al Service y arma
 * la respuesta con el status correcto. Las cookies httpOnly se gestionan
 * AQUÍ (afuerzas de HTTP), el Service nunca las ve.
 */
class AuthController {
  constructor(authService, duracionSesionMin = 1440) {
    this.authService = authService;
    this.duracionSesionMin = duracionSesionMin;
  }

  registrar = async (req, res) => {
    try {
      const { usuario, correo, nacimiento, password } = req.body;
      const resultado = await this.authService.registrar({ usuario, correo, nacimiento, password });
      res.status(201).json({
        exito: true,
        usuario: resultado.usuario,
        aviso: "Revisa tu correo para verificar tu cuenta.",
      });
    } catch (error) {
      res.status(400).json({ exito: false, error: error.message });
    }
  };

  iniciarSesion = async (req, res) => {
    try {
      const { usuario, password } = req.body;
      const resultado = await this.authService.iniciarSesion({
        usuario,
        password,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.cookie(NOMBRE_COOKIE, resultado.token, this.#opcionesCookie());
      res.json({ exito: true, usuario: resultado.usuario });
    } catch (error) {
      res.status(this.#statusDe(error)).json({ exito: false, error: error.message });
    }
  };

  obtenerSesionActiva = async (req, res) => {
    const encontrado = await this.authService.obtenerUsuarioPorToken(req.cookies?.[NOMBRE_COOKIE]);
    if (!encontrado) {
      return res.status(401).json({ exito: false, error: "Sesión no válida" });
    }
    res.json({
      exito: true,
      usuario: encontrado.usuario.publico(),
      sesion: { expiraEn: encontrado.sesion.expiraEn },
    });
  };

  cerrarSesion = async (req, res) => {
    await this.authService.cerrarSesion(req.cookies?.[NOMBRE_COOKIE]);
    res.clearCookie(NOMBRE_COOKIE, { path: "/" });
    res.json({ exito: true });
  };

  #opcionesCookie() {
    return {
      httpOnly: true,
      sameSite: "lax",
      // Parte 4: solo producción con HTTPS (COOKIE_SECURE=1 en .env); en
      // local (http) false, o el navegador ni siquiera guarda la cookie.
      secure: process.env.COOKIE_SECURE === "1",
      path: "/",
      maxAge: this.duracionSesionMin * 60 * 1000,
    };
  }

  #statusDe(error) {
    switch (error.codigo) {
      case "CREDENCIALES":
        return 401;
      case "CORREO_SIN_VERIFICAR":
        return 403;
      case "BLOQUEADA":
        return 423;
      default:
        return 401;
    }
  }
}

module.exports = AuthController;
module.exports.NOMBRE_COOKIE = NOMBRE_COOKIE;