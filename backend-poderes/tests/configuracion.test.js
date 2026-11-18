"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  minutosPositivos,
  resolverMailer,
  esEntornoProduccion,
} = require("../src/utils/configuracion");

describe("configuracion", () => {
  describe("minutosPositivos", () => {
    it("usa el valor cuando es un numero positivo", () => {
      assert.equal(minutosPositivos("1440", 1), 1440);
      assert.equal(minutosPositivos(30, 1), 30);
    });

    it("cae al default con valores invalidos o no positivos", () => {
      assert.equal(minutosPositivos(undefined, 1440), 1440);
      assert.equal(minutosPositivos("", 1440), 1440);
      assert.equal(minutosPositivos("abc", 1440), 1440);
      assert.equal(minutosPositivos("0", 1440), 1440);
      assert.equal(minutosPositivos("-5", 1440), 1440);
      assert.equal(minutosPositivos(NaN, 1440), 1440);
    });
  });

  describe("resolverMailer", () => {
    it("normaliza con trim y minusculas", () => {
      assert.equal(resolverMailer("  SMTP  "), "smtp");
      assert.equal(resolverMailer("Brevo"), "brevo");
    });

    it("rechaza valores desconocidos", () => {
      assert.throws(() => resolverMailer("mailgun"), /MAILER invalido/);
    });

    it("permite consola/ethereal fuera de produccion", () => {
      assert.equal(resolverMailer("consola", { enProduccion: false }), "consola");
      assert.equal(resolverMailer("ethereal", { enProduccion: false }), "ethereal");
    });

    it("rechaza consola/ethereal en produccion", () => {
      assert.throws(
        () => resolverMailer("consola", { enProduccion: true }),
        /no esta permitido en produccion/
      );
      assert.throws(
        () => resolverMailer("ethereal", { enProduccion: true }),
        /no esta permitido en produccion/
      );
    });

    it("permite smtp/brevo en produccion", () => {
      assert.equal(resolverMailer("smtp", { enProduccion: true }), "smtp");
      assert.equal(resolverMailer("brevo", { enProduccion: true }), "brevo");
    });
  });

  describe("esEntornoProduccion", () => {
    it("detecta NODE_ENV=production o RENDER", () => {
      assert.equal(esEntornoProduccion({ NODE_ENV: "production" }), true);
      assert.equal(esEntornoProduccion({ RENDER: "true" }), true);
      assert.equal(esEntornoProduccion({ RENDER: "https://svc" }), true);
      assert.equal(esEntornoProduccion({ NODE_ENV: "test" }), false);
    });
  });
});
