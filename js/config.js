/*=========================================================
  MEMORIA NINJA — CONFIGURACIÓN DE DESPLIEGUE

  En local, LAN y Dev Tunnel se ignora: el multijugador usa el
  mismo origen que sirve la página. En producción (Vercel) apunta
  al backend de Render, que es quien mantiene los WebSockets.

  El backend de Render se define en la URL de abajo.
=========================================================*/

window.MEMORIA_NINJA_BACKEND_URL = "https://ninja-memory.onrender.com";
