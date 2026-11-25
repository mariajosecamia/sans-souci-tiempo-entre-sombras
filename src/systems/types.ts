import type { Era } from '../core/palette';

export type Pt = [number, number];

export interface GameState {
  room: string;
  era: Era;                 // época activa (se conserva al moverse entre salas fracturadas)
  flags: Record<string, boolean | number | string>;
  inventory: string[];
  docs: string[];           // documentos leídos
  notes: string[];          // notas del diario
  fragments: string[];      // fragmentos de memoria recuperados
  visited: string[];
  hintsUsed: number;
  ending?: string;
  pos?: Pt;
  playTime: number;         // segundos
  version: number;
}

export type Effect =
  | { t: 'say'; text: string; who?: string }
  | { t: 'dialog'; id: string }
  | { t: 'give'; item: string }
  | { t: 'take'; item: string }
  | { t: 'flag'; k: string; v?: boolean | number | string }
  | { t: 'doc'; id: string }
  | { t: 'note'; id: string }
  | { t: 'goto'; room: string; at?: Pt; era?: Era }
  | { t: 'era'; era: Era }
  | { t: 'sfx'; id: string }
  | { t: 'anim'; anim: 'pickup' | 'use' | 'read' | 'react' | 'examine' }
  | { t: 'puzzle'; id: PuzzleId }
  | { t: 'event'; id: string }
  | { t: 'fragment'; id: string }
  | { t: 'wait'; ms: number }
  | { t: 'ending'; id: string }
  | { t: 'shake' }
  | { t: 'flash'; color?: string };

export type PuzzleId = 'clock' | 'symbols' | 'piano' | 'theatre';

export type Action = Effect[] | ((s: GameState) => Effect[]);

export type Verb = 'look' | 'use' | 'take' | 'talk';

export interface Hotspot {
  id: string;
  name: string | ((s: GameState) => string);
  rect: [number, number, number, number];   // x, y, w, h en coordenadas de la sala
  walk?: Pt;                                  // a dónde camina Elena antes de interactuar
  face?: 'left' | 'right';
  when?: (s: GameState) => boolean;           // ¿existe ahora?
  eras?: Era[];                               // épocas en las que existe (por defecto todas)
  look?: Action;
  use?: Action;
  take?: Action;
  talk?: Action;
  useItem?: Record<string, Action>;
  exit?: { to: string; at: Pt; when?: (s: GameState) => boolean; locked?: Action };
  prop?: string;                              // objeto ilustrado independiente
  npc?: string;                               // personaje dibujado
  depth?: number;
}

export interface RoomDef {
  id: string;
  name: string;
  width: number;
  floor: Pt[];                    // polígono caminable
  scale: [number, number, number, number]; // yLejos, escalaLejos, yCerca, escalaCerca
  fracture?: (s: GameState) => boolean;
  forceEra?: Era;
  ambience: 'rain-out' | 'rain-in' | 'house' | 'greenhouse' | 'basement' | 'void';
  spawn: Pt;
  hotspots: Hotspot[];
  onEnter?: (s: GameState) => Effect[];
  outdoor?: boolean;
}

export interface ItemDef {
  id: string;
  name: string;
  desc: string;
  icon: string;
}
