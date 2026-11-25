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
  /** Cosas que se mueven sobre la pintura (coordenadas de la sala). */
  fx?: Fx[];
}

export type Fx =
  | { k: 'candle'; x: number; y: number }                    // llamita que titila
  | { k: 'lamp'; x: number; y: number; r: number }           // lámpara o farol: halo que respira
  | { k: 'fire'; x: number; y: number; w: number; h: number } // fuego de chimenea: calor y resplandor
  | { k: 'window'; x: number; y: number; w: number; h: number } // lluvia del otro lado del vidrio
  | { k: 'curtain'; x: number; y: number; w: number; h: number } // cortina que se mece
  | { k: 'plants'; x: number; y: number; w: number; h: number }; // hojas, hiedra

const candles = (pts: [number, number][]): Fx[] => pts.map(([x, y]) => ({ k: 'candle', x, y }));

/** Objetos que se dibujan encima de una placa pintada (los que desaparecen al tomarlos y no están en la pintura). */
export const OVERLAY_PROPS = new Set(['fragmento', 'aceitera', 'lata', 'reflejo']);

export const PAINTED: Record<string, Partial<Record<Era, Plate>>> = {
  jardin: {
    '1920': { src: 'art/jardin-1920.webp', sky: true, veg: true, tint: 0xdcc4a0 },
    abandono: { src: 'art/jardin-abandono.webp', sky: true, veg: true, tint: 0xb8b4a0 },
    sombras: { src: 'art/jardin-sombras.webp', sky: true, veg: true, tint: 0xd8d4cc },
  },
  hall: {
    '1920': { src: 'art/hall-1920.webp', tint: 0xe8c9a0, fx: [...candles([[797, 102], [832, 88], [937, 88], [975, 102], [1137, 405], [1153, 395], [1172, 405]]), { k: 'window', x: 200, y: 25, w: 130, h: 455 }, { k: 'lamp', x: 885, y: 150, r: 160 }] },
    abandono: { src: 'art/hall-abandono.webp', tint: 0xb9b6a2 },
    sombras: { src: 'art/hall-sombras.webp', tint: 0xd8d4cc },
  },
  entrada: {
    '1920': { src: 'art/entrada-1920.webp', sky: true, veg: true, tint: 0xc8b8a0, fx: [{ k: 'lamp', x: 508, y: 185, r: 110 }] },
    abandono: { src: 'art/entrada-abandono.webp', sky: true, veg: true, tint: 0xb8b4a0 },
    sombras: { src: 'art/entrada-sombras.webp', sky: true, veg: true, tint: 0xd8d4cc },
  },
  salon: { '1920': { src: 'art/salon-1920.webp', tint: 0xeac8a0, fx: [{ k: 'fire', x: 530, y: 400, w: 190, h: 135 }, ...candles([[488, 150], [732, 158]]), { k: 'lamp', x: 255, y: 320, r: 120 }, { k: 'window', x: 1228, y: 65, w: 170, h: 330 }, { k: 'curtain', x: 1170, y: 30, w: 80, h: 545 }, { k: 'curtain', x: 1375, y: 30, w: 85, h: 545 }] } },
  estudio: { '1920': { src: 'art/estudio-1920.webp', tint: 0xe6c49c, fx: [{ k: 'lamp', x: 445, y: 335, r: 130 }, { k: 'window', x: 1150, y: 25, w: 115, h: 365 }, { k: 'curtain', x: 1035, y: 10, w: 110, h: 570 }] } },
  biblioteca: {
    '1920': { src: 'art/biblioteca-1920.webp', tint: 0xe2bf98, fx: [...candles([[1140, 352], [1161, 342], [1183, 352]]), { k: 'window', x: 718, y: 22, w: 225, h: 380 }, { k: 'curtain', x: 630, y: 0, w: 85, h: 440 }, { k: 'curtain', x: 925, y: 0, w: 85, h: 500 }] },
    abandono: { src: 'art/biblioteca-abandono.webp', tint: 0xb9b6a2, fx: [{ k: 'window', x: 718, y: 22, w: 225, h: 380 }, { k: 'plants', x: 700, y: 20, w: 280, h: 500 }, { k: 'curtain', x: 630, y: 0, w: 85, h: 500 }, { k: 'curtain', x: 925, y: 0, w: 85, h: 500 }] },
    sombras: { src: 'art/biblioteca-sombras.webp', tint: 0xd8d4cc },
  },
  corredor: {
    '1920': { src: 'art/corredor-1920.webp', tint: 0xe6c49c, fx: [...candles([[333, 205], [378, 205], [711, 205], [754, 205], [1228, 215], [1275, 215]]), { k: 'window', x: 1680, y: 60, w: 110, h: 400 }, { k: 'curtain', x: 1575, y: 20, w: 95, h: 590 }] },
    abandono: { src: 'art/corredor-abandono.webp', tint: 0xb9b6a2 },
    sombras: { src: 'art/corredor-sombras.webp', tint: 0xd8d4cc },
  },
};

export const plateKey = (room: string, era: Era) => `plate-${room}-${era}`;
