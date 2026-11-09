# Respaldo del estado actual (antes de mezclar con `origin/main` / esos 5 commits)

> Propósito: si al aceptar/mezclar el PR con base `main` (5 commits: `c55e140,c1bbf9a,09252c3,54f5c8a,7d05449`) algo se rompe o se cuela código que no querías, **restaurar estos archivos a como están AHORA**.
> Estado respaldado: rama de trabajo `fix/menu-modales-separados-sin-error` @ `f522d09` y rama del PR `docs/pruebas-manuales-mobile-auth-1j-online` @ `01089aa` (HEAD al crear este respaldo). Fecha de respaldo: 2026-11-07.

## Puntos de restauración (ramas locales)
- `backup/estado-mio-pre-merge-main` → `01089aa` (estado del PR/doc, encima de tu trabajo)
- `backup/fix-menu-modales-pre-merge-main` → `f522d09` (tu rama de trabajo `fix/menu-modales-separados-sin-error`)

*(Locales; si quieres tenerlos también en remoto: `git push origin backup/estado-mio-pre-merge-main backup/fix-menu-modales-pre-merge-main`.)*

## Snapshot de archivos en riesgo (versión “buena” actual)
Carpeta: `docs/respaldo-pre-merge-main/` — contiene el contenido de `HEAD` (en el momento del respaldo) de:

| Archivo (original) | Riesgo al mezclar con los 5 |
|---|---|
| `css/menu.css` | Lo tocan `c55e140,c1bbf9a,54f5c8a,7d05449` (conflicto muy probable) |
| `menu.html` | Lo toca `c55e140` (conflicto probable) |
| `js/ui/TwoPlayersModal.js` | Lo toca `c55e140` (modal **morado** `#twoPlayersModal`, sensible) |
| `js/sesion-guard.js` | Lo tocan `54f5c8a,7d05449` (**sensible**, no romper sesión/flujo) |
| `js/board-manager.js` | Lo tocan `54f5c8a,7d05449` |
| `css/game-online.css` | Lo tocan `54f5c8a,7d05449` (adyacente a online) |
| `game-online.html` | Lo tocan `54f5c8a,7d05449` (adyacente a online sensible) |
| `js/nucleo-GAME ONLI/poderes/ByakuganPoder.js` | Lo toca `7d05449` (**sensible**: nucleo/poderes/online — no tocar lógica) |
| `js/niveles/ControladorNivel.js` | Tu refactor 1J (SOLID/POO) — preservar |
| `js/niveles/configNivel.js` | Tu refactor 1J — preservar |
| `css/nivel-base.css` | Base 1J uchiha — preservar |
| `css/tema-aldea.css` | Tema 1J — preservar |
| `js/core-navegacion/TemaAldea.js` | Base integrada — preservar |
| `js/ui/PauseModal.js` | Pausa — preservar |

> No respaldé binarios de `assets/` aquí; los 5 tocan imágenes. Si una imagen queda mal, restáurala con `git checkout backup/estado-mio-pre-merge-main -- <ruta/asset>`.

## Cómo restaurar DESPUÉS del merge (si algo se rompe)
**Opción A — restaurar archivos concretos desde la rama de respaldo (recomendada, solo lo dañado):**
```powershell
# Ejemplos (ajusta la lista a lo que confirmes dañado):
git checkout backup/fix-menu-modales-pre-merge-main -- css/menu.css menu.html js/ui/TwoPlayersModal.js
git checkout backup/fix-menu-modales-pre-merge-main -- js/sesion-guard.js js/board-manager.js css/game-online.css game-online.html "js/nucleo-GAME ONLI/poderes/ByakuganPoder.js"
git checkout backup/fix-menu-modales-pre-merge-main -- js/niveles/ControladorNivel.js js/niveles/configNivel.js css/nivel-base.css css/tema-aldea.css
git status   # revisa, PRUEBA, luego: git add -A; git commit -m "fix: restaura estado pre-merge en <archivos>"
```
**Opción B — volver TODO a tu estado anterior (fuerte):** `git reset --hard backup/fix-menu-modales-pre-merge-main` *(pierde commits posteriores al respaldo en la rama actual; úsalo solo si entiendes el impacto).*

**Opción C — copiar desde el snapshot:** los archivos en `docs/respaldo-pre-merge-main/` tienen el contenido guardado (nombre con `__` en vez de `/`). Puedes copiarlos de vuelta a su ruta original.

## Reglas al resolver conflictos del merge
- Quédate con **tu versión** donde ignoraste esos 5 commits (tu refactor 1J, tu menú/guía, tu auth mobile).
- **No tocar** lógica sensible: `backend-poderes/src/servicios/online/*`, `js/multijugador/*`, `js/nucleo-GAME ONLI/*` (poderes/turnos/vida/chakra/contrarrestos) salvo revisar diffs con mucho cuidado, `js/sesion-guard.js` (sesión/flujo), `js/login|registro|recuperar|verificacion.js`, IDs/handlers de modales **morado `#twoPlayersModal`** y **verde `#multijugadorModal`**.
- Tras restaurar: prueba auth, menú (morado/verde/guía), 1J (reversos/pausa/progreso/historial), y un smoke online 1v1 si aplica.
