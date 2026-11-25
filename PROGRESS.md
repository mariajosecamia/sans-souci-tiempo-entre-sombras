# Progreso

## Hecho (v0.1, 2026-11-25)
- Motor completo: salas, caminar, verbos, inventario con combinaciones, diario (objetivos, notas, personas, documentos, mapa, recuerdos, cronología), pistas en 3 niveles, guardado automático y manual, opciones de volumen, menú, finales.
- 11 salas pintadas en las 3 épocas: portón, jardín y fachada normanda, invernadero, hall, salón, biblioteca, estudio, corredor, cuarto de Isabel, sótano, sala del reloj.
- Personajes: Elena (diseño oficial), Anselmo, Doña Mercedes, Rosa, Isabel, la Sombra, el cuervo.
- 4 acertijos con pantalla propia (reloj, discos, teatro de sombras, piano) + cerrojos de objetos y de época.
- 5 recuerdos ocultos, 4 finales (liberar, retrato, fractura y el secreto "placa").
- Sonido procedural: ambientes por sala, efectos, música generativa, caja de música.
- Prueba de recorrido completo y de los 4 finales.
- Deploy a GitHub Pages con Actions.

## Estética oficial (2026-11-25)
Ale eligió la fachada en abandono pintada como referencia de todo el juego. Los fondos pasan a ser ilustraciones pintadas (`public/art/`, manifiesto en `src/data/painted.ts`); el arte procedural queda como respaldo hasta que llegue cada placa.
- Hecho: jardín y fachada en 1920 y abandono, con zonas interactivas reubicadas sobre la pintura, escala de Elena por sala, tinte de luz por placa.
- Efectos comunes encima de todo: papel de acuarela, viñeta, lluvia, polvo, niebla baja, haces de luz (en salas procedurales).

## v0.3 (2026-11-25)
- Movimiento en el fondo: nubes que se desplazan, plantas e hiedra con viento, cortinas, velas, faroles, fuego y lluvia en ventanas.
- Elena a escala de cada lámina; diálogos a máquina de escribir; papel, ornamentos y cintas en menús y cuadros.
- Candado del portón: Anselmo lo destraba.
- Español e inglés: selector en el menú principal y en Opciones (`src/i18n/`).

## Siguiente
- Láminas que faltan: invernadero, cuarto de Isabel, sótano, sala del reloj; portón abierto.
- Animaciones pintadas de Elena (caminar, agacharse, tomar, usar, leer, reaccionar) y objetos pintados.
- Integrar ilustraciones pintadas (manifiesto de capas PNG) unificadas con el mismo tratamiento de papel y paleta.
- Mejorar el dibujo de Elena y hoja de personaje maestra.
- Ampliar hacia 22 escenas y 15 acertijos: usina, teléfono, túnel, pararrayos, las tres velas de la biblioteca, la cámara como mecánica.
- Transiciones de capítulo ilustradas.
