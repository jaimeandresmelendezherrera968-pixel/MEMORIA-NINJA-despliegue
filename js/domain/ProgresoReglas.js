/*=========================================================
  MEMORIA NINJA
  CAPA: NÚCLEO (Dominio) -> Reglas puras del progreso
  ARCHIVO: domain/ProgresoReglas.js

  Reglas de la experiencia (XP) escritas UNA sola vez y sin
  dependencias, para que el navegador y el backend compartan
  exactamente la misma contabilidad:

  - Cualquier cuenta nueva nace con XP_INICIAL (500) y el resto
    de las estadísticas en 0.
  - Cada victoria de 1 jugador suma XP_POR_VICTORIA (100).
  - Cada derrota suma una derrota y pone la racha en 0.
  - El puntaje máximo guarda el mejor puntaje de la cuenta.
  - El nivel sube cada XP_POR_NIVEL (1000) XP.

  (Espejo exacto de XP_POR_VICTORIA en
   backend-poderes/src/services/UsuarioService.js.)
=========================================================*/

/** Cuenta que juega sin iniciar sesión: progreso solo local. */
export const ID_INVITADO = "invitado";

/** XP con la que nace toda cuenta. */
export const XP_INICIAL = 500;

/** XP fija que se gana por cada victoria de 1 jugador. */
export const XP_POR_VICTORIA = 100;

/** XP necesaria para subir de nivel. */
export const XP_POR_NIVEL = 1000;

/** Perfil recién creado (cuenta nueva o invitado). */
export function perfilPorDefecto() {
  return {
    xp: XP_INICIAL,
    victorias: 0,
    derrotas: 0,
    racha: 0,
    puntajeMax: 0,
  };
}

/** Nivel que corresponde a una cantidad de XP (1-based). */
export function nivelDe(xp) {
  return Math.floor((xp || 0) / XP_POR_NIVEL) + 1;
}

/**
 * Devuelve el perfil resultante de cerrar una partida, sin mutar el original.
 * `victoria` debe llegar como booleano real: cualquier otra cosa cuenta
 * como derrota (mismo criterio que el backend).
 */
export function aplicarFinPartida(perfil, { victoria, puntaje } = {}) {
  const base = perfil || perfilPorDefecto();
  const gano = victoria === true;
  const puntajeValido = Number.isFinite(Number(puntaje)) ? Number(puntaje) : 0;

  return {
    xp: (base.xp || 0) + (gano ? XP_POR_VICTORIA : 0),
    victorias: (base.victorias || 0) + (gano ? 1 : 0),
    derrotas: (base.derrotas || 0) + (gano ? 0 : 1),
    racha: gano ? (base.racha || 0) + 1 : 0,
    puntajeMax: Math.max(base.puntajeMax || 0, puntajeValido),
  };
}
