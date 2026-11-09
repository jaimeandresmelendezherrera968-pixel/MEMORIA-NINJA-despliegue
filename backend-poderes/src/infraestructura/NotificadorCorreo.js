/**
 * ABSTRACCIÓN: NotificadorCorreo
 *
 * Contrato de envío de correo. En servidor de pruebas se implementa con
 * la consola (MAILER=consola); en demo/producción con Ethereal o SMTP.
 * Los Services dependen de ESTA abstracción, nunca de nodemailer.
 */
class NotificadorCorreo {
  enviar(datos) {
    throw new Error("enviar() no implementado");
  }
}

module.exports = NotificadorCorreo;