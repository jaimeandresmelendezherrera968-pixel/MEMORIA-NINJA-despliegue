const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");

const {
  construirUrlCompartir,
  generarQrDataUrl,
} = require("../src/utils/compartirSala");
const crearRutasSalas = require("../src/routes/salasRoutes");

async function levantarServidor() {
  const app = express();
  app.use("/api", crearRutasSalas());
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  return {
    base: `http://127.0.0.1:${server.address().port}`,
    cerrar: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("compartirSala: usa localhost cuando no hay IP LAN", () => {
  const url = construirUrlCompartir({
    codigo: "abc123",
    protocolo: "http",
    host: "localhost:3000",
    ips: [],
  });
  assert.equal(url, "http://localhost:3000/menu.html?codigo=ABC123");
});

test("compartirSala: reemplaza localhost por la IP LAN para el celular", () => {
  const url = construirUrlCompartir({
    codigo: "ABC123",
    protocolo: "http",
    host: "localhost:3000",
    ips: ["192.168.1.42"],
  });
  assert.equal(url, "http://192.168.1.42:3000/menu.html?codigo=ABC123");
});

test("compartirSala: respeta un host que ya es accesible desde la red", () => {
  const url = construirUrlCompartir({
    codigo: "ABC123",
    protocolo: "https",
    host: "memoria.local:8443",
    ips: ["192.168.1.42"],
  });
  assert.equal(url, "https://memoria.local:8443/menu.html?codigo=ABC123");
});

test("compartirSala: rechaza códigos inválidos", () => {
  assert.throws(
    () => construirUrlCompartir({ codigo: "<script>", host: "localhost:3000" }),
    /inválido/
  );
});

test("compartirSala: genera un QR PNG en data URL", async () => {
  const dataUrl = await generarQrDataUrl("http://192.168.1.42:3000/menu.html?codigo=ABC123");
  assert.match(dataUrl, /^data:image\/png;base64,/);
  assert.ok(dataUrl.length > 200);
});

test("ruta compartir: devuelve el enlace y el QR", async (t) => {
  const { base, cerrar } = await levantarServidor();
  t.after(cerrar);

  const respuesta = await fetch(`${base}/api/salas/abc123/compartir`);
  assert.equal(respuesta.status, 200);
  const datos = await respuesta.json();
  const url = new URL(datos.url);
  assert.equal(datos.exito, true);
  assert.equal(datos.codigo, "ABC123");
  assert.equal(url.pathname, "/menu.html");
  assert.equal(url.searchParams.get("codigo"), "ABC123");
  assert.match(datos.qrDataUrl, /^data:image\/png;base64,/);
});

test("ruta compartir: responde 400 con un c�digo inv�lido", async (t) => {
  const { base, cerrar } = await levantarServidor();
  t.after(cerrar);

  const respuesta = await fetch(`${base}/api/salas/NO-VALE!/compartir`);
  assert.equal(respuesta.status, 400);
  const datos = await respuesta.json();
  assert.equal(datos.exito, false);
});
