"use strict";

/**
 * Plantilla HTML única de los correos con código (verificación y
 * recuperación). Fuente de verdad del diseño: si cambia el estilo, cambia
 * para todos los correos a la vez.
 */
function plantillaCodigo({ titulo, subtitulo, codigo, vigenciaMin }) {
  const codigoSeparado = String(codigo).split("").join(" ");
  return `<!doctype html>
<html lang="es">
<body style="margin:0;padding:0;background:#0f1115;font-family:Arial,Helvetica,sans-serif;color:#e8e8e8;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f1115;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;background:#1a1d24;border:1px solid #2b2f3a;border-radius:14px;overflow:hidden;">
        <tr><td style="background:#ff4d1a;padding:20px 28px;font-size:20px;font-weight:bold;color:#ffffff;">Memoria Ninja</td></tr>
        <tr><td style="padding:28px;">
          <h1 style="margin:0 0 8px;font-size:18px;color:#ffffff;">${titulo}</h1>
          <p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#b9bfca;">${subtitulo}</p>
          <div style="text-align:center;background:#0f1115;border:1px dashed #3a4050;border-radius:10px;padding:18px;margin:0 0 20px;">
            <span style="font-size:30px;letter-spacing:6px;font-weight:bold;color:#ffb400;font-family:Consolas,Menlo,monospace;">${codigoSeparado}</span>
          </div>
          <p style="margin:0;font-size:13px;color:#8891a3;">Vence en ${vigenciaMin} minutos. Si no fuiste tú, ignora este correo.</p>
        </td></tr>
        <tr><td style="padding:16px 28px;background:#141720;font-size:12px;color:#6b7280;">Correo automático, por favor no responder.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { plantillaCodigo };
