/*=========================================================
  MEMORIA NINJA
  CAPA: NÚCLEO (Core) -> Interfaz / Contrato
  ARCHIVO: core/interfaces/INotificador.js

  ISP: es una interfaz pequeña y específica (un solo método),
  pensada solo para "avisar algo al usuario". No obliga a
  ninguna clase a implementar métodos que no necesita, como
  pasaría con una interfaz gigante de "UIManager" que mezclara
  notificaciones, temporizadores, modales, etc.

  DIP: los controladores dependen de esta abstracción, no de
  si el mensaje se muestra con alert(), en un <span>, o con un
  toast. Se puede cambiar la implementación sin tocar al
  controlador.
=========================================================*/

export class INotificador {
  constructor() {
    if (new.target === INotificador) {
      throw new Error(
        "INotificador es una interfaz y no se puede instanciar directamente."
      );
    }
  }

  /**
   * @param {string} mensaje
   * @param {"info"|"exito"|"error"} tipo
   */
  mostrar(_mensaje, _tipo) {
    throw new Error("mostrar() debe ser implementado por la subclase.");
  }
}
