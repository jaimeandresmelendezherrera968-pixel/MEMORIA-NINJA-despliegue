const os = require("os");
const QRCode = require("qrcode");

const CODIGO_VALIDO = /^[A-Z0-9]{4,12}$/;

function esHostLocal(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function obtenerIpsLocales() {
  const ips = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const red of interfaces || []) {
      if (red.family === "IPv4" && !red.internal) ips.push(red.address);
    }
  }
  return ips;
}

/**
 * Arma el enlace que se comparte por QR. Si el host de la petición es local,
 * lo reemplaza por la IP LAN para que el celular pueda abrir el lobby.
 */
function construirUrlCompartir({ codigo, protocolo = "http", host, ips = [] }) {
  const codigoNormalizado = String(codigo || "").trim().toUpperCase();
  if (!CODIGO_VALIDO.test(codigoNormalizado)) {
    throw new Error("Código de sala inválido");
  }

  const hostLimpio = String(host || "localhost:3000").trim();
  const [hostname, puerto] = hostLimpio.split(":");
  const protocoloLimpio = protocolo === "https" ? "https" : "http";

  let hostFinal = hostLimpio;
  if (esHostLocal(hostname)) {
    const ipLan = ips.find((ip) => /^\d{1,3}(\.\d{1,3}){3}$/.test(ip));
    if (ipLan) hostFinal = `${ipLan}:${puerto || "3000"}`;
  }

  return `${protocoloLimpio}://${hostFinal}/menu.html?codigo=${encodeURIComponent(codigoNormalizado)}`;
}

async function generarQrDataUrl(url) {
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
    color: { dark: "#101018", light: "#f5efe0" },
  });
}

module.exports = {
  CODIGO_VALIDO,
  construirUrlCompartir,
  generarQrDataUrl,
  obtenerIpsLocales,
};
