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

            const resultado = await this.registroService.registrar(
                datosFormulario
            );

            if (resultado && resultado.correoEnviado === false) {
                this.notificador.mostrar(
                    resultado.aviso || "Cuenta creada, pero no pudimos enviar el correo; reenvia el codigo desde verificacion.",
                    "error"
                );
            } else {
                this.notificador.mostrar(
                    "Registro exitoso. Revisa tu correo para el código de verificación.",
                    "exito"
                );
            }

            return { exito: true, ...(resultado || {}) };

        } catch (error) {

            this.notificador.mostrar(
                error.message,
                "error"
            );

            return { exito: false };
        }
    }
}
