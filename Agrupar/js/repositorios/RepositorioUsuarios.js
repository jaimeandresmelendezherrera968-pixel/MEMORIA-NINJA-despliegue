export class RepositorioUsuarios {
    obtenerUsuarioActivo() {
        const usuarioGuardado = localStorage.getItem("usuarioActivo");

        if (!usuarioGuardado) {
            return null;
        }

        return JSON.parse(usuarioGuardado);
    }

    guardarUsuarioActivo(usuario) {
        localStorage.setItem(
            "usuarioActivo",
            JSON.stringify(usuario)
        );
    }
}
