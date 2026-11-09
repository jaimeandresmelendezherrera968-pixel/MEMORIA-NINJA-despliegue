const NotificadorCorreo = require("./NotificadorCorreo");

/**
 * Notificador de DEMO con Ethereal (https://ethereal.email): correos que
 * NUNCA llegan a nadie pero se pueden abrir en la URL de vista previa.
 * El transporte se crea de forma perezosa en el primer envío.
 */
class EtherealNotificadorCorreo extends NotificadorCorreo {
  #transporte = null;
  #informacionEnvio = null;

  async #obtenerTransporte() {
    if (this.#transporte) return this.#transporte;
    const nodemailer = require("nodemailer");
    const cuenta = await nodemailer.createTestAccount();
    this.#transporte = nodemailer.createTransport({
      host: cuenta.smtp.host,
      port: cuenta.smtp.port,
      secure: cuenta.smtp.secure,
      auth: { user: cuenta.user, pass: cuenta.pass },
    });
    return this.#transporte;
  }

  async enviar({ para, asunto, texto }) {
    const transporte = await this.#obtenerTransporte();
    const info = await transporte.sendMail({
      from: "Memoria Ninja <no-reply@memoria-ninja.example>",
      to: para,
      subject: asunto,
      text: texto,
    });
    const url = info && require("nodemailer").getTestMessageUrl(info);
    if (url) {
      console.log("Ethereal: vista previa del correo ->", url);
    }
    return { id: info.messageId, url };
  }
}

module.exports = EtherealNotificadorCorreo;