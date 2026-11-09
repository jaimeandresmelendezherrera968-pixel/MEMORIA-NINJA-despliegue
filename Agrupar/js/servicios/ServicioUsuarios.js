export class ServicioUsuarios {
    #repositorioUsuarios;

    constructor(repositorioUsuarios) {
        this.#repositorioUsuarios = repositorioUsuarios;
    }

    registrarVictoriaFacil() {
        const usuarioActivo =
            this.#repositorioUsuarios.obtenerUsuarioActivo();

        if (!usuarioActivo) {
            return;
        }

        usuarioActivo.victoriasFacil =
            (usuarioActivo.victoriasFacil || 0) + 1;

        usuarioActivo.victoriasTotales =
            (usuarioActivo.victoriasFacil || 0) +
            (usuarioActivo.victoriasNormal || 0) +
            (usuarioActivo.victoriasDificil || 0);

        this.#repositorioUsuarios.guardarUsuarioActivo(usuarioActivo);
    }
}
