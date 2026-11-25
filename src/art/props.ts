// Objetos interactivos independientes (se dibujan como sprites aparte del fondo y desaparecen al tomarlos)
// e íconos del inventario. Mismo trazo de tinta que los escenarios.
import { Ink, makeCanvas, Pt } from './ink';
import { Rng } from '../core/rng';
import { PALETTES, Era, mix } from '../core/palette';
import { crowSilhouette, candle } from './arch';

export type PropPainter = (k: Ink, w: number, h: number) => void;

const P: Record<string, PropPainter> = {
  aceitera: (k, w, h) => {
    const p = k.pal;
    k.ellipse(w * 0.45, h * 0.7, w * 0.3, h * 0.22, mix(p.stone, p.ink, 0.2), { w: 1.2 });
    k.stroke([[w * 0.6, h * 0.6], [w * 0.95, h * 0.1]], { w: 2.4 });
    k.stroke([[w * 0.2, h * 0.6], [w * 0.05, h * 0.4], [w * 0.2, h * 0.3]], { w: 1.6 });
  },
  lata: (k, w, h) => {
    const p = k.pal;
    k.box(w * 0.15, h * 0.2, w * 0.7, h * 0.75, '#8a6a45', { w: 1.3, shade: 0.4 } as any);
    k.box(w * 0.25, h * 0.4, w * 0.5, h * 0.25, p.paper, { w: 0.8 });
    k.line(w * 0.3, h * 0.52, w * 0.7, h * 0.52, { w: 1.2, color: p.fabric, passes: 1 });
    k.box(w * 0.55, h * 0.06, w * 0.18, h * 0.15, mix(p.stone, p.ink, 0.3), { w: 1 });
  },
  fosforos: (k, w, h) => {
    const p = k.pal;
    k.box(w * 0.08, h * 0.25, w * 0.84, h * 0.6, '#c49a4a', { w: 1.1 });
    k.box(w * 0.2, h * 0.35, w * 0.6, h * 0.4, p.fabric, { w: 0.7 });
    k.line(w * 0.08, h * 0.3, w * 0.92, h * 0.3, { w: 1.4, color: '#6b3a2a', passes: 1 });
  },
  quinque: (k, w, h) => {
    const p = k.pal;
    k.shape([[w * 0.25, h], [w * 0.75, h], [w * 0.65, h * 0.78], [w * 0.35, h * 0.78]], p.gold, { w: 1.2, smooth: 1 } as any);
    k.ellipse(w * 0.5, h * 0.68, w * 0.32, h * 0.12, p.gold, { w: 1.2 });
    k.shape([[w * 0.38, h * 0.62], [w * 0.62, h * 0.62], [w * 0.6, h * 0.12], [w * 0.4, h * 0.12]], mix(p.glass, p.ink, 0.55), { w: 1.2, fillAlpha: 0.85 } as any);
    k.blot(w * 0.5, h * 0.3, w * 0.1, p.ink, 0.6);
    k.radial(w * 0.5, h * 0.5, w * 0.6, p.paper, 0.15);
  },
  cartas: (k, w, h) => {
    const p = k.pal;
    for (let i = 0; i < 3; i++) k.box(w * 0.1 + i * 3, h * 0.2 + i * 2, w * 0.75, h * 0.6, mix(p.paper, p.wall, i * 0.2), { w: 0.8 });
    k.line(w * 0.1, h * 0.5, w * 0.9, h * 0.5, { w: 1.6, color: p.fabric, passes: 1 });
    k.ellipse(w * 0.75, h * 0.35, 3, 3, '#8a2a2a', { w: 0.5 });
  },
  fragmento: (k, w, h) => {
    const p = k.pal;
    k.blot(w / 2, h / 2, w * 0.28, p.ink, 0.85, 12);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      k.line(w / 2 + Math.cos(a) * w * 0.25, h / 2 + Math.sin(a) * h * 0.25, w / 2 + Math.cos(a) * w * 0.45, h / 2 + Math.sin(a) * h * 0.45, { w: 1.2, alpha: 0.6, passes: 1, taper: true });
    }
    k.radial(w / 2, h / 2, w * 0.5, p.paper, 0.2);
  },
  valija: (k, w, h) => {
    const p = k.pal;
    k.box(w * 0.05, h * 0.25, w * 0.9, h * 0.7, '#49372b', { w: 1.2, shade: 0.4 } as any);
    k.stroke([[w * 0.35, h * 0.25], [w * 0.4, h * 0.05], [w * 0.6, h * 0.05], [w * 0.65, h * 0.25]], { w: 2 });
    k.line(w * 0.05, h * 0.5, w * 0.95, h * 0.5, { w: 1, alpha: 0.6 });
    k.box(w * 0.45, h * 0.45, w * 0.1, h * 0.1, p.gold, { w: 0.6 });
  },
};

export function drawProp(id: string, era: Era, w: number, h: number, res = 1): HTMLCanvasElement | null {
  const fn = P[id];
  if (!fn) return null;
  const [cv, ctx] = makeCanvas(Math.ceil(w * res), Math.ceil(h * res));
  ctx.scale(res, res);
  fn(new Ink(ctx, new Rng(id + era), PALETTES[era]), w, h);
  return cv;
}

// ------------------------------------------------------------------ íconos de inventario
const I: Record<string, PropPainter> = {
  camara: (k, w, h) => {
    const p = k.pal;
    k.box(w * 0.12, h * 0.3, w * 0.76, h * 0.45, '#2a2522', { w: 1.3 });
    k.shape([[w * 0.35, h * 0.38], [w * 0.62, h * 0.38], [w * 0.7, h * 0.7], [w * 0.28, h * 0.7]], '#4a3a30', { w: 1 });
    for (let i = 0; i < 4; i++) k.line(w * (0.33 + i * 0.01), h * (0.45 + i * 0.06), w * (0.65 - i * 0.01), h * (0.45 + i * 0.06), { w: 0.6, alpha: 0.6, color: p.paper, passes: 1 });
    k.ellipse(w * 0.5, h * 0.56, w * 0.1, w * 0.1, mix(p.glass, p.ink, 0.5), { w: 1.2 });
    k.box(w * 0.7, h * 0.22, w * 0.1, h * 0.08, p.gold, { w: 0.6 });
  },
  nota: (k, w, h) => paper(k, w, h, 0.1, 3),
  carta: (k, w, h) => {
    paper(k, w, h, -0.05, 0);
    [0.38, 0.5, 0.62].forEach((x) => candle(k, w * x, h * 0.66, h * 0.16, false));
    crowSilhouette(k, w * 0.5, h * 0.32, w * 0.09, 0.9);
  },
  llave: (k, w, h) => key(k, w, h, k.pal.gold, 0.6),
  llave_larga: (k, w, h) => key(k, w, h, mix(k.pal.ink, k.pal.stone, 0.4), 0.8),
  llave_chica: (k, w, h) => {
    const p = k.pal;
    k.ellipse(w * 0.35, h * 0.4, w * 0.13, h * 0.1, p.gold, { w: 1 });
    k.ellipse(w * 0.65, h * 0.4, w * 0.13, h * 0.1, p.gold, { w: 1 });
    k.line(w * 0.5, h * 0.4, w * 0.5, h * 0.85, { w: 3, color: p.gold });
    k.box(w * 0.46, h * 0.75, w * 0.12, h * 0.1, p.gold, { w: 0.6 });
  },
  vela: (k, w, h) => candle(k, w * 0.5, h * 0.9, h * 0.55, false),
  vela_on: (k, w, h) => { candle(k, w * 0.5, h * 0.92, h * 0.5, true); k.radial(w * 0.5, h * 0.3, w * 0.45, k.pal.light, 0.35); },
  fosforos: (k, w, h) => P.fosforos(k, w, h),
  quinque: (k, w, h) => P.quinque(k, w, h),
  quinque_on: (k, w, h) => { k.radial(w * 0.5, h * 0.38, w * 0.55, '#c9d8b0', 0.6); P.quinque(k, w, h); k.blot(w * 0.5, h * 0.36, w * 0.07, '#e8f0c8', 0.9); },
  lata: (k, w, h) => P.lata(k, w, h),
  aceitera: (k, w, h) => P.aceitera(k, w, h),
  libro: (k, w, h) => {
    const p = k.pal;
    k.shape([[w * 0.2, h * 0.15], [w * 0.8, h * 0.12], [w * 0.82, h * 0.85], [w * 0.22, h * 0.88]], '#5b4638', { w: 1.3, shade: 0.4 } as any);
    k.line(w * 0.28, h * 0.15, w * 0.3, h * 0.87, { w: 1, alpha: 0.6 });
    k.blot(w * 0.6, h * 0.6, w * 0.15, '#4a5346', 0.5);
    k.box(w * 0.4, h * 0.3, w * 0.3, h * 0.08, p.gold, { w: 0.5 });
  },
  dibujo: (k, w, h) => {
    paper(k, w, h, 0.06, 0);
    const p = k.pal;
    k.stroke([[w * 0.45, h * 0.22], [w * 0.52, h * 0.18], [w * 0.55, h * 0.26], [w * 0.47, h * 0.3]], { w: 2, color: '#c9a040', passes: 1 });
    crowSilhouette(k, w * 0.5, h * 0.48, w * 0.06, 0.9);
    k.line(w * 0.45, h * 0.7, w * 0.58, h * 0.7, { w: 2, color: p.ink, passes: 1 });
    k.ellipse(w * 0.43, h * 0.7, 3, 3, undefined, { w: 1.5 });
  },
  cinta: (k, w, h) => {
    k.stroke([[w * 0.15, h * 0.3], [w * 0.4, h * 0.5], [w * 0.6, h * 0.35], [w * 0.85, h * 0.6], [w * 0.7, h * 0.85]], { w: 6, color: '#9fb3c8', alpha: 0.95, passes: 1 });
    k.stroke([[w * 0.15, h * 0.3], [w * 0.4, h * 0.5], [w * 0.6, h * 0.35], [w * 0.85, h * 0.6], [w * 0.7, h * 0.85]], { w: 1, passes: 1, alpha: 0.6 });
  },
  engranaje: (k, w, h) => {
    const p = k.pal;
    const pts: Pt[] = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const r = (i % 4 < 2 ? 0.4 : 0.32) * w;
      pts.push([w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r]);
    }
    k.shape(pts, p.gold, { w: 1.2, shade: 0.4 } as any);
    k.ellipse(w / 2, h / 2, w * 0.1, h * 0.1, p.shadow, { w: 1 });
  },
};

function paper(k: Ink, w: number, h: number, rot: number, lines: number): void {
  const p = k.pal;
  const c = k.ctx;
  c.save();
  c.translate(w / 2, h / 2); c.rotate(rot); c.translate(-w / 2, -h / 2);
  k.box(w * 0.18, h * 0.1, w * 0.64, h * 0.8, p.paper, { w: 1 });
  for (let i = 0; i < lines; i++) k.line(w * 0.26, h * (0.3 + i * 0.15), w * 0.72, h * (0.3 + i * 0.15), { w: 0.9, alpha: 0.6, passes: 1 });
  c.restore();
}

function key(k: Ink, w: number, h: number, col: string, len: number): void {
  k.ellipse(w * 0.25, h * 0.5, w * 0.13, h * 0.13, col, { w: 1.2 });
  k.ellipse(w * 0.25, h * 0.5, w * 0.05, h * 0.05, k.pal.shadow, { w: 0.6 });
  k.line(w * 0.36, h * 0.5, w * (0.36 + len * 0.6), h * 0.5, { w: 3.5, color: col });
  k.box(w * (0.36 + len * 0.6) - 10, h * 0.5, 7, h * 0.14, col, { w: 0.8 });
  k.box(w * (0.36 + len * 0.6) - 20, h * 0.5, 6, h * 0.1, col, { w: 0.8 });
}

export function drawIcon(icon: string, size = 96): HTMLCanvasElement {
  const [cv, ctx] = makeCanvas(size, size);
  const fn = I[icon];
  const k = new Ink(ctx, new Rng('icon' + icon), PALETTES['1920']);
  if (fn) fn(k, size, size);
  return cv;
}
