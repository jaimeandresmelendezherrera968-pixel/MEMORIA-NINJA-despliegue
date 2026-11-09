const crypto = require("crypto");
const Usuario = require("../entities/Usuario");

/**
 * Regla de negocio del perfil: XP fija que se gana por cada victoria
 * de 1 jugador. Es UNA constante en todo el sistema (frontend y backend
 * usan el mismo número) para que el progreso nunca se desincronice.
 */
const XP_POR_VICTORIA = 100;

/** XP con la que nace toda cuenta y también el perfil local del invitado. */
const XP_INICIAL = 500;

/** Límite de resultados que acepta el merge invitado→cuenta en una sola petición. */
const TOPE_IMPORTACION = 200;

/**
 * SERVICIO: UsuarioService
 *
 * >>> SRP <<<
 * Toda la lógica de negocio de usuarios vive ACÁ: validaciones de
 * registro, unicidad de usuario/correo, hash de contraseña y sesión.
 * No sabe nada de HTTP (eso es del Controller) ni de SQL (eso es del
 * Repository).
 *
 * >>> DIP <<<
 * Recibe los repositorios y el hasher YA ARMADOS por constructor desde
 * server.js. No hace "new" de nada concreto en medio de su lógica.
 */
class UsuarioService {
  constructor(usuarioRepository, historialRepository, passwordHasher, database = null) {
    this.usuarioRepository = usuarioRepository;
    this.historialRepository = historialRepository;
    this.passwordHasher = passwordHasher;
    // Opcional (sub-parte 3.5): si está, la importación del invitado corre
    // dentro de UNA transacción ACID; si no, se aplican los pasos por separado.
    this.database = database;
  }

  async registrar({ usuario, correo, nacimiento, password }) {
    // Validación en el límite (fail fast): no se confía en el cliente.
    this.#validarCamposObligatorios({ usuario, correo, password });

    if (await this.usuarioRepository.buscarPorUsuario(usuario)) {
      throw new Error("El nombre de usuario ya está en uso");
    }
    if (await this.usuarioRepository.buscarPorCorreo(correo)) {
      throw new Error("El correo ya está registrado");
    }

    const id = crypto.randomUUID();
    const passwordHash = this.passwordHasher.generarHash(password);

    const nuevo = new Usuario({ id, usuario, correo, nacimiento, passwordHash });
    await this.usuarioRepository.guardar(nuevo);
    return nuevo.publico();
  }

  async iniciarSesion({ usuario, password }) {
    const encontrado =
      (await this.usuarioRepository.buscarPorUsuario(usuario)) ||
      (await this.usuarioRepository.buscarPorCorreo(usuario));

    // Mensaje idéntico para "no existe" y "contraseña mala":
    // no se filtra qué usuario está registrado.
    if (!encontrado || !this.passwordHasher.verificar(password, encontrado.passwordHash)) {
      throw new Error("Usuario o contraseña incorrectos");
    }

    return encontrado.publico();
  }

  async buscarPorId(idUsuario) {
    return (await this.usuarioRepository.buscarPorId(idUsuario))?.publico() || null;
  }

  async buscarPorCorreo(correo) {
    const encontrado = await this.usuarioRepository.buscarPorCorreo(correo);
    return encontrado?.publico() || null;
  }

  async obtenerTodos() {
    const usuarios = await this.usuarioRepository.obtenerTodos();
    return usuarios.map((u) => u.publico());
  }

  /**
   * Perfil de juego de una cuenta: nombre + XP y estadísticas.
   * Devuelve null (no un perfil inventado) si la cuenta no existe.
   */
  async obtenerPerfil(idUsuario) {
    const usuario = await this.usuarioRepository.buscarPorId(idUsuario);
    if (!usuario) {
      return null;
    }
    return this.#perfilPublico(usuario);
  }

  /**
   * Aplica el resultado de una partida de 1 jugador al perfil:
   *  - victoria => +XP_POR_VICTORIA, +1 victoria, +1 racha;
   *  - derrota  => +1 derrota y la racha se pone en 0;
   *  - en ambos => el puntaje máximo guarda el mejor puntaje.
   */
  async registrarFinPartidaPerfil({ idUsuario, victoria, puntaje }) {
    const usuario = await this.usuarioRepository.buscarPorId(idUsuario);
    if (!usuario) {
      throw new Error(`El usuario ${idUsuario} no existe`);
    }

    const puntajeValido = Number.isFinite(Number(puntaje)) ? Number(puntaje) : 0;
    const gano = victoria === true;

    const perfilActualizado = {
      xp: usuario.xp + (gano ? XP_POR_VICTORIA : 0),
      victorias: usuario.victorias + (gano ? 1 : 0),
      derrotas: usuario.derrotas + (gano ? 0 : 1),
      racha: gano ? usuario.racha + 1 : 0,
      puntajeMax: Math.max(usuario.puntajeMax, puntajeValido),
    };

    usuario.actualizarPerfil(perfilActualizado);
    await this.usuarioRepository.actualizarPerfil(idUsuario, perfilActualizado);

    return this.#perfilPublico(usuario);
  }

  #perfilPublico(usuario) {
    const datos = usuario.publico();
    return {
      id: datos.id,
      nombre: datos.usuario,
      xp: datos.xp,
      victorias: datos.victorias,
      derrotas: datos.derrotas,
      racha: datos.racha,
      puntajeMax: datos.puntajeMax,
    };
  }

  async guardarResultadoPartida({ idUsuario, idPartida, zona, puntaje, modo, ganador }) {
    // El historial solo tiene sentido para un usuario que exista.
    if (!(await this.buscarPorId(idUsuario))) {
      throw new Error(`El usuario ${idUsuario} no existe`);
    }
    await this.historialRepository.registrar({
      id: crypto.randomUUID(),
      idUsuario,
      idPartida,
      zona,
      puntaje,
      modo,
      ganador,
    });
  }

  async obtenerHistorial(idUsuario) {
    return this.historialRepository.porUsuario(idUsuario);
  }

  /**
   * SUB-PARTE 3.5 — Merge invitado→cuenta.
   *
   * Fusiona el progreso acumulado como invitado (cola local de historial +
   * perfil `perfil:invitado`) en la cuenta recién iniciada:
   *  - historial: inserta solo los resultados con `idPartida` que la cuenta
   *    todavía no tenga (dedup → re-importar es inocuo);
   *  - perfil: suma xp/victorias/derrotas; racha y puntajeMax quedan con el
   *    máximo entre lo del invitado y lo de la cuenta.
   * Con `database` inyectada TODO ocurre en una transacción (BEGIN/COMMIT).
   */
  async importarProgresoInvitado({ idUsuario, historial, perfil }) {
    const usuario = await this.usuarioRepository.buscarPorId(idUsuario);
    if (!usuario) {
      throw new Error(`El usuario ${idUsuario} no existe`);
    }

    const entradas = Array.isArray(historial) ? historial.slice(0, TOPE_IMPORTACION) : [];
    const resultados = this.#sanearHistorialImportado(entradas);
    const suma = this.#sanearPerfilImportado(perfil);

    const aplicar = async (db) => {
      const yaImportados = await this.historialRepository.idPartidasDe(idUsuario, db);
      let importados = 0;

      for (const resultado of resultados) {
        if (yaImportados.has(resultado.idPartida)) continue;
        await this.historialRepository.registrarEn(db, {
          id: crypto.randomUUID(),
          idUsuario,
          ...resultado,
        });
        yaImportados.add(resultado.idPartida);
        importados += 1;
      }

      if (suma.hayCambios && (importados > 0 || resultados.length === 0)) {
        await this.usuarioRepository.fusionarPerfilEn(db, idUsuario, suma.valores);
      }

      // omitidos = todo lo que vino menos lo importado: incluye duplicados
      // por idPartida y los resultados sin idPartida (indeducibles).
      return { importados, omitidos: entradas.length - importados };
    };

    const resultado = this.database
      ? await this.database.transaccion(aplicar)
      : await aplicar(this.historialRepository.database.db);

    return { ...resultado, perfil: await this.obtenerPerfil(idUsuario) };
  }

  /** Normaliza la cola del invitado: solo entra lo con idPartida no vacío. */
  #sanearHistorialImportado(entradas) {
    return entradas
      .map((item) => ({
        idPartida: typeof item?.idPartida === "string" && item.idPartida.trim() !== ""
          ? item.idPartida.trim().slice(0, 120)
          : null,
        zona: typeof item?.zona === "string" ? item.zona.trim().slice(0, 50) : null,
        puntaje: Number.isFinite(Number(item?.puntaje)) ? Math.max(0, Math.trunc(Number(item.puntaje))) : null,
        modo: typeof item?.modo === "string" ? item.modo.trim().slice(0, 10) : null,
        ganador: typeof item?.ganador === "string" ? item.ganador.trim().slice(0, 100) : null,
      }))
      .filter((item) => item.idPartida !== null);
  }

  /**
   * Suma del perfil del invitado; valores negativos/no numéricos cuentan como 0.
   * El XP se mide SOLO lo ganado por encima de los XP_INICIAL: el perfil local
   * del invitado nace con 500 igual que la cuenta, y sumarlos en crudo daría
   * 500 XP fantasma a cualquiera que apenas abriera una partida.
   */
  #sanearPerfilImportado(perfil) {
    const entero = (valor) => {
      const numero = Number(valor);
      return Number.isFinite(numero) && numero > 0 ? Math.trunc(numero) : 0;
    };
    const valores = {
      xp: Math.max(0, entero(perfil?.xp) - XP_INICIAL),
      victorias: entero(perfil?.victorias),
      derrotas: entero(perfil?.derrotas),
      racha: entero(perfil?.racha),
      puntajeMax: entero(perfil?.puntajeMax),
    };
    const hayCambios = Object.values(valores).some((v) => v > 0);
    return { valores, hayCambios };
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

module.exports = UsuarioService;