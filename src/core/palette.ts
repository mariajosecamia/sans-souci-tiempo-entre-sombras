// Paletas por estado temporal. Mismos nombres semánticos en las tres épocas:
// cada escena se dibuja con la misma composición y sólo cambia el color + capas de deterioro.
export type Era = '1920' | 'abandono' | 'sombras';

export interface Palette {
  paper: string;      // fondo de papel / luz alta
  wall: string;       // muro principal
  wallDark: string;   // muro en sombra
  trim: string;       // molduras, zócalos
  gold: string;       // dorados, bronces
  wood: string;       // madera media
  woodDark: string;   // nogal oscuro
  fabric: string;     // tapizados, cortinas
  fabric2: string;    // tela secundaria
  floor: string;      // piso
  floorDark: string;
  plant: string;      // vegetación
  plantDark: string;
  sky: string;        // cielo / exterior
  skyLow: string;
  stone: string;      // piedra
  glass: string;      // vidrio
  ink: string;        // tinta de contorno
  shadow: string;     // sombra proyectada
  light: string;      // luz cálida
  accent: string;     // acento puntual
}

export const PALETTES: Record<Era, Palette> = {
  '1920': {
    paper: '#ece2cc', wall: '#d8c8a9', wallDark: '#a8966f', trim: '#c4b08a', gold: '#a58a53',
    wood: '#6b4e36', woodDark: '#49392d', fabric: '#713f42', fabric2: '#62694c',
    floor: '#7a5c40', floorDark: '#49392d', plant: '#62694c', plantDark: '#3f4532',
    sky: '#8c9aa0', skyLow: '#b9b4a2', stone: '#b8ab92', glass: '#9fb0ad',
    ink: '#242321', shadow: '#2a2420', light: '#f0c878', accent: '#a58a53',
  },
  abandono: {
    paper: '#c9c1aa', wall: '#b9b09a', wallDark: '#7c8077', trim: '#929470', gold: '#8a7a55',
    wood: '#75634d', woodDark: '#514438', fabric: '#5b4638', fabric2: '#596348',
    floor: '#6b5747', floorDark: '#30382d', plant: '#596348', plantDark: '#30382d',
    sky: '#7c8077', skyLow: '#a49f8c', stone: '#8d8577', glass: '#73806a', ink: '#1f231d',
    shadow: '#22281f', light: '#c9c49a', accent: '#7b5947',
  },
  sombras: {
    paper: '#f3efe6', wall: '#c7c3b9', wallDark: '#929088', trim: '#a9a59b', gold: '#a18e73',
    wood: '#5f5c56', woodDark: '#2d2b28', fabric: '#3a3733', fabric2: '#5f5c56',
    floor: '#5f5c56', floorDark: '#2d2b28', plant: '#5f5c56', plantDark: '#2d2b28',
    sky: '#c7c3b9', skyLow: '#e6e1d6', stone: '#929088', glass: '#c7c3b9', ink: '#111111',
    shadow: '#111111', light: '#eee8da', accent: '#b0a15e',
  },
};

// Tonos extra para manchas de humedad, musgo, óxido.
export const DECAY = {
  damp: '#4a5346', moss: '#5f6b4f', mold: '#73806a', rust: '#7b5947', ochre: '#9b8b68', rot: '#3b3127',
};

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export function rgba(hex: string, a: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a), B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * t));
  return '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
}
export function hexNum(hex: string): number {
  return parseInt(hex.replace('#', ''), 16);
}
