# Pruebas

- `npm test` — `tests/walkthrough.test.ts` juega el juego entero con `tests/sim.ts` (mismo motor de efectos que la escena, sin Phaser): llega a la sala del reloj, alcanza los 4 finales, y comprueba cerrojos (portón, escalera, botón de época) y que siempre haya objetivos con pistas.
- QA visual: sin navegadores del contenedor. Superponer los rectángulos de hotspots sobre cada lámina con PIL, y revisar la versión publicada en el Chrome de Windows de Ale sólo cuando haga falta.
- `tests/i18n.test.ts`: todo texto de datos y todo lo que se dice en el recorrido tiene traducción al inglés.
- El workflow de deploy corre los tests antes de construir.
