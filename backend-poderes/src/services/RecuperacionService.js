const { errorConCodigo } = require("../utils/errores");
const { plantillaCodigo } = require("../utils/plantillaCorreo");
const { normalizarCorreo } = require("../utils/normalizar");

class RecuperacionService {
  static INTENTOS_MAXIMOS = 5;
  static VIGENCIA_MIN = 10;

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

  async solicitar({ correo }) {
    const correoNormalizado = normalizarCorreo(correo);
    const usuario = await this.usuarioRepository.buscarPorCorreo(correoNormalizado);
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
      asunto: "Recupera tu contrasena de Memoria Ninja",
      texto:
        "Vamos a restablecer tu contrasena.\n\n" +
        "Tu codigo de recuperacion es: " + codigo + "\n" +
        "Vence en " + RecuperacionService.VIGENCIA_MIN + " minutos.",
      html: plantillaCodigo({
        titulo: "Recupera tu contrasena",
        subtitulo: "Usa este codigo para restablecer la contrasena de tu cuenta.",
        codigo,
        vigenciaMin: RecuperacionService.VIGENCIA_MIN,
      }),
    });

    return { aviso: "Si el correo existe, ya enviamos el codigo." };
  }

  async verificar({ correo, codigo }) {
    const correoNormalizado = normalizarCorreo(correo);
    const usuario = await this.usuarioRepository.buscarPorCorreo(correoNormalizado);
    if (!usuario) {
      throw errorConCodigo("No encontramos una cuenta con ese correo.", "NO_CUENTA");
    }

    const activo = await this.codigoVerificacionRepository.buscarActivo({
      usuarioId: usuario.id,
      tipo: "RECUPERACION",
    });
    if (!activo || activo.codigo_hash !== this.codigoHasher.hash(codigo)) {
      throw errorConCodigo("El codigo es incorrecto o ya vencio.", "CODIGO_INVALIDO");
    }

    return { aviso: "Codigo verificado." };
  }

  async restablecer({ correo, codigo, nuevaPassword }) {
    const correoNormalizado = normalizarCorreo(correo);
    const usuario = await this.usuarioRepository.buscarPorCorreo(correoNormalizado);
    if (!usuario) {
      throw errorConCodigo("No encontramos una cuenta con ese correo.", "NO_CUENTA");
    }
    if (!nuevaPassword || String(nuevaPassword).length < 8) {
      throw errorConCodigo("La nueva contrasena debe tener al menos 8 caracteres", "VALIDACION");
    }

    const codigoHash = this.codigoHasher.hash(codigo);
    const nuevoHash = this.passwordHasher.generarHash(nuevaPassword);

    await this.database.transaccion(async (db) => {
      const activo = await this.codigoVerificacionRepository.buscarActivo(
        { usuarioId: usuario.id, tipo: "RECUPERACION" },
        db
      );
      if (!activo) {
        throw errorConCodigo("El codigo vencio. Vuelve a solicitar uno nuevo.", "CODIGO_INVALIDO");
      }

      const intentos = await this.codigoVerificacionRepository.aumentarIntento(activo.id, db);
      if (intentos > RecuperacionService.INTENTOS_MAXIMOS) {
        throw errorConCodigo("Demasiados intentos. Solicita un codigo nuevo.", "CODIGO_INVALIDO");
      }

      const estado = await this.codigoVerificacionRepository.confirmarCon(db, {
        usuarioId: usuario.id,
        codigoHash,
        tipo: "RECUPERACION",
      });
      if (estado !== "OK") {
        throw errorConCodigo("Codigo incorrecto o vencido.", "CODIGO_INVALIDO");
      }

      await this.usuarioRepository.actualizarPasswordCon(db, usuario.id, nuevoHash);
      await this.usuarioRepository.revocarTodasLasSesionesCon(db, usuario.id);
    });

    return { aviso: "Contrasena actualizada. Ya puedes iniciar sesion." };
  }
}

module.exports = RecuperacionService;
