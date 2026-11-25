# Belle Ombre: El tiempo entre las sombras — guía para agentes

Aventura gráfica point-and-click 2D (Phaser 3 + TypeScript + Vite), en español rioplatense.
Ficción inspirada en un palacio normando de Tandil (1920). La familia es inventada: no usar apellidos ni datos de la familia real.

## Prioridad de la dueña del proyecto
La estética manda: todo tiene que parecer **pintado y dibujado a mano, por la misma mano**.
Respetar las paletas de `src/core/palette.ts` y la biblia de arte (`docs/ART-BIBLE.md`). Ningún elemento puede quedar con otro estilo.

## Comandos
- `npm run dev` — servidor local (http://localhost:5173, vista previa de arte en `/preview.html?room=hall&era=abandono`).
- `npm test` — recorrido completo y los 4 finales (vitest, sin navegador).
- `npm run build` — typecheck + build a `dist/`.
- QA visual: NO usar Chromium/Playwright del contenedor (Ale no lo autoriza). Revisar con superposiciones de hotspots en PIL sobre las láminas, o en el Chrome de Windows de Ale (perfil "claudio") con cuidado.

## Arquitectura
- `src/systems/` — estado y lógica pura (`interact`, `combine`, `settleEra`). Produce `Effect[]`; no conoce Phaser.
- `src/data/` — salas (hotspots, salidas, cerrojos), objetos, documentos.
- `src/dialogue/`, `src/narrative/` (objetivos, pistas, capítulos, finales), `src/puzzles/`.
- `src/art/` — arte procedural en Canvas 2D: `ink.ts` (trazo y aguada), `arch.ts` (arquitectura), `furniture.ts`, `characters.ts` (esqueleto paramétrico), `rooms/*.ts` (un pintor por sala, con las mismas coordenadas que `data/rooms.ts`).
- `src/scenes/WorldScene.ts` — ejecuta efectos, capas, cámara, eventos guionados.
- `src/ui/` — interfaz DOM superpuesta (`--u` = alto/1080).

## Reglas
- Personajes secundarios pintados: `python3 tools/npc-atlas.py /mnt/project-files/sans-souci/arte/personajes` → `public/art/npcs.webp` y `public/art/retratos/`.
- Después de regenerar los atlas, correr `tools/blinkfix.py` (ver su encabezado) para que el parpadeo no mueva el cuerpo.
- Elena pintada: cuadros en `/mnt/project-files/sans-souci/arte/elena/` → `python3 tools/elena-atlas.py <carpeta>` genera `public/art/elena.webp` y `src/art/elenaFrames.ts`. Objetos pintados en `public/art/obj/` (mapa `OBJ_ART` en `ui.ts`). Variantes de lámina por estado: `alt` en `painted.ts`.
- Idiomas: los datos están en español; `src/i18n/en.ts` es el diccionario español→inglés y `t()` traduce al mostrar. Todo texto nuevo necesita su entrada en inglés (lo verifica `tests/i18n.test.ts`). Textos de interfaz: `L(es, en)`.
- Láminas pintadas: `src/data/painted.ts` (efectos `fx`: velas, faroles, fuego, ventanas con lluvia, cortinas, plantas). Exteriores: `python3 tools/skymask.py public/art/<sala>-<época>.webp` separa cielo/nubes/vegetación.
- Toda interacción nueva va primero en datos + lógica, y se cubre en `tests/walkthrough.test.ts`.
- Coordenadas del mundo: ancho de sala × 720. Juego 1920×1080 con zoom 1.5.
- Las tres épocas (1920, abandono, sombras) comparten composición: el pintor decide por `L.era`.
- Commits frecuentes; mantener `PROGRESS.md` al día.
