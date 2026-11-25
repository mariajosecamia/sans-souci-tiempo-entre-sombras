import { Layers } from '../arch';
import { DECAY, mix } from '../../core/palette';
import type { Pt } from '../ink';

/** Paisaje lejano (cielo, sierras de Tandil, árboles) para ventanas y exteriores. */
export function farLandscape(L: Layers, horizon = 380, opts: { rain?: boolean; trees?: boolean } = {}): void {
  const k = L.far, p = k.pal, w = L.w;
  k.vgrad(0, 0, w, horizon + 80, [[0, mix(p.sky, p.ink, 0.25), 1], [0.7, p.sky, 1], [1, p.skyLow, 1]]);
  // nubes bajas
  for (let i = 0; i < w / 120; i++) k.blot(k.rng.range(0, w), k.rng.range(30, horizon - 120), k.rng.range(40, 120), mix(p.sky, p.paper, 0.35), 0.25, 14);
  // sierras: dos planos
  const ridge = (base: number, amp: number, col: string, alpha: number) => {
    const pts: Pt[] = [[0, L.h]];
    for (let x = 0; x <= w; x += 40) pts.push([x, base - amp * (0.5 + 0.5 * Math.sin(x / 230 + base)) - k.rng.range(0, amp * 0.25)]);
    pts.push([w, L.h]);
    k.shape(pts, col, { w: 0.8, alpha: 0.5, fillAlpha: alpha });
  };
  ridge(horizon - 10, 90, mix(p.stone, p.sky, 0.5), 0.8);
  // piedras en las laderas
  for (let i = 0; i < w / 90; i++) k.blot(k.rng.range(0, w), horizon + k.rng.range(-50, 10), k.rng.range(4, 12), mix(p.stone, p.paper, 0.2), 0.5, 8);
  ridge(horizon + 40, 50, mix(p.plant, p.sky, 0.35), 0.95);
  if (opts.trees !== false) {
    for (let x = 0; x < w; x += k.rng.range(50, 140)) {
      const th = k.rng.range(90, 200), ty = horizon + 60;
      k.line(x, ty, x + k.rng.range(-6, 6), ty - th * 0.6, { w: 3, color: p.woodDark, alpha: 0.7 });
      for (let j = 0; j < 5; j++) k.blot(x + k.rng.range(-30, 30), ty - th * k.rng.range(0.5, 1), k.rng.range(20, 40), L.era === 'abandono' ? DECAY.moss : p.plantDark, 0.55, 12);
    }
  }
  k.washRect(0, horizon + 60, w, L.h - horizon - 60, mix(p.plant, p.floor, 0.4), 1, { edge: 0 });
  if (opts.rain) rain(k.ctx, w, L.h, k.rng.next.bind(k.rng), 0.18);
}

export function rain(ctx: CanvasRenderingContext2D, w: number, h: number, rnd: () => number, alpha = 0.2): void {
  ctx.save();
  ctx.strokeStyle = '#e8e4d8';
  ctx.lineWidth = 0.8;
  for (let i = 0; i < (w * h) / 2200; i++) {
    ctx.globalAlpha = alpha * (0.4 + rnd() * 0.6);
    const x = rnd() * w, y = rnd() * h, l = 10 + rnd() * 18;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - l * 0.18, y + l);
    ctx.stroke();
  }
  ctx.restore();
}

export const afterAll = (L: Layers, fn: () => void) => {
  (L as any).afterAll = (L as any).afterAll || [];
  (L as any).afterAll.push(fn);
};
