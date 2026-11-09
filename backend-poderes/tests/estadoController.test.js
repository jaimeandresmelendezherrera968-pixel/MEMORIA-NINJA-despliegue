const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const EstadoController = require("../src/controllers/EstadoController");

/**
 * >>> SRP del controlador <<<
 * /api/estado es el health check que consume la barra de estado del menú
 * (Conectado / Servidor Online / Ping). Se invoca el handler con un req/res
 * falsos para comprobar el contrato JSON sin levantar el servidor.
 */
function invocarEstado() {
  const controller = new EstadoController();
  let cuerpo = null;
  const res = {
    status(codigo) {
      this.codigo = codigo;
      return this;
    },
    json(valor) {
      cuerpo = valor;
      return this;
    },
  };
  controller.estado({}, res);
  return { cuerpo, codigo: res.codigo };
}

describe("EstadoController (health check /api/estado)", () => {
  it("responde exito:true y estado online", () => {
    const { cuerpo, codigo } = invocarEstado();

    assert.equal(codigo, undefined, "usa el status por defecto (200)");
    assert.equal(cuerpo.exito, true);
    assert.equal(cuerpo.estado, "online");
  });

  it("devuelve la hora en formato ISO y el uptime en segundos", () => {
    const { cuerpo } = invocarEstado();

    assert.ok(!isNaN(Date.parse(cuerpo.hora)), "hora debe ser una fecha ISO válida");
    assert.equal(typeof cuerpo.uptimeSegundos, "number");
    assert.ok(cuerpo.uptimeSegundos >= 0);
  });

  it("no expone datos internos del proceso", () => {
    const { cuerpo } = invocarEstado();

    assert.deepEqual(Object.keys(cuerpo).sort(), [
      "estado",
      "exito",
      "hora",
      "uptimeSegundos",
    ]);
  });
});
