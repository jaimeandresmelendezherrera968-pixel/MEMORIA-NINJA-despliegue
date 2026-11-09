import { ProveedorDatos } from "./ProveedorDatos.js";
import { MockServer } from "../../mock-server.js";

/**
 * Envuelve tu MockServer.js actual (sin tocarlo) para que cumpla el
 * contrato de ProveedorDatos.
 *
 * >>> LSP <<< Se puede reemplazar por cualquier otra implementación
 * (ej. ProveedorDatosServidor) en cualquier lugar donde se use un
 * ProveedorDatos, sin romper nada.
 */
export class ProveedorDatosSimulado extends ProveedorDatos {
    obtenerDatos() {
        return MockServer.getData();
    }
}
