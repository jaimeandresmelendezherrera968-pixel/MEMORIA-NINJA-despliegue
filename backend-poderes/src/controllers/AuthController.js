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
  constructor(authService, duracionSesionMin = 1440, duracionRecordadaMin = 30 * 24 * 60) {
    this.authService = authService;
    this.duracionSesionMin = duracionSesionMin;
    this.duracionRecordadaMin = duracionRecordadaMin;
  }

  registrar = async (req, res) => {
    try {
      const { usuario, correo, nacimiento, password } = req.body;
      const resultado = await this.authService.registrar({ usuario, correo, nacimiento, password });
      res.status(201).json({
        exito: true,
        usuario: resultado.usuario,
        correo: resultado.correo,
        correoEnviado: resultado.correoEnviado !== false,
        aviso: resultado.aviso || "Revisa tu correo para verificar tu cuenta.",
      });
    } catch (error) {
      const duplicado =
        error.codigo === "CORREO_DUPLICADO" ||
        error.codigo === "USUARIO_DUPLICADO" ||
        error.codigo === "CUENTA_DUPLICADA";
      const validacion = error.codigo === "VALIDACION";

      if (duplicado) {
        return res.status(409).json({ exito: false, error: error.message });
      }
      if (validacion) {
        return res.status(400).json({ exito: false, error: error.message });
      }

      console.error("Error inesperado en registro:", error);
      res.status(500).json({ exito: false, error: "No se pudo completar el registro" });
    }
  };

  iniciarSesion = async (req, res) => {
    try {
      const { usuario, password, recordar } = req.body;
      const resultado = await this.authService.iniciarSesion({
        usuario,
        password,
        recordar: recordar === true || recordar === "true",
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      res.cookie(NOMBRE_COOKIE, resultado.token, this.#opcionesCookie(req, resultado.recordar));
      res.json({ exito: true, usuario: resultado.usuario, recordar: resultado.recordar });
    } catch (error) {
      const status = this.#statusDe(error);
      if (status === 500) {
        console.error("Error inesperado en login:", error);
        return res.status(500).json({ exito: false, error: "No se pudo iniciar sesion" });
      }
      res.status(status).json({ exito: false, error: error.message });
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
    res.clearCookie(NOMBRE_COOKIE, {
      path: "/",
      sameSite: "lax",
      secure: this.#cookieSegura(req),
    });
    res.json({ exito: true });
  };

  #cookieSegura(req) {
    return (
      Boolean(req?.secure) ||
      process.env.COOKIE_SECURE === "1" ||
      process.env.NODE_ENV === "production"
    );
  }

  #opcionesCookie(req, recordar = false) {
    const opciones = {
      httpOnly: true,
      sameSite: "lax",
      // Solo producción con HTTPS (COOKIE_SECURE=1 o NODE_ENV=production); en
      // local (http) false, o el navegador ni siquiera guarda la cookie.
      secure: this.#cookieSegura(req),
      path: "/",
    };
    // "Recordarme" => cookie persistente 30 días. Sin marcar, cookie de
    // sesión (se borra al cerrar el navegador).
    if (recordar) {
      opciones.maxAge = this.duracionRecordadaMin * 60 * 1000;
    }
    return opciones;
  }

  #statusDe(error) {
    switch (error.codigo) {
      case "CREDENCIALES":
        return 401;
      case "CORREO_SIN_VERIFICAR":
        return 403;
      case "BLOQUEADA":
        return 423;
      case "VALIDACION":
        return 400;
      default:
        return 500;
    }
  }
}

module.exports = AuthController;
module.exports.NOMBRE_COOKIE = NOMBRE_COOKIE;