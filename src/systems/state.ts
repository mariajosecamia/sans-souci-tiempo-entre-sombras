import type { Effect, GameState } from './types';

export const SAVE_VERSION = 1;

export function newState(): GameState {
  return {
    room: 'entrada',
    era: '1920',
    flags: {},
    inventory: ['camara', 'carta_anonima', 'nota_jeanne'],
    docs: [],
    notes: ['llegada'],
    fragments: [],
    visited: [],
    hintsUsed: 0,
    playTime: 0,
    version: SAVE_VERSION,
  };
}

export const has = (s: GameState, item: string) => s.inventory.includes(item);
export const flag = (s: GameState, k: string) => !!s.flags[k];

/** Aplica la parte de estado de un efecto (puro respecto de la presentación). */
export function applyEffect(s: GameState, e: Effect): void {
  switch (e.t) {
    case 'give':
      if (!s.inventory.includes(e.item)) s.inventory.push(e.item);
      break;
    case 'take':
      s.inventory = s.inventory.filter((i) => i !== e.item);
      break;
    case 'flag':
      s.flags[e.k] = e.v ?? true;
      break;
    case 'doc':
      if (!s.docs.includes(e.id)) s.docs.push(e.id);
      break;
    case 'note':
      if (!s.notes.includes(e.id)) s.notes.push(e.id);
      break;
    case 'fragment':
      if (!s.fragments.includes(e.id)) s.fragments.push(e.id);
      break;
    case 'goto':
      s.room = e.room;
      s.pos = e.at;
      if (e.era) s.era = e.era;
      if (!s.visited.includes(e.room)) s.visited.push(e.room);
      break;
    case 'era':
      s.era = e.era;
      break;
    case 'ending':
      s.ending = e.id;
      break;
    default:
      break;
  }
}
