"use strict";

/**
 * Prueba REAL del correo SMTP: manda un correo de prueba usando la misma
 * configuración que el backend (MAILER=smtp + SMTP_* del .env).
 *
 * Uso:
 *   npm run correo:probar                 -> se envía a SMTP_USER (tu propio correo)
 *   npm run correo:probar -- otro@correo.com
 */
require("dotenv").config();

const SmtpNotificadorCorreo = require("../src/infraestructura/SmtpNotificadorCorreo");
const { plantillaCodigo } = require("../src/utils/plantillaCorreo");

async function main() {
  if ((process.env.MAILER || "consola").toLowerCase() !== "smtp") {
    console.error("Poné MAILER=smtp (y SMTP_*) en backend-poderes/.env antes de probar.");
    process.exit(1);
  }

  const para = process.argv[2] || process.env.SMTP_USER;
  if (!para) {
    console.error("Falta el destinatario. Pasá un correo: npm run correo:probar -- alguien@correo.com");
    process.exit(1);
  }

  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  const notificador = new SmtpNotificadorCorreo();

  console.log(`Enviando correo de prueba a ${para} ...`);
  const info = await notificador.enviar({
    para,
    asunto: "Prueba de correo - Memoria Ninja",
    texto: `Prueba de correo.\n\nTu código de prueba es: ${codigo}`,
    html: plantillaCodigo({
      titulo: "Correo de prueba",
      subtitulo: "Si ves este mensaje, el SMTP real está funcionando.",
      codigo,
      vigenciaMin: 10,
    }),
  });

  console.log("OK: correo enviado (id:", info.id + "). Revisá la bandeja de entrada y Spam.");
}

main().catch((err) => {
  console.error("FALLO al enviar:", err.message);
  process.exit(1);
});
