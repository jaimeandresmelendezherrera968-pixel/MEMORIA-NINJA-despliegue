/*=========================================================
  MEMORIA NINJA
  CAPA: NÚCLEO (Core) -> Entidad
  ARCHIVO: core/entities/Usuario.js

  Representa a un usuario del sistema.

  ENCAPSULAMIENTO:
  Los campos son privados (#) y solo se exponen mediante
  getters de solo lectura. La contraseña NUNCA se expone
  directamente: cualquier comparación se hace a través del
  método verificarPassword(), y cualquier cambio a través de
  actualizarPassword(). Ninguna clase externa puede leer o
  sobreescribir el estado interno sin pasar por estos métodos.
=========================================================*/

export class Usuario {
  #id;
  #usuario;
  #nacimiento;
  #correo;
  #passwordHash;

  constructor({ id, usuario, nacimiento, correo, pass }) {
    this.#id = id ?? null;
    this.#usuario = usuario;
    this.#nacimiento = nacimiento;
    this.#correo = correo;
    this.#passwordHash = pass;
  }

  /**
   * id que asigna el backend (SQLite). Solo existe cuando el usuario se
   * registró/inició sesión a través de la API HTTP; los usuarios viejos
   * guardados en localStorage traen null.
   */
  get id() {
    return this.#id;
  }

  get usuario() {
    return this.#usuario;
  }

  get nacimiento() {
    return this.#nacimiento;
  }

  get correo() {
    return this.#correo;
  }

  /**
   * Compara la contraseña ingresada contra el estado interno,
   * sin exponer nunca la contraseña real hacia afuera.
   */
  verificarPassword(passwordIngresada) {
    return this.#passwordHash === passwordIngresada;
  }

  /**
   * Único punto de entrada autorizado para cambiar la contraseña.
   */
  actualizarPassword(nuevaPassword) {
    this.#passwordHash = nuevaPassword;
  }

  /**
   * Serializa la entidad para poder persistirla (por ejemplo en
   * localStorage). Es la ÚNICA forma en la que el passwordHash
   * sale de la entidad, y solo la usa la capa de persistencia.
   */
  toJSON() {
    return {
      id: this.#id,
      usuario: this.#usuario,
      nacimiento: this.#nacimiento,
      correo: this.#correo,
      pass: this.#passwordHash
    };
  }

  static desdeJSON(objetoPlano) {
    return new Usuario(objetoPlano);
  }
}
