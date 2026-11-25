// Interiores de Belle Ombre: misma "cáscara" normanda (vigas, entramado, boiserie, tablas)
// y el mobiliario propio de cada sala. Coordenadas = las de src/data/rooms.ts.
import { Layers, halfTimberWall, beamedCeiling, oakPaneling, windowLeaded, painterlyFinish, door, frame, portraitBust, decayWall, decayFloor, inkInvasion, foregroundColumn, plantPot, crowSilhouette, curtains, candelabra, table } from '../arch';
import { bookshelf, desk, fireplace, armchair, piano, bed, dresser, musicBox, shadowTheatre, vaults, giantClock } from '../furniture';
import { DECAY, mix } from '../../core/palette';
import type { GameState } from '../../systems/types';
import type { Pt } from '../ink';
import { farLandscape } from './common';

function shell(L: Layers, floorY: number, opts: { timberTop?: number; panelTop?: number; floorKind?: 'boards' | 'tiles' | 'stone' } = {}): void {
  const k = L.back;
  beamedCeiling(L, 50, L.w / 2);
  halfTimberWall(L, 0, L.w, 64, opts.panelTop ?? floorY - 190, 150);
  oakPaneling(L, 0, L.w, opts.panelTop ?? floorY - 190, floorY);
  k.floorPerspective(0, L.w, floorY, L.h, L.w / 2, 260, k.pal.floor, opts.floorKind ?? 'boards');
  for (let i = 0; i < L.w / 12; i++) {
    const y = k.rng.range(floorY + 4, L.h), x = k.rng.range(0, L.w);
    k.line(x, y, x + k.rng.range(30, 90), y, { w: 0.6, alpha: 0.16, passes: 1, color: k.pal.woodDark });
  }
}

function finish(L: Layers, floorY: number): void {
  decayWall(L, 0, L.w, 0, floorY, 1.1);
  decayFloor(L, 0, L.w, floorY, L.h);
  inkInvasion(L, 0, L.w, 0, floorY, 1);
  painterlyFinish(L);
}

function rug(L: Layers, x0: number, x1: number, y0: number, color?: string): void {
  const k = L.back, p = k.pal;
  const col = color ?? p.fabric;
  const pts: Pt[] = [[x0 + 60, y0], [x1 - 60, y0], [x1 + 40, L.h], [x0 - 40, L.h]];
  k.wash(pts, L.era === 'abandono' ? mix(col, DECAY.rot, 0.55) : col, 0.85);
  k.stroke(pts, { closed: true, w: 1.2 });
  k.stroke([[x0 + 76, y0 + 10], [x1 - 76, y0 + 10], [x1 + 20, L.h - 8], [x0 - 20, L.h - 8]], { closed: true, w: 1, color: p.gold, alpha: 0.6 });
}

// ============================================================ SALÓN
export function paintSalon(L: Layers, s: GameState): void {
  const k = L.back, era = L.era;
  farLandscape(L, 360, { rain: true });
  shell(L, 550);
  windowLeaded(L, 1340, 120, 170, 320, { curtains: true });
  door(k, 1510, 270, 90, 260, era);
  fireplace(k, L, 720, 300, 240, 220, era, era === '1920', !!s.flags.panelOpen);
  // repisa: jarrón y reloj de mesa
  k.ellipse(900, 278, 18, 26, mix(k.pal.glass, k.pal.fabric2, 0.3), { w: 1 });
  k.box(735, 262, 34, 30, k.pal.gold, { w: 1 });
  frame(k, 150, 140, 200, 150, (kk, x, y, w, h) => {
    kk.washRect(x, y, w, h, mix(kk.pal.sky, kk.pal.paper, 0.3), 1);
    const ridge: Pt[] = [[x, y + h], [x, y + h * 0.6], [x + w * 0.3, y + h * 0.45], [x + w * 0.6, y + h * 0.55], [x + w, y + h * 0.4], [x + w, y + h]];
    kk.shape(ridge, kk.pal.plant, { w: 0.8 });
  });
  piano(k, 1010, 360, 300, 190, era);
  // mesita + costurero (el costurero es parte del fondo: no desaparece)
  table(k, 600, 560, 120, 70, era);
  k.box(622, 525, 80, 38, mix(k.pal.wood, k.pal.gold, 0.2), { w: 1.2, shade: 0.3 } as any);
  for (let i = 0; i < 4; i++) k.ellipse(636 + i * 16, 520, 6, 4, i % 2 ? k.pal.fabric : k.pal.paper, { w: 0.6 });
  armchair(k, 400, 600, 1.15, era, 1);
  armchair(k, 230, 590, 0.95, era, 1);
  // sábanas sobre muebles (la casa a punto de cerrarse)
  k.shape([[180, 470], [290, 455], [320, 560], [150, 570]], mix(k.pal.paper, k.pal.wall, 0.2), { w: 1, smooth: 2, shade: 0.25 } as any);
  rug(L, 300, 1100, 580);
  finish(L, 550);
  plantPot(L.front, 1560, L.h + 20, 1.5, era);
}

// ============================================================ BIBLIOTECA
export function paintBiblioteca(L: Layers, s: GameState): void {
  const k = L.back, era = L.era;
  farLandscape(L, 360, { rain: true });
  shell(L, 550, { panelTop: 450 });
  door(k, 0, 270, 70, 260, era, { open: false });
  bookshelf(k, 100, 110, 480, 360, era, { boarded: era === '1920', collapsed: era === 'abandono' });
  windowLeaded(L, 670, 110, 260, 330, { curtains: true });
  bookshelf(k, 1000, 110, 480, 290, era);
  desk(k, 1060, 430, 320, 120, era, era === 'abandono');
  if (era === '1920') candelabra(k, 1175, 418, 0.8, [-1, s.flags.anomaly1 ? 0 : -1, -1]);
  // globo terráqueo
  const gx = 330, gy = 500;
  if (era === 'abandono') {
    k.ellipse(gx - 20, gy + 40, 40, 22, mix(k.pal.glass, k.pal.fabric2, 0.5), { w: 1.2 });
    k.ellipse(gx + 30, gy + 50, 36, 18, mix(k.pal.glass, k.pal.fabric2, 0.5), { w: 1.2 });
  } else {
    k.ellipse(gx, gy, 54, 54, mix(k.pal.glass, k.pal.fabric2, 0.5), { w: 1.3, shade: 0.4 } as any);
    k.stroke([[gx - 60, gy - 20], [gx, gy - 62], [gx + 60, gy - 10]], { w: 2.5, color: k.pal.gold });
    for (let i = 0; i < 4; i++) k.blot(gx - 20 + i * 14, gy - 10 + (i % 2) * 18, 10, k.pal.fabric2, 0.6);
  }
  k.box(gx - 6, gy + 54, 12, 40, k.pal.woodDark, { w: 1 });
  armchair(k, 580, 580, 1.05, era, -1);
  if (era === 'abandono') {
    // charco bajo el ventanal y lluvia que entra
    k.ellipse(800, 620, 200, 30, mix(k.pal.glass, k.pal.sky, 0.4), { w: 0, fillAlpha: 0.5 } as any);
    for (let i = 0; i < 40; i++) k.line(680 + k.rng.range(0, 240), 120 + k.rng.range(0, 300), 676 + k.rng.range(0, 240), 140 + k.rng.range(0, 300), { w: 0.6, alpha: 0.3, color: k.pal.paper, passes: 1 });
  }
  rug(L, 500, 1100, 580);
  finish(L, 550);
  foregroundColumn(L.front, 1500, 50, L.h, era);
}

// ============================================================ ESTUDIO
export function paintEstudio(L: Layers, s: GameState): void {
  const k = L.back, era = L.era;
  farLandscape(L, 380, { rain: true });
  shell(L, 550);
  door(k, 0, 270, 70, 260, era);
  frame(k, 120, 150, 250, 190, (kk, x, y, w, h) => {
    kk.washRect(x, y, w, h, mix(kk.pal.paper, '#c8d0d8', 0.3), 1);
    for (let i = 0; i < 6; i++) kk.line(x + 20, y + 20 + i * 26, x + w - 20, y + 20 + i * 26, { w: 0.5, alpha: 0.4, color: '#3f5a7a', passes: 1 });
    kk.rectLine(x + 30, y + 30, w * 0.4, h * 0.4, { w: 1, color: '#3f5a7a' });
    kk.rectLine(x + 30 + w * 0.4, y + 30, w * 0.3, h * 0.4, { w: 1, color: '#3f5a7a' });
    kk.stroke([[x + w * 0.3, y + h * 0.35], [x + w * 0.35, y + h * 0.85]], { w: 1.5, color: '#8a2a2a' });
    kk.rectLine(x + w * 0.25, y + h * 0.75, w * 0.2, h * 0.15, { w: 1, color: '#8a2a2a' });
  });
  frame(k, 935, 155, 120, 160, (kk, x, y, w, h) => {
    portraitBust(kk, x, y, w, h, '#efe8da', '#e2c8b0', '#4a4038');
    kk.blot(x + w * 0.62, y + h * 0.24, 8, '#9fb3c8', 0.9);
  });
  windowLeaded(L, 1090, 110, 140, 290);
  bookshelf(k, 420, 120, 440, 240, era);
  desk(k, 420, 440, 440, 120, era);
  // herramientas de relojero sobre el escritorio
  k.ellipse(780, 432, 22, 6, k.pal.gold, { w: 0.8 });
  k.line(700, 436, 740, 430, { w: 1.4, passes: 1 });
  k.box(600, 420, 26, 18, k.pal.ink, { w: 0.8 });
  // cajón con tres discos
  k.box(580, 500, 120, 44, k.pal.wood, { w: 1.2 });
  for (let i = 0; i < 3; i++) k.ellipse(605 + i * 35, 522, 13, 13, s.flags.drawerOpen ? mix(k.pal.gold, k.pal.ink, 0.3) : k.pal.gold, { w: 1 });
  armchair(k, 640, 610, 1.0, era, 1);
  rug(L, 300, 1000, 590, k.pal.fabric2);
  finish(L, 550);
  plantPot(L.front, 40, L.h + 30, 1.3, era);
}

// ============================================================ CORREDOR
export function paintCorredor(L: Layers, s: GameState): void {
  const k = L.back, era = L.era;
  farLandscape(L, 340, { rain: true });
  shell(L, 550);
  door(k, 0, 270, 70, 260, era, { open: true });
  const port = (x: number, y: number, w: number, h: number, coat: string, skin: string, hair: string) => frame(k, x, y, w, h, (kk, fx, fy, fw, fh) => {
    if (era === 'sombras') { kk.washRect(fx, fy, fw, fh, kk.pal.paper, 1); crowSilhouette(kk, fx + fw / 2, fy + fh / 2, 24, 0.9); return; }
    portraitBust(kk, fx, fy, fw, fh, coat, skin, hair);
    if (era === 'abandono') kk.dampStain(fx + fw / 2, fy + fh / 2, fw * 0.4, DECAY.mold, 0.5);
  });
  port(260, 160, 140, 190, '#3a3530', '#c9a58a', '#4a3a30');
  door(k, 540, 260, 110, 250, era);
  // retrato de familia con la cara raspada
  frame(k, 870, 140, 280, 220, (kk, x, y, w, h) => {
    if (era === 'sombras') { kk.washRect(x, y, w, h, kk.pal.paper, 1); crowSilhouette(kk, x + w / 2, y + h / 2, 40, 0.9); return; }
    kk.radial(x + w / 2, y + h * 0.4, w * 0.6, kk.pal.gold, 0.25);
    const fig = (fx: number, sc: number, coat: string, hair: string) => {
      kk.shape([[fx - 30 * sc, y + h], [fx - 24 * sc, y + h * 0.6], [fx + 24 * sc, y + h * 0.6], [fx + 30 * sc, y + h]], coat, { w: 0.8 });
      kk.ellipse(fx, y + h * 0.5, 14 * sc, 16 * sc, '#d8b89a', { w: 0.7 });
      kk.shape([[fx - 14 * sc, y + h * 0.48], [fx - 12 * sc, y + h * 0.4], [fx + 12 * sc, y + h * 0.4], [fx + 14 * sc, y + h * 0.48]], hair, { w: 0.5 });
    };
    fig(x + w * 0.25, 1.1, '#2a2522', '#3a2f28');
    fig(x + w * 0.75, 1.0, '#2a2522', '#6a6058');
    fig(x + w * 0.5, 0.75, '#efe8da', '#4a4038');
    // la mujer de atrás, con la cara raspada
    kk.shape([[x + w * 0.42, y + h * 0.62], [x + w * 0.45, y + h * 0.4], [x + w * 0.58, y + h * 0.4], [x + w * 0.6, y + h * 0.62]], '#505a40', { w: 0.7 });
    for (let i = 0; i < 14; i++) kk.line(x + w * 0.46 + kk.rng.range(0, 30), y + h * 0.22 + kk.rng.range(0, 6), x + w * 0.46 + kk.rng.range(0, 30), y + h * 0.36, { w: 0.8, color: '#efe4c8', passes: 1 });
    if (era === 'abandono') { kk.dampStain(x + w * 0.2, y + h * 0.5, 50, DECAY.mold, 0.55); kk.dampStain(x + w * 0.8, y + h * 0.3, 40, DECAY.damp, 0.5); }
  });
  door(k, 1290, 260, 110, 250, era);
  windowLeaded(L, 1520, 110, 180, 330, { curtains: true });
  port(1760, 170, 120, 170, '#713f42', '#d9bfa3', '#e4ddd0');
  // consola con jarrón
  table(k, 700, 470, 120, 80, era);
  k.ellipse(760, 450, 16, 24, mix(k.pal.glass, k.pal.fabric2, 0.3), { w: 1 });
  rug(L, 200, 1800, 590, k.pal.fabric);
  finish(L, 550);
  foregroundColumn(L.front, 470, 44, L.h, era);
  foregroundColumn(L.front, 1460, 44, L.h, era);
}

// ============================================================ CUARTO INFANTIL
export function paintInfantil(L: Layers, s: GameState): void {
  const k = L.back, era = L.era, p = k.pal;
  farLandscape(L, 360, { rain: true });
  beamedCeiling(L, 50, L.w / 2);
  // papel tapiz con golondrinas (cuarto de niña), boiserie baja clara
  k.wallpaper(0, 64, L.w, 390, mix(p.wall, '#c8d4dc', 0.25), '#5a6a7a', 52);
  for (let i = 0; i < 18; i++) crowSilhouette(k, k.rng.range(20, L.w - 20), k.rng.range(100, 400), 7, 0.25);
  k.vgrad(0, 64, L.w, 140, [[0, p.shadow, 0.4], [1, p.shadow, 0]]);
  oakPaneling(L, 0, L.w, 455, 550);
  k.floorPerspective(0, L.w, 550, L.h, L.w / 2, 260, p.floor, 'boards');
  door(k, 0, 270, 70, 260, era, { open: true });
  windowLeaded(L, 330, 90, 200, 240, { curtains: true });
  if (era === 'abandono') {
    // la rama del tilo atravesó el vidrio y creció adentro
    k.stroke([[420, 90], [470, 200], [560, 300], [690, 360], [760, 450]], { w: 14, color: p.woodDark });
    for (let i = 0; i < 26; i++) k.blot(440 + k.rng.range(0, 330), 150 + k.rng.range(0, 280), k.rng.range(6, 14), DECAY.moss, 0.75, 8);
  }
  bed(k, 110, 400, 330, 180, era);
  shadowTheatre(k, 580, 330, 200, 200, era, !!s.flags.theatreSolved);
  dresser(k, 880, 430, 200, 130, era);
  if (era === '1920') musicBox(k, 940, 395, 80, 40, !!s.flags.musicboxPlayed);
  // papel tapiz despegado (en el abandono deja ver el escondite)
  if (era === 'abandono') {
    k.shape([[1090, 140], [1240, 150], [1235, 380], [1095, 370]], mix(p.stone, DECAY.ochre, 0.3), { w: 1 });
    k.shape([[1090, 140], [1170, 130], [1210, 220], [1130, 260]], mix(p.wall, '#c8d4dc', 0.2), { w: 1.1, smooth: 1, shade: 0.3 } as any);
    if (!s.flags.tookDrawing) { k.box(1130, 270, 70, 50, mix(p.paper, '#e2d3b0', 0.5), { w: 1 }); k.line(1140, 290, 1190, 288, { w: 0.6, passes: 1 }); }
  } else {
    k.line(1205, 150, 1238, 180, { w: 0.8, alpha: 0.5 });
  }
  // muñeca y caballito
  k.ellipse(260, 380, 14, 14, '#e8d8c8', { w: 0.8 });
  k.shape([[244, 395], [276, 395], [282, 430], [238, 430]], '#9fb3c8', { w: 0.8 });
  rug(L, 300, 1000, 590, mix(p.fabric2, '#9fb3c8', 0.4));
  finish(L, 550);
  curtains(L.front, -40, -20, 90, 0, era);
}

// ============================================================ SÓTANO
export function paintSotano(L: Layers, s: GameState): void {
  const k = L.back, era = L.era, p = k.pal;
  vaults(k, L.w, 560, era);
  k.floorPerspective(0, L.w, 560, L.h, L.w / 2, 280, mix(p.stone, p.shadow, 0.3), 'stone');
  // escalera de piedra hacia el salón
  for (let i = 0; i < 8; i++) k.box(60 + i * 10, 520 - i * 40, 170 - i * 8, 40, mix(p.stone, p.paper, 0.1 - i * 0.02), { w: 1 });
  k.vgrad(40, 150, 220, 380, [[0, p.shadow, 0.6], [1, p.shadow, 0]]);
  // caldera
  const bx = 380, by = 240;
  k.shape([[bx, by + 290], [bx, by + 60], [bx + 110, by], [bx + 220, by + 60], [bx + 220, by + 290]], mix(p.ink, p.stone, 0.35), { w: 1.6, smooth: 1, shade: 0.4 } as any);
  k.box(bx + 70, by + 150, 80, 60, p.ink, { w: 1.2 });
  for (let i = 0; i < 6; i++) k.ellipse(bx + 20 + i * 36, by + 90, 5, 5, p.gold, { w: 0.6 });
  // caños hacia la pared del fondo
  for (let i = 0; i < 3; i++) k.stroke([[bx + 200, by + 40 + i * 30], [900, by + 40 + i * 30], [1250, by + 60 + i * 30]], { w: 10 - i * 2, color: era === 'abandono' ? DECAY.rust : mix(p.stone, p.ink, 0.4) });
  // cajas de Verhaegen
  for (const [cx, cy, cw, ch] of [[690, 450, 110, 90], [800, 470, 80, 70], [720, 400, 70, 52]] as [number, number, number, number][]) {
    if (era === 'abandono') { k.shape([[cx, cy + ch], [cx + cw, cy + ch - 20], [cx + cw * 0.7, cy + ch * 0.4], [cx + 10, cy + ch * 0.6]], mix(p.wood, DECAY.rot, 0.4), { w: 1 }); continue; }
    k.box(cx, cy, cw, ch, p.wood, { w: 1.2, shade: 0.3 } as any);
    k.line(cx, cy + ch * 0.5, cx + cw, cy + ch * 0.5, { w: 0.8, alpha: 0.5 });
    k.ellipse(cx + cw * 0.7, cy + ch * 0.3, 6, 6, '#8a2a2a', { w: 0.5 });
  }
  // archivo de hierro
  k.box(990, 210, 210, 320, era === 'abandono' ? DECAY.rust : mix(p.stone, p.ink, 0.45), { w: 1.5, shade: 0.35 } as any);
  for (let i = 0; i < 5; i++) {
    k.box(1005, 225 + i * 60, 180, 50, era === 'abandono' ? mix(DECAY.rust, p.ink, 0.2) : mix(p.stone, p.ink, 0.3), { w: 0.9 });
    k.box(1080, 240 + i * 60, 30, 10, p.paper, { w: 0.5 });
  }
  if (!s.flags.archivoOpen && era === '1920') k.ellipse(1095, 350, 10, 13, p.gold, { w: 1 });
  // pared del fondo: puerta sólo "en el reflejo"
  if (era === 'abandono') {
    k.ellipse(1400, 600, 220, 40, mix(p.glass, p.shadow, 0.4), { w: 0, fillAlpha: 0.75 } as any);
    k.washRect(0, 640, L.w, 80, mix(p.glass, p.shadow, 0.5), 0.45, { edge: 0 });
    // reflejo invertido de una puerta de tinta
    k.shape([[1340, 585], [1460, 585], [1460, 640], [1340, 640]], '#111111', { w: 0, fillAlpha: 0.55 } as any);
    k.shape(k.archPts(1340, 585, 120, 50).map(([x, y]) => [x, 1170 - y] as Pt), '#111111', { w: 1, fillAlpha: 0.4 } as any);
  }
  if (era === 'sombras') { k.shape(k.archPts(1340, 300, 120, 240), '#111111', { w: 2 }); }
  decayFloor(L, 0, L.w, 560, L.h);
  inkInvasion(L, 0, L.w, 0, 560, 1);
  painterlyFinish(L);
  // lámpara de obra colgante
  if (era === '1920') { k.line(700, 0, 700, 140, { w: 1 }); k.ellipse(700, 150, 18, 12, '#f0d8a0', { w: 1 }); L.lights.push({ x: 700, y: 150, r: 360, color: '#f0c878', intensity: 0.7, flicker: 0.05, kind: 'lamp' }); }
  (L as any).ambient = 0.9;
}

// ============================================================ SALA DEL RELOJ (sombras)
export function paintReloj(L: Layers, s: GameState): void {
  const k = L.back, p = k.pal;
  // todo es papel y tinta: el dibujo de la casa dibujándose a sí misma
  k.washRect(0, 0, L.w, L.h, p.paper, 1, { edge: 0, grain: 1.2 });
  for (let i = 0; i < 30; i++) {
    const x = k.rng.range(0, L.w);
    k.stroke([[x, 0], [x + k.rng.range(-40, 40), 560]], { w: 0.8, alpha: 0.25, passes: 1 });
  }
  // fragmentos de la casa flotando: una ventana, una puerta, la escalera, en tinta
  windowLeaded(L, 160, 120, 120, 200);
  k.stroke([[1250, 560], [1320, 300], [1400, 300], [1470, 560]], { w: 2 });
  for (let i = 0; i < 10; i++) k.line(1250 + i * 7, 560 - i * 26, 1470 - i * 7, 560 - i * 26, { w: 1, alpha: 0.6 });
  k.hatch([[0, 0], [L.w, 0], [L.w, 80], [0, 140]], -0.4, 4, { alpha: 0.35 });
  giantClock(k, 620, 60, 360, 480, !!s.flags.rosaFree || true);
  k.floorPerspective(0, L.w, 560, L.h, L.w / 2, 280, p.wall, 'boards');
  for (let i = 0; i < 6; i++) k.blot(k.rng.range(100, L.w - 100), k.rng.range(580, 700), k.rng.range(30, 70), p.ink, 0.8, 16);
  for (let x = 0; x < L.w; x += k.rng.range(30, 80)) k.inkDrip(x, 0, k.rng.range(30, 200), k.rng.range(5, 12));
  L.lights.push({ x: 800, y: 300, r: 500, color: '#eee8da', intensity: 0.6, kind: 'ink' });
}

export const PAINTER_AMBIENT: Record<string, number> = {};
