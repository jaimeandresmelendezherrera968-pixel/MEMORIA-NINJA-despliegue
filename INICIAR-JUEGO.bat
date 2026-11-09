@echo off
chcp 65001 >nul
title Memoria Ninja - Iniciando

REM ============================================================
REM  Doble clic para arrancar el juego.
REM  Solo levanta el servidor del backend y abre el navegador.
REM  No borra ni modifica ningun archivo.
REM ============================================================

REM Ir a la carpeta del backend (donde esta package.json)
cd /d "%~dp0backend-poderes"

if not exist package.json (
  echo.
  echo ERROR: no se encontro backend-poderes\package.json
  echo Asegurate de que este archivo INICIAR-JUEGO.bat este en la carpeta del proyecto.
  echo.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Primera vez: instalando dependencias... ^(puede tardar un rato^)
  call npm install
  if errorlevel 1 (
    echo.
    echo ERROR al instalar dependencias.
    pause
    exit /b 1
  )
)

echo.
echo Iniciando el servidor del juego...
echo Se abrira una ventana llamada "Memoria Ninja - Servidor".
echo Deja esa ventana abierta mientras juegas.
echo.
start "Memoria Ninja - Servidor" cmd /k "npm start"

echo Esperando a que el servidor arranque...
ping -n 7 127.0.0.1 >nul

echo Abriendo el juego en el navegador...
start "" http://localhost:3000/menu.html

echo.
echo Listo. Para detener el juego: cerra la ventana "Memoria Ninja - Servidor"
echo o hace doble clic en DETENER-JUEGO.bat.
echo.
ping -n 6 127.0.0.1 >nul
exit /b 0
