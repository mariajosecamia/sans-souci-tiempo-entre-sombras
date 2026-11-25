import { describe, it, expect } from 'vitest';
import { Sim, playToClockRoom } from './sim';
import { ENDINGS } from '../src/narrative/endings';
import { currentObjectives } from '../src/narrative/journal';

describe('recorrido completo', () => {
  it('se puede llegar a la sala del reloj', () => {
    const g = playToClockRoom();
    expect(g.s.ending).toBeUndefined();
  });

  for (const [id, phrase] of [
    ['liberar', 'Detener el reloj'],
    ['retrato', 'Darle cuerda'],
    ['fractura', 'Romper'],
    ['placa', 'Fotografiar'],
  ] as const) {
    it(`llega al final "${id}"`, () => {
      const g = playToClockRoom();
      g.prefer = [phrase];
      g.use('engranaje', 'reloj_grande');
      expect(g.s.ending).toBe(id);
      expect(ENDINGS[id]).toBeTruthy();
    });
  }

  it('sin los cinco recuerdos no aparece el final secreto', () => {
    const g = playToClockRoom();
    g.s.fragments = g.s.fragments.slice(0, 4);
    g.prefer = ['Fotografiar'];
    g.use('engranaje', 'reloj_grande');
    expect(g.s.ending).not.toBe('placa');
  });

  it('siempre hay al menos un objetivo con pistas', () => {
    const g = new Sim();
    expect(currentObjectives(g.s).length).toBeGreaterThan(0);
    const end = playToClockRoom();
    expect(currentObjectives(end.s).length).toBeGreaterThan(0);
  });
});

describe('cerrojos', () => {
  it('el portón está cerrado hasta llamar a Anselmo', () => {
    const g = new Sim();
    expect(g.s.flags.gateOpen).toBeFalsy();
    g.do('candado', 'use');
    expect(g.s.flags.gateOpen).toBe(true);
    g.go('porton');
    expect(g.s.room).toBe('jardin');
  });
  it('la escalera está trabada en 1920 antes de subir por el otro tiempo', () => {
    const g = new Sim();
    g.do('campana', 'use').go('porton').go('puerta_principal');
    expect(() => g.go('escalera')).toThrow();
  });
  it('no se puede cambiar de tiempo sin el quinqué encendido', () => {
    const g = new Sim();
    g.do('campana', 'use').go('porton');
    expect(() => g.era()).toThrow();
  });
});
