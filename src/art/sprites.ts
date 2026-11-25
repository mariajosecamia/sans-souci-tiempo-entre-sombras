// Genera las hojas de animación de los personajes a partir del dibujante paramétrico.
import { makeCanvas } from './ink';
import { drawFigure, walkPose, idlePose, actionPose, Pose, OUTFITS, STAND } from './characters';
import { crowSilhouette } from './arch';
import { Ink } from './ink';
import { Rng } from '../core/rng';
import { PALETTES } from '../core/palette';

export const FRAME_W = 230;
export const FRAME_H = 330;
export const FOOT_Y = 315;

export interface Sheet { canvas: HTMLCanvasElement; frames: Record<string, number[]>; res: number; cols: number }

export const ANIMS: Record<string, { n: number; pose: (t: number) => Pose; fps: number; loop: boolean }> = {
  walk: { n: 10, pose: (t) => walkPose(t), fps: 12, loop: true },
  idle: { n: 6, pose: (t) => idlePose(t), fps: 5, loop: true },
  pickup: { n: 7, pose: (t) => actionPose('pickup', t), fps: 10, loop: false },
  use: { n: 7, pose: (t) => actionPose('use', t), fps: 10, loop: false },
  examine: { n: 7, pose: (t) => actionPose('examine', t), fps: 8, loop: false },
  react: { n: 6, pose: (t) => actionPose('react', t), fps: 10, loop: false },
  read: { n: 2, pose: () => actionPose('read', 1), fps: 2, loop: true },
  sit: { n: 4, pose: (t) => ({ ...actionPose('sit', 1), bob: Math.sin(t * Math.PI * 2) * 1 }), fps: 3, loop: true },
};

/** Construye una hoja con las animaciones pedidas. Escala 1 = altura propia del outfit. */
export function buildSheet(id: string, anims: string[], res = 1, scale = 0.86): Sheet {
  const total = anims.reduce((a, k) => a + ANIMS[k].n, 0);
  const cols = Math.min(10, total);
  const rows = Math.ceil(total / cols);
  const fw = Math.ceil(FRAME_W * res), fh = Math.ceil(FRAME_H * res);
  const [cv, ctx] = makeCanvas(fw * cols, fh * rows);
  const frames: Record<string, number[]> = {};
  let i = 0;
  const h = OUTFITS[id]?.height ?? 300;
  for (const a of anims) {
    const def = ANIMS[a];
    frames[a] = [];
    for (let f = 0; f < def.n; f++) {
      const t = def.loop ? f / def.n : f / (def.n - 1);
      const cx = (i % cols) * fw, cy = Math.floor(i / cols) * fh;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(res, res);
      // la escala del outfit ya codifica la altura relativa entre personajes
      drawFigure(ctx, id, def.pose(t), FRAME_W * 0.45, FOOT_Y, scale * (h / h), 5);
      ctx.restore();
      frames[a].push(i);
      i++;
    }
  }
  return { canvas: cv, frames, res, cols };
}

/** La Sombra: figura de tinta con alas de levita (cuadros de "respiración"). */
export function buildSombra(res = 1): Sheet {
  const n = 6, fw = Math.ceil(320 * res), fh = Math.ceil(420 * res);
  const [cv, ctx] = makeCanvas(fw * n, fh);
  for (let f = 0; f < n; f++) {
    ctx.save();
    ctx.translate(f * fw, 0);
    ctx.scale(res, res);
    const k = new Ink(ctx, new Rng('sombra' + f), PALETTES.sombras);
    const b = Math.sin((f / n) * Math.PI * 2);
    // cuerpo
    k.shape([[160, 60], [220, 130 + b * 4], [250, 300], [215, 410], [105, 410], [70, 300], [100, 130 - b * 4]], '#111111', { w: 1.5, smooth: 2, fillAlpha: 0.92 } as any);
    // alas-levita
    k.shape([[100, 140], [10 - b * 10, 220], [40, 260], [20, 330 + b * 6], [90, 290]], '#111111', { w: 1, smooth: 1, fillAlpha: 0.85 } as any);
    k.shape([[220, 140], [310 + b * 10, 220], [280, 260], [300, 330 + b * 6], [230, 290]], '#111111', { w: 1, smooth: 1, fillAlpha: 0.85 } as any);
    // cabeza de ave
    k.ellipse(160, 70, 34, 38, '#111111', { w: 1 });
    k.shape([[180, 70], [232, 84], [182, 92]], '#2d2b28', { w: 1 });
    k.ellipse(172, 62, 4, 4, '#eee8da', { w: 0 });
    // goteo
    for (let i = 0; i < 6; i++) k.inkDrip(110 + i * 20, 400, 10 + ((i * 7 + f * 3) % 18), 6);
    ctx.restore();
  }
  return { canvas: cv, frames: { idle: [0, 1, 2, 3, 4, 5] }, res, cols: n };
}

/** Cuervo de tinta suelto (eventos). */
export function buildCrow(res = 1): HTMLCanvasElement {
  const [cv, ctx] = makeCanvas(Math.ceil(240 * res), Math.ceil(140 * res));
  ctx.scale(res, res);
  const k = new Ink(ctx, new Rng('crow'), PALETTES.sombras);
  crowSilhouette(k, 120, 80, 50, 0.95);
  return cv;
}

export { STAND };
