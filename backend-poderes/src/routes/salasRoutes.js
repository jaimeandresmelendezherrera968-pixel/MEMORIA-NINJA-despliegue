const express = require("express");
const {
  CODIGO_VALIDO,
  construirUrlCompartir,
  generarQrDataUrl,
  obtenerIpsLocales,
} = require("../utils/compartirSala");

module.exports = function crearRutasSalas() {
  const router = express.Router();

  router.get("/salas/:codigo/compartir", async (req, res) => {
    const codigo = String(req.params.codigo || "").trim().toUpperCase();
    if (!CODIGO_VALIDO.test(codigo)) {
      return res.status(400).json({ exito: false, error: "Código de sala inválido" });
    }

    try {
      // En producción el frontend vive en Vercel: el QR debe apuntar ahí,
      // no al host interno de Render.
      const basePublica = String(process.env.PUBLIC_FRONTEND_URL || "").replace(/\/+$/, "");
      const url = basePublica
        ? `${basePublica}/menu.html?codigo=${encodeURIComponent(codigo)}`
        : construirUrlCompartir({
            codigo,
            protocolo: req.protocol,
            host: req.get("host"),
            ips: obtenerIpsLocales(),
          });
      const qrDataUrl = await generarQrDataUrl(url);
      return res.json({ exito: true, codigo, url, qrDataUrl });
    } catch (error) {
      return res.status(500).json({ exito: false, error: "No se pudo generar el QR" });
    }
  });

  return router;
};
