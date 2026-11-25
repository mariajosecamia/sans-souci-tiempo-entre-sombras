import { describe, it, expect } from 'vitest';
import { Sim } from './sim';
import { ENDINGS } from '../src/narrative/endings';
import { currentObjectives } from '../src/narrative/journal';

/** Recorrido completo, de la campana del portón hasta la sala del reloj. */
function playToClockRoom(): Sim {
  const g = new Sim();
  // Capítulo 1: la carta
  g.do('campana', 'use').go('porton');
  expect(g.s.room).toBe('jardin');
  g.do('aceitera', 'take').go('puerta_principal');
  g.do('candelabro', 'take').go('puerta_salon');
  g.do('mercedes', 'talk').do('costurero', 'use').do('fosforos', 'take');
  expect(g.has('llave_biblioteca')).toBe(true);
  g.combine('vela', 'fosforos');
  expect(g.has('vela_encendida')).toBe(true);
  g.go('salida');
  g.use('llave_biblioteca', 'puerta_biblioteca').go('puerta_biblioteca');
  // Capítulo 2: la casa que recuerda
  g.use('vela_encendida', 'candelabro_mesa');
  expect(g.s.era).toBe('abandono');
  g.do('nicho', 'take');
  expect(g.s.docs).toContain('diario_aurelio');
  g.do('quinque', 'take');
  expect(g.s.era).toBe('1920');
  g.do('frag_biblioteca', 'use');
  g.go('salida');
  g.use('aceitera', 'reloj_pie').do('reloj_pie', 'use');
  expect(g.has('llave_estudio')).toBe(true);
  g.go('puerta_estudio');
  g.do('cartas', 'take').do('plano', 'look').do('retrato_isabel', 'look');
  g.go('salida').go('puerta_calle').go('salida_invernadero');
  g.do('querosen', 'take');
  g.combine('quinque', 'querosen').combine('fosforos', 'quinque_cargado');
  expect(g.s.flags.quinqueLit).toBe(true);
  // Capítulo 3: lo que esconden las sombras
  g.era();
  g.do('frag_invernadero', 'use');
  g.go('salida');
  g.do('frag_fuente', 'use');
  g.go('puerta_principal');
  expect(g.s.era).toBe('abandono');
  g.go('escalera');
  expect(g.s.flags.stairDoorOpen).toBe(true);
  g.do('frag_corredor', 'use');
  g.go('puerta_infantil');
  g.do('papel_tapiz', 'take');
  expect(g.s.docs).toContain('dibujo_isabel');
  g.era();
  g.combine('vela', 'fosforos');
  g.use('vela_encendida', 'teatro');
  expect(g.s.flags.theatreSolved).toBe(true);
  // el cajón de los discos del estudio
  g.go('salida').go('escalera').go('puerta_estudio');
  g.do('cajon', 'use');
  expect(g.has('llave_caja')).toBe(true);
  g.go('salida').go('escalera').go('puerta_infantil');
  g.use('llave_caja', 'caja_musica');
  expect(g.has('cinta')).toBe(true);
  expect(g.s.flags.rosaGone).toBe(true);
  // Anselmo confiesa
  g.go('salida').go('escalera').go('puerta_calle').go('salida_invernadero');
  g.do('anselmo', 'talk');
  expect(g.has('llave_archivo')).toBe(true);
  // Capítulo 4: la habitación imposible
  g.go('salida').go('puerta_principal').go('puerta_salon');
  g.do('piano', 'use');
  expect(g.s.flags.panelOpen).toBe(true);
  g.go('chimenea');
  g.do('frag_sotano', 'use');
  g.do('archivo', 'use');
  expect(g.has('engranaje')).toBe(true);
  g.era().do('agua', 'use');
  expect(g.s.room).toBe('reloj');
  expect(g.s.era).toBe('sombras');
  // Capítulo 5: antes del amanecer
  g.use('quinque_encendido', 'rosa_atrapada');
  expect(g.s.flags.rosaFree).toBe(true);
  g.do('isabel', 'talk');
  g.use('engranaje', 'reloj_grande');
  expect(g.s.flags.talkedSombra).toBe(true);
  expect(g.s.fragments.length).toBe(5);
  return g;
}

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
  it('el portón está cerrado hasta tocar la campana', () => {
    const g = new Sim();
    expect(() => g.go('porton')).toThrow();
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
