// Renderiza una sala en capas (lejana, fondo, primer plano) + luces, para una época y estado dados.
import { Ink, makeCanvas, clipPoly } from './ink';
import { Layers, LightDef } from './arch';
import { Rng } from '../core/rng';
import { PALETTES, Era, rgba } from '../core/palette';
import type { GameState } from '../systems/types';
import { PAINTERS } from './rooms';

export interface RenderedRoom {
  far: HTMLCanvasElement;
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
  dark: HTMLCanvasElement;  // capa de penumbra (multiplicar) con huecos de luz (resolución 1/2)
  res: number;
  lights: LightDef[];
  w: number;
  h: number;
}

export function renderRoom(id: string, era: Era, s: GameState, w: number, h = 720, res = 1): RenderedRoom {
  const pal = PALETTES[era];
  const mk = () => { const [cv, ctx] = makeCanvas(Math.ceil(w * res), Math.ceil(h * res)); ctx.scale(res, res); return [cv, ctx] as const; };
  const [far, fctx] = mk();
  const [back, bctx] = mk();
  const [front, frctx] = mk();
  const seed = id + ':' + era;
  const L: Layers = {
    far: new Ink(fctx, new Rng(seed + 'f'), pal),
    back: new Ink(bctx, new Rng(seed + 'b'), pal),
    front: new Ink(frctx, new Rng(seed + 'x'), pal),
    era, w, h, holes: [], lights: [],
  };
  const painter = PAINTERS[id];
  if (painter) painter(L, s);
  // recortar ventanas
  if (L.holes.length) {
    bctx.save();
    bctx.globalCompositeOperation = 'destination-out';
    for (const hole of L.holes) {
      bctx.save();
      clipPoly(bctx, hole);
      bctx.fillRect(0, 0, w, h);
      bctx.restore();
    }
    bctx.restore();
  }
  for (const fn of ((L as any).afterHoles || []) as (() => void)[]) fn();
  for (const fn of ((L as any).afterAll || []) as (() => void)[]) fn();
  paperize(bctx, w, h, seed, era);
  const dark = darkness(L.lights, w, h, era, (L as any).ambient);
  return { far, back, front, dark, lights: L.lights, w, h, res };
}

/** Textura de papel y fibras sobre la ilustración (multiplica muy suave). */
function paperize(ctx: CanvasRenderingContext2D, w: number, h: number, seed: string, era: Era): void {
  const r = new Rng(seed + 'paper');
  ctx.save();
  ctx.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < (w * h) / 900; i++) {
    ctx.globalAlpha = r.range(0.02, 0.07);
    ctx.fillStyle = r.chance(0.5) ? '#2a2420' : '#fff8e8';
    ctx.fillRect(r.range(0, w), r.range(0, h), r.range(1, 3), r.range(1, 2));
  }
  ctx.strokeStyle = era === 'sombras' ? '#111111' : '#3a2f26';
  for (let i = 0; i < (w * h) / 9000; i++) {
    ctx.globalAlpha = r.range(0.03, 0.07);
    ctx.lineWidth = 0.6;
    const x = r.range(0, w), y = r.range(0, h), a = r.range(0, Math.PI * 2), l = r.range(4, 14);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + 2, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    ctx.stroke();
  }
  ctx.restore();
}

/** Capa de penumbra: color oscuro con "agujeros" de luz. Se dibuja con blend MULTIPLY. */
export function darkness(lights: LightDef[], w: number, h: number, era: Era, ambient?: number): HTMLCanvasElement {
  const [cv, ctx] = makeCanvas(Math.ceil(w / 2), Math.ceil(h / 2));
  ctx.scale(0.5, 0.5);
  const base = era === '1920' ? '#7a6a5a' : era === 'abandono' ? '#7f8a80' : '#9a9690';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = ambient ?? (era === '1920' ? 0.8 : era === 'abandono' ? 0.6 : 0.35);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  // viñeta vertical: el techo y el piso cercano más oscuros
  ctx.globalAlpha = 1;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, rgba('#3a3028', 0.45));
  g.addColorStop(0.35, rgba('#3a3028', 0));
  g.addColorStop(0.85, rgba('#3a3028', 0));
  g.addColorStop(1, rgba('#3a3028', 0.3));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // luces: aclaran hacia blanco
  ctx.globalCompositeOperation = 'lighter';
  for (const l of lights) {
    const rg = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    rg.addColorStop(0, rgba('#ffffff', 0.6 * l.intensity));
    rg.addColorStop(0.5, rgba('#ffffff', 0.25 * l.intensity));
    rg.addColorStop(1, rgba('#ffffff', 0));
    ctx.fillStyle = rg;
    ctx.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2);
  }
  return cv;
}
