# Lista fija de QA (pedido de Ale, 26/11/2026)

Ale no tiene que volver a escribir qué revisar: cada pasada de QA recorre esta lista entera,
sala por sala y en las tres épocas (1920, abandono, sombras). Probar sólo en el Chrome de Ale
(perfil "claudio") o con pruebas automáticas. Regla: NO cambiar la estética aprobada; lo que
necesite arte nuevo se consulta.

## 1. Personajes
- Escala respecto de puertas y muebles (Elena ≈ 1,6 m; puerta ≈ 2,2 m).
- Pies apoyados en el piso, sin flotar ni hundirse; sentados dentro del asiento.
- Hacia dónde miran: hacia Elena cuando hablan; sin tortícolis.
- Manos y objetos bien sostenidos (faroles colgando, objetos que pasan de mano en mano).
- Animaciones sin saltos: caminar, parpadeo (sólo los ojos), boca al hablar, respirar.
- Luz del personaje coherente con la sala (tinte, tinta en la época de sombras).
- Profundidad: Elena pasa detrás de muebles de primer plano y delante de los del fondo.

## 2. Escenarios
- Hora del día coherente dentro de cada época (1920: atardecer → noche).
- Sin rectángulos, bordes ni cortes de imagen visibles.
- Zonas caminables sobre el piso real de la pintura.

## 3. Efectos
- Nubes, lluvia, polvo, niebla, agua, fuego, velas, partículas: movimiento suave, sin bordes.
- La niebla nunca tapa a los personajes.
- Los efectos usan los colores de la propia lámina.

## 4. Uniformidad
- Objetos, retratos, íconos e interfaz "de la misma mano" que la referencia oficial.
- Ningún dibujo por código visible en lugar de una pintura.

## 5. Interfaz
- Menús, inventario, diario, mapa, diálogos, cursor: misma tipografía y tamaños.
- Legible en pantallas chicas (probar ventana angosta).

## 6. Jugabilidad
- Cada zona clickeable se distingue y responde, con sonido.
- No hay caminos trabados; los cuatro finales se alcanzan (`npm test`).
- Textos en español e inglés sin errores ni faltantes.

## 7. Sonido
- Volumen parejo; música y ambiente en cada sala; cada acción suena.
