import { FormularioControllerBase } from "./FormularioControllerBase.js";

export class RegistroController extends FormularioControllerBase {

    constructor(registroService, notificador) {
        super(notificador);
        this.registroService = registroService;
    }

    async manejarEnvio(datos) {

        const {
            datosFormulario,
            aceptaTerminos,
            aceptaPolitica
        } = datos;

        try {

            if (!aceptaTerminos) {
                throw new Error(
                    "Debes aceptar los Términos y Condiciones."
                );
            }

            if (!aceptaPolitica) {
                throw new Error(
                    "Debes aceptar la Política de Privacidad."
                );
            }

            await this.registroService.registrar(
                datosFormulario
            );

            this.notificador.mostrar(
                "Registro exitoso. Revisa tu correo para el código de verificación.",
                "exito"
            );

            return true;

        } catch (error) {

            this.notificador.mostrar(
                error.message,
                "error"
            );

            return false;
        }
    }
}