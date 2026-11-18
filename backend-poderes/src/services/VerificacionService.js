const { errorConCodigo } = require("../utils/errores");
const { plantillaCodigo } = require("../utils/plantillaCorreo");
const { normalizarCorreo } = require("../utils/normalizar");

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

  async enviar({ correo }) {
    const correoNormalizado = normalizarCorreo(correo);
    const usuario = await this.usuarioRepository.buscarPorCorreo(correoNormalizado);
    if (!usuario) {
      throw errorConCodigo("No encontramos una cuenta con ese correo.", "NO_CUENTA");
    }
    if (usuario.correoVerificado) {
      return { aviso: "Tu correo ya esta verificado. Ya puedes iniciar sesion." };
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
      asunto: "Tu codigo de verificacion de Memoria Ninja",
      texto:
        "Revisa la bandeja de entrada.\n\n" +
        "Tu codigo de verificacion es: " + codigo + "\nVence en " + VerificacionService.VIGENCIA_MIN + " minutos.",
      html: plantillaCodigo({
        titulo: "Verifica tu correo",
        subtitulo: "Usa este codigo para activar tu cuenta de Memoria Ninja.",
        codigo,
        vigenciaMin: VerificacionService.VIGENCIA_MIN,
      }),
    });

    return { aviso: "Codigo enviado. Revisa tu correo." };
  }

  async confirmar({ correo, codigo }) {
    const correoNormalizado = normalizarCorreo(correo);
    const usuario = await this.usuarioRepository.buscarPorCorreo(correoNormalizado);
    if (!usuario) {
      throw errorConCodigo("No encontramos una cuenta con ese correo.", "NO_CUENTA");
    }
    if (usuario.correoVerificado) {
      return {
        aviso: "Tu correo ya esta verificado. Ya puedes iniciar sesion.",
        correoVerificado: true,
      };
    }

    const codigoHash = this.codigoHasher.hash(codigo);

    await this.database.transaccion(async (db) => {
      const activo = await this.codigoVerificacionRepository.buscarActivo(
        { usuarioId: usuario.id, tipo: "REGISTRO" },
        db
      );
      if (!activo) {
        throw errorConCodigo("El codigo vencio. Vuelve a solicitar uno nuevo.", "CODIGO_INVALIDO");
      }

      const intentos = await this.codigoVerificacionRepository.aumentarIntento(activo.id, db);
      if (intentos > VerificacionService.INTENTOS_MAXIMOS) {
        throw errorConCodigo("Demasiados intentos. Solicita un codigo nuevo.", "CODIGO_INVALIDO");
      }

      const estado = await this.codigoVerificacionRepository.confirmarCon(db, {
        usuarioId: usuario.id,
        codigoHash,
        tipo: "REGISTRO",
      });
      if (estado !== "OK") {
        throw errorConCodigo("Codigo incorrecto o vencido.", "CODIGO_INVALIDO");
      }
    });

    return {
      aviso: "Correo verificado. Ya puedes iniciar sesion.",
      correoVerificado: true,
    };
  }
}

module.exports = VerificacionService;
