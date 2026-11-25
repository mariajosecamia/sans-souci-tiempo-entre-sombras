// Exteriores: portón, jardín con la fachada normanda (siguiendo la foto de referencia) e invernadero.
import { Layers, painterlyFinish, crowSilhouette, plantPot } from '../arch';
import { fountain } from '../furniture';
import { DECAY, mix } from '../../core/palette';
import type { GameState } from '../../systems/types';
import type { Ink, Pt } from '../ink';
import { farLandscape } from './common';

function ground(L: Layers, y: number, gravel = true): void {
  const k = L.back, p = k.pal;
  k.washRect(0, y, L.w, L.h - y, L.era === 'abandono' ? mix(p.plant, DECAY.ochre, 0.3) : mix(p.plant, p.paper, 0.1), 1, { edge: 0, grain: 1 });
  if (gravel) {
    const path: Pt[] = [[0, y + 50], [L.w, y + 30], [L.w, L.h - 30], [0, L.h - 10]];
    k.wash(path, mix(p.stone, p.paper, 0.2), 0.9, { grain: 1.5 });
    for (let i = 0; i < L.w / 3; i++) k.blot(k.rng.range(0, L.w), k.rng.range(y + 40, L.h), k.rng.range(1, 3), p.woodDark, 0.25, 5);
  }
  for (let i = 0; i < L.w / 6; i++) {
    const gx = k.rng.range(0, L.w), gy = y + k.rng.range(0, 40);
    k.line(gx, gy, gx + k.rng.range(-3, 3), gy - k.rng.range(4, 14), { w: 0.7, alpha: 0.5, color: p.plantDark, passes: 1 });
  }
  if (L.era === 'abandono') for (let i = 0; i < L.w / 60; i++) k.moss(k.rng.range(0, L.w), k.rng.range(y + 40, L.h), 40, 20, DECAY.moss);
}

function tree(k: Ink, x: number, y: number, s: number, era: string): void {
  const p = k.pal;
  k.stroke([[x, y], [x + 6 * s, y - 120 * s], [x - 4 * s, y - 220 * s]], { w: 14 * s, color: p.woodDark });
  k.stroke([[x + 4 * s, y - 140 * s], [x + 60 * s, y - 200 * s]], { w: 6 * s, color: p.woodDark });
  for (let i = 0; i < 14; i++) k.blot(x + k.rng.range(-90, 90) * s, y - k.rng.range(160, 300) * s, k.rng.range(30, 60) * s, era === 'abandono' ? DECAY.moss : p.plantDark, 0.55, 12);
}

// ============================================================ ENTRADA
export function paintEntrada(L: Layers, s: GameState): void {
  const k = L.back, p = k.pal, era = L.era;
  farLandscape(L, 400, { rain: false });
  // el lejano se dibuja también en el fondo (exterior: no hay ventanas)
  k.ctx.drawImage(L.far.ctx.canvas, 0, 0, L.w, L.h);
  ground(L, 540);
  // muro de piedra a los lados del portón
  const wall = (x0: number, x1: number) => {
    k.box(x0, 380, x1 - x0, 170, mix(p.stone, p.wall, 0.3), { w: 1.3, shade: 0.2 } as any);
    for (let y = 395; y < 550; y += 22) for (let x = x0 + ((y / 22) % 2) * 20; x < x1; x += 40) k.rectLine(x, y, 38, 20, { w: 0.6, alpha: 0.35, passes: 1 });
    if (era === 'abandono') k.moss(x0, 384, x1 - x0, 16, DECAY.moss);
  };
  wall(680, 860); wall(1240, 1600);
  // pilares
  for (const px of [840, 1220]) {
    k.box(px, 200, 50, 350, mix(p.stone, p.paper, 0.15), { w: 1.4, shade: 0.35 } as any);
    k.box(px - 8, 186, 66, 20, p.stone, { w: 1.2 });
    k.ellipse(px + 25, 172, 22, 16, p.stone, { w: 1.2 });
  }
  // portón de hierro (abierto si Anselmo abrió)
  const open = !!s.flags.gateOpen;
  const leaf = (x0: number, w: number, swing: number) => {
    const x1 = x0 + w * swing;
    k.stroke([[x0, 540], [x0, 220], [x1, 230], [x1, 540]], { w: 3, color: p.ink });
    for (let i = 1; i < 9; i++) {
      const bx = x0 + (x1 - x0) * (i / 9);
      k.line(bx, 540, bx, 232, { w: 2, color: p.ink });
      k.stroke([[bx - 3, 240], [bx, 226], [bx + 3, 240]], { w: 1.5, color: p.ink });
    }
    k.line(x0, 300, x1, 300, { w: 2.5, color: p.ink });
    k.line(x0, 480, x1, 480, { w: 2.5, color: p.ink });
    k.ellipse(x0 + (x1 - x0) * 0.5, 390, 30 * Math.abs(swing), 30, undefined, { w: 2, color: p.ink });
  };
  if (open) { leaf(890, 165, 0.35); leaf(1220, -165, 0.35); }
  else { leaf(890, 165, 1); leaf(1220, -165, 1); k.stroke([[1040, 380], [1058, 420], [1072, 380]], { w: 3, color: p.gold }); }
  // arco con letras BELLE OMBRE
  k.stroke([[860, 200], [960, 130], [1150, 130], [1245, 200]], { w: 4, color: p.ink });
  k.ctx.save();
  k.ctx.font = 'italic 28px "IM Fell English", Georgia, serif';
  k.ctx.fillStyle = p.ink; k.ctx.textAlign = 'center'; k.ctx.globalAlpha = 0.9;
  k.ctx.fillText('BELLE OMBRE', 1052, 160);
  k.ctx.restore();
  // campana en el pilar derecho
  k.line(1288, 236, 1288, 256, { w: 2 });
  k.shape([[1272, 256], [1304, 256], [1310, 300], [1266, 300]], era === 'abandono' ? DECAY.mold : mix(p.gold, p.plant, 0.3), { w: 1.2, smooth: 1 } as any);
  k.line(1288, 300, 1290, 330, { w: 1.2 });
  // farol
  k.line(605, 560, 605, 190, { w: 5, color: p.ink });
  k.shape([[585, 150], [625, 150], [632, 190], [578, 190]], mix(p.glass, p.ink, 0.4), { w: 1.4 });
  k.shape([[580, 150], [605, 128], [630, 150]], p.ink, { w: 1 });
  // camino de tierra hacia la tranquera
  tree(k, 140, 560, 1.4, era);
  tree(k, 1480, 560, 1.2, era);
  if (era === '1920') crowSilhouette(k, 1250, 170, 10, 0.9);
  painterlyFinish(L);
  plantPot(L.front, -40, L.h + 40, 2, era);
  (L as any).ambient = 0.36;
}

// ============================================================ FACHADA / JARDÍN
export function paintJardin(L: Layers, s: GameState): void {
  const k = L.back, p = k.pal, era = L.era;
  farLandscape(L, 380, { rain: false });
  k.ctx.drawImage(L.far.ctx.canvas, 0, 0, L.w, L.h);
  facade(k, L, era);
  ground(L, 545);
  fountain(k, 510, 560, 1.0, era);
  // estatua de la ninfa
  const sx = 1700;
  k.box(sx - 40, 470, 80, 80, p.stone, { w: 1.2, shade: 0.3 } as any);
  k.shape([[sx - 20, 470], [sx - 26, 340], [sx, 300], [sx + 26, 340], [sx + 20, 470]], mix(p.stone, p.paper, 0.3), { w: 1.2, smooth: 2, shade: 0.35 } as any);
  if (era !== 'abandono') k.ellipse(sx, 285, 14, 16, mix(p.stone, p.paper, 0.3), { w: 1 });
  k.shape([[sx - 10, 360], [sx + 10, 360], [sx + 4, 380], [sx + 10, 400], [sx - 10, 400], [sx - 4, 380]], p.gold, { w: 1 });
  // carretilla
  const cx = 1400, cy = 600;
  k.shape([[cx, cy - 40], [cx + 150, cy - 50], [cx + 130, cy], [cx + 20, cy + 4]], era === 'abandono' ? DECAY.rust : p.wood, { w: 1.3, shade: 0.3 } as any);
  k.ellipse(cx + 150, cy + 10, 22, 22, undefined, { w: 2.5, color: p.ink });
  k.line(cx, cy - 30, cx - 50, cy + 10, { w: 3, color: p.woodDark });
  if (era === 'abandono') k.moss(cx, cy - 46, 150, 20, DECAY.moss);
  // macizos y magnolias
  for (const [bx, by, r] of [[260, 560, 60], [760, 556, 50], [1260, 560, 55], [1820, 556, 70]] as [number, number, number][]) {
    for (let i = 0; i < 8; i++) k.blot(bx + k.rng.range(-r, r), by - k.rng.range(0, r), k.rng.range(r * 0.3, r * 0.6), era === 'abandono' ? DECAY.moss : p.plantDark, 0.65, 12);
    if (era === '1920') for (let i = 0; i < 6; i++) k.blot(bx + k.rng.range(-r, r), by - k.rng.range(10, r), 6, '#efe4dc', 0.9, 7);
  }
  // sendero hacia el invernadero
  k.wash([[1820, 560], [1920, 540], [1920, 700], [1800, 700]], mix(p.stone, p.paper, 0.2), 0.9);
  painterlyFinish(L);
  // primer plano: ramas que cuelgan
  const f = L.front;
  f.stroke([[0, 40], [120, 70], [260, 60], [340, 100]], { w: 8, color: f.pal.woodDark });
  for (let i = 0; i < 18; i++) f.blot(f.rng.range(0, 360), f.rng.range(40, 140), f.rng.range(10, 24), era === 'abandono' ? DECAY.moss : f.pal.plantDark, 0.8, 9);
  (L as any).ambient = 0.36;
}

/** La fachada de Belle Ombre: chalet normando de techos empinados (ver foto de referencia). */
export function facade(k: Ink, L: Layers, era: string): void {
  const p = k.pal;
  const ab = era === 'abandono';
  const render = ab ? mix(p.wall, DECAY.damp, 0.35) : mix(p.wall, p.paper, 0.15);
  const roof = ab ? mix('#6b4a3a', DECAY.moss, 0.35) : era === 'sombras' ? p.woodDark : '#7a4a3a';
  const G = 545;
  const wallBox = (x: number, y: number, w: number, h: number) => {
    k.box(x, y, w, h, render, { w: 1.5, shade: 0.25 } as any);
    for (let i = 0; i < (w * h) / 1600; i++) k.blot(x + k.rng.range(0, w), y + k.rng.range(0, h), k.rng.range(2, 6), p.wallDark, 0.1, 6);
    if (ab) for (let i = 0; i < w / 120; i++) k.dampStain(x + k.rng.range(0, w), y + k.rng.range(10, h * 0.5), k.rng.range(30, 70), DECAY.damp, 0.45);
  };
  const gableRoof = (x: number, w: number, eave: number, peak: number, timber: boolean) => {
    const pts: Pt[] = [[x - 20, eave], [x + w / 2, peak], [x + w + 20, eave]];
    // frontón con entramado
    const gable: Pt[] = [[x, eave], [x + w / 2, peak + 30], [x + w, eave]];
    k.shape(gable, render, { w: 1.2 });
    if (timber) {
      for (let i = 1; i < 6; i++) { const gx = x + (w / 6) * i; const top = eave - (eave - peak - 30) * (1 - Math.abs(gx - x - w / 2) / (w / 2)); k.line(gx, eave, gx, top, { w: 6, color: p.woodDark }); }
      k.line(x + 10, eave - 40, x + w - 10, eave - 40, { w: 6, color: p.woodDark });
    }
    k.stroke(pts, { w: 16, color: roof });
    k.stroke(pts, { w: 2, color: p.ink });
  };
  const slopeRoof = (x0: number, x1: number, eave: number, ridge: number, inset: number) => {
    const pts: Pt[] = [[x0 - 20, eave], [x0 + inset, ridge], [x1 - inset, ridge], [x1 + 20, eave]];
    k.shape(pts, roof, { w: 1.5, shade: 0.3 } as any);
    // tejas
    for (let y = ridge + 10; y < eave; y += 12) {
      const t = (y - ridge) / (eave - ridge);
      const xa = x0 + inset - (inset + 20) * t, xb = x1 - inset + (inset + 20) * t;
      k.line(xa, y, xb, y, { w: 0.7, alpha: 0.35, passes: 1 });
      for (let x = xa + ((y / 12) % 2) * 9; x < xb; x += 18) k.line(x, y, x, y + 12, { w: 0.5, alpha: 0.25, passes: 1 });
    }
    if (ab) {
      // techo hundido: huecos con cabios a la vista
      for (let i = 0; i < 3; i++) {
        const hx = k.rng.range(x0 + inset + 40, x1 - inset - 100), hy = k.rng.range(ridge + 10, eave - 50);
        k.shape([[hx, hy], [hx + 90, hy + 6], [hx + 70, hy + 40], [hx + 10, hy + 34]], p.shadow, { w: 1, fillAlpha: 0.9 } as any);
        for (let j = 0; j < 4; j++) k.line(hx + 10 + j * 20, hy, hx + 20 + j * 18, hy + 40, { w: 3, color: p.woodDark });
      }
      for (let i = 0; i < (x1 - x0) / 60; i++) k.blot(k.rng.range(x0, x1), k.rng.range(ridge, eave), k.rng.range(8, 20), DECAY.moss, 0.5, 9);
    }
  };
  const win = (x: number, y: number, w: number, h: number, lit = false) => {
    k.box(x - 8, y - 8, w + 16, h + 16, p.woodDark, { w: 1.2 });
    if (ab && k.rng.chance(0.5)) {
      k.box(x, y, w, h, mix(p.paper, p.wall, 0.3), { w: 1 }); // tapiado con chapas blancas, como en la foto
      for (let i = 1; i < 4; i++) k.line(x, y + (h / 4) * i, x + w, y + (h / 4) * i, { w: 0.8, alpha: 0.5 });
    } else {
      k.box(x, y, w, h, lit ? '#f0d090' : mix(p.glass, p.ink, ab ? 0.7 : 0.45), { w: 1 });
      for (let i = 1; i < 3; i++) k.line(x + (w / 3) * i, y, x + (w / 3) * i, y + h, { w: 2, color: p.woodDark });
      k.line(x, y + h * 0.4, x + w, y + h * 0.4, { w: 2, color: p.woodDark });
      if (lit) L.lights.push({ x: x + w / 2, y: y + h / 2, r: 160, color: '#f0c878', intensity: 0.8, flicker: 0.05, kind: 'lamp' });
    }
  };
  const chimney = (x: number, top: number, bottom: number, w = 40) => {
    k.box(x, top, w, bottom - top, mix(render, p.stone, 0.3), { w: 1.3, shade: 0.35 } as any);
    k.box(x - 6, top - 10, w + 12, 14, p.stone, { w: 1.1 });
    for (let i = 0; i < 2; i++) k.box(x + 6 + i * 16, top - 28, 10, 18, '#8a5a40', { w: 0.8 });
    if (ab) k.vine(x + w / 2, top, bottom - top, DECAY.moss);
  };

  // --- ala izquierda baja con frontón
  wallBox(300, 330, 260, G - 330);
  slopeRoof(300, 560, 340, 230, 60);
  win(340, 410, 70, 90, era === '1920'); win(450, 410, 70, 90);
  // --- cuerpo izquierdo alto con frontón entramado
  wallBox(560, 250, 330, G - 250);
  gableRoof(560, 330, 250, 70, true);
  win(600, 290, 80, 100); win(770, 290, 80, 100); win(600, 420, 80, 100, era === '1920'); win(770, 420, 80, 100);
  // --- cuerpo central con techo grande y arcada
  wallBox(880, 290, 380, G - 290);
  slopeRoof(880, 1260, 300, 120, 90);
  chimney(1010, 70, 160, 46);
  chimney(1170, 40, 250, 54); // la chimenea-torre alta de la derecha
  // buhardillas
  for (const dx of [930, 1120]) { k.box(dx, 200, 70, 70, render, { w: 1.2 }); k.shape([[dx - 10, 204], [dx + 35, 168], [dx + 80, 204]], roof, { w: 1.2 }); win(dx + 15, 214, 40, 44); }
  // arcada de la entrada
  k.shape(k.archPts(880, 300, 160, 245), mix(render, p.shadow, 0.15), { w: 1.4 });
  k.shape(k.archPts(900, 320, 120, 225), p.shadow, { w: 1.6, fillAlpha: 0.95 } as any);
  // puerta principal dentro de la arcada
  k.box(912, 360, 96, 150, ab ? mix(p.woodDark, DECAY.rot, 0.3) : p.woodDark, { w: 1.3, hatch: true });
  k.ellipse(985, 440, 4, 4, p.gold, { w: 0.6 });
  // escalinata
  for (let i = 0; i < 3; i++) k.box(880 - i * 16, 510 + i * 12, 160 + i * 32, 12, p.stone, { w: 1 });
  win(1100, 330, 80, 110); win(1100, 460, 80, 70);
  // --- ala derecha con pérgola-terraza
  wallBox(1260, 330, 330, G - 330);
  win(1300, 380, 90, 110); win(1450, 380, 90, 110, era === '1920');
  k.box(1250, 316, 350, 18, mix(render, p.stone, 0.3), { w: 1.2 });
  // pérgola de madera sobre la terraza
  const pg = ab ? mix(p.woodDark, DECAY.rot, 0.3) : p.woodDark;
  for (const px of [1270, 1390, 1510, 1580]) k.box(px, 150, 14, 170, pg, { w: 1 });
  k.box(1255, 140, 345, 16, pg, { w: 1.2 });
  for (let x = 1260; x < 1600; x += 28) k.line(x, 132, x + 10, 160, { w: 4, color: pg });
  if (!ab) for (let i = 0; i < 16; i++) k.blot(k.rng.range(1260, 1600), k.rng.range(130, 170), k.rng.range(8, 16), p.plantDark, 0.6, 8);
  // --- hiedra (en el abandono, la gran mata sobre la arcada, como en la foto)
  if (ab) {
    for (let i = 0; i < 60; i++) k.blot(940 + k.rng.range(-160, 200), 230 + k.rng.range(0, 120), k.rng.range(14, 34), k.rng.chance(0.5) ? DECAY.moss : p.plantDark, 0.75, 10);
    for (let i = 0; i < 30; i++) k.blot(560 + k.rng.range(0, 40), 300 + k.rng.range(0, 240), k.rng.range(10, 24), DECAY.moss, 0.7, 9);
    for (let i = 0; i < 25; i++) k.blot(1560 + k.rng.range(0, 40), 200 + k.rng.range(0, 340), k.rng.range(10, 24), DECAY.moss, 0.7, 9);
  } else {
    for (let i = 0; i < 18; i++) k.blot(570 + k.rng.range(0, 30), 380 + k.rng.range(0, 160), k.rng.range(8, 16), p.plantDark, 0.6, 9);
  }
  if (era === 'sombras') for (let x = 300; x < 1600; x += k.rng.range(20, 60)) k.inkDrip(x, 330, k.rng.range(30, 180), 7);
  k.moss(300, G, 1300, 14, ab ? DECAY.moss : p.plantDark);
}

// ============================================================ INVERNADERO
export function paintInvernadero(L: Layers, s: GameState): void {
  const k = L.back, p = k.pal, era = L.era;
  const ab = era === 'abandono';
  farLandscape(L, 420, { rain: false });
  k.ctx.drawImage(L.far.ctx.canvas, 0, 0, L.w, L.h);
  // estructura de hierro y vidrio
  k.washRect(0, 0, L.w, 560, mix(p.glass, p.paper, 0.4), ab ? 0.35 : 0.5, { edge: 0 });
  for (let x = 0; x <= L.w; x += 110) k.line(x, 0, x, 560, { w: 5, color: mix(p.ink, p.stone, 0.3) });
  for (let y = 60; y < 560; y += 120) k.line(0, y, L.w, y, { w: 3, color: mix(p.ink, p.stone, 0.3) });
  k.stroke([[0, 60], [L.w / 2, 0], [L.w, 60]], { w: 6, color: mix(p.ink, p.stone, 0.3) });
  if (ab) {
    for (let i = 0; i < 8; i++) { const gx = k.rng.range(0, L.w - 110), gy = k.rng.range(60, 400); k.shape([[gx, gy], [gx + 80, gy + 10], [gx + 40, gy + 90]], p.shadow, { w: 0.8, fillAlpha: 0.4 } as any); }
    for (let i = 0; i < 80; i++) k.blot(k.rng.range(0, L.w), k.rng.range(0, 200), k.rng.range(10, 30), DECAY.moss, 0.6, 9); // hiedra que tapa el techo
  }
  // piso de baldosas
  k.floorPerspective(0, L.w, 560, L.h, L.w / 2, 280, mix(p.stone, '#a06a50', 0.4), 'tiles');
  // mesa de trasplante
  const mx = 560, my = 440;
  if (ab) { k.shape([[mx, my + 120], [mx + 330, my + 80], [mx + 300, my + 40], [mx + 20, my + 70]], mix(p.wood, DECAY.rot, 0.4), { w: 1.2 }); }
  else {
    k.box(mx, my, 330, 18, p.wood, { w: 1.2 });
    for (const lx of [mx + 10, mx + 300]) k.box(lx, my + 18, 16, 100, p.woodDark, { w: 1 });
    for (let i = 0; i < 6; i++) { k.shape([[mx + 20 + i * 50, my], [mx + 56 + i * 50, my], [mx + 50 + i * 50, my - 30], [mx + 26 + i * 50, my - 30]], '#a0603a', { w: 0.9 }); k.blot(mx + 38 + i * 50, my - 40, 14, p.plant, 0.8, 8); }
  }
  // grandes plantas a la derecha
  for (let i = 0; i < 6; i++) plantPot(k, 950 + i * 50, 560 - (i % 2) * 20, 1.2 + (i % 3) * 0.2, era);
  if (ab) for (let i = 0; i < 40; i++) k.blot(k.rng.range(850, L.w), k.rng.range(150, 560), k.rng.range(14, 34), k.rng.chance(0.5) ? DECAY.moss : p.plantDark, 0.75, 10);
  // limonero
  plantPot(k, 230, 570, 1.6, era);
  // vidrios empañados por la lluvia
  for (let i = 0; i < 120; i++) { const x = k.rng.range(0, L.w), y = k.rng.range(0, 520); k.line(x, y, x - 2, y + k.rng.range(10, 30), { w: 0.6, alpha: 0.3, color: p.paper, passes: 1 }); }
  painterlyFinish(L);
  (L as any).ambient = 0.5;
}
