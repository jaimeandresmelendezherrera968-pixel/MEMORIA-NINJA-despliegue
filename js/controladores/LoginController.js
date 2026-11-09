/*=========================================================
  MEMORIA NINJA
  CAPA: CONTROLADORES (presentación)
  ARCHIVO: controladores/LoginController.js

  HERENCIA: extiende FormularioControllerBase (ES-UN
  formulario controller).

  POLIMORFISMO / LSP: manejarEnvio(datos) recibe SIEMPRE un
  único objeto — misma firma que el resto de controladores
  (RegistroController, VerificacionController,
  RecuperacionController), aunque cada uno haga algo distinto
  con su contenido. Así cualquiera de los 4 es sustituible
  donde se espere un FormularioControllerBase.

  DIP: recibe AutenticacionService, SesionService y un
  INotificador ya construidos (inyección por constructor).
=========================================================*/

import { FormularioControllerBase } from "./FormularioControllerBase.js";
import { sincronizacionInvitado } from "../services/SincronizacionInvitadoService.js";

export class LoginController extends FormularioControllerBase {
  constructor(autenticacionService, sesionService, notificador) {
    super(notificador);
    this.autenticacionService = autenticacionService;
    this.sesionService = sesionService;
  }

  /**
   * @param {{ usuario: string, password: string, recordar: boolean }} datos
   */
  async manejarEnvio(datos) {
    const { usuario, password, recordar } = datos;

    try {
      const usuarioValido = await this.autenticacionService.iniciarSesion(
        usuario,
        password
      );

      this.notificador.mostrar("Acceso concedido ⚡", "exito");

      // La sesión real vive en la cookie httpOnly que fijó el servidor.
      // Igualmente se guarda una copia del usuario en localStorage para
      // que el menú y el perfil sepan QUIÉN está jugando (mismo-origen).
      this.sesionService.guardarSesion(usuarioValido);

      // SUB-PARTE 3.5: si vino de jugar como invitado, sube la cola local
      // y el perfil del invitado a esta cuenta (best-effort, nunca lanza
      // y no retrasa la navegación de forma perceptible).
      await sincronizacionInvitado.sincronizar(usuarioValido.id);

      setTimeout(() => {
        window.location.href = "menu.html";
      }, 800);
    } catch (error) {
      this.notificador.mostrar(error.message, "error");
    }
  }
}
