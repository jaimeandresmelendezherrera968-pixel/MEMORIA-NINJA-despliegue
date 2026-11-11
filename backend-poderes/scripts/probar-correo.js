"use strict";

/**
 * Prueba REAL del correo: manda un correo de prueba usando la misma
 * configuración que el backend.
 *
 *   MAILER=smtp  -> usa SMTP_* (Gmail/Resend; ojo: Render free bloquea SMTP)
 *   MAILER=brevo -> usa BREVO_* (API HTTPS, la opción que funciona en Render)
 *
 * Uso:
 *   npm run correo:probar                 -> se envía al remitente configurado
 *   npm run correo:probar -- otro@correo.com
 */
require("dotenv").config();

const SmtpNotificadorCorreo = require("../src/infraestructura/SmtpNotificadorCorreo");
const BrevoNotificadorCorreo = require("../src/infraestructura/BrevoNotificadorCorreo");
const { plantillaCodigo } = require("../src/utils/plantillaCorreo");

async function main() {
  const mailer = (process.env.MAILER || "consola").toLowerCase();
  if (mailer !== "smtp" && mailer !== "brevo") {
    console.error(
      "Poné MAILER=smtp (SMTP_*) o MAILER=brevo (BREVO_*) en backend-poderes/.env antes de probar."
    );
    process.exit(1);
  }

  const porDefecto =
    mailer === "brevo" ? process.env.BREVO_SENDER_EMAIL : process.env.SMTP_USER;
  const para = process.argv[2] || porDefecto;
  if (!para) {
    console.error(
      "Falta el destinatario. Pasá un correo: npm run correo:probar -- alguien@correo.com"
    );
    process.exit(1);
  }

  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  const notificador =
    mailer === "brevo"
      ? new BrevoNotificadorCorreo()
      : new SmtpNotificadorCorreo();

  console.log(`Enviando correo de prueba (${mailer}) a ${para} ...`);
  const info = await notificador.enviar({
    para,
    asunto: "Prueba de correo - Memoria Ninja",
    texto: `Prueba de correo.\n\nTu código de prueba es: ${codigo}`,
    html: plantillaCodigo({
      titulo: "Correo de prueba",
      subtitulo: "Si ves este mensaje, el envío real está funcionando.",
      codigo,
      vigenciaMin: 10,
    }),
  });

  console.log(
    "OK: correo enviado (id:",
    (info && info.id) || "sin id",
    "). Revisá la bandeja de entrada y Spam."
  );
}

main().catch((err) => {
  console.error("FALLO al enviar:", err.message);
  process.exit(1);
});
