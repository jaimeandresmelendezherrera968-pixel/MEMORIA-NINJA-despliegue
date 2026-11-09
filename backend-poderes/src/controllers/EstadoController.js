/**
 * CONTROLADOR: EstadoController
 *
 * >>> SRP <<<
 * Health check para la barra de estado del menú (Conectado / Servidor /
 * Ping). Solo traduce el estado del proceso a una response JSON: no hay
 * reglas de negocio, por eso no tiene Service asociado.
 */
class EstadoController {
  estado = (req, res) => {
    res.json({
      exito: true,
      estado: "online",
      hora: new Date().toISOString(),
      uptimeSegundos: Math.round(process.uptime()),
    });
  };
}

module.exports = EstadoController;
