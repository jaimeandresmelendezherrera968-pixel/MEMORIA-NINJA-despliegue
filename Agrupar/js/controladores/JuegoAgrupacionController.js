export class JuegoAgrupacionController {
    #juegoService;
    #temporizadorService;
    #resultadoGanador;
    #resultadoPerdedor;

    #contenedorObjetos;
    #pauseMenu;
    #pantallaFinal;
    #mensajeFinal;

    constructor(
        juegoService,
        temporizadorService,
        resultadoGanador,
        resultadoPerdedor
    ) {
        this.#juegoService = juegoService;
        this.#temporizadorService = temporizadorService;
        this.#resultadoGanador = resultadoGanador;
        this.#resultadoPerdedor = resultadoPerdedor;

        this.#contenedorObjetos =
            document.getElementById("objetosContainer");

        this.#pauseMenu =
            document.getElementById("pauseMenu");

        this.#pantallaFinal =
            document.getElementById("finalScreen");

        this.#mensajeFinal =
            document.getElementById("finalMessage");
    }

    iniciar() {
        this.#crearObjetos();
        this.#configurarCarpetas();
        this.#configurarPausa();
        this.#temporizadorService.iniciar();
    }

    #crearObjetos() {
        const objetos = this.#juegoService.cargarObjetos();

        objetos.forEach((objetoJuego, indiceObjeto) => {
            const imagen = document.createElement("img");

            imagen.src = "img/" + objetoJuego.imagen;
            imagen.classList.add("objeto");
            imagen.draggable = true;
            imagen.id = "obj" + indiceObjeto;
            imagen.dataset.correct = objetoJuego.categoria;

            imagen.addEventListener("dragstart", evento => {
                evento.dataTransfer.setData("id", imagen.id);
            });

            this.#contenedorObjetos.appendChild(imagen);
        });
    }

    #configurarCarpetas() {
        document.querySelectorAll(".carpeta").forEach(carpeta => {
            carpeta.addEventListener("dragover", evento => {
                evento.preventDefault();
            });

            carpeta.addEventListener("drop", evento => {
                evento.preventDefault();

                if (this.#juegoService.juegoFinalizado) {
                    return;
                }

                const idObjeto =
                    evento.dataTransfer.getData("id");

                const objeto =
                    document.getElementById(idObjeto);

                if (objeto) {
                    carpeta.appendChild(objeto);
                    this.#comprobarFinalizacion();
                }
            });
        });
    }

    #comprobarFinalizacion() {
        const elementosObjetos =
            document.querySelectorAll(".objeto");

        if (
            this.#juegoService.todosLosObjetosColocados(
                elementosObjetos
            )
        ) {
            this.#evaluarJuego(elementosObjetos);
        }
    }

    #evaluarJuego(elementosObjetos) {
        const gano =
            this.#juegoService.evaluarResultado(
                elementosObjetos
            );

        this.#finalizarJuego(gano);
    }

    finalizarPorTiempo() {
        if (this.#juegoService.juegoFinalizado) {
            return;
        }

        this.#finalizarJuego(false);
    }

    #finalizarJuego(gano) {
        if (this.#juegoService.juegoFinalizado) {
            return;
        }

        this.#juegoService.marcarJuegoFinalizado();
        this.#temporizadorService.detener();
        this.#temporizadorService.pausar();

        if (gano) {
            this.#resultadoGanador.ejecutar(this.#mensajeFinal);
        } else {
            this.#resultadoPerdedor.ejecutar(this.#mensajeFinal);
        }

        this.#pantallaFinal.classList.remove("hidden");
    }

    #configurarPausa() {
        const botonPausa =
            document.getElementById("btnPause");

        const botonContinuar =
            document.getElementById("btnResume");

        botonPausa.onclick = () => {
            if (this.#juegoService.juegoFinalizado) {
                return;
            }

            this.#temporizadorService.pausar();
            this.#pauseMenu.classList.remove("hidden");
        };

        botonContinuar.onclick = () => {
            if (this.#juegoService.juegoFinalizado) {
                return;
            }

            this.#temporizadorService.continuar();
            this.#pauseMenu.classList.add("hidden");
        };
    }
}
