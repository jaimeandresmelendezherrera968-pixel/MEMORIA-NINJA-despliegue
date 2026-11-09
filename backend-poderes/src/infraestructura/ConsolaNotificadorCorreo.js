const NotificadorCorreo = require("./NotificadorCorreo");

/**
 * Notificador de PRUEBAS: imprime el correo (y el código) en la consola
 * del servidor. Ideal para el desarrollo en este PC sin SMTP real.
 */
class ConsolaNotificadorCorreo extends NotificadorCorreo {
  enviar({ para, asunto, texto }) {
    const separador = "=".repeat(60);
    console.log(separador);
    console.log(`>> CORREO (para: ${para})`);
    console.log(`>> Asunto: ${asunto}`);
    console.log(separador);
    console.log(texto);
    console.log(separador);
    return Promise.resolve();
  }
}

module.exports = ConsolaNotificadorCorreo;