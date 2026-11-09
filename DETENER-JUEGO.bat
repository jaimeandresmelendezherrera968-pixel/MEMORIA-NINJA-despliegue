@echo off
chcp 65001 >nul
title Memoria Ninja - Detener

REM ============================================================
REM  Doble clic para detener el servidor del juego (puerto 3000).
REM  Solo cierra el proceso del backend; no borra ni cambia archivos.
REM ============================================================

set ENCONTRADO=0

for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
  echo Cerrando servidor PID %%p ...
  taskkill /PID %%p /F >nul 2>&1
  set ENCONTRADO=1
)

if "%ENCONTRADO%"=="1" (
  echo.
  echo Servidor detenido.
) else (
  echo.
  echo No habia ningun servidor corriendo en el puerto 3000.
)

echo.
ping -n 4 127.0.0.1 >nul
exit /b 0
