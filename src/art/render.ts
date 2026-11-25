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
  beams: HTMLCanvasElement | null; // haces de luz de las ventanas (sumar, resolución 1/2)
  near: HTMLCanvasElement;  // primerísimo plano desenfocado (parallax > 1)
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
  const outdoor = id === 'entrada' || id === 'jardin';
  const beams = lightBeams(L.lights, w, h, era, outdoor);
  const near = nearLayer(id, era, w, h, res, outdoor);
  return { far, back, front, dark, beams, near, lights: L.lights, w, h, res };
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
  ctx.globalAlpha = ambient ?? (era === '1920' ? 0.62 : era === 'abandono' ? 0.5 : 0.3);
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

/** Haces de luz que entran por las ventanas: aguadas claras, inclinadas, con bordes deshechos. */
export function lightBeams(lights: LightDef[], w: number, h: number, era: Era, outdoor: boolean): HTMLCanvasElement | null {
  const wins = lights.filter((l) => l.kind === 'window');
  if (outdoor || !wins.length) return null;
  const [raw, ctx] = makeCanvas(Math.ceil(w / 2), Math.ceil(h / 2));
  ctx.scale(0.5, 0.5);
  const r = new Rng('beams' + w + era);
  const col = era === 'sombras' ? '#fbf8f0' : era === 'abandono' ? '#d9dcb8' : '#f0dfb8';
  const strength = era === 'abandono' ? 0.3 : era === 'sombras' ? 0.22 : 0.18;
  for (const l of wins) {
    const half = l.r * 0.42, dx = 170 + r.range(-30, 30); // la luz cae hacia la derecha y abajo
    const floor = h - 40;
    for (let k = 0; k < 3; k++) {
      const off = r.range(-half * 0.3, half * 0.3), spread = r.range(1.1, 1.6);
      const x0 = l.x - half + off, x1 = l.x + half + off, y0 = l.y;
      const g = ctx.createLinearGradient(0, y0, 0, floor);
      g.addColorStop(0, rgba(col, 0));
      g.addColorStop(0.15, rgba(col, strength * l.intensity * 1.6));
      g.addColorStop(0.6, rgba(col, strength * l.intensity * 0.7));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y0);
      ctx.lineTo(x1 + dx + half * (spread - 1), floor);
      ctx.lineTo(x0 + dx - half * (spread - 1) * 0.4, floor);
      ctx.closePath();
      ctx.globalAlpha = 0.5;
      ctx.fill();
    }
    // charco de luz en el piso
    const px = l.x + dx + 20, py = h - 70;
    const rg = ctx.createRadialGradient(px, py, 0, px, py, l.r * 1.2);
    rg.addColorStop(0, rgba(col, strength * 1.2));
    rg.addColorStop(1, rgba(col, 0));
    ctx.globalAlpha = 1;
    ctx.save(); ctx.translate(px, py); ctx.scale(1, 0.28); ctx.translate(-px, -py);
    ctx.fillStyle = rg; ctx.fillRect(px - l.r * 1.3, py - l.r * 1.3, l.r * 2.6, l.r * 2.6);
    ctx.restore();
  }
  // grumos de pigmento para que no parezca un degradado digital
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < w / 6; i++) {
    ctx.globalAlpha = r.range(0.05, 0.25);
    ctx.beginPath();
    ctx.arc(r.range(0, w), r.range(0, h), r.range(6, 30), 0, Math.PI * 2);
    ctx.fill();
  }
  const [cv, out] = makeCanvas(raw.width, raw.height);
  try { (out as any).filter = 'blur(10px)'; } catch { /* sin desenfoque */ }
  out.drawImage(raw, 0, 0);
  return cv;
}

/** Primerísimo plano: siluetas desenfocadas que pasan delante de la cámara (más rápido que la sala). */
export function nearLayer(id: string, era: Era, w: number, h: number, res: number, outdoor: boolean): HTMLCanvasElement {
  const nw = Math.ceil(w * 1.25);
  const [cv, ctx] = makeCanvas(Math.ceil(nw * res), Math.ceil(h * res));
  ctx.scale(res, res);
  const pal = PALETTES[era];
  const ink = new Ink(ctx, new Rng(id + era + 'near'), pal);
  const r = ink.rng;
  const dark = era === 'sombras' ? '#1a1918' : era === 'abandono' ? '#1f261f' : '#231b16';
  try { (ctx as any).filter = 'blur(3px)'; } catch { /* sin desenfoque */ }
  const spots = Math.max(2, Math.round(nw / 900));
  for (let i = 0; i < spots; i++) {
    const x = (i + 0.5) * (nw / spots) + r.range(-120, 120);
    if (outdoor) {
      // matas de pasto y ramas
      for (let j = 0; j < 22; j++) {
        const bx = x + r.range(-90, 90), bh = r.range(50, 150), lean = r.range(-30, 30);
        ink.shape([[bx - 5, h], [bx + lean, h - bh], [bx + 5, h]], dark, { w: 0, fillAlpha: 0.75 });
      }
      if (r.chance(0.5)) ink.shape([[x - 200, 0], [x + 160, 0], [x + 60, 40], [x - 120, 70]], dark, { w: 0, fillAlpha: 0.7, smooth: 2 });
    } else {
      const kind = r.int(0, 2);
      if (r.chance(0.35)) continue; // no en todos lados
      if (kind === 0) {
        // respaldo de silla
        ink.shape([[x - 60, h], [x - 55, h - 120], [x - 30, h - 150], [x + 30, h - 150], [x + 55, h - 120], [x + 60, h]], dark, { w: 0, fillAlpha: 0.92, smooth: 2 });
      } else if (kind === 1) {
        // jarrón con ramas secas
        ink.shape([[x - 40, h], [x - 46, h - 60], [x - 20, h - 100], [x + 20, h - 100], [x + 46, h - 60], [x + 40, h]], dark, { w: 0, fillAlpha: 0.85, smooth: 2 });
        for (let j = 0; j < 7; j++) ink.stroke([[x, h - 100], [x + r.range(-80, 80), h - r.range(160, 260)]], { w: 4, color: dark, alpha: 0.8 });
      } else {
        // pila de libros o baúl
        ink.shape([[x - 80, h], [x - 78, h - 70], [x + 70, h - 76], [x + 74, h]], dark, { w: 0, fillAlpha: 0.9, smooth: 1 });
        ink.shape([[x - 50, h - 70], [x - 46, h - 104], [x + 40, h - 108], [x + 44, h - 74]], dark, { w: 0, fillAlpha: 0.9, smooth: 1 });
      }
      if (era === 'abandono') ink.shape([[x - 120, h], [x - 60, h - 40], [x + 80, h - 30], [x + 140, h]], '#2c3626', { w: 0, fillAlpha: 0.8, smooth: 2 });
      if (era === 'sombras') for (let j = 0; j < 3; j++) ink.shape([[x + j * 30 - 50, 0], [x + j * 30 - 40, 0], [x + j * 30 - 45, r.range(60, 160)]], '#111111', { w: 0, fillAlpha: 0.85 });
    }
  }
  return cv;
}
