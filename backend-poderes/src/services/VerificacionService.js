const { errorConCodigo } = require("../utils/errores");
const { plantillaCodigo } = require("../utils/plantillaCorreo");

/**
 * SERVICIO: VerificacionService
 *
 * Envío y confirmación de códigos de verificación de correo (registro).
 *
 * La confirmación es ACID: corre dentro de DatabasePostgres.transaccion()
 * y la función fn_confirmar_codigo bloquea la fila con FOR UPDATE, así el
 * mismo código jamás se usa dos veces aunque lleguen dos peticiones juntas.
 */
class VerificacionService {
  static INTENTOS_MAXIMOS = 5;
  static VIGENCIA_MIN = 10;

  constructor(
    usuarioRepository,
    codigoVerificacionRepository,
    codigoHasher,
    codigoGenerador,
    notificador,
    database
  ) {
    this.usuarioRepository = usuarioRepository;
    this.codigoVerificacionRepository = codigoVerificacionRepository;
    this.codigoHasher = codigoHasher;
    this.codigoGenerador = codigoGenerador;
    this.notificador = notificador;
    this.database = database;
  }

  /**
   * Genera un nuevo código REGISTRO y lo envía al correo de la cuenta.
   * El trigger fn_invalidar_codigo_previo deja sin efecto cualquier
   * código anterior del mismo tipo (siempre UNO vigente).
   */
  async enviar({ correo }) {
    const usuario = await this.usuarioRepository.buscarPorCorreo(correo);
    if (!usuario) {
      throw errorConCodigo("No encontramos una cuenta con ese correo.", "NO_CUENTA");
    }

    const codigo = this.codigoGenerador.generar();
    await this.codigoVerificacionRepository.guardar({
      usuarioId: usuario.id,
      codigoHash: this.codigoHasher.hash(codigo),
      tipo: "REGISTRO",
      expiraEn: new Date(Date.now() + VerificacionService.VIGENCIA_MIN * 60 * 1000),
    });

    await this.notificador.enviar({
      para: usuario.correo,
      asunto: "Tu código de verificación de Memoria Ninja",
      texto:
        `Revisa la bandeja de entrada.\n\n` +
        `Tu código de verificación es: ${codigo}\nVence en ${VerificacionService.VIGENCIA_MIN} minutos.`,
      html: plantillaCodigo({
        titulo: "Verifica tu correo",
        subtitulo: "Usa este código para activar tu cuenta de Memoria Ninja.",
        codigo,
        vigenciaMin: VerificacionService.VIGENCIA_MIN,
      }),
    });

    return { aviso: "Código enviado. Revisa tu correo." };
  }

  /**
   * Confirma el código. Flujo atómico:
   *   1) toma la transacción,
   *   2) cuenta intentos sobre el código activo (máx. 5),
   *   3) llama a fn_confirmar_codigo (FOR UPDATE) que consume el código
   *      y marca el correo como verificado — todo o nada.
   */
  async confirmar({ correo, codigo }) {
    const usuario = await this.usuarioRepository.buscarPorCorreo(correo);
    if (!usuario) {
      throw errorConCodigo("No encontramos una cuenta con ese correo.", "NO_CUENTA");
    }

    const codigoHash = this.codigoHasher.hash(codigo);

    await this.database.transaccion(async (db) => {
      const activo = await this.codigoVerificacionRepository.buscarActivo(
        { usuarioId: usuario.id, tipo: "REGISTRO" },
        db
      );
      if (!activo) {
        throw errorConCodigo("El código venció. Vuelve a solicitar uno nuevo.", "CODIGO_INVALIDO");
      }

      const intentos = await this.codigoVerificacionRepository.aumentarIntento(activo.id, db);
      if (intentos > VerificacionService.INTENTOS_MAXIMOS) {
        throw errorConCodigo("Demasiados intentos. Solicita un código nuevo.", "CODIGO_INVALIDO");
      }

      const estado = await this.codigoVerificacionRepository.confirmarCon(db, {
        usuarioId: usuario.id,
        codigoHash,
        tipo: "REGISTRO",
      });
      if (estado !== "OK") {
        throw errorConCodigo("Código incorrecto o vencido.", "CODIGO_INVALIDO");
      }
    });

    return {
      aviso: "Correo verificado. Ya puedes iniciar sesión.",
      correoVerificado: true,
    };
  }
}

module.exports = VerificacionService;