export class JuegoAgrupacionService {
    #repositorioObjetos;
    #resultadoService;
    #objetosJuego;
    #juegoFinalizado;

    constructor(repositorioObjetos, resultadoService) {
        this.#repositorioObjetos = repositorioObjetos;
        this.#resultadoService = resultadoService;
        this.#objetosJuego = [];
        this.#juegoFinalizado = false;
    }

    cargarObjetos() {
        this.#objetosJuego = this.#repositorioObjetos.obtenerObjetos();
        return this.#mezclarObjetos([...this.#objetosJuego]);
    }

    #mezclarObjetos(objetos) {
        for (let indiceActual = objetos.length - 1; indiceActual > 0; indiceActual--) {
            const indiceAleatorio =
                Math.floor(Math.random() * (indiceActual + 1));

            [objetos[indiceActual], objetos[indiceAleatorio]] =
                [objetos[indiceAleatorio], objetos[indiceActual]];
        }

        return objetos;
    }

    todosLosObjetosColocados(elementosObjetos) {
        const totalObjetos = elementosObjetos.length;
        const objetosColocados =
            document.querySelectorAll(".carpeta img.objeto").length;

        return objetosColocados === totalObjetos;
    }

    evaluarResultado(elementosObjetos) {
        if (this.#juegoFinalizado) {
            return false;
        }

        return this.#resultadoService.evaluarObjetos(elementosObjetos);
    }

    marcarJuegoFinalizado() {
        this.#juegoFinalizado = true;
    }

    get juegoFinalizado() {
        return this.#juegoFinalizado;
    }
}
