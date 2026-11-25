// Interfaces de los acertijos con pantalla propia. Devuelven true si se resolvió.
import type { UI } from './ui';
import type { PuzzleId } from '../systems/types';
import { ICONS } from './icons';
import { SYMBOLS, THEATRE_FIGURES, NOTES_ES, checkPuzzle } from '../puzzles/puzzles';
import { audio } from '../audio/audio';
import { t } from '../i18n/i18n';

const h = (html: string): HTMLElement => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild as HTMLElement;
};

export function openPuzzle(ui: UI, id: PuzzleId): Promise<boolean> {
  switch (id) {
    case 'clock': return clock(ui);
    case 'symbols': return discs(ui, 'symbols', 'El cajón de los discos', 'Tres discos de bronce. Cada uno gira entre seis símbolos grabados.', [...SYMBOLS]);
    case 'theatre': return theatre(ui);
    case 'piano': return piano(ui);
  }
}

function frame(ui: UI, title: string, intro: string): { el: HTMLElement; body: HTMLElement; done: (ok: boolean) => void; result: Promise<boolean> } {
  const el = h(`<div class="sheet paper puzzle"><h1>${t(title)}</h1><p><i>${t(intro)}</i></p><div class="pz"></div></div>`);
  const m = ui.modal(el);
  let ok = false;
  const result = m.closed.then(() => ok);
  return { el, body: el.querySelector('.pz') as HTMLElement, done: (v) => { ok = v; setTimeout(() => m.close(), v ? 900 : 0); }, result };
}

function clock(ui: UI): Promise<boolean> {
  const f = frame(ui, 'El reloj de pie', 'Las agujas, ya aceitadas, se mueven con un quejido. ¿A qué hora se detuvo todo?');
  let hh = 12, mm = 0;
  const svgNS = 'http://www.w3.org/2000/svg';
  const face = h(`<svg class="clockface" viewBox="-110 -110 220 220">
    <circle r="100" fill="#efe4c8" stroke="#49392d" stroke-width="6"/><circle r="92" fill="none" stroke="#a58a53" stroke-width="2"/>
    <g class="nums"></g><line class="hh" x1="0" y1="0" x2="0" y2="-50" stroke="#242321" stroke-width="7" stroke-linecap="round"/>
    <line class="mh" x1="0" y1="0" x2="0" y2="-78" stroke="#242321" stroke-width="4" stroke-linecap="round"/><circle r="6" fill="#a58a53"/></svg>`);
  const roman = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  roman.forEach((r, i) => {
    const a = (i / 12) * Math.PI * 2;
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', String(Math.sin(a) * 76)); t.setAttribute('y', String(-Math.cos(a) * 76 + 6));
    t.setAttribute('text-anchor', 'middle'); t.setAttribute('font-size', '15'); t.setAttribute('font-family', 'IM Fell English, serif'); t.setAttribute('fill', '#242321');
    t.textContent = r;
    face.querySelector('.nums')!.appendChild(t);
  });
  const draw = () => {
    face.querySelector('.hh')!.setAttribute('transform', `rotate(${((hh % 12) + mm / 60) * 30})`);
    face.querySelector('.mh')!.setAttribute('transform', `rotate(${mm * 6})`);
    lbl.textContent = `${hh}:${String(mm).padStart(2, '0')}`;
  };
  const lbl = h(`<div style="font-family:var(--fell);font-size:calc(var(--u)*40)"></div>`);
  const row = h(`<div class="row"></div>`);
  const btn = (label: string, fn: () => void) => { const b = h(`<button class="pbtn">${t(label)}</button>`); b.addEventListener('click', () => { fn(); audio.tick(0.3); draw(); }); row.appendChild(b); };
  btn('− hora', () => { hh = hh === 1 ? 12 : hh - 1; });
  btn('+ hora', () => { hh = hh === 12 ? 1 : hh + 1; });
  btn('− 5 min', () => { mm = (mm + 55) % 60; });
  btn('+ 5 min', () => { mm = (mm + 5) % 60; });
  const ok = h(t(`<button class="pbtn sel">Soltar las agujas</button>`));
  ok.addEventListener('click', () => {
    if (checkPuzzle('clock', { h: hh, m: mm })) { audio.sfx('clock_open'); lbl.textContent = t('…clac.'); f.done(true); }
    else { audio.sfx('door_stuck'); ui.toast('El reloj no responde. No es esa hora.'); }
  });
  f.body.append(face, lbl, row, h(`<div class="row"></div>`));
  f.body.lastElementChild!.appendChild(ok);
  draw();
  return f.result;
}

function discs(ui: UI, id: 'symbols', title: string, intro: string, symbols: string[]): Promise<boolean> {
  const f = frame(ui, title, intro);
  const state = [0, 0, 0];
  const row = h(`<div class="row"></div>`);
  state.forEach((_, i) => {
    const d = h(`<div class="disc"><button class="pbtn">${ICONS.up}</button><div class="face"></div><button class="pbtn">${ICONS.down}</button></div>`);
    const face = d.querySelector('.face')!;
    const draw = () => { face.innerHTML = ICONS[symbols[state[i]]]; face.setAttribute('aria-label', symbols[state[i]]); };
    const [up, down] = d.querySelectorAll('button');
    up.addEventListener('click', () => { state[i] = (state[i] + 1) % symbols.length; audio.tick(0.3); draw(); });
    down.addEventListener('click', () => { state[i] = (state[i] + symbols.length - 1) % symbols.length; audio.tick(0.3); draw(); });
    (up as HTMLElement).style.width = (down as HTMLElement).style.width = 'calc(var(--u)*90)';
    draw();
    row.appendChild(d);
  });
  const ok = h(t(`<button class="pbtn sel">Tirar del cajón</button>`));
  ok.addEventListener('click', () => {
    const ans = state.map((i) => symbols[i]);
    if (checkPuzzle(id, ans)) { audio.sfx('unlock'); f.done(true); }
    else { audio.sfx('door_stuck'); ui.toast('El cajón no se mueve.'); }
  });
  const r2 = h(`<div class="row"></div>`);
  r2.appendChild(ok);
  f.body.append(row, r2);
  return f.result;
}

function theatre(ui: UI): Promise<boolean> {
  const f = frame(ui, 'El teatro de sombras', 'Tres varillas detrás de la pantalla, una arriba de la otra. Elegí qué figura va en cada una. La vela ilumina desde atrás.');
  const slots: (string | null)[] = [null, null, null];
  const wall = h(`<div class="screen-wall"></div>`);
  const draw = () => {
    wall.innerHTML = '';
    wall.style.flexDirection = 'column';
    wall.style.gap = 'calc(var(--u)*6)';
    slots.forEach((s) => {
      const c = h(`<div style="height:calc(var(--u)*86);color:#1b1714;opacity:.88;filter:blur(.6px)">${s ? ICONS[s] : ''}</div>`);
      (c.firstElementChild as HTMLElement | null)?.setAttribute('style', 'width:calc(var(--u)*86);height:calc(var(--u)*86)');
      wall.appendChild(c);
    });
  };
  const rows = h(`<div></div>`);
  ['Varilla de arriba', 'Varilla del medio', 'Varilla de abajo'].forEach((name, i) => {
    const r = h(`<div class="row" style="margin:calc(var(--u)*8) 0"><span style="font-family:var(--fell);font-size:calc(var(--u)*28);width:calc(var(--u)*240);text-align:right">${t(name)}</span></div>`);
    THEATRE_FIGURES.forEach((fig) => {
      const b = h(`<button class="pbtn" aria-label="${fig}" style="width:calc(var(--u)*86);height:calc(var(--u)*76);padding:calc(var(--u)*6)">${ICONS[fig]}</button>`);
      b.addEventListener('click', () => {
        slots[i] = fig;
        r.querySelectorAll('button').forEach((x) => x.classList.remove('sel'));
        b.classList.add('sel');
        audio.sfx('paper');
        draw();
      });
      r.appendChild(b);
    });
    rows.appendChild(r);
  });
  const ok = h(t(`<button class="pbtn sel">Acercar la vela</button>`));
  ok.addEventListener('click', () => {
    if (slots.some((s) => !s)) { ui.toast('Faltan figuras.'); return; }
    if (checkPuzzle('theatre', slots)) { wall.style.background = 'radial-gradient(ellipse at 50% 60%, #fff1c8, #e0b870 60%, #49392d)'; audio.sfx('memory'); f.done(true); }
    else { audio.sfx('crow'); ui.toast('Las sombras se mezclan sin sentido. La llama tiembla.'); }
  });
  const r2 = h(`<div class="row"></div>`);
  r2.appendChild(ok);
  draw();
  f.body.append(wall, rows, r2);
  return f.result;
}

function piano(ui: UI): Promise<boolean> {
  const f = frame(ui, 'El Pleyel', 'Ocho teclas blancas. Abajo de cada una, alguien pegó un papelito con el nombre de la nota, con letra de niña.');
  const played: number[] = [];
  const keys = h(`<div class="keys"></div>`);
  const shown = h(`<div style="font-family:var(--fell);font-size:calc(var(--u)*34);min-height:calc(var(--u)*48)"></div>`);
  NOTES_ES.forEach((n, i) => {
    const b = h(`<button aria-label="${n}">${n}</button>`);
    b.addEventListener('click', () => {
      audio.pianoKey(i);
      b.classList.add('hit'); setTimeout(() => b.classList.remove('hit'), 160);
      played.push(i);
      if (played.length > 8) played.shift();
      shown.textContent = played.map((p) => NOTES_ES[p]).join(' · ');
      if (checkPuzzle('piano', played)) { shown.textContent += '  ✓'; f.done(true); }
    });
    keys.appendChild(b);
  });
  const clear = h(t(`<button class="pbtn">Empezar de nuevo</button>`));
  clear.addEventListener('click', () => { played.length = 0; shown.textContent = ''; });
  const r = h(`<div class="row"></div>`);
  r.appendChild(clear);
  f.body.append(keys, shown, r);
  return f.result;
}
