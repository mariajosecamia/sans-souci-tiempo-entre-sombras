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
