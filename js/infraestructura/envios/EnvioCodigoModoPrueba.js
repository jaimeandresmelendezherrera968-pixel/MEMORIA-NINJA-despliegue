/*=========================================================
  MEMORIA NINJA
  CAPA: INFRAESTRUCTURA -> Envíos
  ARCHIVO: infraestructura/envios/EnvioCodigoModoPrueba.js

  Implementación de IEnviadorCodigo mientras no exista un
  backend de correo real: en vez de enviar un email, muestra el
  código usando el INotificador inyectado.

  Cuando se conecte un backend real, se crea
  "EnvioCodigoPorCorreo.js" implementando el mismo contrato
  (probablemente llamando a una API), y en el composition root
  se cambia una sola línea. VerificacionController y
  RecuperacionController no se tocan.
=========================================================*/

import { IEnviadorCodigo } from "../../core/interfaces/IEnviadorCodigo.js";

export class EnvioCodigoModoPrueba extends IEnviadorCodigo {
  /** @param {import("../../core/interfaces/INotificador.js").INotificador} notificador */
  constructor(notificador) {
    super();
    this.notificador = notificador;
  }

  enviar(correo, codigo) {
    this.notificador.mostrar(
      `Modo de prueba: tu código es ${codigo}\n(esto se quitará cuando haya envío de correo real a ${correo})`,
      "info"
    );
  }
}
