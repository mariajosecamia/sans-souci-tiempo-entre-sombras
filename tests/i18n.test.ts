import { describe, it, expect } from 'vitest';
import { EN } from '../src/i18n/en';
import { t, setLang } from '../src/i18n/i18n';
import { ITEMS } from '../src/data/items';
import { DOCS } from '../src/data/documents';
import { NOTES, OBJECTIVES, CHAPTERS, PLACES, LEMA } from '../src/narrative/journal';
import { ENDINGS } from '../src/narrative/endings';
import { DIALOGS, SPEAKERS } from '../src/dialogue/dialogues';
import { ROOMS } from '../src/data/rooms';
import { playToClockRoom } from './sim';

/** Textos que no cambian entre idiomas (nombres propios, notas musicales). */
const SAME = new Set(['Elena', 'Anselmo', 'Rosa', 'Isabel', 'Doña Mercedes', 'Mercedes', 'Belle Ombre', 'SOL', 'DO²', '', '…', '1909', '1920', 'Belle Ombre, 1909–1910', 'Anselmo Quiroga', 'Rosa Benítez', 'Lucien Verhaegen', 'Isabel Valcárcel', 'Piano']);
const missing = (texts: string[]) => [...new Set(texts)].filter((x) => !SAME.has(x) && !(x in EN));

describe('inglés', () => {
  it('todos los textos fijos tienen traducción', () => {
    const texts: string[] = [];
    for (const i of Object.values(ITEMS)) texts.push(i.name, i.desc);
    for (const d of Object.values(DOCS)) texts.push(d.title, d.body, ...(d.date ? [d.date] : []));
    for (const n of Object.values(NOTES)) texts.push(n.title, n.text);
    for (const o of OBJECTIVES) texts.push(o.title, ...o.hints);
    texts.push(...CHAPTERS, ...Object.values(PLACES), LEMA);
    for (const e of Object.values(ENDINGS)) texts.push(e.title, ...e.text);
    for (const d of Object.values(DIALOGS)) for (const n of Object.values(d.nodes)) {
      for (const [, l] of n.lines) texts.push(l);
      for (const o of n.options ?? []) texts.push(o.text);
    }
    for (const s of Object.values(SPEAKERS)) texts.push(s.name);
    for (const r of Object.values(ROOMS)) { texts.push(r.name); for (const h of r.hotspots) if (typeof h.name === 'string') texts.push(h.name); }
    expect(missing(texts)).toEqual([]);
  });

  it('todo lo que se dice en el recorrido tiene traducción', () => {
    const g = playToClockRoom();
    const said = g.log.map((l) => l.slice(l.indexOf(': ') + 2));
    expect(missing(said)).toEqual([]);
  });

  it('t() devuelve inglés o español según el idioma', () => {
    setLang('en');
    expect(t('Vela')).toBe('Candle');
    expect(t('texto sin traducción')).toBe('texto sin traducción');
    setLang('es');
    expect(t('Vela')).toBe('Vela');
  });
});
