// Lógica pura de los acertijos con interfaz propia (la UI vive en ui/puzzleUI.ts).
import type { Effect, PuzzleId } from '../systems/types';

export const SYMBOLS = ['sol', 'luna', 'cuervo', 'llave', 'ojo', 'estrella'] as const;
export const THEATRE_FIGURES = ['sol', 'luna', 'cuervo', 'llave', 'casa'] as const;
export const NOTES_ES = ['DO', 'RE', 'MI', 'FA', 'SOL', 'LA', 'SI', 'DO²'];
export const MELODY = [2, 0, 1, 4]; // MI DO RE SOL

export const ANSWERS = {
  clock: { h: 3, m: 40 },
  symbols: ['luna', 'cuervo', 'llave'],
  theatre: ['luna', 'cuervo', 'llave'],
  piano: MELODY,
};

export function checkPuzzle(id: PuzzleId, answer: any): boolean {
  switch (id) {
    case 'clock': return (answer.h % 12) === 3 && answer.m === 40;
    case 'symbols': return JSON.stringify(answer) === JSON.stringify(ANSWERS.symbols);
    case 'theatre': return JSON.stringify(answer) === JSON.stringify(ANSWERS.theatre);
    case 'piano': {
      const a = answer as number[];
      const tail = a.slice(-MELODY.length);
      return JSON.stringify(tail) === JSON.stringify(MELODY);
    }
  }
}

const say = (text: string, who = 'elena'): Effect => ({ t: 'say', text, who });

export const SOLVED: Record<PuzzleId, Effect[]> = {
  clock: [
    { t: 'sfx', id: 'clock_open' }, { t: 'flag', k: 'clockOpen' }, { t: 'give', item: 'llave_estudio' },
    say('Clac. A las cuatro menos veinte, la caja del reloj se abre sola. Adentro, colgada del péndulo, una llave larga.'),
  ],
  symbols: [
    { t: 'sfx', id: 'unlock' }, { t: 'flag', k: 'drawerOpen' }, { t: 'give', item: 'llave_caja' },
    say('Luna, cuervo, llave. El cajón se desliza. Adentro hay una llavecita dorada con forma de mariposa.'),
  ],
  theatre: [
    { t: 'sfx', id: 'memory' }, { t: 'flag', k: 'theatreSolved' }, { t: 'event', id: 'theatre_shadow' },
    say('Las tres sombras se superponen en la pared y, por un instante, forman otra cosa: el escritorio del estudio, con su cajón abierto.'),
    { t: 'note', id: 'simbolos' },
  ],
  piano: [
    { t: 'sfx', id: 'rumble' }, { t: 'shake' }, { t: 'flag', k: 'panelOpen' },
    say('Mi, do, re, sol. Algo se destraba dentro de la pared. El fondo de la chimenea se corre hacia un costado.'),
    { t: 'say', who: 'mercedes', text: '¡Muy bien, Isabel! ¿Ves que si practicás te sale?' },
  ],
};
