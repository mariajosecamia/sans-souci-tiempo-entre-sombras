import { expect } from 'vitest';
// Simulador del juego sin Phaser: aplica efectos igual que WorldScene, para probar recorridos.
import type { Effect, GameState, Verb } from '../src/systems/types';
import { applyEffect, newState } from '../src/systems/state';
import { interact, combine, visibleHotspots, settleEra, eraToggleAvailable, eraOf } from '../src/systems/logic';
import { ROOMS } from '../src/data/rooms';
import { DIALOGS, type DialogNode, type DialogOption } from '../src/dialogue/dialogues';
import { SOLVED, ANSWERS, checkPuzzle } from '../src/puzzles/puzzles';

export class Sim {
  s: GameState = newState();
  log: string[] = [];
  /** Preferencias para elegir opciones de diálogo (fragmentos de texto). */
  prefer: string[] = [];

  constructor() { this.enter(); }

  private enter(): void {
    settleEra(ROOMS[this.s.room], this.s);
    if (!this.s.visited.includes(this.s.room)) this.s.visited.push(this.s.room);
    this.exec(ROOMS[this.s.room].onEnter?.(this.s) ?? []);
  }

  exec(effects: Effect[]): void {
    for (const e of effects) {
      if (this.s.ending) return;
      switch (e.t) {
        case 'say': this.log.push(`${e.who ?? 'elena'}: ${e.text}`); break;
        case 'goto': applyEffect(this.s, e); this.enter(); break;
        case 'dialog': this.dialog(e.id); break;
        case 'puzzle': {
          if (!checkPuzzle(e.id, (ANSWERS as any)[e.id])) throw new Error(`la respuesta de ${e.id} no valida`);
          this.exec(SOLVED[e.id]);
          break;
        }
        case 'event': if (e.id === 'free_rosa') this.s.flags.rosaFree = true; break;
        default: applyEffect(this.s, e);
      }
    }
  }

  private dialog(id: string): void {
    const d = DIALOGS[id];
    let node: string | undefined = d.start(this.s);
    let guard = 0;
    while (node && guard++ < 60 && !this.s.ending) {
      const n: DialogNode = d.nodes[node];
      for (const [who, text] of n.lines) this.log.push(`${who}: ${text}`);
      if (n.effects) this.exec(n.effects);
      if (n.options) {
        const opts: DialogOption[] = n.options.filter((o) => (!o.when || o.when(this.s)) && (!o.onceFlag || !this.s.flags[o.onceFlag]));
        if (!opts.length) break;
        const pick: DialogOption = opts.find((o) => this.prefer.some((p) => o.text.includes(p))) ?? opts[opts.length - 1];
        if (pick.effects) this.exec(pick.effects);
        node = pick.next;
      } else node = n.next;
    }
  }

  private spot(id: string) {
    const h = visibleHotspots(this.s.room, this.s).find((x) => x.id === id);
    if (!h) throw new Error(`"${id}" no está visible en ${this.s.room} (${eraOf(ROOMS[this.s.room], this.s)})`);
    return h;
  }

  do(id: string, verb: Verb | 'exit'): this { this.exec(interact(this.spot(id), verb, this.s)); return this; }
  use(item: string, id: string): this {
    if (!this.s.inventory.includes(item)) throw new Error(`no tengo ${item}`);
    this.exec(interact(this.spot(id), 'use', this.s, item)); return this;
  }
  go(id: string): this {
    const before = this.s.room;
    this.do(id, 'exit');
    if (this.s.room === before) throw new Error(`no pude salir por ${id} desde ${before}`);
    return this;
  }
  combine(a: string, b: string): this { this.exec(combine(a, b, this.s)); return this; }
  era(): this {
    if (!eraToggleAvailable(ROOMS[this.s.room], this.s)) throw new Error(`no puedo cambiar de tiempo en ${this.s.room}`);
    this.s.era = this.s.era === '1920' ? 'abandono' : '1920';
    return this;
  }
  has(item: string): boolean { return this.s.inventory.includes(item); }
}

/** Recorrido completo, de la campana del portón hasta la sala del reloj. */
export function playToClockRoom(): Sim {
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

