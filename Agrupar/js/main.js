import { RepositorioObjetosJuego } from "./repositorios/RepositorioObjetosJuego.js";
import { RepositorioUsuarios } from "./repositorios/RepositorioUsuarios.js";

import { ServicioUsuarios } from "./servicios/ServicioUsuarios.js";
import { ResultadoService } from "./servicios/ResultadoService.js";
import { TemporizadorService } from "./servicios/TemporizadorService.js";
import { ResultadoGanador } from "./servicios/ResultadoGanador.js";
import { ResultadoPerdedor } from "./servicios/ResultadoPerdedor.js";
import { JuegoAgrupacionService } from "./servicios/JuegoAgrupacionService.js";

import { JuegoAgrupacionController } from "./controladores/JuegoAgrupacionController.js";


// ============================================================
// COMPOSICIÓN E INYECCIÓN DE DEPENDENCIAS
// ============================================================

const sonidoGanar =
    new Audio("sonidos/Ganar.mp3");

const sonidoPerder =
    new Audio("sonidos/Perder.mp3");


// Repositorios
const repositorioObjetos =
    new RepositorioObjetosJuego();

const repositorioUsuarios =
    new RepositorioUsuarios();


// Servicios
const servicioUsuarios =
    new ServicioUsuarios(
        repositorioUsuarios
    );

const resultadoService =
    new ResultadoService();

const juegoService =
    new JuegoAgrupacionService(
        repositorioObjetos,
        resultadoService
    );


// Polimorfismo
const resultadoGanador =
    new ResultadoGanador(
        sonidoGanar,
        servicioUsuarios
    );

const resultadoPerdedor =
    new ResultadoPerdedor(
        sonidoPerder
    );


// Temporizador
const elementoTimer =
    document.getElementById("timer");


// Se declara antes del controlador para que
// pueda ser utilizado cuando termine el tiempo.
let juegoController;

const temporizadorService =
    new TemporizadorService(
        40,
        elementoTimer,
        () => {
            juegoController.finalizarPorTiempo();
        }
    );


// Controlador con dependencias inyectadas
juegoController =
    new JuegoAgrupacionController(
        juegoService,
        temporizadorService,
        resultadoGanador,
        resultadoPerdedor
    );


// Iniciar juego
juegoController.iniciar();
