// Ilustraciones pintadas que reemplazan al arte procedural, por sala y época.
// Las coordenadas de los puntos calientes de cada sala están ajustadas a estas imágenes.
// La placa se escala a 720 de alto (o al ancho de la sala, lo que cubra más) y se desplaza con dx/dy.
import type { Era } from '../core/palette';

export interface Plate { src: string; dx?: number; dy?: number; ambient?: number; tint?: number }

export const PAINTED: Record<string, Partial<Record<Era, Plate>>> = {
  jardin: {
    '1920': { src: 'art/jardin-1920.webp', dx: -12, tint: 0xd9b89a },
    abandono: { src: 'art/jardin-abandono.webp', tint: 0xb8b4a0 },
  },
  hall: {
    '1920': { src: 'art/hall-1920.webp', tint: 0xe8c9a0 },
    abandono: { src: 'art/hall-abandono.webp', tint: 0xb9b6a2 },
    sombras: { src: 'art/hall-sombras.webp', tint: 0xd8d4cc },
  },
};

export const plateKey = (room: string, era: Era) => `plate-${room}-${era}`;
