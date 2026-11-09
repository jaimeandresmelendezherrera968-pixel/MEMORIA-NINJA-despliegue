"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const RAIZ = path.join(__dirname, "..", "..");
const EXCLUIDOS = new Set(["node_modules", "Agrupar", ".git", "respaldo-pre-merge-main"]);

function recorrer(directorio, archivos = []) {
  for (const entrada of fs.readdirSync(directorio, { withFileTypes: true })) {
    if (EXCLUIDOS.has(entrada.name)) continue;
    const ruta = path.join(directorio, entrada.name);
    if (entrada.isDirectory()) {
      recorrer(ruta, archivos);
    } else if (entrada.isFile() && entrada.name.endsWith(".js")) {
      archivos.push(ruta);
    }
  }
  return archivos;
}

const archivos = recorrer(RAIZ);
const errores = [];

for (const archivo of archivos) {
  try {
    execFileSync(process.execPath, ["--check", archivo], { stdio: "pipe" });
  } catch (error) {
    errores.push({
      archivo: path.relative(RAIZ, archivo),
      detalle: String(error.stderr || error.message).trim()
    });
  }
}

if (errores.length > 0) {
  console.error(`Sintaxis inválida en ${errores.length} archivo(s):`);
  for (const error of errores) {
    console.error(`\n${error.archivo}\n${error.detalle}`);
  }
  process.exit(1);
}

console.log(`Sintaxis OK: ${archivos.length} archivos JS verificados.`);
