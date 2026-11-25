// Herramienta de QA visual: compone una sala completa (capas + luces + personaje) en un canvas.
import { renderRoom } from '../src/art/render';
import { newState } from '../src/systems/state';
import { drawFigure, STAND, walkPose, drawPortrait, actionPose } from '../src/art/characters';
import type { Era } from '../src/core/palette';

const q = new URLSearchParams(location.search);
const mode = q.get('mode') || 'room';

function composite(room: string, era: Era, w: number, scroll: number, chars: [string, number, number, number, any][] = []) {
  const s = newState();
  const r = renderRoom(room, era, s, w);
  const cv = document.createElement('canvas');
  cv.width = 1280; cv.height = 720;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#000'; c.fillRect(0, 0, 1280, 720);
  c.drawImage(r.far, -scroll * 0.85, 0);
  c.drawImage(r.back, -scroll, 0);
  for (const [id, x, y, sc, pose] of chars) drawFigure(c, id, pose, x - scroll, y, sc);
  c.globalCompositeOperation = 'multiply';
  c.drawImage(r.dark, -scroll, 0, r.w, r.h);
  c.globalCompositeOperation = 'source-over';
  c.drawImage(r.front, -scroll * 1.0, 0);
  document.body.appendChild(cv);
}

if (mode === 'room') {
  const room = q.get('room') || 'hall';
  const era = (q.get('era') || '1920') as Era;
  const w = Number(q.get('w') || 1920);
  const scroll = Number(q.get('scroll') || 320);
  composite(room, era, w, scroll, [['elena', Number(q.get('ex') || 1180), 660, 0.95, STAND]]);
} else if (mode === 'elena') {
  const cv = document.createElement('canvas');
  cv.width = 1280; cv.height = 720;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#ece2cc'; c.fillRect(0, 0, 1280, 720);
  drawFigure(c, 'elena', STAND, 230, 660, 2.0);
  const poses = [walkPose(0), walkPose(0.25), walkPose(0.5), walkPose(0.75)];
  poses.forEach((p, i) => drawFigure(c, 'elena', p, 520 + i * 110, 660, 1.0));
  drawFigure(c, 'elena', actionPose('read', 1), 520, 330, 0.9);
  drawFigure(c, 'elena', actionPose('pickup', 0.5), 640, 330, 0.9);
  drawFigure(c, 'elena', actionPose('use', 0.5), 760, 330, 0.9);
  drawFigure(c, 'elena', actionPose('react', 0.5), 880, 330, 0.9);
  const pc = document.createElement('canvas'); pc.width = 260; pc.height = 300;
  drawPortrait(pc.getContext('2d')!, 'elena', 260, 300);
  c.drawImage(pc, 1000, 40);
  ['anselmo', 'mercedes', 'rosa', 'isabel'].forEach((id, i) => drawFigure(c, id, STAND, 1010 + i * 65, 680, 0.55));
  document.body.appendChild(cv);
}
(window as any).__done = true;
