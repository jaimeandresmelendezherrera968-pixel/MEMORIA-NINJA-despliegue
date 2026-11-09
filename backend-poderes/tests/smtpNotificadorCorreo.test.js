"use strict";

const { describe, it, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const SmtpNotificadorCorreo = require("../src/infraestructura/SmtpNotificadorCorreo");

/** Doble de transporte: no abre red, solo registra lo que se le envía. */
function transporteFalso() {
  const capturado = {};
  return {
    capturado,
    sendMail(opciones) {
      Object.assign(capturado, opciones);
      return Promise.resolve({ messageId: "id-de-prueba" });
    },
  };
}

describe("SmtpNotificadorCorreo (unitario, sin red)", () => {
  it("enviar() usa el transporte inyectado y devuelve el id", async () => {
    const transporte = transporteFalso();
    const notificador = new SmtpNotificadorCorreo({
      transporte,
      config: { from: "Memoria Ninja <x@y.com>", auth: { user: "x@y.com", pass: "p" } },
    });

    const resultado = await notificador.enviar({
      para: "alguien@correo.com",
      asunto: "Hola",
      texto: "texto plano",
      html: "<b>html</b>",
    });

    assert.equal(resultado.id, "id-de-prueba");
    assert.equal(transporte.capturado.to, "alguien@correo.com");
    assert.equal(transporte.capturado.subject, "Hola");
    assert.equal(transporte.capturado.text, "texto plano");
    assert.equal(transporte.capturado.html, "<b>html</b>");
    assert.equal(transporte.capturado.from, "Memoria Ninja <x@y.com>");
  });

  it("enviar() sin html deja html undefined", async () => {
    const transporte = transporteFalso();
    const notificador = new SmtpNotificadorCorreo({
      transporte,
      config: { from: "a@b.com", auth: { user: "a@b.com", pass: "p" } },
    });

    await notificador.enviar({ para: "x@y.com", asunto: "S", texto: "t" });
    assert.equal(transporte.capturado.html, undefined);
  });

  it("falla con un error claro si faltan SMTP_USER/SMTP_PASS (sin transporte inyectado)", async () => {
    const notificador = new SmtpNotificadorCorreo({
      config: { from: "a@b.com", auth: { user: "", pass: "" } },
    });

    await assert.rejects(
      () => notificador.enviar({ para: "x@y.com", asunto: "S", texto: "t" }),
      /SMTP mal configurado/
    );
  });

  describe("desdeEntorno() deduce secure y remitente", () => {
    const claves = ["SMTP_SERVICE", "SMTP_HOST", "SMTP_PORT", "SMTP_SECURE", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];
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

    it("puerto 465 => secure true; deriva el from del SMTP_USER", () => {
      process.env.SMTP_HOST = "smtp.gmail.com";
      process.env.SMTP_PORT = "465";
      process.env.SMTP_USER = "yo@gmail.com";
      process.env.SMTP_PASS = "clave-app";
      const config = SmtpNotificadorCorreo.desdeEntorno();
      assert.equal(config.secure, true);
      assert.equal(config.from, "Memoria Ninja <yo@gmail.com>");
    });

    it("puerto 587 => secure false", () => {
      process.env.SMTP_PORT = "587";
      process.env.SMTP_USER = "yo@gmail.com";
      process.env.SMTP_PASS = "clave-app";
      assert.equal(SmtpNotificadorCorreo.desdeEntorno().secure, false);
    });

    it("SMTP_SECURE explícito manda sobre el puerto", () => {
      process.env.SMTP_PORT = "587";
      process.env.SMTP_SECURE = "true";
      process.env.SMTP_USER = "yo@gmail.com";
      process.env.SMTP_PASS = "clave-app";
      assert.equal(SmtpNotificadorCorreo.desdeEntorno().secure, true);
    });

    it("SMTP_FROM personalizado se respeta", () => {
      process.env.SMTP_FROM = "Soporte <soporte@ninja.com>";
      assert.equal(SmtpNotificadorCorreo.desdeEntorno().from, "Soporte <soporte@ninja.com>");
    });
  });
});
