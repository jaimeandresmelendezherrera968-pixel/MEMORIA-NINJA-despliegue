/*=========================================================
  MEMORIA NINJA
  CAPA: INFRAESTRUCTURA -> Repositorio
  ARCHIVO: infraestructura/repositorios/LocalStorageSesionRepositorio.js

  Exporta también CLAVE_SESION para que cualquier otra parte
  del proyecto (por ejemplo menu.js) pueda leer la MISMA clave
  en vez de escribirla a mano por su cuenta, evitando que la
  clave "usuarioActivo" quede duplicada en dos sitios distintos
  del código.
=========================================================*/

import { ISesionRepositorio } from "../../core/interfaces/ISesionRepositorio.js";

export const CLAVE_SESION = "usuarioActivo";

export class LocalStorageSesionRepositorio extends ISesionRepositorio {
  guardar(datosSesion) {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(datosSesion));
  }

  obtener() {
    const datos = localStorage.getItem(CLAVE_SESION);
    return datos ? JSON.parse(datos) : null;
  }

  eliminar() {
    localStorage.removeItem(CLAVE_SESION);
  }
}
