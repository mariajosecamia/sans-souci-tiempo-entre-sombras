// Mobiliario y piezas específicas, en el mismo trazo de tinta y aguada.
import { Ink, Pt } from './ink';
import type { Era } from '../core/palette';
import { DECAY, mix } from '../core/palette';
import { crowSilhouette, candelabra, Layers } from './arch';

export function bookshelf(k: Ink, x: number, y: number, w: number, h: number, era: Era, opts: { collapsed?: boolean; boarded?: boolean } = {}): void {
  const p = k.pal, r = k.rng;
  k.box(x, y, w, h, p.woodDark, { w: 1.4, shade: 0.3 } as any);
  k.box(x - 8, y - 14, w + 16, 16, p.wood, { w: 1.2 });
  const shelves = Math.floor(h / 70);
  for (let i = 0; i < shelves; i++) {
    const sy = y + 10 + i * (h - 20) / shelves, sh = (h - 20) / shelves;
    k.box(x + 6, sy + sh - 8, w - 12, 8, p.wood, { w: 0.8 });
    let bx = x + 10;
    while (bx < x + w - 16) {
      const bw = r.range(8, 18), bh = sh - r.range(12, 26);
      if (era === 'abandono' && r.chance(0.35)) { bx += bw + 4; continue; }
      const tilt = era === 'abandono' && r.chance(0.3) ? r.range(-0.3, 0.3) : r.chance(0.08) ? 0.15 : 0;
      const col = r.pick([p.fabric, p.fabric2, p.woodDark, p.gold, mix(p.fabric, p.paper, 0.3), '#3f4a5a']);
      const bpts: Pt[] = [[bx, sy + sh - 8], [bx + bw, sy + sh - 8], [bx + bw + tilt * bh, sy + sh - 8 - bh], [bx + tilt * bh, sy + sh - 8 - bh]];
      k.shape(bpts, era === 'abandono' ? mix(col, DECAY.damp, 0.4) : col, { w: 0.7, alpha: 0.7 });
      k.line(bx + 2, sy + sh - 8 - bh * 0.7, bx + bw - 2, sy + sh - 8 - bh * 0.7, { w: 0.8, color: p.gold, alpha: 0.5, passes: 1 });
      bx += bw + r.range(0, 2);
    }
  }
  if (opts.boarded) {
    for (let i = 0; i < 5; i++) k.box(x + 4, y + h * 0.55 + i * 26, w - 8, 22, mix(p.wood, p.paper, 0.15), { w: 1 });
  }
  if (opts.collapsed) {
    k.shape([[x - 10, y + h], [x + w * 0.9, y + h - 30], [x + w + 20, y + h], [x + w * 0.2, y + h + 14]], p.woodDark, { w: 1.2 });
    for (let i = 0; i < 14; i++) k.shape([[x + r.range(0, w), y + h + r.range(-10, 20)], [x + r.range(0, w), y + h + r.range(-10, 20)], [x + r.range(0, w), y + h + r.range(0, 30)]], r.pick([p.fabric, p.woodDark, p.paper]), { w: 0.7 });
    // nicho detrás: hueco oscuro
    k.box(x + 50, y + h * 0.55, 160, 140, p.shadow, { w: 1.2, fillAlpha: 0.9 } as any);
    k.hatch([[x + 50, y + h * 0.55], [x + 210, y + h * 0.55], [x + 210, y + h * 0.55 + 140], [x + 50, y + h * 0.55 + 140]], -0.6, 4, { alpha: 0.3 });
  }
  if (era === 'abandono') { k.cobweb(x + 4, y + 2, 50, 'tl', 0.5); k.dampStain(x + w * 0.6, y + h * 0.3, w * 0.3, DECAY.mold, 0.35); }
}

export function desk(k: Ink, x: number, y: number, w: number, h: number, era: Era, sagging = false): void {
  const p = k.pal;
  const top: Pt[] = sagging ? [[x - 10, y], [x + w + 10, y + 26], [x + w + 10, y + 42], [x - 10, y + 16]] : [[x - 10, y], [x + w + 10, y], [x + w + 10, y + 16], [x - 10, y + 16]];
  k.shape(top, p.wood, { w: 1.4 });
  k.box(x, y + 16, w * 0.3, h - 16, p.woodDark, { w: 1.2, shade: 0.3 } as any);
  k.box(x + w * 0.7, y + 16 + (sagging ? 24 : 0), w * 0.3, h - 16 - (sagging ? 24 : 0), p.woodDark, { w: 1.2, shade: 0.3 } as any);
  k.box(x + w * 0.32, y + 20, w * 0.36, 30, p.wood, { w: 1 });
  for (let i = 0; i < 3; i++) k.box(x + 10, y + 30 + i * (h - 40) / 3, w * 0.3 - 20, (h - 40) / 3 - 8, mix(p.wood, p.paper, 0.06), { w: 0.8 });
  if (era === 'abandono') { k.moss(x - 10, y + h, w + 20, 10, DECAY.moss); k.dampStain(x + w * 0.5, y + h * 0.6, w * 0.3, DECAY.damp, 0.35); }
}

export function fireplace(k: Ink, L: Layers, x: number, y: number, w: number, h: number, era: Era, lit: boolean, open = false): void {
  const p = k.pal;
  // estilo normando: campana de revoque, repisa de roble, boca de piedra
  k.shape([[x + w * 0.1, y - 200], [x + w * 0.9, y - 200], [x + w, y], [x, y]], mix(p.wall, p.stone, 0.4), { w: 1.4, shade: 0.25 } as any);
  k.box(x - 20, y - 10, w + 40, 22, p.woodDark, { w: 1.4 });
  k.box(x, y + 12, w, h - 12, p.stone, { w: 1.4 });
  for (let yy = y + 30; yy < y + h; yy += 26) k.line(x, yy, x + w, yy, { w: 0.6, alpha: 0.3 });
  const mouth: Pt[] = k.archPts(x + w * 0.18, y + 40, w * 0.64, h - 40);
  k.shape(mouth, open ? p.shadow : mix(p.ink, p.woodDark, 0.4), { w: 1.4 });
  if (open) {
    // escalera de piedra que baja
    for (let i = 0; i < 6; i++) k.box(x + w * 0.24 + i * 6, y + h - 30 - i * 18, w * 0.52 - i * 12, 14, mix(p.stone, p.shadow, 0.3 + i * 0.1), { w: 0.8 });
    k.hatch(mouth, -0.7, 4, { alpha: 0.25 });
  } else {
    // fondo de hierro con relieve de engranajes
    for (let i = 0; i < 3; i++) k.ellipse(x + w * (0.35 + i * 0.15), y + h * 0.45, 14, 14, undefined, { w: 0.8, alpha: 0.5, color: p.gold });
    k.box(x + w * 0.25, y + h - 26, w * 0.5, 10, p.ink, { w: 0.8 });
    if (lit) {
      for (let i = 0; i < 4; i++) k.blot(x + w * (0.35 + i * 0.1), y + h - 34, 12, i % 2 ? '#e0a050' : '#f0c878', 0.8, 8);
      L.lights.push({ x: x + w / 2, y: y + h - 40, r: 320, color: '#f0a050', intensity: 0.9, flicker: 0.15, kind: 'candle' });
    }
  }
  if (era === 'abandono') { k.dampStain(x + w / 2, y - 120, w * 0.4, DECAY.damp, 0.45); k.moss(x, y + h, w, 12, DECAY.moss); }
}

export function armchair(k: Ink, x: number, y: number, s: number, era: Era, facing: 1 | -1 = 1): void {
  const p = k.pal;
  const col = era === 'abandono' ? mix(p.fabric, DECAY.rot, 0.4) : p.fabric;
  const f = (px: number) => x + px * s * facing;
  k.shape([[f(-50), y], [f(50), y], [f(55), y - 60 * s], [f(-55), y - 60 * s]], col, { w: 1.3, shade: 0.35 } as any);
  k.shape([[f(-58), y - 50 * s], [f(-40), y - 140 * s], [f(40), y - 140 * s], [f(58), y - 50 * s]], col, { w: 1.3, smooth: 1, shade: 0.35 } as any);
  k.box(Math.min(f(-70), f(-48)), y - 80 * s, 22 * s, 80 * s, mix(col, p.ink, 0.15), { w: 1.2 });
  k.box(Math.min(f(48), f(70)), y - 80 * s, 22 * s, 80 * s, mix(col, p.ink, 0.15), { w: 1.2 });
  for (const lx of [-50, 45]) k.box(f(lx), y, 6 * s, 14 * s, p.woodDark, { w: 0.8 });
  if (era === 'abandono') { k.crack(f(-30), y - 120 * s, 60, 1.2, { alpha: 0.6 }); k.blot(f(10), y - 30 * s, 20 * s, DECAY.mold, 0.4); }
}

export function piano(k: Ink, x: number, y: number, w: number, h: number, era: Era): void {
  const p = k.pal;
  const body: Pt[] = [[x, y + 30], [x + w * 0.5, y], [x + w, y + 10], [x + w, y + h * 0.5], [x, y + h * 0.5]];
  k.shape(body, mix(p.ink, p.woodDark, 0.5), { w: 1.5, smooth: 1, shade: 0.3 } as any);
  k.line(x + w * 0.5, y + 4, x + w * 0.85, y - 70, { w: 2, color: p.ink });
  k.shape([[x + w * 0.5, y + 4], [x + w * 0.85, y - 70], [x + w, y + 10]], mix(p.ink, p.woodDark, 0.3), { w: 1.2 });
  k.box(x + 10, y + h * 0.5 - 10, w * 0.5, 18, p.paper, { w: 1 });
  for (let i = 0; i < 24; i++) k.line(x + 14 + i * (w * 0.5 - 8) / 24, y + h * 0.5 - 10, x + 14 + i * (w * 0.5 - 8) / 24, y + h * 0.5 + 2, { w: i % 3 === 1 ? 2.5 : 0.6, passes: 1, alpha: 0.8 });
  for (const lx of [x + 20, x + w - 30, x + w * 0.55]) k.box(lx, y + h * 0.5, 14, h * 0.5, mix(p.ink, p.woodDark, 0.4), { w: 1 });
  k.box(x + w * 0.1, y + 4, w * 0.25, 24, p.paper, { w: 0.8 });
  if (era === 'abandono') k.dampStain(x + w * 0.6, y + h * 0.25, w * 0.2, DECAY.mold, 0.4);
}

export function bed(k: Ink, x: number, y: number, w: number, h: number, era: Era): void {
  const p = k.pal;
  const metal = era === 'abandono' ? DECAY.mold : p.gold;
  k.stroke([[x, y + h], [x, y + 10], [x + 30, y], [x + 60, y + 10], [x + 60, y + h * 0.5]], { w: 3, color: metal });
  for (let i = 1; i < 4; i++) k.line(x + i * 15, y + 10, x + i * 15, y + h * 0.5, { w: 1.5, color: metal });
  const cover: Pt[] = [[x + 50, y + h * 0.4], [x + w, y + h * 0.45], [x + w, y + h * 0.85], [x + 50, y + h * 0.85]];
  k.shape(cover, era === 'abandono' ? mix(p.paper, DECAY.damp, 0.5) : mix(p.paper, '#9fb3c8', 0.25), { w: 1.3, shade: 0.3 } as any);
  k.ellipse(x + 100, y + h * 0.38, 40, 16, p.paper, { w: 1 });
  k.box(x + 40, y + h * 0.85, w - 40, 12, p.woodDark, { w: 1 });
  k.stroke([[x + w, y + h], [x + w, y + h * 0.3]], { w: 3, color: metal });
  if (era === 'abandono') { k.moss(x + 60, y + h * 0.45, w - 60, 10, DECAY.moss); for (let i = 0; i < 8; i++) k.blot(x + k.rng.range(80, w), y + h * k.rng.range(0.45, 0.8), 6, DECAY.ochre, 0.7); }
}

export function dresser(k: Ink, x: number, y: number, w: number, h: number, era: Era): void {
  const p = k.pal;
  const col = era === 'abandono' ? mix(p.paper, DECAY.damp, 0.4) : mix(p.paper, p.wall, 0.3);
  k.box(x, y, w, h, col, { w: 1.3, shade: 0.3 } as any);
  for (let i = 0; i < 3; i++) {
    const dy = y + 12 + i * (h - 20) / 3;
    k.box(x + 10, dy, w - 20, (h - 20) / 3 - 8, mix(col, p.paper, 0.2), { w: 0.9 });
    k.ellipse(x + w / 2, dy + (h - 20) / 6 - 4, 4, 4, p.gold, { w: 0.6 });
    // flores pintadas
    for (let j = 0; j < 3; j++) k.blot(x + 30 + j * (w - 60) / 2, dy + 14, 4, '#c08080', 0.4, 6);
  }
  if (era === 'abandono') { k.crack(x + 10, y + 20, h * 0.8, 1.4, { alpha: 0.5 }); k.box(x + 14, y + 12 + (h - 20) / 3 + 6, w - 28, 14, p.shadow, { w: 0.6 }); }
}

export function musicBox(k: Ink, x: number, y: number, w: number, h: number, open: boolean): void {
  const p = k.pal;
  k.box(x, y + h * 0.3, w, h * 0.7, mix(p.paper, '#e8d8e0', 0.4), { w: 1.2, shade: 0.3 } as any);
  for (let i = 0; i < 5; i++) k.blot(x + 10 + i * (w - 20) / 4, y + h * 0.6, 3, '#9fb3c8', 0.7, 6);
  if (open) {
    k.shape([[x, y + h * 0.3], [x + w, y + h * 0.3], [x + w - 6, y - h * 0.5], [x + 6, y - h * 0.5]], mix(p.paper, '#e8d8e0', 0.2), { w: 1 });
    k.line(x + w / 2, y + h * 0.3, x + w / 2, y, { w: 1, passes: 1 });
    k.ellipse(x + w / 2, y - 6, 5, 8, p.paper, { w: 0.8 });
  } else k.box(x - 2, y + h * 0.2, w + 4, h * 0.14, mix(p.paper, '#e8d8e0', 0.2), { w: 1 });
}

export function shadowTheatre(k: Ink, x: number, y: number, w: number, h: number, era: Era, solved: boolean): void {
  const p = k.pal;
  if (era === 'abandono') {
    k.shape([[x, y + h], [x + w, y + h - 10], [x + w * 0.8, y + h * 0.5], [x + w * 0.2, y + h * 0.6]], p.woodDark, { w: 1.2 });
    k.stroke([[x - 40, y - 80], [x + w * 0.5, y + h * 0.5], [x + w + 30, y + h * 0.7]], { w: 8, color: p.woodDark });
    return;
  }
  k.box(x, y + h * 0.75, w, h * 0.25, p.woodDark, { w: 1.2 });
  k.shape([[x + 10, y + h * 0.75], [x + 10, y + 20], [x + w / 2, y], [x + w - 10, y + 20], [x + w - 10, y + h * 0.75]], p.fabric, { w: 1.3 });
  k.box(x + 30, y + 30, w - 60, h * 0.75 - 50, solved ? '#f0d8a0' : mix(p.paper, p.light, 0.3), { w: 1 });
  if (solved) {
    crowSilhouette(k, x + w / 2, y + h * 0.4, 20, 0.8);
    k.stroke([[x + w / 2 - 10, y + 50], [x + w / 2 + 6, y + 44], [x + w / 2 + 2, y + 58]], { w: 3, color: p.ink, passes: 1 });
  }
  // figuras apoyadas
  crowSilhouette(k, x + w + 30, y + h * 0.9, 10, 0.9);
  k.ellipse(x - 20, y + h * 0.9, 8, 8, p.ink, { w: 0.6 });
}

export function fountain(k: Ink, x: number, y: number, s: number, era: Era): void {
  const p = k.pal;
  const stone = era === 'abandono' ? mix(p.stone, DECAY.damp, 0.25) : p.stone;
  k.ellipse(x, y, 140 * s, 30 * s, stone, { w: 1.4 });
  k.ellipse(x, y - 6 * s, 120 * s, 22 * s, era === 'abandono' ? mix(DECAY.rot, DECAY.moss, 0.4) : mix(p.glass, p.sky, 0.3), { w: 1 });
  k.box(x - 14 * s, y - 110 * s, 28 * s, 104 * s, stone, { w: 1.2, shade: 0.3 } as any);
  k.ellipse(x, y - 110 * s, 60 * s, 14 * s, stone, { w: 1.2 });
  k.box(x - 8 * s, y - 170 * s, 16 * s, 60 * s, stone, { w: 1 });
  k.ellipse(x, y - 170 * s, 32 * s, 8 * s, stone, { w: 1 });
  if (era === '1920') {
    for (const dx of [-50, -20, 20, 50]) k.stroke([[x + dx * 0.5 * s, y - 112 * s], [x + dx * s, y - 70 * s], [x + dx * 1.2 * s, y - 10 * s]], { w: 1, alpha: 0.5, color: p.paper, passes: 1 });
  } else {
    k.moss(x - 140 * s, y + 10 * s, 280 * s, 14, DECAY.moss);
    for (let i = 0; i < 10; i++) k.blot(x + k.rng.range(-100, 100) * s, y - k.rng.range(0, 10) * s, 5, DECAY.ochre, 0.7);
    k.dampStain(x, y - 120 * s, 40 * s, DECAY.mold, 0.5);
  }
}

export function giantClock(k: Ink, x: number, y: number, w: number, h: number, missing: boolean): void {
  const p = k.pal;
  k.shape([[x, y + h], [x, y + w * 0.5], [x + w * 0.5, y], [x + w, y + w * 0.5], [x + w, y + h]], p.paper, { w: 2.2, smooth: 1 } as any);
  k.hatch([[x, y + h], [x, y + w * 0.5], [x + w * 0.5, y], [x + w * 0.2, y + h]], -0.6, 5, { alpha: 0.35 });
  const cx = x + w / 2, cy = y + w * 0.6, r = w * 0.4;
  k.ellipse(cx, cy, r, r, p.wall, { w: 2.4 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    // en lugar de números, pequeñas "fotografías" veladas
    const fx = cx + Math.cos(a) * r * 0.78, fy = cy + Math.sin(a) * r * 0.78;
    k.box(fx - 14, fy - 10, 28, 20, mix(p.paper, p.ink, 0.3 + (i % 3) * 0.15), { w: 0.8 });
  }
  k.line(cx, cy, cx - r * 0.35, cy + r * 0.1, { w: 4 });
  k.line(cx, cy, cx + r * 0.1, cy + r * 0.62, { w: 2.5 });
  if (missing) { k.ellipse(cx, cy, 26, 26, p.ink, { w: 1.5 }); k.ellipse(cx, cy, 14, 14, p.paper, { w: 0.8 }); }
  else { k.ellipse(cx, cy, 26, 26, p.gold, { w: 1.5 }); }
  // péndulo
  k.line(cx, cy + r + 10, cx, y + h - 60, { w: 2 });
  k.ellipse(cx, y + h - 50, 30, 30, p.gold, { w: 1.5 });
  for (let i = 0; i < 8; i++) k.inkDrip(x + 20 + i * (w - 40) / 7, y + w * 0.5, 30 + (i * 37) % 90, 7);
}

export function vaults(k: Ink, w: number, floorY: number, era: Era): void {
  const p = k.pal;
  const brick = era === 'sombras' ? p.wall : mix('#8a5a40', p.stone, 0.4);
  k.washRect(0, 0, w, floorY, brick, 1, { edge: 0, grain: 1 });
  for (let y = 10; y < floorY; y += 16) {
    k.line(0, y, w, y, { w: 0.6, alpha: 0.35, passes: 1 });
    for (let x = (y / 16) % 2 ? 0 : 20; x < w; x += 40) k.line(x, y, x, y + 16, { w: 0.5, alpha: 0.3, passes: 1 });
  }
  for (let x = 0; x < w; x += 400) {
    const arch = k.archPts(x + 30, 40, 340, floorY - 40, 18);
    k.stroke(arch.slice(1, -1), { w: 10, color: mix(brick, p.ink, 0.35) });
    k.vgrad(x + 30, 40, 340, 200, [[0, p.shadow, 0.5], [1, p.shadow, 0]]);
  }
  k.vgrad(0, 0, w, floorY, [[0, p.shadow, 0.55], [0.6, p.shadow, 0.1], [1, p.shadow, 0.3]]);
}

export { candelabra };
