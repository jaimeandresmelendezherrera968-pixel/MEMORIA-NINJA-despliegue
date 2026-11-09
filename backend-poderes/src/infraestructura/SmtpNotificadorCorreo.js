const NotificadorCorreo = require("./NotificadorCorreo");

/**
 * Notificador de PRODUCCIÓN por SMTP real (Gmail, Resend, Brevo, etc.).
 *
 * Lee la configuración de las variables de entorno SMTP_* y crea el
 * transporte de nodemailer de forma PEREZOSA (recién en el primer envío),
 * así la app arranca aunque todavía no haya correos por mandar.
 *
 * El transporte es inyectable (constructor `{ transporte }`) para poder
 * testear con un doble sin abrir conexiones de red.
 */
class SmtpNotificadorCorreo extends NotificadorCorreo {
  #transporte;
  #config;

  constructor({ transporte = null, config = null } = {}) {
    super();
    this.#transporte = transporte;
    this.#config = config || SmtpNotificadorCorreo.desdeEntorno();
  }

  /** Arma la configuración a partir de las variables SMTP_* del entorno. */
  static desdeEntorno() {
    const puerto = Number(process.env.SMTP_PORT || 587);
    const seguro =
      process.env.SMTP_SECURE != null
        ? String(process.env.SMTP_SECURE).toLowerCase() === "true"
        : puerto === 465;

    return {
      service: process.env.SMTP_SERVICE || undefined,
      host: process.env.SMTP_HOST,
      port: puerto,
      secure: seguro,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      from:
        process.env.SMTP_FROM ||
        `Memoria Ninja <${process.env.SMTP_USER || "no-reply@memoria-ninja.example"}>`,
    };
  }

  #obtenerTransporte() {
    if (this.#transporte) return this.#transporte;

    const { service, host, port, secure, auth } = this.#config;
    if (!auth.user || !auth.pass) {
      throw new Error(
        "SMTP mal configurado: faltan SMTP_USER/SMTP_PASS. Revisa tu .env (usa una contraseña de aplicación)."
      );
    }

    const nodemailer = require("nodemailer");
    const opciones = service
      ? { service, auth }
      : { host, port, secure, auth };

    this.#transporte = nodemailer.createTransport(opciones);
    return this.#transporte;
  }

  async enviar({ para, asunto, texto, html }) {
    const transporte = this.#obtenerTransporte();
    const info = await transporte.sendMail({
      from: this.#config.from,
      to: para,
      subject: asunto,
      text: texto,
      html: html || undefined,
    });
    return { id: info && info.messageId };
  }
}

module.exports = SmtpNotificadorCorreo;
