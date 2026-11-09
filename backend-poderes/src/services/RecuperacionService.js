const { errorConCodigo } = require("../utils/errores");
const { plantillaCodigo } = require("../utils/plantillaCorreo");

/**
 * SERVICIO: RecuperacionService
 *
 * Recuperación de contraseña olvidada: código de 1 solo uso (tipo
 * RECUPERACION) + procedimiento almacenado sp_restablecer_password que,
 * en UNA operación atómica: revoca todas las sesiones, cambia el hash de
 * la contraseña e invalida los códigos pendientes.
 */
class RecuperacionService {
  static INTENTOS_MAXIMOS = 5;
  static VIGENCIA_MIN = 15;

  constructor(
    usuarioRepository,
    codigoVerificacionRepository,
    codigoHasher,
    passwordHasher,
    codigoGenerador,
    notificador,
    database
  ) {
    this.usuarioRepository = usuarioRepository;
    this.codigoVerificacionRepository = codigoVerificacionRepository;
    this.codigoHasher = codigoHasher;
    this.passwordHasher = passwordHasher;
    this.codigoGenerador = codigoGenerador;
    this.notificador = notificador;
    this.database = database;
  }

  /** Envía un código RECUPERACION al correo de la cuenta. */
  async solicitar({ correo }) {
    const usuario = await this.usuarioRepository.buscarPorCorreo(correo);
    if (!usuario) {
      throw errorConCodigo("No encontramos una cuenta con ese correo.", "NO_CUENTA");
    }

    const codigo = this.codigoGenerador.generar();
    await this.codigoVerificacionRepository.guardar({
      usuarioId: usuario.id,
      codigoHash: this.codigoHasher.hash(codigo),
      tipo: "RECUPERACION",
      expiraEn: new Date(Date.now() + RecuperacionService.VIGENCIA_MIN * 60 * 1000),
    });

    await this.notificador.enviar({
      para: usuario.correo,
      asunto: "Recupera tu contraseña de Memoria Ninja",
      texto:
        `Vamos a restablecer tu contraseña.\n\n` +
        `Tu código de recuperación es: ${codigo}\n` +
        `Vence en ${RecuperacionService.VIGENCIA_MIN} minutos.`,
      html: plantillaCodigo({
        titulo: "Recupera tu contraseña",
        subtitulo: "Usa este código para restablecer la contraseña de tu cuenta.",
        codigo,
        vigenciaMin: RecuperacionService.VIGENCIA_MIN,
      }),
    });

    return { aviso: "Si el correo existe, ya enviamos el código." };
  }

  /**
   * Verificación PREVIA del código de recuperación, SIN consumirlo ni
   * quemar intentos: el flujo del front valida aquí antes de pedir la
   * contraseña nueva. La seguridad real (consumo ACID + límite de
   * intentos) sigue viviendo únicamente en restablecer().
   */
  async verificar({ correo, codigo }) {
    const usuario = await this.usuarioRepository.buscarPorCorreo(correo);
    if (!usuario) {
      throw errorConCodigo("No encontramos una cuenta con ese correo.", "NO_CUENTA");
    }

    const activo = await this.codigoVerificacionRepository.buscarActivo({
      usuarioId: usuario.id,
      tipo: "RECUPERACION",
    });
    if (!activo || activo.codigo_hash !== this.codigoHasher.hash(codigo)) {
      throw errorConCodigo("El código es incorrecto o ya venció.", "CODIGO_INVALIDO");
    }

    return { aviso: "Código verificado." };
  }

  /**
   * Valida el código y aplica el cambio de contraseña.
   * Mismo aislamiento ACID que la verificación + CALL al SP atómico.
   */
  async restablecer({ correo, codigo, nuevaPassword }) {
    const usuario = await this.usuarioRepository.buscarPorCorreo(correo);
    if (!usuario) {
      throw errorConCodigo("No encontramos una cuenta con ese correo.", "NO_CUENTA");
    }
    if (!nuevaPassword || String(nuevaPassword).length < 6) {
      throw new Error("La nueva contraseña debe tener al menos 6 caracteres");
    }

    const codigoHash = this.codigoHasher.hash(codigo);
    const nuevoHash = this.passwordHasher.generarHash(nuevaPassword);

    await this.database.transaccion(async (db) => {
      const activo = await this.codigoVerificacionRepository.buscarActivo(
        { usuarioId: usuario.id, tipo: "RECUPERACION" },
        db
      );
      if (!activo) {
        throw errorConCodigo("El código venció. Vuelve a solicitar uno nuevo.", "CODIGO_INVALIDO");
      }

      const intentos = await this.codigoVerificacionRepository.aumentarIntento(activo.id, db);
      if (intentos > RecuperacionService.INTENTOS_MAXIMOS) {
        throw errorConCodigo("Demasiados intentos. Solicita un código nuevo.", "CODIGO_INVALIDO");
      }

      const estado = await this.codigoVerificacionRepository.confirmarCon(db, {
        usuarioId: usuario.id,
        codigoHash,
        tipo: "RECUPERACION",
      });
      if (estado !== "OK") {
        throw errorConCodigo("Código incorrecto o vencido.", "CODIGO_INVALIDO");
      }

      // Procedimiento almacenado: revoca sesiones + cambia password
      // + invalida códigos pendientes (TO-DO o NADA).
      await db.query("CALL sp_restablecer_password($1, $2)", [usuario.id, nuevoHash]);
    });

    return { aviso: "Contraseña actualizada. Ya puedes iniciar sesión." };
  }
}

module.exports = RecuperacionService;