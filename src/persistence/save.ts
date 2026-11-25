// Guardado en localStorage (tres ranuras: auto + manual). Tolerante a navegadores sin almacenamiento.
import type { GameState } from '../systems/types';
import { SAVE_VERSION } from '../systems/state';

const KEY = 'belle-ombre:save:';
const OPT = 'belle-ombre:options';

export type Slot = 'auto' | 'manual';

export function save(s: GameState, slot: Slot = 'auto'): boolean {
  try {
    localStorage.setItem(KEY + slot, JSON.stringify({ ...s, savedAt: Date.now() }));
    return true;
  } catch { return false; }
}

export function load(slot: Slot = 'auto'): GameState | null {
  try {
    const raw = localStorage.getItem(KEY + slot);
    if (!raw) return null;
    const s = JSON.parse(raw) as GameState;
    if (s.version !== SAVE_VERSION) return null;
    return s;
  } catch { return null; }
}

export function latest(): GameState | null {
  const a = load('auto'), m = load('manual');
  if (!a) return m; if (!m) return a;
  return ((a as any).savedAt ?? 0) >= ((m as any).savedAt ?? 0) ? a : m;
}

export function clearAll(): void {
  try { localStorage.removeItem(KEY + 'auto'); localStorage.removeItem(KEY + 'manual'); } catch { /* */ }
}

export interface Options { master: number; music: number; amb: number; sfx: number; textSpeed: number; subtitlesBig: boolean; reduceMotion: boolean }
export const DEFAULT_OPTIONS: Options = { master: 0.8, music: 0.5, amb: 0.7, sfx: 0.8, textSpeed: 1, subtitlesBig: false, reduceMotion: false };

export function loadOptions(): Options {
  try { return { ...DEFAULT_OPTIONS, ...JSON.parse(localStorage.getItem(OPT) || '{}') }; } catch { return { ...DEFAULT_OPTIONS }; }
}
export function saveOptions(o: Options): void {
  try { localStorage.setItem(OPT, JSON.stringify(o)); } catch { /* */ }
}
