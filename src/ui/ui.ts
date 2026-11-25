// Capa de interfaz en HTML sobre el canvas. Todas las pantallas devuelven promesas para que
// el ejecutor de efectos pueda esperar a que el jugador lea, elija o cierre.
import { ICONS } from './icons';
import { SPEAKERS } from '../dialogue/dialogues';
import { DOCS } from '../data/documents';
import { ITEMS } from '../data/items';
import { drawIcon } from '../art/props';
import { drawPortrait } from '../art/characters';
import type { GameState, Verb } from '../systems/types';
import { NOTES, OBJECTIVES, currentObjectives, CHAPTERS, chapterOf, PLACES, LEMA } from '../narrative/journal';
import { Options } from '../persistence/save';
import { TITLE, VERSION } from '../core/config';

const $ = <T extends HTMLElement = HTMLElement>(html: string): T => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as T;
};
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const VERB_LABEL: Record<Verb, string> = { look: 'Mirar', use: 'Usar', take: 'Tomar', talk: 'Hablar' };

export class UI {
  root = document.getElementById('ui')!;
  private iconCache: Record<string, HTMLCanvasElement> = {};
  private portraitCache: Record<string, HTMLCanvasElement> = {};
  selected: string | null = null;
  onSelect?: (id: string | null) => void;
  onCombine?: (a: string, b: string) => void;
  onInspect?: (id: string) => void;
  onEra?: () => void;
  onJournal?: () => void;
  onMenu?: () => void;
  onHint?: () => void;
  busy = false;
  private seenItems = new Set<string>();
  topbar!: HTMLElement;
  inv!: HTMLElement;
  erabtn!: HTMLElement;
  label!: HTMLElement;
  verbs!: HTMLElement;
  sayBox!: HTMLElement;
  toastEl!: HTMLElement;
  cursorItem!: HTMLElement;

  constructor() {
    this.fit();
    window.addEventListener('resize', () => this.fit());
    this.build();
  }

  /** Ajusta la capa de UI al rectángulo real del canvas (Scale.FIT deja bandas). */
  fit(): void {
    const W = window.innerWidth, H = window.innerHeight;
    const s = Math.min(W / 1920, H / 1080);
    const w = 1920 * s, h = 1080 * s;
    Object.assign(this.root.style, { left: (W - w) / 2 + 'px', top: (H - h) / 2 + 'px', width: w + 'px', height: h + 'px' });
    document.documentElement.style.setProperty('--u', h / 1080 + 'px');
  }

  private build(): void {
    this.topbar = $(`<div id="topbar" class="hidden"><div><span class="room"></span><span class="chapter"></span></div>
      <div class="right">
        <button class="icon-btn" data-a="hint" title="Pistas (H)" aria-label="Pistas">${ICONS.hint}</button>
        <button class="icon-btn" data-a="journal" title="Diario (J)" aria-label="Diario">${ICONS.journal}</button>
        <button class="icon-btn" data-a="menu" title="Pausa (Esc)" aria-label="Menú">${ICONS.menu}</button>
      </div></div>`);
    this.topbar.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const a = (b as HTMLElement).dataset.a;
      if (a === 'journal') this.onJournal?.();
      if (a === 'menu') this.onMenu?.();
      if (a === 'hint') this.onHint?.();
    }));
    this.inv = $(`<div id="inv"><div class="tab">Estuche</div><div class="case"></div></div>`);
    this.inv.querySelector('.tab')!.addEventListener('click', () => this.inv.classList.toggle('open'));
    this.erabtn = $(`<div id="erabtn" title="Cambiar de tiempo (T)" role="button" aria-label="Cambiar de tiempo"></div>`);
    this.erabtn.appendChild(drawIcon('quinque_on', 80));
    this.erabtn.appendChild($(`<span>Otro tiempo</span>`));
    this.erabtn.addEventListener('click', (e) => { e.stopPropagation(); this.onEra?.(); });
    this.label = $(`<div id="label" class="passthrough"></div>`);
    this.verbs = $(`<div id="verbs"></div>`);
    this.sayBox = $(`<div id="say" class="paper"></div>`);
    this.toastEl = $(`<div id="toast"></div>`);
    this.cursorItem = $(`<div class="cursor-item"></div>`);
    document.body.appendChild(this.cursorItem);
    window.addEventListener('pointermove', (e) => {
      this.cursorItem.style.left = e.clientX + 'px';
      this.cursorItem.style.top = e.clientY + 'px';
    });
    this.root.append(this.topbar, this.inv, this.erabtn, this.label, this.verbs, this.sayBox, this.toastEl);
    this.hud(false);
  }

  hud(show: boolean): void {
    for (const el of [this.topbar, this.inv]) el.style.display = show ? '' : 'none';
    if (!show) this.erabtn.classList.remove('show');
  }

  setRoom(name: string, s: GameState): void {
    this.topbar.querySelector('.room')!.textContent = name;
    this.topbar.querySelector('.chapter')!.textContent = `Capítulo ${chapterOf(s) + 1}: ${CHAPTERS[chapterOf(s)]}`;
  }

  setEraButton(show: boolean, era: string): void {
    this.erabtn.classList.toggle('show', show);
    const sp = this.erabtn.querySelector('span');
    if (sp) sp.textContent = era === '1920' ? 'Ver el abandono' : 'Volver a 1920';
  }

  icon(id: string, size = 96): HTMLCanvasElement {
    const key = id + size;
    if (!this.iconCache[key]) this.iconCache[key] = drawIcon(ITEMS[id]?.icon ?? id, size);
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    c.getContext('2d')!.drawImage(this.iconCache[key], 0, 0);
    return c;
  }

  renderInventory(s: GameState): void {
    const box = this.inv.querySelector('.case')!;
    box.innerHTML = '';
    let fresh = false;
    for (const id of s.inventory) {
      const slot = $(`<div class="slot" tabindex="0" title="${esc(ITEMS[id]?.name ?? id)}"></div>`);
      if (!this.seenItems.has(id)) { slot.classList.add('new'); fresh = true; }
      if (this.selected === id) slot.classList.add('sel');
      slot.appendChild(this.icon(id));
      slot.addEventListener('click', (e) => {
        e.stopPropagation();
        this.seenItems.add(id);
        if (this.busy) return;
        if (this.selected && this.selected !== id) { const a = this.selected; this.select(null); this.onCombine?.(a, id); return; }
        if (this.selected === id) { this.select(null); this.onInspect?.(id); return; }
        this.select(id);
      });
      slot.addEventListener('contextmenu', (e) => { e.preventDefault(); this.seenItems.add(id); this.onInspect?.(id); });
      box.appendChild(slot);
    }
    if (fresh) { this.inv.classList.add('open'); setTimeout(() => this.inv.classList.remove('open'), 1800); }
  }

  select(id: string | null): void {
    this.selected = id;
    this.inv.querySelectorAll('.slot').forEach((el) => el.classList.toggle('sel', (el as HTMLElement).title === (id ? ITEMS[id]?.name : '')));
    this.cursorItem.innerHTML = '';
    if (id) { this.cursorItem.appendChild(this.icon(id, 56)); this.cursorItem.style.display = 'block'; this.toast(`${ITEMS[id].name}: elegí dónde usarlo (tocalo de nuevo para examinarlo)`); }
    else this.cursorItem.style.display = 'none';
    this.onSelect?.(id);
  }

  showLabel(text: string | null, x = 0, y = 0): void {
    if (!text) { this.label.classList.remove('show'); return; }
    this.label.textContent = (this.selected ? `Usar ${ITEMS[this.selected].name} con ` : '') + text;
    Object.assign(this.label.style, { left: x + 'px', top: y + 'px' });
    this.label.classList.add('show');
  }

  /** Muestra el anillo de verbos en (x,y) relativos a #ui. */
  chooseVerb(verbs: Verb[], x: number, y: number): Promise<Verb | null> {
    return new Promise((res) => {
      this.verbs.innerHTML = '';
      const close = (v: Verb | null) => { this.verbs.classList.remove('show'); window.removeEventListener('pointerdown', away, true); res(v); };
      const away = (e: Event) => { if (!this.verbs.contains(e.target as Node)) close(null); };
      for (const v of verbs) {
        const b = $(`<button aria-label="${VERB_LABEL[v]}">${ICONS[v]}<span>${VERB_LABEL[v]}</span></button>`);
        b.addEventListener('click', (e) => { e.stopPropagation(); close(v); });
        this.verbs.appendChild(b);
      }
      const r = this.root.getBoundingClientRect();
      const u = r.height / 1080;
      const half = (verbs.length * 102 * u) / 2;
      Object.assign(this.verbs.style, { left: Math.min(r.width - half - 10, Math.max(half + 10, x)) + 'px', top: Math.max(60 * u, y) + 'px' });
      this.verbs.classList.add('show');
      setTimeout(() => window.addEventListener('pointerdown', away, true), 0);
    });
  }

  private portrait(who: string): HTMLCanvasElement | null {
    if (!['elena', 'anselmo', 'mercedes', 'rosa', 'isabel'].includes(who)) return null;
    if (!this.portraitCache[who]) {
      const c = document.createElement('canvas');
      c.width = 300; c.height = 348;
      drawPortrait(c.getContext('2d')!, who, 300, 348);
      this.portraitCache[who] = c;
    }
    return this.portraitCache[who];
  }

  private fillSay(who: string, text: string): HTMLElement {
    const sp = SPEAKERS[who] ?? SPEAKERS.narr;
    this.sayBox.innerHTML = '';
    this.sayBox.className = 'paper show' + (who === 'narr' ? ' narr' : '');
    const p = this.portrait(who);
    if (p) { const pf = $(`<div class="portrait"></div>`); const c = document.createElement('canvas'); c.width = 300; c.height = 348; c.getContext('2d')!.drawImage(p, 0, 0); pf.appendChild(c); this.sayBox.appendChild(pf); }
    const col = $(`<div class="col"></div>`);
    if (sp.name) col.appendChild($(`<div class="who" style="color:${sp.color}">${esc(sp.name)}</div>`));
    const t = $(`<div class="text"></div>`);
    t.textContent = text;
    col.appendChild(t);
    this.sayBox.appendChild(col);
    return col;
  }

  /** Línea de diálogo / narración. Se cierra con clic, tecla o tiempo. */
  say(who: string, text: string, opts: Options): Promise<void> {
    return new Promise((res) => {
      this.fillSay(who, text);
      this.sayBox.appendChild($(`<div class="more">▾</div>`));
      const ms = Math.max(2200, text.length * 55) / Math.max(0.3, opts.textSpeed);
      let done = false;
      const finish = () => {
        if (done) return; done = true;
        clearTimeout(timer);
        this.sayBox.removeEventListener('click', finish);
        window.removeEventListener('keydown', key);
        this.sayBox.classList.remove('show');
        res();
      };
      const key = (e: KeyboardEvent) => { if ([' ', 'Enter', '.'].includes(e.key)) { e.preventDefault(); finish(); } };
      const timer = window.setTimeout(finish, ms * 2.2);
      setTimeout(() => { this.sayBox.addEventListener('click', finish); window.addEventListener('keydown', key); }, 150);
    });
  }

  choose(who: string, prompt: string, options: string[]): Promise<number> {
    return new Promise((res) => {
      const col = this.fillSay(who, prompt);
      const box = $(`<div class="opts"></div>`);
      options.forEach((o, i) => {
        const b = $(`<button>${i + 1}. ${esc(o)}</button>`);
        b.addEventListener('click', (e) => { e.stopPropagation(); end(i); });
        box.appendChild(b);
      });
      col.appendChild(box);
      const key = (e: KeyboardEvent) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= options.length) end(n - 1); };
      const end = (i: number) => { window.removeEventListener('keydown', key); this.sayBox.classList.remove('show'); res(i); };
      window.addEventListener('keydown', key);
      (box.firstElementChild as HTMLElement)?.focus();
    });
  }

  modal(inner: HTMLElement, closable = true): { el: HTMLElement; closed: Promise<void>; close: () => void } {
    const m = $(`<div class="modal"></div>`);
    m.appendChild(inner);
    let resolve!: () => void;
    const closed = new Promise<void>((r) => (resolve = r));
    const close = () => { m.remove(); window.removeEventListener('keydown', key); resolve(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape' && closable) close(); };
    if (closable) {
      const x = $(`<button class="close" aria-label="Cerrar">×</button>`);
      x.addEventListener('click', close);
      inner.appendChild(x);
      m.addEventListener('click', (e) => { if (e.target === m) close(); });
      window.addEventListener('keydown', key);
    }
    this.root.appendChild(m);
    return { el: m, closed, close };
  }

  showDoc(id: string): Promise<void> {
    const d = DOCS[id];
    if (!d) return Promise.resolve();
    const body = d.body.split(/\n\n+/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
    const el = $(`<div class="sheet paper doc ${d.kind}"><h2>${esc(d.title)}</h2>${d.date ? `<div class="date">${esc(d.date)}</div>` : ''}<div class="body">${body}</div></div>`);
    return this.modal(el).closed;
  }

  toast(text: string, ms = 2400): void {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    clearTimeout((this.toastEl as any)._t);
    (this.toastEl as any)._t = setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  // ---------------------------------------------------------------- diario
  journal(s: GameState, tab = 'objetivos'): Promise<void> {
    const el = $(`<div class="sheet paper"><h1>Diario de investigación</h1><div class="journal"><div class="tabs"></div><div class="content"></div></div></div>`);
    const tabs: [string, string][] = [['objetivos', 'Objetivos'], ['notas', 'Notas'], ['personas', 'Personas'], ['documentos', 'Documentos'], ['lugares', 'Mapa'], ['recuerdos', 'Recuerdos'], ['cronologia', 'Cronología']];
    const tb = el.querySelector('.tabs')!, content = el.querySelector('.content') as HTMLElement;
    const show = (t: string) => {
      tb.querySelectorAll('button').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.t === t));
      content.innerHTML = '';
      if (t === 'objetivos') {
        const cur = currentObjectives(s);
        if (!cur.length) content.appendChild($(`<p>No hay nada pendiente.</p>`));
        cur.forEach((o) => content.appendChild($(`<div class="entry"><h3>☐ ${esc(o.title)}</h3></div>`)));
        const done = OBJECTIVES.filter((o) => o.done(s));
        done.forEach((o) => content.appendChild($(`<div class="entry done"><h3>☑ ${esc(o.title)}</h3></div>`)));
      }
      if (t === 'notas' || t === 'personas') {
        const ids = s.notes.filter((n) => NOTES[n] && ((t === 'personas') === (NOTES[n].cat === 'persona')));
        if (!ids.length) content.appendChild($(`<p><i>Todavía nada.</i></p>`));
        ids.slice().reverse().forEach((n) => content.appendChild($(`<div class="entry"><h3>${esc(NOTES[n].title)}</h3><p>${esc(NOTES[n].text)}</p></div>`)));
      }
      if (t === 'documentos') {
        if (!s.docs.length) content.appendChild($(`<p><i>Todavía no leí ningún documento.</i></p>`));
        s.docs.forEach((d) => {
          const e = $(`<div class="entry"><h3 class="link">${esc(DOCS[d].title)}</h3><p>${esc(DOCS[d].date ?? '')}</p></div>`);
          e.querySelector('h3')!.addEventListener('click', () => this.showDoc(d));
          content.appendChild(e);
        });
      }
      if (t === 'lugares') content.appendChild(this.map(s));
      if (t === 'recuerdos') {
        content.appendChild($(`<p>Fragmentos de memoria recuperados: <b>${s.fragments.length} de 5</b>. Son destellos de tinta que sólo aparecen en una de las dos épocas.</p>`));
        s.fragments.forEach((f) => {
          const id = 'frag_' + f;
          const e = $(`<div class="entry"><h3 class="link">${esc(DOCS[id].title)}</h3></div>`);
          e.querySelector('h3')!.addEventListener('click', () => this.showDoc(id));
          content.appendChild(e);
        });
      }
      if (t === 'cronologia') {
        const ev: [string, string, boolean][] = [
          ['1900', 'Nace Isabel Valcárcel.', s.notes.includes('isabel')],
          ['1904', 'Juana Calfún entra a trabajar como niñera.', s.notes.includes('jeanne')],
          ['15 jun. 1909', 'Muere Isabel, a las cuatro menos veinte. Aurelio detiene el reloj.', s.docs.includes('diario_aurelio')],
          ['oct. 1909', 'Llegan las cajas de Verhaegen desde Lieja.', s.docs.includes('carta_verhaegen1') || s.fragments.includes('sotano')],
          ['1910', 'Juana saca una pieza del mecanismo. La echan.', s.docs.includes('cartas_jeanne')],
          ['1912', 'Muere Aurelio.', s.flags.mer_reloj === true || s.docs.includes('carta_verhaegen2')],
          ['12 may. 1920', 'Llego a Belle Ombre con una carta sin remitente.', true],
        ];
        ev.forEach(([d, txt, known]) => content.appendChild($(`<div class="entry"><h3>${esc(d)}</h3><p>${known ? esc(txt) : '…'}</p></div>`)));
      }
    };
    tabs.forEach(([k, n]) => {
      const b = $(`<button data-t="${k}">${n}</button>`);
      b.addEventListener('click', () => show(k));
      tb.appendChild(b);
    });
    show(tab);
    return this.modal(el).closed;
  }

  private map(s: GameState): HTMLElement {
    const m = $(`<div class="map"></div>`);
    const R: [string, number, number, number, number][] = [
      ['corredor', 22, 2, 46, 14], ['infantil', 70, 2, 22, 14],
      ['estudio', 58, 34, 16, 16], ['salon', 2, 34, 20, 16], ['hall', 24, 34, 32, 16], ['biblioteca', 76, 34, 22, 16],
      ['sotano', 2, 56, 40, 12], ['reloj', 44, 56, 24, 12],
      ['jardin', 20, 74, 50, 12], ['invernadero', 72, 74, 26, 12], ['entrada', 30, 90, 30, 9],
    ];
    m.appendChild($(`<div style="position:absolute;left:0;top:18%;font-family:var(--fell);font-style:italic;opacity:.6">planta alta ↑</div>`));
    for (const [id, x, y, w, h] of R) {
      const known = s.visited.includes(id) || s.room === id;
      const el = $(`<div class="r ${known ? '' : 'unk'} ${s.room === id ? 'here' : ''}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%">${known ? esc(PLACES[id]) : '?'}</div>`);
      m.appendChild(el);
    }
    return m;
  }

  hints(s: GameState, onUse: () => void): Promise<void> {
    const el = $(`<div class="sheet paper"><h1>Pistas</h1><p><i>Cada pista se revela de a una: primero una orientación, después algo más concreto y por último la solución.</i></p><div class="list"></div></div>`);
    const list = el.querySelector('.list')!;
    const cur = currentObjectives(s);
    if (!cur.length) list.appendChild($(`<p>No hay nada pendiente ahora.</p>`));
    const level: Record<string, number> = (s.flags._hintLv as any) ? JSON.parse(String(s.flags._hintLv)) : {};
    cur.forEach((o) => {
      const e = $(`<div class="entry journal" style="display:block;min-height:0"><h3 style="font-family:var(--fell);font-weight:normal;font-size:calc(var(--u)*34);margin:0">${esc(o.title)}</h3><div class="hs"></div></div>`);
      const hs = e.querySelector('.hs')!;
      const render = () => {
        hs.innerHTML = '';
        const lv = level[o.id] ?? 0;
        for (let i = 0; i < lv; i++) hs.appendChild($(`<p class="hint">${['Orientación', 'Pista', 'Solución'][i]}: ${esc(o.hints[i])}</p>`));
        if (lv < 3) {
          const b = $(`<button class="pbtn">${['Ver orientación', 'Ver pista concreta', 'Ver solución'][lv]}</button>`);
          b.addEventListener('click', () => { level[o.id] = lv + 1; s.flags._hintLv = JSON.stringify(level); onUse(); render(); });
          hs.appendChild(b);
        }
      };
      render();
      list.appendChild(e);
    });
    return this.modal(el).closed;
  }

  // ---------------------------------------------------------------- menús
  title(hasSave: boolean): Promise<'new' | 'continue' | 'options' | 'howto' | 'credits'> {
    return new Promise((res) => {
      const el = $(`<div id="title"><h1>Belle Ombre</h1><h2>El tiempo entre las sombras</h2><div class="lema">${esc(LEMA)}</div><div class="menu"></div>
        <div class="foot">${esc(TITLE)} · v${VERSION} · Ficción inspirada en un palacio normando de Tandil.</div></div>`);
      const menu = el.querySelector('.menu')!;
      const items: [string, string, boolean][] = [['continue', 'Continuar', hasSave], ['new', 'Nueva partida', true], ['options', 'Opciones', true], ['howto', 'Cómo jugar', true], ['credits', 'Créditos', true]];
      for (const [k, t, en] of items) {
        if (!en) continue;
        const b = $(`<button class="btn">${t}</button>`);
        b.addEventListener('click', () => { el.remove(); res(k as any); });
        menu.appendChild(b);
      }
      this.root.appendChild(el);
      (menu.firstElementChild as HTMLElement)?.focus();
    });
  }

  options(o: Options, apply: (o: Options) => void): Promise<void> {
    const el = $(`<div class="sheet paper"><h1>Opciones</h1></div>`);
    const row = (label: string, key: keyof Options, min = 0, max = 1, step = 0.05) => {
      const r = $(`<label class="range"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${o[key]}"></label>`);
      r.querySelector('input')!.addEventListener('input', (e) => { (o as any)[key] = parseFloat((e.target as HTMLInputElement).value); apply(o); });
      el.appendChild(r);
    };
    row('Volumen general', 'master'); row('Música', 'music'); row('Ambiente', 'amb'); row('Efectos', 'sfx'); row('Velocidad del texto', 'textSpeed', 0.5, 2, 0.1);
    const chk = (label: string, key: keyof Options) => {
      const r = $(`<label class="range"><span>${label}</span><input type="checkbox" ${o[key] ? 'checked' : ''} style="width:calc(var(--u)*36);height:calc(var(--u)*36)"></label>`);
      r.querySelector('input')!.addEventListener('change', (e) => { (o as any)[key] = (e.target as HTMLInputElement).checked; apply(o); });
      el.appendChild(r);
    };
    chk('Texto grande', 'subtitlesBig'); chk('Menos movimiento', 'reduceMotion');
    return this.modal(el).closed;
  }

  howto(): Promise<void> {
    const el = $(`<div class="sheet paper"><h1>Cómo jugar</h1><ul>
      <li><b>Caminar:</b> tocá o hacé clic en el piso.</li>
      <li><b>Interactuar:</b> tocá un objeto o una persona y elegí <i>Mirar, Usar, Tomar</i> o <i>Hablar</i>. Clic derecho mira directamente.</li>
      <li><b>Puertas y salidas:</b> tocalas y Elena va hacia ellas.</li>
      <li><b>Estuche (inventario):</b> abajo. Tocá un objeto para elegirlo y después tocá dónde usarlo. Tocá otro objeto para combinarlos. Tocalo dos veces para examinarlo o leerlo.</li>
      <li><b>El quinqué:</b> cuando lo tengas encendido, en los lugares donde la casa está quebrada vas a poder ver <i>el otro tiempo</i>.</li>
      <li><b>Diario (J):</b> objetivos, notas, personas, documentos, mapa y recuerdos.</li>
      <li><b>Pistas (H):</b> tres niveles, sólo si las pedís.</li>
      <li>El juego se guarda solo al cambiar de habitación. Esc abre la pausa.</li></ul></div>`);
    return this.modal(el).closed;
  }

  credits(): Promise<void> {
    const el = $(`<div class="sheet paper"><h1>Créditos</h1>
      <p><b>Belle Ombre: El tiempo entre las sombras</b>. Idea y dirección: Ale.</p>
      <p>Historia, programación, ilustración procedural, sonido y diseño: desarrollado con Claude (Anthropic) a partir del documento de diseño de Ale.</p>
      <p>Belle Ombre es un lugar ficticio, inspirado en la arquitectura de un palacio normando de las afueras de Tandil. La familia Valcárcel y todos los personajes son inventados.</p>
      <p>La atmósfera rinde homenaje a <i>La casa maldita</i> de H. P. Lovecraft (dominio público), sin reproducir su texto ni su trama.</p>
      <p>Hecho con Phaser 3, TypeScript y Vite. Todo el arte y el sonido se generan en tiempo real.</p></div>`);
    return this.modal(el).closed;
  }

  pause(): Promise<'resume' | 'save' | 'options' | 'howto' | 'title'> {
    return new Promise((res) => {
      const el = $(`<div class="sheet paper" style="text-align:center;max-width:calc(var(--u)*700)"><h1>Pausa</h1><div style="display:flex;flex-direction:column;gap:calc(var(--u)*12);align-items:center"></div></div>`);
      const box = el.querySelector('div')!;
      const m = this.modal(el);
      const opts: [string, string][] = [['resume', 'Seguir jugando'], ['save', 'Guardar partida'], ['options', 'Opciones'], ['howto', 'Cómo jugar'], ['title', 'Volver al menú principal']];
      let picked: any = 'resume';
      for (const [k, t] of opts) {
        const b = $(`<button class="pbtn" style="width:80%">${t}</button>`);
        b.addEventListener('click', () => { picked = k; m.close(); });
        box.appendChild(b);
      }
      m.closed.then(() => res(picked));
    });
  }

  ending(title: string, paragraphs: string[]): Promise<void> {
    return new Promise((res) => {
      const el = $(`<div class="ending"><h1>${esc(title)}</h1></div>`);
      paragraphs.forEach((p, i) => { const e = $(`<p style="animation-delay:${1 + i * 2.6}s">${esc(p)}</p>`); el.appendChild(e); });
      const b = $(`<button class="btn" style="opacity:0;animation:fade 1s forwards;animation-delay:${2 + paragraphs.length * 2.6}s">Créditos</button>`);
      b.addEventListener('click', () => { el.remove(); this.credits().then(() => res()); });
      el.appendChild(b);
      this.root.appendChild(el);
    });
  }
}
