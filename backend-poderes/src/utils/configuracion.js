const MAILERS_VALIDOS = new Set(["consola", "ethereal", "smtp", "brevo"]);
const MAILERS_SOLO_DESARROLLO = new Set(["consola", "ethereal"]);

function minutosPositivos(valor, porDefecto) {
  const numero = Number(valor);
  if (Number.isFinite(numero) && numero > 0) return numero;
  return porDefecto;
}

function resolverMailer(valor, opciones = {}) {
  const { enProduccion = false } = opciones;
  const normalizado = String(valor ?? "consola").trim().toLowerCase();

  if (!MAILERS_VALIDOS.has(normalizado)) {
    throw new Error(
      'MAILER invalido: "' + valor + '". Valores permitidos: consola, ethereal, smtp, brevo.'
    );
  }

  if (enProduccion && MAILERS_SOLO_DESARROLLO.has(normalizado)) {
    throw new Error(
      "MAILER=" + normalizado + " no esta permitido en produccion. Usa smtp o brevo."
    );
  }

  return normalizado;
}

function esEntornoProduccion(env = process.env) {
  return env.NODE_ENV === "production" || env.RENDER === "true" || Boolean(env.RENDER);
}

module.exports = {
  minutosPositivos,
  resolverMailer,
  esEntornoProduccion,
  MAILERS_VALIDOS,
  MAILERS_SOLO_DESARROLLO,
};
