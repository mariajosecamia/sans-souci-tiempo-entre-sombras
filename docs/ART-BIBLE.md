# Biblia de arte

**Una sola mano.** Todo el juego es tinta y acuarela sobre papel: trazo levemente tembloroso en varias pasadas, aguadas con bordes oscurecidos y floraciones de pigmento, grano de papel encima de todo. Nada de vectores limpios, degradados digitales ni fondos blancos.

## Paletas (`src/core/palette.ts`)
- **1920** — Marfil #D8C8A9, Dorado #A58A53, Bordó #713F42, Oliva #62694C, Nogal #49392D, Carbón #242321.
- **Abandono** — Yeso #B9B09A, Liquen #929470, Musgo #596348, Tierra #75634D, Madera #514438, Humedad #30382D.
- **Sombras** — Papel #F3EFE6, Ceniza #C7C3B9, Gris #929088, Grafito #5F5C56, Carbón #2D2B28, Tinta #111111.
- **Elena** — #DFD2B7, #505A40, #80664C, #733E43, #49372B, #AD7956, #211D1A.

## Las tres épocas
Misma composición, misma cámara y mismo trazo. Cambian paleta y estado:
- 1920: cálido, velas, cera, telas bordó.
- Abandono: revoque caído que deja ver ladrillo, manchas de humedad, moho, musgo, hiedra, maderas hundidas, telarañas.
- Sombras: papel y tinta; la tinta gotea del techo, los retratos se vuelven cuervos, charcos de tinta en el piso.

## Arquitectura
Normanda: entramado de madera (half-timber), vigas paralelas en el techo, boiserie de roble con pliegue de lino, ventanas emplomadas en rombos, techos empinados con buhardas, chimeneas altas.

## Capas
far (paisaje, parallax 0.85) → back → personajes y objetos → dark (penumbra MULTIPLY con huecos de luz) → brillos ADD → front (oclusores) → partículas → viñeta y papel.

## Personaje
No se escala con la profundidad. Caminata de 10 cuadros sincronizada con la velocidad (sin deslizarse).
