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
import { audio } from '../audio/audio';
import { t, L, getLang, setLang, type Lang } from '../i18n/i18n';

const $ = <T extends HTMLElement = HTMLElement>(html: string): T => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as T;
};
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const VERB_LABEL = (v: Verb): string => ({ look: L('Mirar', 'Look'), use: L('Usar', 'Use'), take: L('Tomar', 'Take'), talk: L('Hablar', 'Talk') })[v];

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
        <button class="icon-btn" data-a="hint" title="${L('Pistas', 'Hints')} (H)" aria-label="${L('Pistas', 'Hints')}">${ICONS.hint}</button>
        <button class="icon-btn" data-a="journal" title="${L('Diario', 'Journal')} (J)" aria-label="${L('Diario', 'Journal')}">${ICONS.journal}</button>
        <button class="icon-btn" data-a="menu" title="${L('Pausa', 'Pause')} (Esc)" aria-label="${L('Menú', 'Menu')}">${ICONS.menu}</button>
      </div></div>`);
    this.topbar.querySelectorAll('button').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      const a = (b as HTMLElement).dataset.a;
      if (a === 'journal') this.onJournal?.();
      if (a === 'menu') this.onMenu?.();
      if (a === 'hint') this.onHint?.();
    }));
    this.inv = $(`<div id="inv"><div class="tab">${L('Estuche', 'Satchel')}</div><div class="case"></div></div>`);
    this.inv.querySelector('.tab')!.addEventListener('click', () => this.inv.classList.toggle('open'));
    this.erabtn = $(`<div id="erabtn" title="${L('Cambiar de tiempo', 'Change time')} (T)" role="button" aria-label="${L('Cambiar de tiempo', 'Change time')}"></div>`);
    this.erabtn.appendChild(drawIcon('quinque_on', 80));
    this.erabtn.appendChild($(`<span>${L('Otro tiempo', 'Other time')}</span>`));
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
    this.lastRoom = [name, s];
    this.topbar.querySelector('.room')!.textContent = t(name);
    this.topbar.querySelector('.chapter')!.textContent = `${L('Capítulo', 'Chapter')} ${chapterOf(s) + 1}: ${t(CHAPTERS[chapterOf(s)])}`;
  }

  setEraButton(show: boolean, era: string): void {
    this.lastEra = [show, era];
    this.erabtn.classList.toggle('show', show);
    const sp = this.erabtn.querySelector('span');
    if (sp) sp.textContent = era === '1920' ? L('Ver el abandono', 'See the abandonment') : L('Volver a 1920', 'Back to 1920');
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
    this.lastInv = s;
    const box = this.inv.querySelector('.case')!;
    box.innerHTML = '';
    let fresh = false;
    for (const id of s.inventory) {
      const slot = $(`<div class="slot" tabindex="0" title="${esc(t(ITEMS[id]?.name ?? id))}"></div>`);
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
    this.inv.querySelectorAll('.slot').forEach((el) => el.classList.toggle('sel', (el as HTMLElement).title === (id ? t(ITEMS[id]?.name ?? id) : '')));
    this.cursorItem.innerHTML = '';
    if (id) { this.cursorItem.appendChild(this.icon(id, 56)); this.cursorItem.style.display = 'block'; this.toast(`${t(ITEMS[id].name)}: ${L('elegí dónde usarlo (tocalo de nuevo para examinarlo)', 'choose where to use it (tap it again to examine it)')}`); }
    else this.cursorItem.style.display = 'none';
    this.onSelect?.(id);
  }

  showLabel(text: string | null, x = 0, y = 0): void {
    if (!text) { this.label.classList.remove('show'); return; }
    this.label.textContent = (this.selected ? L(`Usar ${t(ITEMS[this.selected].name)} con `, `Use ${t(ITEMS[this.selected].name)} with `) : '') + t(text);
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
        const b = $(`<button aria-label="${VERB_LABEL(v)}">${ICONS[v]}<span>${VERB_LABEL(v)}</span></button>`);
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
    if (sp.name) col.appendChild($(`<div class="who" style="color:${sp.color}">${esc(t(sp.name))}</div>`));
    const tEl = $(`<div class="text"></div>`);
    // el texto completo reserva el espacio; se revela letra por letra encima
    tEl.innerHTML = `<span class="typed"></span><span class="ghost">${esc(text)}</span>`;
    col.appendChild(tEl);
    this.sayBox.appendChild(col);
    return col;
  }

  /** Escribe el texto letra por letra, como a máquina. Devuelve una función que lo completa de golpe. */
  private typewrite(col: HTMLElement, text: string, speed: number, onDone: () => void): () => void {
    const typed = col.querySelector('.typed') as HTMLElement, ghost = col.querySelector('.ghost') as HTMLElement;
    let i = 0, stopped = false;
    const cps = 38 * Math.max(0.3, speed);
    const step = () => {
      if (stopped) return;
      i++;
      typed.textContent = text.slice(0, i);
      ghost.textContent = text.slice(i);
      const ch = text[i - 1];
      if (ch && ch !== ' ' && i % 2 === 0) audio.key();
      if (i >= text.length) { stopped = true; onDone(); return; }
      const pause = '.,;:!?…—'.includes(ch) ? 7 : 1;
      timer = window.setTimeout(step, (1000 / cps) * pause);
    };
    let timer = window.setTimeout(step, 60);
    return () => { if (stopped) return; stopped = true; clearTimeout(timer); typed.textContent = text; ghost.textContent = ''; onDone(); };
  }

  /** Línea de diálogo / narración. Clic o tecla: primero completa el texto, después lo cierra. */
  say(who: string, text: string, opts: Options): Promise<void> {
    return new Promise((res) => {
      text = t(text);
      const col = this.fillSay(who, text);
      const more = $(`<div class="more">▾</div>`);
      more.style.visibility = 'hidden';
      this.sayBox.appendChild(more);
      const ms = Math.max(2200, text.length * 55) / Math.max(0.3, opts.textSpeed);
      let done = false, typing = true, timer = 0;
      const complete = this.typewrite(col, text, opts.textSpeed, () => {
        typing = false; more.style.visibility = 'visible';
        timer = window.setTimeout(finish, ms * 1.6);
      });
      const finish = () => {
        if (done) return; done = true;
        clearTimeout(timer);
        this.sayBox.removeEventListener('click', advance);
        window.removeEventListener('keydown', key);
        this.sayBox.classList.remove('show');
        res();
      };
      const advance = () => { if (typing) complete(); else finish(); };
      const key = (e: KeyboardEvent) => { if ([' ', 'Enter', '.'].includes(e.key)) { e.preventDefault(); advance(); } };
      setTimeout(() => { this.sayBox.addEventListener('click', advance); window.addEventListener('keydown', key); }, 150);
    });
  }

  choose(who: string, prompt: string, options: string[]): Promise<number> {
    return new Promise((res) => {
      prompt = t(prompt);
      const col = this.fillSay(who, prompt);
      this.typewrite(col, prompt, 2.5, () => {})();
      const box = $(`<div class="opts"></div>`);
      options.forEach((o, i) => {
        const b = $(`<button>${i + 1}. ${esc(t(o))}</button>`);
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
      const x = $(`<button class="close" aria-label="${L('Cerrar', 'Close')}">×</button>`);
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
    const body = t(d.body).split(/\n\n+/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
    const el = $(`<div class="sheet paper doc ${d.kind}"><h2>${esc(t(d.title))}</h2>${d.date ? `<div class="date">${esc(t(d.date))}</div>` : ''}<div class="body">${body}</div></div>`);
    return this.modal(el).closed;
  }

  toast(text: string, ms = 2400): void {
    this.toastEl.textContent = t(text);
    this.toastEl.classList.add('show');
    clearTimeout((this.toastEl as any)._t);
    (this.toastEl as any)._t = setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  // ---------------------------------------------------------------- diario
  journal(s: GameState, tab = 'objetivos'): Promise<void> {
    const el = $(`<div class="sheet paper"><h1>${L('Diario de investigación', 'Investigation journal')}</h1><div class="journal"><div class="tabs"></div><div class="content"></div></div></div>`);
    const tabs: [string, string][] = [['objetivos', L('Objetivos', 'Objectives')], ['notas', L('Notas', 'Notes')], ['personas', L('Personas', 'People')], ['documentos', L('Documentos', 'Documents')], ['lugares', L('Mapa', 'Map')], ['recuerdos', L('Recuerdos', 'Memories')], ['cronologia', L('Cronología', 'Timeline')]];
    const tb = el.querySelector('.tabs')!, content = el.querySelector('.content') as HTMLElement;
    const show = (tab: string) => {
      tb.querySelectorAll('button').forEach((b) => b.classList.toggle('on', (b as HTMLElement).dataset.t === tab));
      content.innerHTML = '';
      if (tab === 'objetivos') {
        const cur = currentObjectives(s);
        if (!cur.length) content.appendChild($(`<p>${L('No hay nada pendiente.', 'Nothing pending.')}</p>`));
        cur.forEach((o) => content.appendChild($(`<div class="entry"><h3>☐ ${esc(t(o.title))}</h3></div>`)));
        const done = OBJECTIVES.filter((o) => o.done(s));
        done.forEach((o) => content.appendChild($(`<div class="entry done"><h3>☑ ${esc(t(o.title))}</h3></div>`)));
      }
      if (tab === 'notas' || tab === 'personas') {
        const ids = s.notes.filter((n) => NOTES[n] && ((tab === 'personas') === (NOTES[n].cat === 'persona')));
        if (!ids.length) content.appendChild($(`<p><i>${L('Todavía nada.', 'Nothing yet.')}</i></p>`));
        ids.slice().reverse().forEach((n) => content.appendChild($(`<div class="entry"><h3>${esc(t(NOTES[n].title))}</h3><p>${esc(t(NOTES[n].text))}</p></div>`)));
      }
      if (tab === 'documentos') {
        if (!s.docs.length) content.appendChild($(`<p><i>${L('Todavía no leí ningún documento.', 'I haven\'t read any documents yet.')}</i></p>`));
        s.docs.forEach((d) => {
          const e = $(`<div class="entry"><h3 class="link">${esc(t(DOCS[d].title))}</h3><p>${esc(t(DOCS[d].date ?? ''))}</p></div>`);
          e.querySelector('h3')!.addEventListener('click', () => this.showDoc(d));
          content.appendChild(e);
        });
      }
      if (tab === 'lugares') content.appendChild(this.map(s));
      if (tab === 'recuerdos') {
        content.appendChild($(`<p>${L(`Fragmentos de memoria recuperados: <b>${s.fragments.length} de 5</b>. Son destellos de tinta que sólo aparecen en una de las dos épocas.`, `Memory fragments recovered: <b>${s.fragments.length} of 5</b>. They are glimmers of ink that only appear in one of the two eras.`)}</p>`));
        s.fragments.forEach((f) => {
          const id = 'frag_' + f;
          const e = $(`<div class="entry"><h3 class="link">${esc(t(DOCS[id].title))}</h3></div>`);
          e.querySelector('h3')!.addEventListener('click', () => this.showDoc(id));
          content.appendChild(e);
        });
      }
      if (tab === 'cronologia') {
        const ev: [string, string, boolean][] = [
          ['1900', L('Nace Isabel Valcárcel.', 'Isabel Valcárcel is born.'), s.notes.includes('isabel')],
          ['1904', L('Juana Calfún entra a trabajar como niñera.', 'Juana Calfún starts work as a nanny.'), s.notes.includes('jeanne')],
          [L('15 jun. 1909', '15 Jun 1909'), L('Muere Isabel, a las cuatro menos veinte. Aurelio detiene el reloj.', 'Isabel dies, at twenty to four. Aurelio stops the clock.'), s.docs.includes('diario_aurelio')],
          [L('oct. 1909', 'Oct 1909'), L('Llegan las cajas de Verhaegen desde Lieja.', 'Verhaegen\'s crates arrive from Liège.'), s.docs.includes('carta_verhaegen1') || s.fragments.includes('sotano')],
          ['1910', L('Juana saca una pieza del mecanismo. La echan.', 'Juana takes a piece out of the mechanism. She is dismissed.'), s.docs.includes('cartas_jeanne')],
          ['1912', L('Muere Aurelio.', 'Aurelio dies.'), s.flags.mer_reloj === true || s.docs.includes('carta_verhaegen2')],
          [L('12 may. 1920', '12 May 1920'), L('Llego a Belle Ombre con una carta sin remitente.', 'I arrive at Belle Ombre with a letter with no sender.'), true],
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
    m.appendChild($(`<div style="position:absolute;left:0;top:18%;font-family:var(--fell);font-style:italic;opacity:.6">${L('planta alta', 'upper floor')} ↑</div>`));
    for (const [id, x, y, w, h] of R) {
      const known = s.visited.includes(id) || s.room === id;
      const el = $(`<div class="r ${known ? '' : 'unk'} ${s.room === id ? 'here' : ''}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%">${known ? esc(t(PLACES[id])) : '?'}</div>`);
      m.appendChild(el);
    }
    return m;
  }

  hints(s: GameState, onUse: () => void): Promise<void> {
    const el = $(`<div class="sheet paper"><h1>${L('Pistas', 'Hints')}</h1><p><i>${L('Cada pista se revela de a una: primero una orientación, después algo más concreto y por último la solución.', 'Hints are revealed one at a time: first a nudge, then something more concrete and finally the solution.')}</i></p><div class="list"></div></div>`);
    const list = el.querySelector('.list')!;
    const cur = currentObjectives(s);
    if (!cur.length) list.appendChild($(`<p>${L('No hay nada pendiente ahora.', 'Nothing pending right now.')}</p>`));
    const level: Record<string, number> = (s.flags._hintLv as any) ? JSON.parse(String(s.flags._hintLv)) : {};
    cur.forEach((o) => {
      const e = $(`<div class="entry journal" style="display:block;min-height:0"><h3 style="font-family:var(--fell);font-weight:normal;font-size:calc(var(--u)*34);margin:0">${esc(t(o.title))}</h3><div class="hs"></div></div>`);
      const hs = e.querySelector('.hs')!;
      const render = () => {
        hs.innerHTML = '';
        const lv = level[o.id] ?? 0;
        for (let i = 0; i < lv; i++) hs.appendChild($(`<p class="hint">${[L('Orientación', 'Nudge'), L('Pista', 'Hint'), L('Solución', 'Solution')][i]}: ${esc(t(o.hints[i]))}</p>`));
        if (lv < 3) {
          const b = $(`<button class="pbtn">${[L('Ver orientación', 'Show nudge'), L('Ver pista concreta', 'Show concrete hint'), L('Ver solución', 'Show solution')][lv]}</button>`);
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
  /** Selector de idioma: dos botones, Español / English. */
  private langPicker(onChange: () => void): HTMLElement {
    const box = $(`<div class="lang"></div>`);
    const opts: [Lang, string][] = [['es', 'Español'], ['en', 'English']];
    for (const [k, n] of opts) {
      const b = $(`<button class="pbtn${getLang() === k ? ' sel' : ''}" lang="${k}">${n}</button>`);
      b.addEventListener('click', (e) => { e.stopPropagation(); if (getLang() === k) return; setLang(k); this.refreshStatic(); onChange(); });
      box.appendChild(b);
    }
    return box;
  }

  /** Vuelve a escribir los textos fijos del HUD en el idioma actual. */
  refreshStatic(): void {
    const keep = [this.topbar, this.inv, this.erabtn].map((el) => el.style.display);
    for (const el of [this.topbar, this.inv, this.erabtn, this.label, this.verbs, this.sayBox, this.toastEl, this.cursorItem]) el.remove();
    this.build();
    [this.topbar, this.inv, this.erabtn].forEach((el, i) => (el.style.display = keep[i]));
    if (this.lastRoom) this.setRoom(...this.lastRoom);
    if (this.lastEra) this.setEraButton(...this.lastEra);
    if (this.lastInv) this.renderInventory(this.lastInv);
    this.onLang?.();
  }
  private lastRoom?: [string, GameState];
  private lastEra?: [boolean, string];
  private lastInv?: GameState;
  onLang?: () => void;

  title(hasSave: boolean): Promise<'new' | 'continue' | 'options' | 'howto' | 'credits'> {
    return new Promise((res) => {
      const el = $(`<div id="title"><h1>Belle Ombre</h1><h2></h2><div class="lema"></div><div class="menu"></div><div class="foot"></div></div>`);
      const menu = el.querySelector('.menu')!;
      const render = () => {
        el.querySelector('h2')!.textContent = L('El tiempo entre las sombras', 'Time between the shadows');
        el.querySelector('.lema')!.textContent = t(LEMA);
        el.querySelector('.foot')!.textContent = `${TITLE} · v${VERSION} · ${L('Ficción inspirada en un palacio normando de Tandil.', 'Fiction inspired by a Norman-style palace in Tandil, Argentina.')}`;
        menu.innerHTML = '';
        const items: [string, string, boolean][] = [['continue', L('Continuar', 'Continue'), hasSave], ['new', L('Nueva partida', 'New game'), true], ['options', L('Opciones', 'Options'), true], ['howto', L('Cómo jugar', 'How to play'), true], ['credits', L('Créditos', 'Credits'), true]];
        for (const [k, tx, en] of items) {
          if (!en) continue;
          const b = $(`<button class="btn">${tx}</button>`);
          b.addEventListener('click', () => { el.remove(); res(k as any); });
          menu.appendChild(b);
        }
        menu.appendChild(this.langPicker(render));
      };
      render();
      this.root.appendChild(el);
      (menu.firstElementChild as HTMLElement)?.focus();
    });
  }

  options(o: Options, apply: (o: Options) => void): Promise<void> {
    const el = $(`<div class="sheet paper"></div>`);
    const render = () => {
      el.querySelectorAll(':scope > :not(.close)').forEach((n) => n.remove());
      const add = (n: HTMLElement) => { const x = el.querySelector(':scope > .close'); x ? el.insertBefore(n, x) : el.appendChild(n); };
      add($(`<h1>${L('Opciones', 'Options')}</h1>`));
      const lr = $(`<div class="range"><span>${L('Idioma', 'Language')}</span></div>`);
      lr.appendChild(this.langPicker(render));
      add(lr);
      const row = (label: string, key: keyof Options, min = 0, max = 1, step = 0.05) => {
        const r = $(`<label class="range"><span>${label}</span><input type="range" min="${min}" max="${max}" step="${step}" value="${o[key]}"></label>`);
        r.querySelector('input')!.addEventListener('input', (e) => { (o as any)[key] = parseFloat((e.target as HTMLInputElement).value); apply(o); });
        add(r);
      };
      row(L('Volumen general', 'Master volume'), 'master'); row(L('Música', 'Music'), 'music'); row(L('Ambiente', 'Ambience'), 'amb'); row(L('Efectos', 'Effects'), 'sfx'); row(L('Velocidad del texto', 'Text speed'), 'textSpeed', 0.5, 2, 0.1);
      const chk = (label: string, key: keyof Options) => {
        const r = $(`<label class="range"><span>${label}</span><input type="checkbox" ${o[key] ? 'checked' : ''} style="width:calc(var(--u)*36);height:calc(var(--u)*36)"></label>`);
        r.querySelector('input')!.addEventListener('change', (e) => { (o as any)[key] = (e.target as HTMLInputElement).checked; apply(o); });
        add(r);
      };
      chk(L('Texto grande', 'Large text'), 'subtitlesBig'); chk(L('Menos movimiento', 'Reduced motion'), 'reduceMotion');
    };
    render();
    return this.modal(el).closed;
  }

  howto(): Promise<void> {
    const el = getLang() === 'en'
      ? $(`<div class="sheet paper"><h1>How to play</h1><ul>
      <li><b>Walk:</b> tap or click on the floor.</li>
      <li><b>Interact:</b> tap an object or a person and choose <i>Look, Use, Take</i> or <i>Talk</i>. Right-click looks straight away.</li>
      <li><b>Doors and exits:</b> tap them and Elena walks there.</li>
      <li><b>Satchel (inventory):</b> at the bottom. Tap an item to pick it, then tap where to use it. Tap another item to combine them. Tap it twice to examine or read it.</li>
      <li><b>The oil lamp:</b> once it is lit, in the places where the house is broken you'll be able to see <i>the other time</i>.</li>
      <li><b>Journal (J):</b> objectives, notes, people, documents, map and memories.</li>
      <li><b>Hints (H):</b> three levels, only if you ask for them.</li>
      <li>The game saves itself when you change rooms. Esc opens the pause menu.</li></ul></div>`)
      : $(`<div class="sheet paper"><h1>Cómo jugar</h1><ul>
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
    const el = getLang() === 'en'
      ? $(`<div class="sheet paper"><h1>Credits</h1>
      <p><b>Belle Ombre: Time between the shadows</b>. Idea and direction: Ale.</p>
      <p>Story, programming, illustration, sound and design: developed with Claude (Anthropic) from Ale's design document.</p>
      <p>Belle Ombre is a fictional place, inspired by the architecture of a Norman-style palace on the outskirts of Tandil, Argentina. The Valcárcel family and all the characters are invented.</p>
      <p>The atmosphere pays homage to H. P. Lovecraft's <i>The Shunned House</i> (public domain), without reproducing its text or plot.</p>
      <p>Made with Phaser 3, TypeScript and Vite.</p></div>`)
      : $(`<div class="sheet paper"><h1>Créditos</h1>
      <p><b>Belle Ombre: El tiempo entre las sombras</b>. Idea y dirección: Ale.</p>
      <p>Historia, programación, ilustración, sonido y diseño: desarrollado con Claude (Anthropic) a partir del documento de diseño de Ale.</p>
      <p>Belle Ombre es un lugar ficticio, inspirado en la arquitectura de un palacio normando de las afueras de Tandil. La familia Valcárcel y todos los personajes son inventados.</p>
      <p>La atmósfera rinde homenaje a <i>La casa maldita</i> de H. P. Lovecraft (dominio público), sin reproducir su texto ni su trama.</p>
      <p>Hecho con Phaser 3, TypeScript y Vite.</p></div>`);
    return this.modal(el).closed;
  }

  pause(): Promise<'resume' | 'save' | 'options' | 'howto' | 'title'> {
    return new Promise((res) => {
      const el = $(`<div class="sheet paper" style="text-align:center;max-width:calc(var(--u)*700)"><h1>${L('Pausa', 'Pause')}</h1><div style="display:flex;flex-direction:column;gap:calc(var(--u)*12);align-items:center"></div></div>`);
      const box = el.querySelector('div')!;
      const m = this.modal(el);
      const opts: [string, string][] = [['resume', L('Seguir jugando', 'Keep playing')], ['save', L('Guardar partida', 'Save game')], ['options', L('Opciones', 'Options')], ['howto', L('Cómo jugar', 'How to play')], ['title', L('Volver al menú principal', 'Back to main menu')]];
      let picked: any = 'resume';
      for (const [k, tx] of opts) {
        const b = $(`<button class="pbtn" style="width:80%">${tx}</button>`);
        b.addEventListener('click', () => { picked = k; m.close(); });
        box.appendChild(b);
      }
      m.closed.then(() => res(picked));
    });
  }

  ending(title: string, paragraphs: string[]): Promise<void> {
    return new Promise((res) => {
      const el = $(`<div class="ending"><h1>${esc(t(title))}</h1></div>`);
      paragraphs.forEach((p, i) => { const e = $(`<p style="animation-delay:${1 + i * 2.6}s">${esc(t(p))}</p>`); el.appendChild(e); });
      const b = $(`<button class="btn" style="opacity:0;animation:fade 1s forwards;animation-delay:${2 + paragraphs.length * 2.6}s">${L('Créditos', 'Credits')}</button>`);
      b.addEventListener('click', () => { el.remove(); this.credits().then(() => res()); });
      el.appendChild(b);
      this.root.appendChild(el);
    });
  }
}
