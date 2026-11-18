export class AmistadService {
  async #pedir(ruta, opciones = {}) {
    let respuesta;
    try {
      respuesta = await fetch(ruta, {
        ...opciones,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(opciones.headers || {}),
        },
        cache: 'no-store',
      });
    } catch (error) {
      const fallo = new Error('No se pudo conectar con el servidor. Intentá nuevamente.');
      fallo.codigo = 'ERROR_RED';
      fallo.status = 0;
      throw fallo;
    }

    let datos = null;
    try {
      datos = await respuesta.json();
    } catch (error) {
      datos = null;
    }

    if (respuesta.status === 401) {
      const fallo = new Error('Tu sesión venció. Iniciá sesión para usar tus amigos.');
      fallo.codigo = 'SESION_VENCIDA';
      fallo.status = 401;
      throw fallo;
    }

    if (!respuesta.ok || !datos?.exito) {
      const fallo = new Error(
        datos?.error || (respuesta.ok ? 'La solicitud no se pudo completar.' : 'Error del servidor.')
      );
      fallo.codigo = datos?.codigo || (respuesta.ok ? 'ERROR_RESPUESTA' : `HTTP_${respuesta.status}`);
      fallo.status = respuesta.status;
      throw fallo;
    }

    return datos;
  }

  obtenerResumen() {
    return this.#pedir('/api/amistades/resumen');
  }

  buscar(termino) {
    return this.#pedir(`/api/amistades/buscar?q=${encodeURIComponent(String(termino || ''))}`);
  }

  enviarSolicitud(termino) {
    return this.#pedir('/api/amistades/solicitudes', {
      method: 'POST',
      body: JSON.stringify({ termino: String(termino || '') }),
    });
  }

  aceptarSolicitud(id) {
    return this.#pedir(`/api/amistades/solicitudes/${encodeURIComponent(String(id))}/aceptar`, {
      method: 'POST',
    });
  }

  rechazarSolicitud(id) {
    return this.#pedir(`/api/amistades/solicitudes/${encodeURIComponent(String(id))}/rechazar`, {
      method: 'POST',
    });
  }

  cancelarSolicitud(id) {
    return this.#pedir(`/api/amistades/solicitudes/${encodeURIComponent(String(id))}`, {
      method: 'DELETE',
    });
  }

  bloquear(idUsuario) {
    return this.#pedir(`/api/amistades/bloqueos/${encodeURIComponent(String(idUsuario))}`, {
      method: 'POST',
    });
  }

  desbloquear(idUsuario) {
    return this.#pedir(`/api/amistades/bloqueos/${encodeURIComponent(String(idUsuario))}`, {
      method: 'DELETE',
    });
  }

  eliminarAmistad(idAmigo) {
    return this.#pedir(`/api/amistades/${encodeURIComponent(String(idAmigo))}`, {
      method: 'DELETE',
    });
  }

  cambiarNombre(idUsuario, nombre) {
    return this.#pedir(`/api/usuarios/${encodeURIComponent(String(idUsuario))}/nombre`, {
      method: 'PATCH',
      body: JSON.stringify({ nombre: String(nombre || '') }),
    });
  }
}
