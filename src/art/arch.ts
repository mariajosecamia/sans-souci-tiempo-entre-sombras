// Piezas de arquitectura y mobiliario reutilizables, dibujadas con Ink.
// Todas aceptan la época para que la misma composición cambie de estado.
import { Ink, Pt } from './ink';
import type { Era } from '../core/palette';
import { DECAY, mix } from '../core/palette';

export interface Layers {
  far: Ink;    // lo que se ve por las ventanas (parallax lento)
  back: Ink;   // arquitectura y mobiliario
  front: Ink;  // primer plano que tapa al personaje
  era: Era;
  w: number;
  h: number;
  holes: Pt[][]; // recortes en `back` (ventanas) que dejan ver `far`
  lights: LightDef[];
}

export interface LightDef {
  x: number; y: number; r: number; color: string; intensity: number; flicker?: number; kind?: 'candle' | 'window' | 'lamp' | 'ink';
}

// ---------------------------------------------------------------- muros
export function wallBase(L: Layers, x0: number, x1: number, top: number, floorY: number, opts: { wainscot?: number; paper?: boolean } = {}): void {
  const k = L.back, p = k.pal;
  const wy = opts.wainscot ?? floorY - 150;
  if (opts.paper !== false) k.wallpaper(x0, top, x1 - x0, wy - top, p.wall, L.era === 'sombras' ? p.ink : p.fabric, 48);
  else k.washRect(x0, top, x1 - x0, wy - top, p.wall, 1, { edge: 0 });
  // penumbra cerca del techo
  k.vgrad(x0, top, x1 - x0, 220, [[0, p.shadow, 0.45], [1, p.shadow, 0]]);
  // cornisa
  k.box(x0, top, x1 - x0, 26, p.trim, { w: 1.2 });
  k.line(x0, top + 32, x1, top + 32, { w: 1, alpha: 0.5 });
  for (let x = x0 + 10; x < x1; x += 22) k.box(x, top + 26, 10, 9, mix(p.trim, p.ink, 0.15), { w: 0.6, alpha: 0.5 });
  // friso de madera
  k.box(x0, wy, x1 - x0, floorY - wy, p.wood, { w: 1.2, hatch: true });
  k.box(x0, wy - 8, x1 - x0, 12, p.woodDark, { w: 1 });
  for (let x = x0 + 30; x < x1 - 60; x += 120) {
    k.box(x, wy + 22, 90, floorY - wy - 48, mix(p.wood, p.paper, 0.08), { w: 0.9, alpha: 0.7 });
    k.line(x + 4, wy + 26, x + 86, wy + 26, { w: 0.6, alpha: 0.3, color: p.paper });
  }
  // zócalo
  k.box(x0, floorY - 18, x1 - x0, 18, p.woodDark, { w: 1 });
}

export function pilaster(k: Ink, x: number, top: number, bottom: number, w = 44): void {
  const p = k.pal;
  k.box(x, top + 40, w, bottom - top - 40, p.trim, { w: 1.2 });
  k.box(x - 6, top + 34, w + 12, 18, mix(p.trim, p.paper, 0.2), { w: 1 });
  k.box(x - 6, bottom - 30, w + 12, 30, mix(p.trim, p.ink, 0.1), { w: 1 });
  for (let i = 1; i < 4; i++) k.line(x + (w / 4) * i, top + 60, x + (w / 4) * i, bottom - 40, { w: 0.7, alpha: 0.35 });
  k.vgrad(x + w * 0.6, top + 52, w * 0.4, bottom - top - 80, [[0, p.shadow, 0.18], [1, p.shadow, 0.18]]);
}

// ---------------------------------------------------------------- aberturas
export function windowArch(L: Layers, x: number, y: number, w: number, h: number, opts: { curtains?: boolean; mullions?: number } = {}): void {
  const k = L.back, p = k.pal;
  const outer = k.archPts(x - 14, y - 14, w + 28, h + 14);
  k.shape(outer, p.trim, { w: 1.4 });
  const glass = k.archPts(x, y, w, h);
  L.holes.push(glass);
  // marco y travesaños: se dibujan en una capa aparte por encima del hueco (front no: back después del recorte)
  (L as any).afterHoles = (L as any).afterHoles || [];
  (L as any).afterHoles.push(() => {
    const ctx = k.ctx;
    ctx.save();
    // vidrio: ligero velo
    k.fillPoly(glass, p.glass, L.era === 'abandono' ? 0.08 : 0.18);
    ctx.restore();
    k.stroke(glass, { closed: true, w: 2 });
    const m = opts.mullions ?? 2;
    for (let i = 1; i <= m; i++) k.line(x + (w / (m + 1)) * i, y + w / 2 - 10, x + (w / (m + 1)) * i, y + h, { w: 3, color: p.woodDark, alpha: 0.95 });
    for (let yy = y + w / 2 + 40; yy < y + h; yy += 70) k.line(x, yy, x + w, yy, { w: 2.5, color: p.woodDark, alpha: 0.9 });
    k.line(x, y + w / 2, x + w, y + w / 2, { w: 3, color: p.woodDark });
    if (L.era === 'abandono') {
      // vidrios rotos: algunos paneles con astillas
      for (let i = 0; i < 4; i++) {
        const gx = x + k.rng.range(10, w - 30), gy = y + w / 2 + k.rng.range(10, h - w / 2 - 30);
        k.stroke([[gx, gy], [gx + 10, gy + 18], [gx + 4, gy + 30]], { w: 0.8, alpha: 0.6 });
      }
      k.vine(x + 6, y + w * 0.3, h * 0.6, DECAY.moss);
      k.vine(x + w - 8, y + w * 0.4, h * 0.45, DECAY.moss);
    }
    // alféizar
    k.box(x - 20, y + h, w + 40, 14, p.trim, { w: 1.2 });
    if (opts.curtains !== false) curtains(k, x - 40, y - 30, w + 80, h + 50, L.era);
  });
  L.lights.push({ x: x + w / 2, y: y + h * 0.55, r: Math.max(w, h) * 0.9, color: L.era === 'abandono' ? '#c9c49a' : L.era === 'sombras' ? '#f3efe6' : '#b9c4c0', intensity: 0.45, kind: 'window' });
}

export function curtains(k: Ink, x: number, y: number, w: number, h: number, era: Era): void {
  const p = k.pal;
  const col = era === 'abandono' ? mix(p.fabric, DECAY.damp, 0.3) : p.fabric;
  for (const side of [0, 1]) {
    const cx = side ? x + w - 60 : x;
    const torn = era === 'abandono';
    const bottom = torn ? h * 0.78 : h;
    const pts: Pt[] = side
      ? [[cx, y], [cx + 70, y], [cx + 70, y + bottom], [cx + 20, y + bottom - 10], [cx - 10, y + h * 0.5]]
      : [[cx - 10, y], [cx + 60, y], [cx + 70, y + h * 0.5], [cx + 40, y + bottom - 6], [cx - 10, y + bottom]];
    k.shape(pts, col, { w: 1.2, hatch: true });
    for (let i = 0; i < 4; i++) {
      const fx = cx + 8 + i * 14;
      k.line(fx, y + 10, fx + (side ? -6 : 6) * i * 0.4, y + bottom - 20, { w: 0.8, alpha: 0.4, passes: 1, taper: true });
    }
    if (torn) for (let i = 0; i < 5; i++) k.line(cx + k.rng.range(0, 60), y + bottom - 12, cx + k.rng.range(0, 60), y + bottom + k.rng.range(4, 30), { w: 0.8, alpha: 0.5, passes: 1, color: col });
  }
  // galería
  k.box(x - 20, y - 14, w + 40, 16, p.gold, { w: 1 });
}

export function door(k: Ink, x: number, y: number, w: number, h: number, era: Era, opts: { double?: boolean; open?: boolean; plaque?: boolean; arched?: boolean } = {}): void {
  const p = k.pal;
  const frame = opts.arched ? k.archPts(x - 12, y - 12, w + 24, h + 12) : ([[x - 12, y - 18], [x + w + 12, y - 18], [x + w + 12, y + h], [x - 12, y + h]] as Pt[]);
  k.shape(frame, p.trim, { w: 1.3 });
  if (!opts.arched) k.box(x - 22, y - 30, w + 44, 14, mix(p.trim, p.paper, 0.15), { w: 1 });
  const inner: Pt[] = opts.arched ? k.archPts(x, y, w, h) : [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  if (opts.open) {
    k.shape(inner, p.shadow, { w: 1.2, fillAlpha: 0.92 });
    k.hatch(inner, -0.6, 5, { alpha: 0.25 });
    return;
  }
  k.shape(inner, p.wood, { w: 1.4, hatch: true });
  const leaves = opts.double ? 2 : 1;
  const lw = w / leaves;
  for (let i = 0; i < leaves; i++) {
    const lx = x + i * lw;
    const top = opts.arched ? y + w / 2 : y;
    k.box(lx + 10, top + 14, lw - 20, (h - (top - y)) * 0.38, mix(p.wood, p.paper, 0.06), { w: 0.9 });
    k.box(lx + 10, top + 24 + (h - (top - y)) * 0.42, lw - 20, (h - (top - y)) * 0.44, mix(p.wood, p.paper, 0.06), { w: 0.9 });
    k.ellipse(lx + (i === 0 && leaves === 2 ? lw - 10 : lw - 14), y + h * 0.55, 3.5, 3.5, p.gold, { w: 0.8 });
  }
  if (opts.double) k.line(x + w / 2, y + 4, x + w / 2, y + h, { w: 1.2, alpha: 0.8 });
  if (opts.plaque) k.box(x + w / 2 - 22, y + 30, 44, 12, p.gold, { w: 0.7 });
  if (era === 'abandono') {
    k.blot(x + w * 0.3, y + h * 0.85, w * 0.4, DECAY.damp, 0.35);
    k.crack(x + w * 0.7, y + 10, h * 0.4, 1.6, { alpha: 0.5 });
  }
}

export function frame(k: Ink, x: number, y: number, w: number, h: number, paint: (k: Ink, x: number, y: number, w: number, h: number) => void): void {
  const p = k.pal;
  k.box(x - 14, y - 14, w + 28, h + 28, p.gold, { w: 1.3 });
  k.box(x - 6, y - 6, w + 12, h + 12, mix(p.gold, p.ink, 0.3), { w: 0.8 });
  k.box(x, y, w, h, mix(p.wallDark, p.ink, 0.35), { w: 0.8 });
  paint(k, x, y, w, h);
  // brillo del marco
  k.line(x - 10, y - 10, x + w * 0.6, y - 10, { w: 1.2, color: p.paper, alpha: 0.4, passes: 1 });
}

/** Silueta pintada de retrato de busto (para cuadros). */
export function portraitBust(k: Ink, x: number, y: number, w: number, h: number, coat: string, skin: string, hair: string): void {
  const cx = x + w / 2;
  k.radial(cx, y + h * 0.35, w * 0.6, k.pal.gold, 0.25);
  k.shape([[x + w * 0.12, y + h], [x + w * 0.2, y + h * 0.62], [cx, y + h * 0.55], [x + w * 0.8, y + h * 0.62], [x + w * 0.88, y + h]], coat, { w: 0.9 });
  k.ellipse(cx, y + h * 0.38, w * 0.16, h * 0.15, skin, { w: 0.9 });
  k.shape([[cx - w * 0.17, y + h * 0.36], [cx - w * 0.15, y + h * 0.22], [cx + w * 0.15, y + h * 0.22], [cx + w * 0.17, y + h * 0.34], [cx, y + h * 0.27]], hair, { w: 0.6 });
  k.line(cx - w * 0.07, y + h * 0.47, cx + w * 0.07, y + h * 0.47, { w: 2, color: hair, passes: 1 });
}

// ---------------------------------------------------------------- mobiliario
export function grandfatherClock(k: Ink, x: number, y: number, w: number, h: number, era: Era, hands: [number, number] = [12, 0], open = false): void {
  const p = k.pal;
  // capitel
  k.shape([[x - 8, y + 30], [x + w / 2, y - 8], [x + w + 8, y + 30]], p.woodDark, { w: 1.2 });
  k.box(x, y + 26, w, h - 26, p.wood, { w: 1.3, hatch: true });
  k.box(x - 6, y + h - 40, w + 12, 40, p.woodDark, { w: 1.2 });
  // esfera
  const cx = x + w / 2, cy = y + 70, r = w * 0.36;
  k.ellipse(cx, cy, r + 6, r + 6, p.gold, { w: 1 });
  k.ellipse(cx, cy, r, r, mix(p.paper, p.wall, 0.3), { w: 1 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    k.line(cx + Math.cos(a) * r * 0.78, cy + Math.sin(a) * r * 0.78, cx + Math.cos(a) * r * 0.92, cy + Math.sin(a) * r * 0.92, { w: 1, passes: 1 });
  }
  const [hh, mm] = hands;
  const ah = ((hh % 12) / 12 + mm / 720) * Math.PI * 2 - Math.PI / 2;
  const am = (mm / 60) * Math.PI * 2 - Math.PI / 2;
  k.line(cx, cy, cx + Math.cos(ah) * r * 0.5, cy + Math.sin(ah) * r * 0.5, { w: 2.4, passes: 1 });
  k.line(cx, cy, cx + Math.cos(am) * r * 0.78, cy + Math.sin(am) * r * 0.78, { w: 1.6, passes: 1 });
  // puerta con péndulo
  const dx = x + w * 0.18, dy = cy + r + 22, dw = w * 0.64, dh = h - (dy - y) - 60;
  if (open) {
    k.box(dx, dy, dw, dh, p.shadow, { w: 1, fillAlpha: 0.9 });
    k.box(dx - dw * 0.7, dy, dw * 0.68, dh, mix(p.wood, p.paper, 0.1), { w: 1 });
  } else {
    k.box(dx, dy, dw, dh, mix(p.glass, p.woodDark, 0.6), { w: 1 });
  }
  k.line(cx, dy + 4, cx, dy + dh * 0.7, { w: 1, color: p.gold, passes: 1 });
  k.ellipse(cx, dy + dh * 0.7, 12, 12, p.gold, { w: 1 });
  if (era === 'abandono') {
    k.dampStain(x + w * 0.5, y + h * 0.75, w * 0.6, DECAY.damp, 0.4);
    k.moss(x - 4, y + h, w + 8, 10, DECAY.moss);
  }
}

export function table(k: Ink, x: number, y: number, w: number, h: number, era: Era, cloth = false): void {
  const p = k.pal;
  if (cloth) {
    k.shape([[x - 6, y], [x + w + 6, y], [x + w + 14, y + h * 0.6], [x - 14, y + h * 0.6]], era === 'abandono' ? mix(p.paper, DECAY.damp, 0.3) : p.paper, { w: 1.1 });
  } else {
    k.box(x - 8, y, w + 16, 12, p.woodDark, { w: 1.2 });
  }
  const legTop = cloth ? y + h * 0.6 : y + 12;
  k.box(x + 6, legTop, 10, y + h - legTop, p.woodDark, { w: 1 });
  k.box(x + w - 16, legTop, 10, y + h - legTop, p.woodDark, { w: 1 });
}

export function candle(k: Ink, x: number, y: number, h: number, lit: boolean, L?: Layers): void {
  const p = k.pal;
  k.box(x - 4, y - h, 8, h, mix(p.paper, '#f0e2c0', 0.5), { w: 0.8 });
  k.line(x, y - h, x, y - h - 5, { w: 1, passes: 1 });
  if (lit) {
    const ctx = k.ctx;
    ctx.save();
    const g = ctx.createRadialGradient(x, y - h - 12, 1, x, y - h - 12, 12);
    g.addColorStop(0, 'rgba(255,240,190,1)');
    g.addColorStop(0.5, 'rgba(240,180,90,0.7)');
    g.addColorStop(1, 'rgba(240,180,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y - h - 12, 5, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    L?.lights.push({ x, y: y - h - 12, r: 260, color: '#f0c878', intensity: 0.9, flicker: 0.12, kind: 'candle' });
  }
}

export function candelabra(k: Ink, x: number, y: number, s: number, lit: number[], L?: Layers): void {
  const p = k.pal;
  k.shape([[x - 16 * s, y], [x + 16 * s, y], [x + 6 * s, y - 10 * s], [x - 6 * s, y - 10 * s]], p.gold, { w: 1 });
  k.line(x, y - 10 * s, x, y - 50 * s, { w: 3 * s, color: p.gold });
  k.stroke([[x - 26 * s, y - 50 * s], [x - 20 * s, y - 40 * s], [x, y - 36 * s], [x + 20 * s, y - 40 * s], [x + 26 * s, y - 50 * s]], { w: 2.5 * s, color: p.gold });
  const arms = [x - 26 * s, x, x + 26 * s];
  arms.forEach((ax, i) => {
    k.ellipse(ax, y - 52 * s, 6 * s, 2.5 * s, p.gold, { w: 0.8 });
    if (lit[i] >= 0) candle(k, ax, y - 54 * s, lit[i] > 0 ? 26 * s : 6 * s, lit[i] > 1, L);
  });
}

export function chandelier(k: Ink, x: number, y: number, s: number, era: Era): void {
  const p = k.pal;
  k.line(x, 0, x, y, { w: 1.4 });
  k.ellipse(x, y + 10 * s, 50 * s, 12 * s, p.gold, { w: 1.2 });
  for (let i = -3; i <= 3; i++) {
    const ax = x + i * 18 * s;
    k.stroke([[x, y + 10 * s], [ax, y + 36 * s], [ax, y + 26 * s]], { w: 1.6, color: p.gold });
    if (era !== 'abandono' || Math.abs(i) < 2) {
      for (let j = 0; j < 3; j++) k.ellipse(ax + k.rng.range(-3, 3), y + 42 * s + j * 9 * s, 2.2 * s, 3.5 * s, mix(p.glass, p.paper, 0.5), { w: 0.5, alpha: 0.6 });
    }
  }
  if (era === 'abandono') { k.cobweb(x - 50 * s, y + 6 * s, 40 * s, 'tl', 0.5); k.vine(x + 30 * s, y + 18 * s, 80, DECAY.moss); }
}

export function plantPot(k: Ink, x: number, y: number, s: number, era: Era): void {
  const p = k.pal;
  k.shape([[x - 30 * s, y - 60 * s], [x + 30 * s, y - 60 * s], [x + 22 * s, y], [x - 22 * s, y]], era === 'abandono' ? DECAY.rust : '#8a5a3c', { w: 1.2 });
  const leaves = era === 'abandono' ? 14 : 10;
  for (let i = 0; i < leaves; i++) {
    const a = -Math.PI / 2 + k.rng.range(-1.3, 1.3);
    const len = k.rng.range(60, 140) * s;
    const ex = x + Math.cos(a) * len, ey = y - 60 * s + Math.sin(a) * len;
    k.stroke([[x, y - 60 * s], [x + Math.cos(a) * len * 0.5, y - 60 * s + Math.sin(a) * len * 0.6 - 10], [ex, ey]], { w: 1, passes: 1, color: p.plantDark });
    const lp: Pt[] = [[x + Math.cos(a) * len * 0.3, y - 60 * s + Math.sin(a) * len * 0.35], [ex + 10, ey - 6], [ex, ey], [ex - 10, ey + 6]];
    k.shape(lp, era === 'abandono' && i % 3 === 0 ? DECAY.ochre : p.plant, { w: 0.8, alpha: 0.8 });
  }
}

// ---------------------------------------------------------------- estados de época
/** Deterioro genérico de una pared: manchas, moho, grietas, papel despegado, telarañas, musgo. */
export function decayWall(L: Layers, x0: number, x1: number, top: number, floorY: number, density = 1): void {
  if (L.era !== 'abandono') return;
  const k = L.back, r = k.rng;
  const n = Math.round(((x1 - x0) / 220) * density);
  for (let i = 0; i < n; i++) {
    k.dampStain(r.range(x0, x1), r.range(top + 40, top + 160), r.range(40, 110), DECAY.damp, r.range(0.25, 0.45));
  }
  for (let i = 0; i < n; i++) {
    // revoque caído: deja ver el ladrillo, con borde irregular
    const px = r.range(x0 + 20, x1 - 80), py = r.range(top + 80, floorY - 220);
    const pw = r.range(50, 120), ph = r.range(40, 100);
    const pts: Pt[] = [];
    for (let j = 0; j < 14; j++) {
      const a = (j / 14) * Math.PI * 2;
      pts.push([px + pw / 2 + Math.cos(a) * pw / 2 * r.range(0.6, 1.1), py + ph / 2 + Math.sin(a) * ph / 2 * r.range(0.6, 1.1)]);
    }
    k.shape(pts, mix(DECAY.rust, k.pal.wall, 0.35), { w: 0.9, alpha: 0.7, smooth: 1 } as any);
    const ctx = k.ctx;
    ctx.save();
    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const q of pts) ctx.lineTo(q[0], q[1]); ctx.closePath(); ctx.clip();
    for (let yy = py - 10; yy < py + ph + 10; yy += 11) {
      k.line(px - 10, yy, px + pw + 10, yy, { w: 0.7, alpha: 0.5, passes: 1 });
      for (let xx = px - 10 + ((yy / 11) % 2) * 12; xx < px + pw + 10; xx += 24) k.line(xx, yy, xx, yy + 11, { w: 0.6, alpha: 0.45, passes: 1 });
    }
    ctx.restore();
  }
  for (let i = 0; i < n * 0.8; i++) k.crack(r.range(x0, x1), r.range(top + 30, floorY - 160), r.range(40, 120), r.range(0.8, 2.2), { alpha: 0.5 });
  for (let i = 0; i < n * 1.5; i++) k.blot(r.range(x0, x1), floorY - 160 + r.range(-10, 20), r.range(8, 30), DECAY.mold, 0.25, 10);
  k.cobweb(x0 + 2, top + 30, 70, 'tl', 0.4);
  k.cobweb(x1 - 2, top + 30, 70, 'tr', 0.4);
  k.moss(x0, floorY, x1 - x0, 16, DECAY.moss);
  for (let i = 0; i < n; i++) k.vine(r.range(x0, x1), top + 30, r.range(60, 200), DECAY.moss);
}

/** Deterioro del piso: hojas, charcos, escombro. */
export function decayFloor(L: Layers, x0: number, x1: number, y0: number, y1: number): void {
  if (L.era !== 'abandono') return;
  const k = L.back, r = k.rng;
  for (let i = 0; i < (x1 - x0) / 300; i++) {
    const cx = r.range(x0 + 100, x1 - 100), cy = r.range(y0 + 40, y1 - 20);
    const rx = r.range(60, 160);
    k.ellipse(cx, cy, rx, rx * 0.16, mix(k.pal.glass, k.pal.sky, 0.4), { w: 0, fillAlpha: 0.35 });
    k.line(cx - rx * 0.6, cy - 2, cx + rx * 0.3, cy - 2, { w: 0.8, color: k.pal.paper, alpha: 0.4, passes: 1 });
  }
  for (let i = 0; i < (x1 - x0) / 14; i++) {
    const lx = r.range(x0, x1), ly = r.range(y0, y1);
    const col = r.pick([DECAY.ochre, DECAY.rust, DECAY.moss, k.pal.plantDark]);
    k.blot(lx, ly, r.range(2, 6), col, 0.7, 6);
  }
  for (let i = 0; i < (x1 - x0) / 120; i++) {
    const lx = r.range(x0, x1), ly = r.range(y0, y1);
    k.shape([[lx, ly], [lx + r.range(10, 30), ly - r.range(2, 8)], [lx + r.range(14, 34), ly + 4], [lx + 4, ly + 6]], k.pal.stone, { w: 0.8, alpha: 0.8 });
  }
  k.moss(x0, y0 + 4, x1 - x0, 12, DECAY.mold);
}

/** Anomalía: tinta que gotea, charcos de tinta, pájaros-sombra. */
export function inkInvasion(L: Layers, x0: number, x1: number, top: number, floorY: number, strength = 1): void {
  if (L.era !== 'sombras') return;
  const k = L.back, r = k.rng;
  for (let x = x0; x < x1; x += r.range(20, 70)) k.inkDrip(x, top, r.range(20, 160) * strength, r.range(4, 10));
  for (let i = 0; i < (x1 - x0) / 250; i++) k.blot(r.range(x0, x1), r.range(floorY + 20, floorY + 140), r.range(16, 46), k.pal.ink, 0.55, 16);
  for (let i = 0; i < (x1 - x0) / 400; i++) crowSilhouette(k, r.range(x0 + 60, x1 - 60), r.range(top + 80, floorY - 200), r.range(20, 50), 0.5);
}

export function crowSilhouette(k: Ink, x: number, y: number, s: number, alpha = 0.9): void {
  const pts: Pt[] = [
    [x - s * 2, y - s * 0.2], [x - s * 1.2, y - s * 0.7], [x - s * 0.4, y - s * 0.3], [x, y - s * 0.55],
    [x + s * 0.25, y - s * 0.75], [x + s * 0.55, y - s * 0.6], [x + s * 0.4, y - s * 0.35],
    [x + s * 1.2, y - s * 0.9], [x + s * 2.1, y - s * 0.4], [x + s * 0.9, y - s * 0.1], [x + s * 0.3, y + s * 0.6], [x - s * 0.3, y + s * 0.5], [x - s * 0.9, y],
  ];
  k.fillPoly(pts, k.pal.ink, alpha);
  k.stroke(pts, { closed: true, w: 1, alpha: alpha * 0.6 });
}

/** Columna de primer plano (oclusión del personaje). */
export function foregroundColumn(k: Ink, x: number, w: number, h: number, era: Era): void {
  const p = k.pal;
  const dark = mix(p.woodDark, p.ink, 0.35);
  // poste de roble con ménsula tallada
  k.box(x, 0, w, h, dark, { w: 2, shade: 0.4 } as any);
  k.shape([[x - 50, 40], [x, 40], [x, 120], [x - 10, 110], [x - 30, 70]], dark, { w: 2 });
  k.shape([[x + w, 40], [x + w + 50, 40], [x + w + 30, 70], [x + w + 10, 110], [x + w, 120]], dark, { w: 2 });
  k.box(x - 70, 20, w + 140, 24, dark, { w: 2 });
  for (let i = 1; i < 3; i++) k.line(x + (w / 3) * i, 140, x + (w / 3) * i, h - 40, { w: 0.8, alpha: 0.35, color: p.paper });
  for (let y = 160; y < h; y += 90) k.stroke([[x + 6, y], [x + w * 0.5, y + 12], [x + w - 6, y + 4]], { w: 0.7, alpha: 0.3, color: p.paper, passes: 1 });
  k.box(x - 8, h - 50, w + 16, 50, mix(dark, p.ink, 0.2), { w: 2 });
  if (era === 'abandono') { k.moss(x - 12, h - 50, w + 24, 18, DECAY.moss); k.vine(x + w * 0.3, 44, 320, DECAY.moss); k.dampStain(x + w / 2, h * 0.6, w * 0.6, DECAY.damp, 0.5); }
  if (era === 'sombras') for (let i = 0; i < 3; i++) k.inkDrip(x + 8 + i * (w / 3), 44, 80 + i * 40, 8);
}

// ---------------------------------------------------------------- estilo normando (Belle Ombre)
/** Muro de revoque con entramado de madera a la vista (estilo normando/tudor del palacio). */
export function halfTimberWall(L: Layers, x0: number, x1: number, top: number, bottom: number, bay = 160): void {
  const k = L.back, p = k.pal;
  k.washRect(x0, top, x1 - x0, bottom - top, p.wall, 1, { grain: 0.9, edge: 0, layers: 4 });
  // textura de revoque
  for (let i = 0; i < ((x1 - x0) * (bottom - top)) / 900; i++) k.blot(k.rng.range(x0, x1), k.rng.range(top, bottom), k.rng.range(2, 9), k.rng.chance(0.5) ? p.paper : p.wallDark, 0.08, 7);
  const beam = (pts: Pt[], w: number) => {
    k.stroke(pts, { w, color: p.woodDark, alpha: 0.95, jitter: 1.4, passes: 1 });
    k.stroke(pts.map(([x, y]) => [x + w * 0.3, y + 1] as Pt), { w: w * 0.25, color: mix(p.wood, p.paper, 0.2), alpha: 0.35, passes: 1 });
  };
  beam([[x0, top + 6], [x1, top + 6]], 14);
  beam([[x0, bottom - 6], [x1, bottom - 6]], 14);
  const mid = top + (bottom - top) * 0.5;
  for (let x = x0; x <= x1; x += bay) {
    beam([[x, top], [x, bottom]], 13);
    if (x + bay <= x1) {
      // jabalcones en cruz de San Andrés alternados con riostras simples
      const i = Math.round((x - x0) / bay);
      if (i % 2 === 0) { beam([[x + 8, mid], [x + bay * 0.5, top + 10]], 9); beam([[x + bay - 8, mid], [x + bay * 0.5, top + 10]], 9); }
      else { beam([[x + 8, bottom - 10], [x + bay - 8, mid + 6]], 9); }
      beam([[x, mid], [x + bay, mid]], 9);
    }
  }
  k.vgrad(x0, top, x1 - x0, 140, [[0, p.shadow, 0.5], [1, p.shadow, 0]]);
}

/** Techo de vigas en perspectiva (franja superior). */
export function beamedCeiling(L: Layers, h: number, vpX: number, spacing = 140): void {
  const k = L.back, p = k.pal;
  k.washRect(0, 0, L.w, h, mix(p.wall, p.shadow, 0.35), 1, { edge: 0 });
  for (let x = -400; x < L.w + 400; x += spacing) {
    const bx = x, tx = x + (x - vpX) * 0.06;
    k.shape([[tx - 8, 0], [tx + 8, 0], [bx + 14, h], [bx - 14, h]], p.woodDark, { w: 1.2 });
  }
  k.box(0, h - 6, L.w, 22, p.woodDark, { w: 1.4 });
  for (let x = 20; x < L.w; x += 46) k.box(x, h + 14, 18, 10, mix(p.woodDark, p.ink, 0.2), { w: 0.6 });
}

/** Boiserie de roble con paneles "linenfold". */
export function oakPaneling(L: Layers, x0: number, x1: number, top: number, bottom: number): void {
  const k = L.back, p = k.pal;
  k.box(x0, top, x1 - x0, bottom - top, p.woodDark, { w: 1.2 });
  k.box(x0, top - 10, x1 - x0, 14, mix(p.wood, p.ink, 0.1), { w: 1.2 });
  const pw = 74;
  for (let x = x0 + 14; x < x1 - pw; x += pw + 12) {
    k.box(x, top + 18, pw, bottom - top - 50, p.wood, { w: 0.9, shade: 0.25 } as any);
    for (let j = 1; j < 4; j++) {
      const fx = x + (pw / 4) * j;
      k.stroke([[fx, top + 30], [fx - 4, top + 40], [fx, top + 50], [fx, bottom - 52], [fx + 4, bottom - 42]], { w: 0.8, alpha: 0.45, passes: 1 });
    }
  }
  k.box(x0, bottom - 22, x1 - x0, 22, mix(p.woodDark, p.ink, 0.25), { w: 1 });
}

/** Ventana de vidrios emplomados en rombos. */
export function windowLeaded(L: Layers, x: number, y: number, w: number, h: number, opts: { curtains?: boolean } = {}): void {
  const k = L.back, p = k.pal;
  k.box(x - 16, y - 16, w + 32, h + 32, p.woodDark, { w: 1.4 });
  const glass: Pt[] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  L.holes.push(glass);
  (L as any).afterHoles = (L as any).afterHoles || [];
  (L as any).afterHoles.push(() => {
    k.fillPoly(glass, p.glass, L.era === 'abandono' ? 0.06 : 0.16);
    const ctx = k.ctx;
    ctx.save();
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    const d = 22;
    for (let t = -h; t < w + h; t += d) {
      if (L.era === 'abandono' && k.rng.chance(0.35)) continue;
      k.line(x + t, y, x + t + h * 0.6, y + h, { w: 0.9, alpha: 0.6, passes: 1, jitter: 0.3 });
      k.line(x + t, y, x + t - h * 0.6, y + h, { w: 0.9, alpha: 0.6, passes: 1, jitter: 0.3 });
    }
    ctx.restore();
    const cols = Math.max(1, Math.round(w / 70));
    for (let i = 1; i < cols; i++) k.line(x + (w / cols) * i, y, x + (w / cols) * i, y + h, { w: 6, color: p.woodDark });
    k.line(x, y + h * 0.3, x + w, y + h * 0.3, { w: 5, color: p.woodDark });
    k.rectLine(x, y, w, h, { w: 2 });
    if (L.era === 'abandono') { k.vine(x + 4, y, h * 0.8, DECAY.moss); k.vine(x + w - 6, y + 10, h * 0.5, DECAY.moss); k.blot(x + w * 0.7, y + h * 0.4, 30, DECAY.moss, 0.5); }
    k.box(x - 22, y + h + 10, w + 44, 12, p.wood, { w: 1.2 });
    if (opts.curtains) curtains(k, x - 36, y - 26, w + 72, h + 40, L.era);
  });
  L.lights.push({ x: x + w / 2, y: y + h * 0.5, r: Math.max(w, h) * 1.1, color: '#c9cfc8', intensity: 0.55, kind: 'window' });
}

/** Velo pictórico final: manchas de pigmento grandes y sombreado en las esquinas. */
export function painterlyFinish(L: Layers): void {
  const k = L.back, p = k.pal, r = k.rng;
  for (let i = 0; i < L.w / 90; i++) {
    k.radial(r.range(0, L.w), r.range(0, L.h), r.range(80, 240), r.chance(0.6) ? p.shadow : p.paper, r.range(0.04, 0.09));
  }
  k.hatch([[0, 0], [160, 0], [0, 300]], -0.7, 5, { alpha: 0.25 });
  k.hatch([[L.w, 0], [L.w - 160, 0], [L.w, 300]], 0.7, 5, { alpha: 0.25 });
}
