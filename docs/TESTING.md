# Pruebas

- `npm test` — `tests/walkthrough.test.ts` juega el juego entero con `tests/sim.ts` (mismo motor de efectos que la escena, sin Phaser): llega a la sala del reloj, alcanza los 4 finales, y comprueba cerrojos (portón, escalera, botón de época) y que siempre haya objetivos con pistas.
- QA visual: con `npm run dev`, abrir `preview.html?room=<sala>&era=<1920|abandono|sombras>` o capturar con `tools/shoot.cjs`. Revisar las 11 salas × 3 épocas antes de publicar.
- El workflow de deploy corre los tests antes de construir.
