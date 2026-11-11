"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const BrevoNotificadorCorreo = require("../src/infraestructura/BrevoNotificadorCorreo");

/** Doble de fetch: no abre red, registra la petición y devuelve una respuesta. */
function fetchFalso({ ok = true, status = 201, json = { messageId: "msg-123" } } = {}) {
  const llamadas = [];
  const fn = async (url, opciones) => {
    llamadas.push({ url, opciones });
    return {
      ok,
      status,
      json: async () => json,
    };
  };
  fn.llamadas = llamadas;
  return fn;
}

function configValida(extra = {}) {
  return {
    apiKey: "xkeysib-de-prueba",
    sender: { email: "yo@correo.com", name: "Memoria Ninja" },
    endpoint: "https://api.brevo.com/v3/smtp/email",
    timeoutMs: 5000,
    ...extra,
  };
}

describe("BrevoNotificadorCorreo (unitario, sin red)", () => {
  it("enviar() hace POST a la API con api-key y devuelve el messageId", async () => {
    const fetchImpl = fetchFalso();
    const notificador = new BrevoNotificadorCorreo({
      fetchImpl,
      config: configValida(),
    });

    const resultado = await notificador.enviar({
      para: "alguien@correo.com",
      asunto: "Hola",
      texto: "texto plano",
      html: "<b>html</b>",
    });

    assert.equal(resultado.id, "msg-123");
    assert.equal(fetchImpl.llamadas.length, 1);

    const [llamada] = fetchImpl.llamadas;
    assert.equal(llamada.url, "https://api.brevo.com/v3/smtp/email");
    assert.equal(llamada.opciones.method, "POST");
    assert.equal(llamada.opciones.headers["api-key"], "xkeysib-de-prueba");
    assert.equal(llamada.opciones.headers["content-type"], "application/json");

    const cuerpo = JSON.parse(llamada.opciones.body);
    assert.deepEqual(cuerpo.sender, { email: "yo@correo.com", name: "Memoria Ninja" });
    assert.deepEqual(cuerpo.to, [{ email: "alguien@correo.com" }]);
    assert.equal(cuerpo.subject, "Hola");
    assert.equal(cuerpo.textContent, "texto plano");
    assert.equal(cuerpo.htmlContent, "<b>html</b>");
  });

  it("enviar() sin html manda solo textContent", async () => {
    const fetchImpl = fetchFalso();
    const notificador = new BrevoNotificadorCorreo({
      fetchImpl,
      config: configValida(),
    });

    await notificador.enviar({ para: "x@y.com", asunto: "S", texto: "t" });

    const cuerpo = JSON.parse(fetchImpl.llamadas[0].opciones.body);
    assert.equal(cuerpo.htmlContent, undefined);
    assert.equal(cuerpo.textContent, "t");
  });

  it("falla con el estado y el detalle si Brevo responde error", async () => {
    const fetchImpl = fetchFalso({
      ok: false,
      status: 401,
      json: { code: "unauthorized", message: "Key not found" },
    });
    const notificador = new BrevoNotificadorCorreo({
      fetchImpl,
      config: configValida(),
    });

    await assert.rejects(
      () => notificador.enviar({ para: "x@y.com", asunto: "S", texto: "t" }),
      /Brevo respondió 401: Key not found/
    );
  });

  it("falla con un error claro si falta BREVO_API_KEY y no llama a fetch", async () => {
    const fetchImpl = fetchFalso();
    const notificador = new BrevoNotificadorCorreo({
      fetchImpl,
      config: configValida({ apiKey: "" }),
    });

    await assert.rejects(
      () => notificador.enviar({ para: "x@y.com", asunto: "S", texto: "t" }),
      /falta BREVO_API_KEY/
    );
    assert.equal(fetchImpl.llamadas.length, 0);
  });

  it("falla con un error claro si falta el remitente verificado", async () => {
    const notificador = new BrevoNotificadorCorreo({
      fetchImpl: fetchFalso(),
      config: configValida({ sender: { email: "", name: "Memoria Ninja" } }),
    });

    await assert.rejects(
      () => notificador.enviar({ para: "x@y.com", asunto: "S", texto: "t" }),
      /falta BREVO_SENDER_EMAIL/
    );
  });

  describe("desdeEntorno() deduce apiKey, remitente y endpoint", () => {
    const claves = [
      "BREVO_API_KEY",
      "BREVO_SENDER_EMAIL",
      "BREVO_SENDER_NAME",
      "BREVO_ENDPOINT",
      "BREVO_TIMEOUT_MS",
    ];
    let respaldo;

    beforeEach(() => {
      respaldo = {};
      for (const k of claves) {
        respaldo[k] = process.env[k];
        delete process.env[k];
      }
    });

    afterEach(() => {
      for (const k of claves) {
        if (respaldo[k] === undefined) delete process.env[k];
        else process.env[k] = respaldo[k];
      }
    });

    it("usa los valores del entorno y defaults sensatos", () => {
      process.env.BREVO_API_KEY = "k";
      process.env.BREVO_SENDER_EMAIL = "a@b.com";

      const config = BrevoNotificadorCorreo.desdeEntorno();
      assert.equal(config.apiKey, "k");
      assert.deepEqual(config.sender, { email: "a@b.com", name: "Memoria Ninja" });
      assert.equal(config.endpoint, "https://api.brevo.com/v3/smtp/email");
      assert.equal(config.timeoutMs, 10000);
    });

    it("respeta nombre, endpoint y timeout personalizados", () => {
      process.env.BREVO_SENDER_EMAIL = "a@b.com";
      process.env.BREVO_SENDER_NAME = "Soporte Ninja";
      process.env.BREVO_ENDPOINT = "https://proxy.local/brevo";
      process.env.BREVO_TIMEOUT_MS = "2500";

      const config = BrevoNotificadorCorreo.desdeEntorno();
      assert.equal(config.sender.name, "Soporte Ninja");
      assert.equal(config.endpoint, "https://proxy.local/brevo");
      assert.equal(config.timeoutMs, 2500);
    });
  });
});
