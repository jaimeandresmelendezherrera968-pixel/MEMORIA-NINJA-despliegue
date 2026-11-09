/**
 * INTERFAZ: ProveedorDatos
 *
 * >>> ABSTRACCIÓN + ISP <<<
 * Un solo método: obtenerDatos(). El día que haya un servidor real,
 * se crea ProveedorDatosServidor.js con este mismo método (por
 * ejemplo, haciendo fetch a un backend real) y GestorPartida ni se
 * entera del cambio — sigue llamando exactamente lo mismo.
 *
 * notificarPoder() es un método OPCIONAL (no lo necesita toda
 * implementación): sirve para que el motor avise al servidor cuando
 * un poder se activa. La base lo define como no-op para que cualquier
 * implementación que no hable con un servidor simplemente lo herede.
 */
export class ProveedorDatos {
    obtenerDatos() {
        throw new Error("obtenerDatos() no implementado");
    }

    /** OPCIONAL: avisa al servidor del uso de un poder. No-op por defecto. */
    async notificarPoder() {
        return { enviado: false, motivo: "sin_servidor" };
    }
}
