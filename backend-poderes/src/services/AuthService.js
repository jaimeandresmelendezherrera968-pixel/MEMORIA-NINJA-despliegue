const crypto = require("crypto");
const Usuario = require("../entities/Usuario");
const { errorConCodigo } = require("../utils/errores");
const { normalizarUsuario, normalizarCorreo } = require("../utils/normalizar");

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
    duracionSesionMin = 1440,
    duracionRecordadaMin = 30 * 24 * 60,
    database = null
  ) {
    this.usuarioRepository = usuarioRepository;
    this.codigoVerificacionRepository = codigoVerificacionRepository;
    this.sesionRepository = sesionRepository;
    this.passwordHasher = passwordHasher;
    this.codigoGenerador = codigoGenerador;
    this.codigoHasher = codigoHasher;
    this.notificador = notificador;
    this.duracionSesionMin = duracionSesionMin;
    this.duracionRecordadaMin = duracionRecordadaMin;
    this.database = database;
  }

  #hashearToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  async #codigoEnvio(idUsuario, ejecutor = null) {
    const codigo = this.codigoGenerador.generar();
    const vigenciaMs = 10 * 60 * 1000;
    await this.codigoVerificacionRepository.guardar(
      {
        usuarioId: idUsuario,
        codigoHash: this.codigoHasher.hash(codigo),
        tipo: "REGISTRO",
        expiraEn: new Date(Date.now() + vigenciaMs),
      },
      ejecutor
    );
    return codigo;
  }

  async registrar({ usuario, correo, nacimiento, password }) {
    const usuarioNormalizado = normalizarUsuario(usuario);
    const correoNormalizado = normalizarCorreo(correo);

    this.#validarCamposObligatorios({
      usuario: usuarioNormalizado,
      correo: correoNormalizado,
      password,
    });

    if (await this.usuarioRepository.buscarPorUsuario(usuarioNormalizado)) {
      throw errorConCodigo("El nombre de usuario ya esta en uso", "USUARIO_DUPLICADO");
    }
    if (await this.usuarioRepository.buscarPorCorreo(correoNormalizado)) {
      throw errorConCodigo("El correo ya esta registrado", "CORREO_DUPLICADO");
    }

    const id = crypto.randomUUID();
    const nuevo = new Usuario({
      id,
      usuario: usuarioNormalizado,
      correo: correoNormalizado,
      nacimiento,
      passwordHash: this.passwordHasher.generarHash(password),
    });

    let codigo;
    try {
      const persistir = async (db) => {
        await this.usuarioRepository.guardar(nuevo, db);
        return this.#codigoEnvio(id, db);
      };

      codigo = this.database
        ? await this.database.transaccion(persistir)
        : await persistir(null);
    } catch (error) {
      if (error && error.code === "23505") {
        const detalle = String(error.detail || "").toLowerCase();
        if (detalle.includes("correo")) {
          throw errorConCodigo("El correo ya esta registrado", "CORREO_DUPLICADO");
        }
        if (detalle.includes("usuario")) {
          throw errorConCodigo("El nombre de usuario ya esta en uso", "USUARIO_DUPLICADO");
        }
      }
      throw error;
    }

    const resultado = {
      usuario: nuevo.publico(),
      correo: correoNormalizado,
      correoEnviado: true,
      aviso: "Revisa tu correo para verificar tu cuenta.",
    };

    try {
      await this.notificador.enviar({
        para: correoNormalizado,
        asunto: "Verifica tu correo en Memoria Ninja",
        texto:
          "Falta un paso para activar tu cuenta de Memoria Ninja.\n\n" +
          "Tu codigo de verificacion es: " + codigo + "\nVence en 10 minutos.",
      });
    } catch (error) {
      resultado.correoEnviado = false;
      resultado.aviso =
        "La cuenta se creo, pero no pudimos enviar el correo. Reenvia el codigo desde la pantalla de verificacion.";
      console.error("No se pudo enviar el correo de verificacion:", error.message);
    }

    return resultado;
  }

  async iniciarSesion({ usuario, password, ip, userAgent, recordar = false }) {
    const identificador = normalizarUsuario(usuario);
    const encontrado =
      (await this.usuarioRepository.buscarPorUsuario(identificador)) ||
      (await this.usuarioRepository.buscarPorCorreo(identificador));

    if (!encontrado) {
      throw errorConCodigo("Usuario o contrasena incorrectos", "CREDENCIALES");
    }

    const bloqueado = encontrado.bloqueadoHasta && new Date(encontrado.bloqueadoHasta) > new Date();
    if (bloqueado) {
      throw errorConCodigo(
        "Cuenta temporalmente bloqueada por muchos intentos. Intenta mas tarde.",
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
          "Cuenta temporalmente bloqueada por muchos intentos. Intenta mas tarde.",
          "BLOQUEADA"
        );
      }
      throw errorConCodigo("Usuario o contrasena incorrectos", "CREDENCIALES");
    }

    if (!encontrado.correoVerificado) {
      throw errorConCodigo(
        "Verifica tu correo antes de iniciar sesion. Revisa la bandeja de entrada.",
        "CORREO_SIN_VERIFICAR"
      );
    }

    await this.usuarioRepository.limpiarIntentosFallidos(encontrado.id);

    const token = crypto.randomBytes(32).toString("hex");
    const duracionMin = recordar ? this.duracionRecordadaMin : this.duracionSesionMin;
    const expiraEn = new Date(Date.now() + duracionMin * 60 * 1000);
    await this.sesionRepository.crear({
      usuarioId: encontrado.id,
      tokenHash: this.#hashearToken(token),
      ip,
      userAgent,
      expiraEn,
    });

    return {
      usuario: encontrado.publico(),
      token,
      expiraEn,
      recordar: Boolean(recordar),
    };
  }

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
      throw errorConCodigo("El nombre de usuario es obligatorio", "VALIDACION");
    }
    if (!correo || String(correo).trim() === "" || !String(correo).includes("@")) {
      throw errorConCodigo("Debes ingresar un correo valido", "VALIDACION");
    }
    if (!password || String(password).length < 8) {
      throw errorConCodigo(
        "La contrasena debe tener al menos 8 caracteres",
        "VALIDACION"
      );
    }
  }
}

module.exports = AuthService;
