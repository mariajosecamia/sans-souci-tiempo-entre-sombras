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
- `node tools/shoot.cjs "preview.html?room=salon&era=1920" out.png` — captura con Playwright.

## Arquitectura
- `src/systems/` — estado y lógica pura (`interact`, `combine`, `settleEra`). Produce `Effect[]`; no conoce Phaser.
- `src/data/` — salas (hotspots, salidas, cerrojos), objetos, documentos.
- `src/dialogue/`, `src/narrative/` (objetivos, pistas, capítulos, finales), `src/puzzles/`.
- `src/art/` — arte procedural en Canvas 2D: `ink.ts` (trazo y aguada), `arch.ts` (arquitectura), `furniture.ts`, `characters.ts` (esqueleto paramétrico), `rooms/*.ts` (un pintor por sala, con las mismas coordenadas que `data/rooms.ts`).
- `src/scenes/WorldScene.ts` — ejecuta efectos, capas, cámara, eventos guionados.
- `src/ui/` — interfaz DOM superpuesta (`--u` = alto/1080).

## Reglas
- Toda interacción nueva va primero en datos + lógica, y se cubre en `tests/walkthrough.test.ts`.
- Coordenadas del mundo: ancho de sala × 720. Juego 1920×1080 con zoom 1.5.
- Las tres épocas (1920, abandono, sombras) comparten composición: el pintor decide por `L.era`.
- Commits frecuentes; mantener `PROGRESS.md` al día.
