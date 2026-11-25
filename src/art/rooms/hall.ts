import { Layers, halfTimberWall, beamedCeiling, oakPaneling, windowLeaded, painterlyFinish, door, frame, portraitBust, grandfatherClock, table, candelabra, decayWall, decayFloor, inkInvasion, foregroundColumn, plantPot, crowSilhouette } from '../arch';
import { farLandscape } from './common';
import { DECAY, mix } from '../../core/palette';
import type { GameState } from '../../systems/types';
import type { Pt } from '../ink';

const FLOOR = 540;

export function paintHall(L: Layers, s: GameState): void {
  const k = L.back, p = k.pal, era = L.era, W = L.w;
  farLandscape(L, 360, { rain: era !== 'sombras' });

  beamedCeiling(L, 56, 960);
  halfTimberWall(L, 0, W, 70, 340, 150);
  oakPaneling(L, 0, W, 340, FLOOR);

  // ventana emplomada junto a la biblioteca
  windowLeaded(L, 1585, 120, 92, 300);
  // ventanita sobre el rellano
  windowLeaded(L, 925, 84, 70, 64);

  // puertas
  door(k, 40, 250, 130, 270, era, { double: true, arched: true });
  door(k, 300, 270, 120, 240, era);
  door(k, 1400, 280, 110, 230, era, { plaque: true });
  door(k, 1700, 270, 120, 240, era, { double: true });

  // retrato de Aurelio
  frame(k, 510, 130, 170, 220, (kk, x, y, w, h) => {
    if (era === 'sombras') { kk.box(x, y, w, h, kk.pal.paper, { w: 0 }); crowSilhouette(kk, x + w / 2, y + h / 2, 36, 0.95); return; }
    portraitBust(kk, x, y, w, h, '#2a2522', '#c9a58a', '#3a2f28');
    kk.ellipse(x + w * 0.62, y + h * 0.82, 9, 9, kk.pal.gold, { w: 0.8 }); // reloj de bolsillo
    if (era === 'abandono') { kk.dampStain(x + w * 0.4, y + h * 0.4, w * 0.5, DECAY.mold, 0.55); kk.blot(x + w * 0.3, y + h * 0.2, 30, DECAY.damp, 0.4); }
  });

  // escalera central
  stairs(L, s);

  // reloj de pie
  const clockOpen = !!s.flags.clockOpen;
  grandfatherClock(k, 1180, 200, 110, 320, era, era === '1920' && !clockOpen ? [12, 0] : [3, 40], clockOpen && era === '1920');

  // mesita con candelabro (la vela entera desaparece cuando Elena la toma)
  table(k, 715, 450, 110, 90, era, true);
  if (era === '1920') candelabra(k, 768, 452, 0.9, [0, s.flags.tookCandle ? 0 : 1, 0]);
  else candelabra(k, 768, 452, 0.9, [-1, 0, -1]);

  // apliques eléctricos (tenues)
  for (const x of [470 - 40, 1300 + 60]) {
    k.box(x, 230, 14, 30, p.gold, { w: 0.8 });
    k.ellipse(x + 7, 222, 14, 10, era === '1920' ? '#f0d8a0' : mix(p.glass, p.ink, 0.3), { w: 0.8 });
    if (era === '1920') L.lights.push({ x: x + 7, y: 222, r: 200, color: '#f0c878', intensity: 0.45, flicker: 0.05, kind: 'lamp' });
  }


  // piso de mármol en damero con alfombra
  floorHall(L);

  decayWall(L, 0, W, 0, FLOOR, 1.2);
  decayFloor(L, 0, W, FLOOR, L.h);
  inkInvasion(L, 0, W, 0, FLOOR, 1);
  painterlyFinish(L);

  // primer plano: columna y palmera
  foregroundColumn(L.front, 1530, 56, L.h, era);
  plantPot(L.front, 120, L.h + 10, 1.4, era);
  if (era === 'abandono') plantPot(L.front, 1880, L.h + 30, 1.6, era);
}

function stairs(L: Layers, s: GameState): void {
  const k = L.back, p = k.pal, era = L.era;
  const bx0 = 830, bx1 = 1090, tx0 = 885, tx1 = 1035, by = FLOOR, ty = 300;
  // muro del rellano + puerta del rellano
  const landingDoorOpen = era === 'abandono' || !!s.flags.stairDoorOpen;
  door(k, 905, 160, 110, 140, era, { open: era === 'abandono' });
  if (era === 'abandono') {
    // la puerta caída, apoyada de costado en el rellano
    k.shape([[915, 300], [1010, 280], [1030, 300], [930, 306]], mix(p.wood, DECAY.rot, 0.4), { w: 1.2, hatch: true });
  } else if (landingDoorOpen) {
    k.line(905, 300, 1015, 300, { w: 1, alpha: 0.5 });
  }
  // peldaños
  const n = 13;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 1) / n;
    const y0 = by - (by - ty) * t0, y1 = by - (by - ty) * t1;
    const xa0 = bx0 + (tx0 - bx0) * t0, xa1 = bx1 + (tx1 - bx1) * t0;
    const xb0 = bx0 + (tx0 - bx0) * t1, xb1 = bx1 + (tx1 - bx1) * t1;
    const riser: Pt[] = [[xa0, y0], [xa1, y0], [xb1, y1 + 4], [xb0, y1 + 4]];
    k.shape(riser, mix(p.wood, p.paper, 0.05 + 0.15 * (1 - t0)), { w: 0.9, alpha: 0.75 });
    k.line(xb0, y1 + 4, xb1, y1 + 4, { w: 1.2, alpha: 0.8 });
    k.vgrad(xa0, y1 + 4, xa1 - xa0, y0 - y1 - 4, [[0, p.shadow, 0.0], [1, p.shadow, 0.18]]);
  }
  // alfombra de la escalera
  const carpet: Pt[] = [[bx0 + 60, by], [bx1 - 60, by], [tx1 - 35, ty], [tx0 + 35, ty]];
  k.wash(carpet, era === 'abandono' ? mix(p.fabric, DECAY.rot, 0.5) : p.fabric, era === 'abandono' ? 0.6 : 0.85);
  for (let i = 0; i < n; i++) {
    const t = i / n, y = by - (by - ty) * t;
    const xa = bx0 + 60 + (tx0 + 35 - bx0 - 60) * t, xb = bx1 - 60 + (tx1 - 35 - bx1 + 60) * t;
    k.line(xa, y, xb, y, { w: 1.4, color: p.gold, alpha: 0.6, passes: 1 });
  }
  // rellano
  k.box(tx0 - 40, ty - 4, tx1 - tx0 + 80, 10, p.woodDark, { w: 1.2 });
  // barandas con balaustres
  for (const side of [0, 1]) {
    const x0 = side ? bx1 + 10 : bx0 - 10, x1 = side ? tx1 + 8 : tx0 - 8;
    const rail: Pt[] = [[x0 + (side ? 20 : -20), by - 90], [x0, by - 70], [x1, ty - 68]];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = x0 + (x1 - x0) * t, yb = by - (by - ty) * t, yt = by - 70 - (by - 70 - (ty - 68)) * t;
      k.line(x, yb, x, yt, { w: 2.2, color: p.woodDark, alpha: 0.85 });
      k.ellipse(x, yt + (yb - yt) * 0.45, 2.6, 5, p.woodDark, { w: 0.5 });
    }
    k.stroke(rail, { w: 6, color: p.woodDark });
    k.stroke(rail, { w: 1.5, color: mix(p.wood, p.paper, 0.3), alpha: 0.5 });
    // pilar de arranque
    const px = side ? bx1 + 6 : bx0 - 34;
    k.box(px, by - 110, 28, 110, p.woodDark, { w: 1.2 });
    k.ellipse(px + 14, by - 116, 16, 9, p.wood, { w: 1 });
  }
  if (era === 'abandono') {
    for (let i = 0; i < 18; i++) k.blot(k.rng.range(tx0, bx1 - 40), k.rng.range(ty, by), k.rng.range(3, 8), k.rng.pick([DECAY.ochre, DECAY.rust, DECAY.moss]), 0.8, 6);
    k.moss(tx0 - 30, ty + 2, tx1 - tx0 + 60, 12, DECAY.moss);
  }
}

function floorHall(L: Layers): void {
  const k = L.back, p = k.pal;
  k.floorPerspective(0, L.w, FLOOR, L.h, 960, 260, p.floor, 'boards');
  // vetas
  for (let i = 0; i < 160; i++) {
    const y = k.rng.range(FLOOR + 4, L.h), x = k.rng.range(0, L.w);
    k.line(x, y, x + k.rng.range(30, 90), y + k.rng.range(-1, 1), { w: 0.6, alpha: 0.18, passes: 1, color: p.woodDark });
  }
  // alfombra central
  const rug: Pt[] = [[820, FLOOR + 6], [1100, FLOOR + 6], [1240, L.h], [680, L.h]];
  k.wash(rug, L.era === 'abandono' ? mix(p.fabric, DECAY.rot, 0.55) : p.fabric, 0.85);
  k.stroke(rug, { closed: true, w: 1.2 });
  const inner: Pt[] = [[840, FLOOR + 16], [1080, FLOOR + 16], [1205, L.h - 10], [715, L.h - 10]];
  k.stroke(inner, { closed: true, w: 1, color: p.gold, alpha: 0.6 });
  for (let i = 0; i < 6; i++) { const t = i / 6; k.ellipse(760 + 400 * t, FLOOR + 60 + 80 * Math.sin(t * 3), 10, 3, p.gold, { w: 0, fillAlpha: 0.4 }); }
  // reflejo de la luz de la ventana
  k.radial(1630, 620, 220, p.paper, 0.14);
}
