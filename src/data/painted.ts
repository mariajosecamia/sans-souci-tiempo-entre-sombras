// Ilustraciones pintadas que reemplazan al arte procedural, por sala y época.
// Las coordenadas de los puntos calientes de cada sala están ajustadas a estas imágenes.
// La placa se escala a 720 de alto (o al ancho de la sala, lo que cubra más) y se desplaza con dx/dy.
import type { Era } from '../core/palette';

export interface Plate {
  src: string; dx?: number; dy?: number; ambient?: number; tint?: number;
  /** Hay <src>-fg.webp (sin cielo) y <src>-clouds.webp: las nubes se mueven detrás. */
  sky?: boolean;
  /** Hay <src>-veg.webp: la vegetación se mece con el viento. */
  veg?: boolean;
}

/** Objetos que se dibujan encima de una placa pintada (los que desaparecen al tomarlos y no están en la pintura). */
export const OVERLAY_PROPS = new Set(['fragmento', 'aceitera', 'lata', 'quinque', 'reflejo', 'nicho']);

export const PAINTED: Record<string, Partial<Record<Era, Plate>>> = {
  jardin: {
    '1920': { src: 'art/jardin-1920.webp', sky: true, veg: true, tint: 0xdcc4a0 },
    abandono: { src: 'art/jardin-abandono.webp', sky: true, veg: true, tint: 0xb8b4a0 },
    sombras: { src: 'art/jardin-sombras.webp', sky: true, veg: true, tint: 0xd8d4cc },
  },
  hall: {
    '1920': { src: 'art/hall-1920.webp', tint: 0xe8c9a0 },
    abandono: { src: 'art/hall-abandono.webp', tint: 0xb9b6a2 },
    sombras: { src: 'art/hall-sombras.webp', tint: 0xd8d4cc },
  },
  entrada: {
    '1920': { src: 'art/entrada-1920.webp', sky: true, veg: true, tint: 0xc8b8a0 },
    abandono: { src: 'art/entrada-abandono.webp', sky: true, veg: true, tint: 0xb8b4a0 },
    sombras: { src: 'art/entrada-sombras.webp', sky: true, veg: true, tint: 0xd8d4cc },
  },
  salon: { '1920': { src: 'art/salon-1920.webp', tint: 0xeac8a0 } },
  estudio: { '1920': { src: 'art/estudio-1920.webp', tint: 0xe6c49c } },
};

export const plateKey = (room: string, era: Era) => `plate-${room}-${era}`;
