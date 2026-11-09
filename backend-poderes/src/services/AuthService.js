const crypto = require("crypto");
const Usuario = require("../entities/Usuario");
const { errorConCodigo } = require("../utils/errores");

/**
 * SERVICIO: AuthService
 *
 * Registro, inicio de sesión y sesiones (login real con cookie httpOnly).
 *
 * >>> SRP <<<
 * Solo lógica de autenticación: validaciones, hash, bloqueos por intentos
 * y creación de sesiones. No sabe de HTTP ni de SQL.
 *
 * >>> DIP <<<
 * Recibe repositorios, hasher, generador y notificador YA ARMADOS desde
 * server.js. El token se guarda HASEADO en la base; la cookie guarda el
 * token en crudo.
 */
class AuthService {
  static INTENTOS_MAXIMOS = 5;
  static BLOQUEO_MINUTOS = 5;

  constructor(
    usuarioRepository,
    codigoVerificacionRepository,
    sesionRepository,
    passwordHasher,
    codigoGenerador,
    codigoHasher,
    notificador,
    duracionSesionMin = 1440
  ) {
    this.usuarioRepository = usuarioRepository;
    this.codigoVerificacionRepository = codigoVerificacionRepository;
    this.sesionRepository = sesionRepository;
    this.passwordHasher = passwordHasher;
    this.codigoGenerador = codigoGenerador;
    this.codigoHasher = codigoHasher;
    this.notificador = notificador;
    this.duracionSesionMin = duracionSesionMin;
  }

  #hashearToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  #codigoEnvio(idUsuario) {
    const codigo = this.codigoGenerador.generar();
    const vigenciaMs = 10 * 60 * 1000; // 10 minutos
    return this.codigoVerificacionRepository.guardar({
      usuarioId: idUsuario,
      codigoHash: this.codigoHasher.hash(codigo),
      tipo: "REGISTRO",
      expiraEn: new Date(Date.now() + vigenciaMs),
    }).then(() => codigo);
  }

  /**
   * Registra la cuenta, genera el código de verificación y lo envía.
   * El correo queda "pendiente de verificar" hasta /auth/verificacion/confirmar.
   */
  async registrar({ usuario, correo, nacimiento, password }) {
    this.#validarCamposObligatorios({ usuario, correo, password });

    if (await this.usuarioRepository.buscarPorUsuario(usuario)) {
      throw new Error("El nombre de usuario ya está en uso");
    }
    if (await this.usuarioRepository.buscarPorCorreo(correo)) {
      throw new Error("El correo ya está registrado");
    }

    const id = crypto.randomUUID();
    const nuevo = new Usuario({
      id,
      usuario,
      correo,
      nacimiento,
      passwordHash: this.passwordHasher.generarHash(password),
    });
    try {
      await this.usuarioRepository.guardar(nuevo);
    } catch (error) {
      // Carrera de registros simultáneos: los chequeos de arriba pueden pasar
      // a la vez y PostgreSQL decide con sus UNIQUE (código 23505).
      if (error && error.code === "23505") {
        const detalle = String(error.detail || "").toLowerCase();
        if (detalle.includes("correo")) {
          throw new Error("El correo ya está registrado");
        }
        if (detalle.includes("usuario")) {
          throw new Error("El nombre de usuario ya está en uso");
        }
        throw new Error("La cuenta ya existe");
      }
      throw error;
    }

    // Código de verificación de 1 solo uso (el trigger invalida el previo).
    const codigo = await this.#codigoEnvio(id);
    await this.notificador.enviar({
      para: correo,
      asunto: "Verifica tu correo en Memoria Ninja",
      texto:
        `Falta un paso para activar tu cuenta de Memoria Ninja.\n\n` +
        `Tu código de verificación es: ${codigo}\nVence en 10 minutos.`,
    });

    return { usuario: nuevo.publico() };
  }

  /**
   * Login: verifica credenciales, controla intentos fallidos y bloqueo,
   * exige correo verificado y crea la sesión. Devuelve token (para la
   * cookie) + usuario público.
   */
  async iniciarSesion({ usuario, password, ip, userAgent }) {
    const encontrado =
      (await this.usuarioRepository.buscarPorUsuario(usuario)) ||
      (await this.usuarioRepository.buscarPorCorreo(usuario));

    // Mensaje idéntico para "no existe" y "contraseña mala": no se filtra
    // qué usuario está registrado.
    if (!encontrado) {
      throw errorConCodigo("Usuario o contraseña incorrectos", "CREDENCIALES");
    }

    const bloqueado = encontrado.bloqueadoHasta && new Date(encontrado.bloqueadoHasta) > new Date();
    if (bloqueado) {
      throw errorConCodigo(
        "Cuenta temporalmente bloqueada por muchos intentos. Intenta más tarde.",
        "BLOQUEADA"
      );
    }

    const claveValida = this.passwordHasher.verificar(password, encontrado.passwordHash);
    if (!claveValida) {
      const intentos = await this.usuarioRepository.sumarIntentoFallido(encontrado.id);
      if (intentos >= AuthService.INTENTOS_MAXIMOS) {
        const hasta = new Date(Date.now() + AuthService.BLOQUEO_MINUTOS * 60 * 1000);
        await this.usuarioRepository.marcarBloqueado(encontrado.id, hasta);
        throw errorConCodigo(
          "Cuenta temporalmente bloqueada por muchos intentos. Intenta más tarde.",
          "BLOQUEADA"
        );
      }
      throw errorConCodigo("Usuario o contraseña incorrectos", "CREDENCIALES");
    }

    if (!encontrado.correoVerificado) {
      throw errorConCodigo(
        "Verifica tu correo antes de iniciar sesión. Revisa la bandeja de entrada.",
        "CORREO_SIN_VERIFICAR"
      );
    }

    await this.usuarioRepository.limpiarIntentosFallidos(encontrado.id);

    const token = crypto.randomBytes(32).toString("hex");
    const expiraEn = new Date(Date.now() + this.duracionSesionMin * 60 * 1000);
    await this.sesionRepository.crear({
      usuarioId: encontrado.id,
      tokenHash: this.#hashearToken(token),
      ip,
      userAgent,
      expiraEn,
    });

    return { usuario: encontrado.publico(), token, expiraEn };
  }

  /**
   * Recupera la sesión por el token de la cookie (haseado antes de
   * consultar). Devuelve null si no existe, está revocada o vencida.
   */
  async obtenerUsuarioPorToken(token) {
    if (!token) return null;
    const encontrado = await this.sesionRepository.buscarPorTokenHash(this.#hashearToken(token));
    if (!encontrado) return null;
    if (encontrado.sesion.revocadaEn) return null;
    if (new Date(encontrado.sesion.expiraEn) <= new Date()) return null;
    return encontrado;
  }

  async cerrarSesion(token) {
    if (!token) return;
    await this.sesionRepository.revocar(this.#hashearToken(token));
  }

  async revocarTodasLasSesiones(idUsuario) {
    await this.sesionRepository.revocarTodasPorUsuario(idUsuario);
  }

  #validarCamposObligatorios({ usuario, correo, password }) {
    if (!usuario || String(usuario).trim() === "") {
      throw new Error("El nombre de usuario es obligatorio");
    }
    if (!correo || String(correo).trim() === "" || !String(correo).includes("@")) {
      throw new Error("Debes ingresar un correo válido");
    }
    if (!password || String(password).length < 6) {
      throw new Error("La contraseña debe tener al menos 6 caracteres");
    }
  }
}

module.exports = AuthService;