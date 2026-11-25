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
  /** Objetos que ya están pintados en la lámina (no se dibujan encima). Si se pueden tomar,
   *  `patch` es un retazo de la misma pintura sin el objeto, que se pone cuando desaparece. */
  inPaint?: Record<string, { patch?: string; x: number; y: number }>;
  /** Otra versión de la misma lámina (misma composición) que se usa cuando el flag está activo. */
  alt?: { flag: string; src: string };
}

export type Fx =
  | { k: 'candle'; x: number; y: number }                    // llamita que titila
  | { k: 'lamp'; x: number; y: number; r: number }           // lámpara o farol: halo que respira
  | { k: 'fire'; x: number; y: number; w: number; h: number } // fuego de chimenea: calor y resplandor
  | { k: 'window'; x: number; y: number; w: number; h: number } // lluvia del otro lado del vidrio
  | { k: 'curtain'; x: number; y: number; w: number; h: number } // cortina que se mece
  | { k: 'plants'; x: number; y: number; w: number; h: number } // hojas, hiedra
  | { k: 'fountain'; tiers: [number, number, number][]; pool: [number, number, number, number]; flow: 'full' | 'drip' }; // agua que cae de cada borde [x0, x1, y] y ondas en la pileta [x0, x1, y, alto]

const candles = (pts: [number, number][]): Fx[] => pts.map(([x, y]) => ({ k: 'candle', x, y }));

/** Objetos que se dibujan encima de una placa pintada (los que desaparecen al tomarlos y no están en la pintura). */
export const OVERLAY_PROPS = new Set(['fragmento', 'aceitera', 'lata', 'reflejo']);

export const PAINTED: Record<string, Partial<Record<Era, Plate>>> = {
  jardin: {
    '1920': { src: 'art/jardin-1920.webp', sky: true, veg: true, tint: 0xdcc4a0, fx: [{ k: 'fountain', tiers: [[170, 232, 373], [152, 250, 418], [128, 272, 476]], pool: [100, 300, 538, 14], flow: 'full' }] },
    abandono: { src: 'art/jardin-abandono.webp', sky: true, veg: true, tint: 0xb8b4a0, fx: [{ k: 'fountain', tiers: [[170, 232, 373], [152, 250, 418], [128, 272, 476]], pool: [100, 300, 538, 14], flow: 'drip' }] },
    sombras: { src: 'art/jardin-sombras.webp', sky: true, veg: true, tint: 0xd8d4cc },
  },
  hall: {
    '1920': { src: 'art/hall-1920.webp', tint: 0xe8c9a0, fx: [...candles([[797, 102], [832, 88], [937, 88], [975, 102], [1137, 405], [1153, 395], [1172, 405]]), { k: 'window', x: 190, y: 36, w: 105, h: 448 }, { k: 'fire', x: 418, y: 465, w: 90, h: 80 }, { k: 'lamp', x: 885, y: 150, r: 160 }] },
    abandono: { src: 'art/hall-abandono.webp', tint: 0xb9b6a2 },
    sombras: { src: 'art/hall-sombras.webp', tint: 0xd8d4cc },
  },
  entrada: {
    '1920': { src: 'art/entrada-1920.webp', alt: { flag: 'gateOpen', src: 'art/entrada-1920-abierto.webp' }, sky: true, veg: true, tint: 0xc8b8a0, fx: [{ k: 'lamp', x: 508, y: 185, r: 110 }] },
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

PAINTED.invernadero = {
  '1920': {
    src: 'art/invernadero-1920.webp', tint: 0xe6c49c,
    inPaint: { querosen: { patch: 'art/invernadero-1920-sinlata.webp', x: 976, y: 505 } },
    fx: [{ k: 'window', x: 300, y: 95, w: 560, h: 320 }, { k: 'window', x: 860, y: 95, w: 150, h: 180 },
      { k: 'plants', x: 205, y: 0, w: 420, h: 330 }, { k: 'plants', x: 1000, y: 0, w: 279, h: 470 }, { k: 'plants', x: 860, y: 70, w: 190, h: 170 },
      { k: 'plants', x: 870, y: 260, w: 200, h: 170 }, { k: 'plants', x: 330, y: 300, w: 160, h: 320 }],
  },
  abandono: {
    src: 'art/invernadero-abandono.webp', tint: 0xb9b6a2,
    fx: [{ k: 'window', x: 300, y: 95, w: 700, h: 320 }, { k: 'plants', x: 200, y: 0, w: 320, h: 620 }, { k: 'plants', x: 1040, y: 60, w: 239, h: 580 }, { k: 'plants', x: 900, y: 290, w: 170, h: 150 }],
  },
  sombras: { src: 'art/invernadero-sombras.webp', tint: 0xd8d4cc, fx: [{ k: 'plants', x: 200, y: 0, w: 320, h: 620 }, { k: 'plants', x: 1040, y: 250, w: 239, h: 400 }] },
};

PAINTED.infantil = {
  '1920': {
    src: 'art/infantil-1920.webp', tint: 0xeac8a0,
    inPaint: { teatro: { x: 0, y: 0 }, caja_musica: { x: 0, y: 0 } },
    fx: [...candles([[846, 305]]), { k: 'lamp', x: 720, y: 320, r: 120 }, { k: 'window', x: 285, y: 20, w: 245, h: 190 },
      { k: 'curtain', x: 210, y: 0, w: 75, h: 285 }, { k: 'curtain', x: 535, y: 0, w: 65, h: 295 }],
  },
  abandono: {
    src: 'art/infantil-abandono.webp', tint: 0xb9b6a2,
    inPaint: { teatro: { x: 0, y: 0 } },
    fx: [{ k: 'window', x: 285, y: 20, w: 245, h: 190 }, { k: 'plants', x: 300, y: 0, w: 240, h: 400 },
      { k: 'curtain', x: 210, y: 0, w: 85, h: 320 }, { k: 'curtain', x: 520, y: 0, w: 85, h: 330 }],
  },
  sombras: { src: 'art/infantil-sombras.webp', tint: 0xd8d4cc, inPaint: { teatro: { x: 0, y: 0 } }, fx: [...candles([[846, 300]])] },
};

PAINTED.sotano = {
  '1920': { src: 'art/sotano-1920.webp', tint: 0xe2bf98, fx: [{ k: 'fire', x: 505, y: 462, w: 105, h: 65 }, { k: 'lamp', x: 910, y: 150, r: 150 }, ...candles([[158, 95], [178, 88]])] },
  abandono: { src: 'art/sotano-abandono.webp', tint: 0xb9b6a2 },
  sombras: { src: 'art/sotano-sombras.webp', tint: 0xd8d4cc },
};

PAINTED.reloj = {
  sombras: { src: 'art/reloj-sombras.webp', tint: 0xd8d4cc, inPaint: { sombra: { x: 0, y: 0 } }, fx: [{ k: 'plants', x: 300, y: 0, w: 170, h: 290 }] },
};

export const plateKey = (room: string, era: Era) => `plate-${room}-${era}`;
