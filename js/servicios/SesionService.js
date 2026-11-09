/*=========================================================
  MEMORIA NINJA
  CAPA: SERVICIOS (lógica de negocio)
  ARCHIVO: servicios/SesionService.js

  DIP: ya no llama a localStorage directamente. Recibe un
  ISesionRepositorio inyectado, igual que hacen
  AutenticacionService y RegistroService con
  IUsuarioRepositorio.
=========================================================*/

export class SesionService {
  /** @param {import("../core/interfaces/ISesionRepositorio.js").ISesionRepositorio} sesionRepositorio */
  constructor(sesionRepositorio) {
    this.sesionRepositorio = sesionRepositorio;
  }

  guardarSesion(usuario) {
    this.sesionRepositorio.guardar(usuario.toJSON());
  }

  obtenerSesionActiva() {
    return this.sesionRepositorio.obtener();
  }

  cerrarSesion() {
    this.sesionRepositorio.eliminar();
  }
}
