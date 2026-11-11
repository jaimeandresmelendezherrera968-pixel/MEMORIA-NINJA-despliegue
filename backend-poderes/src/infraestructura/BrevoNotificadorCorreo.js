const NotificadorCorreo = require("./NotificadorCorreo");

/**
 * Notificador de PRODUCCIÓN por la API HTTPS de Brevo.
 *
 * Render free bloquea los puertos SMTP (25/465/587), así que el correo real
 * sale por HTTPS (443) contra https://api.brevo.com/v3/smtp/email con la
 * cabecera `api-key`.
 *
 * El fetch es inyectable (`{ fetchImpl }`) para poder testear sin red.
 */
class BrevoNotificadorCorreo extends NotificadorCorreo {
  #fetchImpl;
  #config;

  constructor({ fetchImpl = null, config = null } = {}) {
    super();
    this.#fetchImpl = fetchImpl;
    this.#config = config || BrevoNotificadorCorreo.desdeEntorno();
  }

  /** Arma la configuración a partir de las variables BREVO_* del entorno. */
  static desdeEntorno() {
    return {
      apiKey: process.env.BREVO_API_KEY || "",
      sender: {
        email: process.env.BREVO_SENDER_EMAIL || "",
        name: process.env.BREVO_SENDER_NAME || "Memoria Ninja",
      },
      endpoint: process.env.BREVO_ENDPOINT || "https://api.brevo.com/v3/smtp/email",
      timeoutMs: Number(process.env.BREVO_TIMEOUT_MS || 10000),
    };
  }

  #obtenerFetch() {
    const fetchImpl = this.#fetchImpl || globalThis.fetch;
    if (typeof fetchImpl !== "function") {
      throw new Error(
        "Brevo requiere fetch global (Node 18+) o un fetchImpl inyectado."
      );
    }
    return fetchImpl;
  }

  async enviar({ para, asunto, texto, html }) {
    const { apiKey, sender, endpoint, timeoutMs } = this.#config;

    if (!apiKey) {
      throw new Error(
        "Brevo mal configurado: falta BREVO_API_KEY. Generala en Brevo > SMTP & API > API Keys."
      );
    }
    if (!sender || !sender.email) {
      throw new Error(
        "Brevo mal configurado: falta BREVO_SENDER_EMAIL (el remitente verificado en Brevo)."
      );
    }

    const cuerpo = {
      sender,
      to: [{ email: para }],
      subject: asunto,
    };
    if (html) cuerpo.htmlContent = html;
    if (texto) cuerpo.textContent = texto;
    if (!cuerpo.htmlContent && !cuerpo.textContent) cuerpo.textContent = " ";

    const fetchImpl = this.#obtenerFetch();
    const abortador = new AbortController();
    const temporizador = setTimeout(() => abortador.abort(), timeoutMs);

    let respuesta;
    try {
      respuesta = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          "api-key": apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(cuerpo),
        signal: abortador.signal,
      });
    } finally {
      clearTimeout(temporizador);
    }

    let datos = null;
    try {
      datos = await respuesta.json();
    } catch (error) {}

    if (!respuesta.ok) {
      const detalle =
        (datos && (datos.message || datos.code)) || "sin detalle";
      throw new Error(`Brevo respondió ${respuesta.status}: ${detalle}`);
    }

    return { id: datos && datos.messageId ? datos.messageId : null };
  }
}

module.exports = BrevoNotificadorCorreo;
