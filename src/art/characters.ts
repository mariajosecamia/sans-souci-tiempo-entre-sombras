// Personajes dibujados a tinta y aguada, por esqueleto paramétrico.
// Un mismo dibujante genera todos los cuadros de animación, así el personaje nunca cambia de cara.
import { Ink, Pt } from './ink';
import { Rng } from '../core/rng';
import { PALETTES, mix } from '../core/palette';

export interface Outfit {
  skin: string; hair: string; top: string; vest?: string; legs: string; sash?: string;
  boots: string; scarf?: string; bag?: string; braid?: boolean; bun?: boolean; short?: boolean;
  dress?: string; apron?: string; skirtLen?: number; height: number; build: number;
  beard?: boolean; grey?: boolean; ghost?: boolean; hat?: boolean;
}

export const OUTFITS: Record<string, Outfit> = {
  // Paleta oficial de Elena (definida por Ale).
  elena: {
    skin: '#ad7956', hair: '#211d1a', top: '#dfd2b7', vest: '#505a40', legs: '#80664c', sash: '#733e43',
    boots: '#49372b', scarf: '#733e43', bag: '#49372b', braid: true, height: 300, build: 1,
  },
  anselmo: {
    skin: '#9c7356', hair: '#8f8a80', top: '#cfc5ad', vest: '#3b362f', legs: '#4f463b',
    boots: '#2e2620', scarf: '#62694c', height: 296, build: 1.08, beard: true, grey: true, hat: true,
  },
  mercedes: {
    skin: '#d9bfa3', hair: '#e4ddd0', top: '#2a2522', legs: '#2a2522', boots: '#1d1a18', dress: '#2a2522',
    skirtLen: 1, height: 270, build: 0.95, bun: true, scarf: '#d8c8a9',
  },
  rosa: {
    skin: '#b98a66', hair: '#2b211b', top: '#6b6f7a', legs: '#6b6f7a', boots: '#2b2320', dress: '#55596a',
    apron: '#e8e0cf', skirtLen: 0.92, height: 282, build: 0.92, bun: true,
  },
  isabel: {
    skin: '#e9e2d6', hair: '#4a4038', top: '#f3efe6', legs: '#f3efe6', boots: '#c7c3b9', dress: '#f3efe6',
    skirtLen: 0.7, height: 200, build: 0.8, scarf: '#9fb3c8', ghost: true,
  },
};

export interface Pose {
  thighF: number; kneeF: number; thighB: number; kneeB: number; // radianes (0 = vertical)
  armF: number; elbowF: number; armB: number; elbowB: number;
  bob: number; lean: number; headTilt: number; braidSwing: number;
  reach?: number; crouch?: number;
}

export const STAND: Pose = { thighF: 0.04, kneeF: 0.02, thighB: -0.05, kneeB: 0.03, armF: 0.08, elbowF: -0.18, armB: -0.06, elbowB: -0.12, bob: 0, lean: 0, headTilt: 0, braidSwing: 0 };

export function walkPose(p: number): Pose {
  const a = Math.PI * 2 * p;
  const sw = Math.sin(a);
  return {
    thighF: 0.42 * sw,
    kneeF: 0.08 + 0.55 * Math.max(0, Math.sin(a - 1.1)),
    thighB: -0.42 * sw,
    kneeB: 0.08 + 0.55 * Math.max(0, Math.sin(a + Math.PI - 1.1)),
    armF: -0.32 * sw, elbowF: -0.3,
    armB: 0.32 * sw, elbowB: -0.3,
    bob: -Math.abs(Math.cos(a)) * 4 + 2,
    lean: 0.05,
    headTilt: 0.02,
    braidSwing: Math.sin(a + 0.8) * 0.12,
  };
}

export function idlePose(p: number): Pose {
  const b = Math.sin(Math.PI * 2 * p);
  return { ...STAND, bob: b * 1.2, armF: 0.08 + b * 0.02, braidSwing: b * 0.03, headTilt: b * 0.015 };
}

export function actionPose(kind: string, t: number): Pose {
  const e = Math.sin(Math.PI * Math.min(1, t)); // 0→1→0
  switch (kind) {
    case 'pickup':
      return { ...STAND, crouch: 0.55 * e, lean: 0.45 * e, thighF: 0.5 * e, kneeF: 0.9 * e, thighB: 0.2 * e, kneeB: 0.8 * e, armF: 0.9 * e + 0.1, elbowF: -0.1, headTilt: 0.25 * e };
    case 'use':
      return { ...STAND, armF: 1.35 * e + 0.08, elbowF: -0.25 * (1 - e) - 0.05, lean: 0.06 * e, headTilt: 0.05 };
    case 'examine':
      return { ...STAND, lean: 0.16 * e, headTilt: 0.18 * e, armF: 0.7 * e, elbowF: -1.6 * e - 0.2, armB: -0.05 };
    case 'read':
      return { ...STAND, armF: 0.55, elbowF: -1.75, armB: 0.45, elbowB: -1.5, headTilt: 0.28, lean: 0.03 };
    case 'react':
      return { ...STAND, lean: -0.14 * e, thighB: -0.22 * e, kneeB: 0.1, armF: 0.5 * e, elbowF: -1.9 * e, armB: 0.3 * e, elbowB: -1.4 * e, headTilt: -0.1 * e };
    case 'sit':
      return { ...STAND, thighF: 1.45, kneeF: -1.4, thighB: 1.4, kneeB: -1.35, armF: 0.6, elbowF: -1.2, armB: 0.5, elbowB: -1.1, crouch: 0 };
    default:
      return STAND;
  }
}

function sh(ink: Ink, pts: Pt[], col: string, o: any = {}): void {
  ink.shape(pts, col, { smooth: 2, shade: 0.42, shadeAngle: 0.3, jitter: 0.5, ...o });
}

/** Polígono de un miembro cónico entre p1 y p2. */
function limb(p1: Pt, p2: Pt, w1: number, w2: number): Pt[] {
  const dx = p2[0] - p1[0], dy = p2[1] - p1[1];
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L, ny = dx / L;
  const pts: Pt[] = [
    [p1[0] + nx * w1 / 2, p1[1] + ny * w1 / 2],
    [p2[0] + nx * w2 / 2, p2[1] + ny * w2 / 2],
  ];
  // punta redondeada
  for (let i = 1; i < 6; i++) {
    const a = Math.atan2(ny, nx) - (i / 6) * Math.PI;
    pts.push([p2[0] + Math.cos(a) * w2 / 2, p2[1] + Math.sin(a) * w2 / 2]);
  }
  pts.push([p2[0] - nx * w2 / 2, p2[1] - ny * w2 / 2], [p1[0] - nx * w1 / 2, p1[1] - ny * w1 / 2]);
  for (let i = 1; i < 6; i++) {
    const a = Math.atan2(-ny, -nx) - (i / 6) * Math.PI;
    pts.push([p1[0] + Math.cos(a) * w1 / 2, p1[1] + Math.sin(a) * w1 / 2]);
  }
  return pts;
}

/**
 * Dibuja una figura mirando a la derecha (3/4) con los pies en (ox, oy).
 * scale: 1 = altura del outfit en píxeles.
 */
export function drawFigure(ctx: CanvasRenderingContext2D, id: string, pose: Pose, ox: number, oy: number, scale = 1, seed = 7): void {
  const o = OUTFITS[id];
  const pal = PALETTES['1920'];
  const ink = new Ink(ctx, new Rng(seed), pal);
  const H = o.height * scale;
  const k = H / 300;           // unidad relativa a una figura de 300 px
  const B = o.build;
  const crouch = (pose.crouch ?? 0) * 60 * k;
  const sitting = pose.thighF > 1.2;
  const hipY = oy - 150 * k + crouch + pose.bob * k + (sitting ? 52 * k : 0);
  const hip: Pt = [ox, hipY];
  const thigh = 70 * k, shin = 70 * k;
  const lw = 1.3 * Math.max(0.6, k);

  const leg = (ta: number, ka: number): [Pt, Pt, Pt] => {
    const knee: Pt = [hip[0] + Math.sin(ta) * thigh, hip[1] + Math.cos(ta) * thigh];
    const sa = ta - ka;
    const ankle: Pt = [knee[0] + Math.sin(sa) * shin, knee[1] + Math.cos(sa) * shin];
    return [hip, knee, ankle];
  };
  const legF = leg(pose.thighF, pose.kneeF);
  const legB = leg(pose.thighB, pose.kneeB);

  // torso
  const lean = pose.lean;
  const torsoLen = 85 * k;
  const neck: Pt = [hip[0] + Math.sin(lean) * torsoLen, hip[1] - Math.cos(lean) * torsoLen];
  const shoulder: Pt = [neck[0] - 4 * k, neck[1] + 10 * k];
  const headC: Pt = [neck[0] + Math.sin(lean + pose.headTilt) * 24 * k + 2 * k, neck[1] - Math.cos(lean + pose.headTilt) * 24 * k];

  const arm = (sa: number, ea: number, dx: number): [Pt, Pt, Pt] => {
    const sh: Pt = [shoulder[0] + dx, shoulder[1]];
    const ua = 52 * k, fa = 50 * k;
    const elbow: Pt = [sh[0] + Math.sin(sa + lean) * ua, sh[1] + Math.cos(sa + lean) * ua];
    const fa2 = sa + lean - ea;
    const hand: Pt = [elbow[0] + Math.sin(fa2) * fa, elbow[1] + Math.cos(fa2) * fa];
    return [sh, elbow, hand];
  };
  const armF = arm(pose.armF, pose.elbowF, 4 * k);
  const armB = arm(pose.armB, pose.elbowB, -8 * k);

  const shade = (c: string, t = 0.28) => mix(c, '#1b1714', t);
  const alphaG = o.ghost ? 0.78 : 1;
  ctx.save();
  ctx.globalAlpha = alphaG;

  // ---- sombra en el piso
  ctx.save();
  ctx.globalAlpha = 0.28 * alphaG;
  ctx.fillStyle = '#1b1714';
  ctx.beginPath();
  ctx.ellipse(ox + 4 * k, oy, 38 * k * B, 7 * k, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ---- trenza (detrás)
  if (o.braid) {
    const bx = headC[0] - 16 * k, by = headC[1] + 6 * k;
    const pts: Pt[] = [];
    let a = 0.25 + pose.braidSwing - lean * 0.5;
    let x = bx, y = by;
    for (let i = 0; i < 9; i++) {
      pts.push([x, y]);
      x += Math.sin(a) * 9 * k;
      y += Math.cos(a) * 9 * k;
      a += 0.02 + pose.braidSwing * 0.3;
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const w = (9 - i * 0.5) * k;
      sh(ink, limb(pts[i], pts[i + 1], w, w * 0.9), o.hair, { w: lw * 0.7, alpha: 0.7 });
      ink.line(pts[i][0] - w / 2, pts[i][1], pts[i][0] + w / 2, pts[i][1] + 5 * k, { w: 0.6 * k, alpha: 0.4, color: '#5a5048', passes: 1 });
    }
    const end = pts[pts.length - 1];
    ink.ellipse(end[0], end[1] + 3 * k, 3 * k, 4 * k, o.scarf ?? o.sash ?? '#733e43', { w: lw * 0.6 });
    // mechones sueltos del final
    for (let i = 0; i < 4; i++) ink.line(end[0], end[1] + 6 * k, end[0] + (i - 1.5) * 3 * k, end[1] + 16 * k, { w: 0.8 * k, alpha: 0.7, color: o.hair, passes: 1, taper: true });
  }

  // ---- brazo de atrás
  drawArm(ink, armB, o, shade(o.top, 0.35), shade(o.skin, 0.3), k, lw);

  // ---- pierna de atrás
  drawLeg(ink, legB, o, true, k, lw, shade);

  // ---- falda / vestido (detrás de la pierna delantera para vestidos largos)
  const waist: Pt = [hip[0] + Math.sin(lean) * 18 * k, hip[1] - 16 * k];
  if (o.dress) {
    const len = (o.skirtLen ?? 1) * 148 * k;
    const hem = Math.min(oy - 4 * k, waist[1] + len);
    const swing = (pose.thighF - pose.thighB) * 14 * k;
    const sk: Pt[] = sitting ? [
      [waist[0] - 24 * k * B, waist[1]], [waist[0] + 22 * k * B, waist[1]],
      [legF[1][0] + 18 * k, legF[1][1] - 6 * k], [legF[1][0] + 16 * k, legF[2][1] - 8 * k],
      [legF[1][0] - 40 * k, legF[2][1] - 6 * k], [waist[0] - 30 * k, waist[1] + 50 * k],
    ] : [
      [waist[0] - 22 * k * B, waist[1]], [waist[0] + 20 * k * B, waist[1]],
      [waist[0] + 36 * k * B + swing, hem], [waist[0] + 8 * k, hem + 3 * k], [waist[0] - 40 * k * B + swing * 0.5, hem],
    ];
    sh(ink, sk, o.dress, { w: lw, alpha: 0.85, hatch: true });
    // pliegues
    for (let i = 0; i < 4; i++) {
      const fx = waist[0] - 14 * k + i * 10 * k;
      ink.line(fx, waist[1] + 20 * k, fx + (i - 1.5) * 6 * k + swing * 0.3, sitting ? waist[1] + 60 * k : hem - 6 * k, { w: 0.7 * k, alpha: 0.4, passes: 1, taper: true });
    }
    if (o.apron && !sitting) {
      const ap: Pt[] = [[waist[0] - 4 * k, waist[1] + 2 * k], [waist[0] + 22 * k, waist[1] + 2 * k], [waist[0] + 30 * k + swing, hem - 18 * k], [waist[0] - 2 * k + swing * 0.6, hem - 16 * k]];
      sh(ink, ap, o.apron, { w: lw * 0.8, alpha: 0.7 });
    }
  }

  // ---- pierna delantera
  if (!o.dress || sitting) drawLeg(ink, legF, o, false, k, lw, shade);
  else drawLeg(ink, legF, o, false, k, lw, shade, true);

  // ---- torso
  const tw = 46 * k * B;
  const chestFront = 4 * k;
  const torso: Pt[] = [
    [shoulder[0] - tw * 0.5, shoulder[1] - 2 * k],
    [shoulder[0] + tw * 0.42 + chestFront, shoulder[1] - 4 * k],
    [shoulder[0] + tw * 0.48 + chestFront + Math.sin(lean) * 10 * k, shoulder[1] + 34 * k],
    [waist[0] + tw * 0.36, waist[1]],
    [waist[0] - tw * 0.42, waist[1]],
    [shoulder[0] - tw * 0.55, shoulder[1] + 30 * k],
  ];
  sh(ink, torso, o.top, { w: lw, alpha: 0.85 });
  // chaleco (deja ver la blusa adelante)
  if (o.vest) {
    const vest: Pt[] = [
      [shoulder[0] - tw * 0.48, shoulder[1] + 2 * k],
      [shoulder[0] + tw * 0.16, shoulder[1] - 2 * k],
      [shoulder[0] + tw * 0.26, shoulder[1] + 26 * k],
      [waist[0] + tw * 0.22, waist[1] + 4 * k],
      [waist[0] - tw * 0.42, waist[1] + 2 * k],
      [shoulder[0] - tw * 0.54, shoulder[1] + 30 * k],
    ];
    sh(ink, vest, o.vest, { w: lw, alpha: 0.9 });
    ink.hatch(vest, -1.1, 5 * k + 2, { alpha: 0.16, w: 0.6 });
    // botones antiguos
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      const bxp = shoulder[0] + tw * (0.2 + 0.02 * t) + (waist[0] - shoulder[0]) * t;
      const byp = shoulder[1] + 10 * k + (waist[1] - shoulder[1] - 12 * k) * t;
      ink.ellipse(bxp, byp, 1.6 * k, 1.6 * k, '#a58a53', { w: 0.5 });
    }
  }
  // bordado de la blusa
  if (id === 'elena') {
    for (let i = 0; i < 5; i++) ink.ellipse(shoulder[0] + tw * 0.34 + chestFront * 0.5, shoulder[1] + 6 * k + i * 7 * k, 1.3 * k, 1 * k, undefined, { w: 0.5, alpha: 0.5, color: '#8a6a45' });
  }
  // faja
  if (o.sash) {
    const sash: Pt[] = [[waist[0] - tw * 0.44, waist[1] - 6 * k], [waist[0] + tw * 0.38, waist[1] - 7 * k], [waist[0] + tw * 0.4, waist[1] + 6 * k], [waist[0] - tw * 0.46, waist[1] + 7 * k]];
    sh(ink, sash, o.sash, { w: lw * 0.8, alpha: 0.9 });
    for (let i = 0; i < 3; i++) ink.line(waist[0] - tw * 0.4, waist[1] - 3 * k + i * 4 * k, waist[0] + tw * 0.36, waist[1] - 4 * k + i * 4 * k, { w: 0.5, alpha: 0.35, passes: 1, color: '#e2b8a0' });
    // flecos colgando del nudo
    for (let i = 0; i < 3; i++) ink.line(waist[0] - tw * 0.4, waist[1] + 4 * k, waist[0] - tw * 0.44 - i * 2 * k, waist[1] + 18 * k, { w: 1.2 * k, alpha: 0.7, color: o.sash, passes: 1, taper: true });
  }
  // bolso cruzado
  if (o.bag) {
    ink.stroke([[shoulder[0] + tw * 0.1, shoulder[1] - 2 * k], [waist[0] - tw * 0.1, waist[1] - 4 * k], [waist[0] - tw * 0.5, waist[1] + 10 * k]], { w: 3.2 * k, color: o.bag, alpha: 0.9, passes: 1 });
    const bgx = waist[0] - tw * 0.62, bgy = waist[1] + 6 * k;
    sh(ink, [[bgx - 12 * k, bgy], [bgx + 12 * k, bgy - 2 * k], [bgx + 14 * k, bgy + 26 * k], [bgx - 12 * k, bgy + 28 * k]], o.bag, { w: lw, alpha: 0.9 });
    ink.line(bgx - 12 * k, bgy + 8 * k, bgx + 13 * k, bgy + 6 * k, { w: 0.8 * k, alpha: 0.6, passes: 1 });
    ink.ellipse(bgx, bgy + 9 * k, 1.8 * k, 1.8 * k, '#a58a53', { w: 0.4 });
  }

  // ---- cuello + pañuelo
  sh(ink, limb([neck[0], neck[1] + 8 * k], [headC[0] - 2 * k, headC[1] + 12 * k], 13 * k, 12 * k), o.skin, { w: lw * 0.8, alpha: 0.7 });
  if (o.scarf) {
    const sc: Pt[] = [[neck[0] - 9 * k, neck[1] + 2 * k], [neck[0] + 10 * k, neck[1]], [neck[0] + 11 * k, neck[1] + 9 * k], [neck[0] - 9 * k, neck[1] + 10 * k]];
    sh(ink, sc, o.scarf, { w: lw * 0.8 });
    sh(ink, [[neck[0] + 6 * k, neck[1] + 8 * k], [neck[0] + 12 * k, neck[1] + 9 * k], [neck[0] + 9 * k, neck[1] + 22 * k], [neck[0] + 4 * k, neck[1] + 20 * k]], o.scarf, { w: lw * 0.7 });
  }

  // ---- cabeza
  drawHead(ink, o, headC, k, lw, pose.headTilt + lean);

  // ---- brazo delantero
  drawArm(ink, armF, o, o.top, o.skin, k, lw);

  ctx.restore();
}

function drawArm(ink: Ink, a: [Pt, Pt, Pt], o: Outfit, sleeve: string, skin: string, k: number, lw: number): void {
  const [shd, el, hand] = a;
  // manga (arremangada en Elena: el antebrazo queda desnudo)
  sh(ink, limb(shd, el, 15 * k, 13 * k), sleeve, { w: lw, alpha: 0.85 });
  const rolled = !!o.braid; // Elena
  if (rolled) {
    const mid: Pt = [el[0] + (hand[0] - el[0]) * 0.22, el[1] + (hand[1] - el[1]) * 0.22];
    sh(ink, limb(el, mid, 14 * k, 14 * k), mix(sleeve, '#ffffff', 0.08), { w: lw, alpha: 0.85 });
    sh(ink, limb(mid, hand, 10 * k, 8 * k), skin, { w: lw * 0.9, alpha: 0.75 });
  } else {
    sh(ink, limb(el, hand, 12 * k, 10 * k), o.dress ? o.dress : sleeve, { w: lw, alpha: 0.85 });
  }
  ink.ellipse(hand[0], hand[1] + 2 * k, 5.5 * k, 6.5 * k, skin, { w: lw * 0.8, alpha: 0.7 });
}

function drawLeg(ink: Ink, l: [Pt, Pt, Pt], o: Outfit, back: boolean, k: number, lw: number, shade: (c: string, t?: number) => string, onlyBoot = false): void {
  const [hip, knee, ankle] = l;
  const legCol = back ? shade(o.legs, 0.3) : o.legs;
  const bootCol = back ? shade(o.boots, 0.25) : o.boots;
  if (!onlyBoot) {
    if (o.braid) {
      // bombachas: anchas en el muslo y la rodilla, recogidas en la bota
      sh(ink, limb(hip, knee, 34 * k, 30 * k), legCol, { w: lw, alpha: 0.85 });
      const calf: Pt = [knee[0] + (ankle[0] - knee[0]) * 0.55, knee[1] + (ankle[1] - knee[1]) * 0.55];
      sh(ink, limb(knee, calf, 30 * k, 24 * k), legCol, { w: lw, alpha: 0.85 });
      // pliegues
      ink.line(hip[0] + 4 * k, hip[1] + 20 * k, knee[0] - 2 * k, knee[1] - 4 * k, { w: 0.7 * k, alpha: 0.35, passes: 1, taper: true });
      ink.line(knee[0] - 8 * k, knee[1] + 6 * k, calf[0] + 6 * k, calf[1] - 4 * k, { w: 0.7 * k, alpha: 0.35, passes: 1, taper: true });
    } else {
      sh(ink, limb(hip, knee, 24 * k, 20 * k), legCol, { w: lw, alpha: 0.85 });
      sh(ink, limb(knee, ankle, 20 * k, 15 * k), legCol, { w: lw, alpha: 0.85 });
    }
  }
  // bota hasta media pantorrilla
  const top: Pt = [knee[0] + (ankle[0] - knee[0]) * 0.45, knee[1] + (ankle[1] - knee[1]) * 0.45];
  sh(ink, limb(top, ankle, (o.braid ? 19 : 15) * k, 14 * k), bootCol, { w: lw, alpha: 0.95 });
  // pie
  const foot: Pt[] = [[ankle[0] - 7 * k, ankle[1] - 6 * k], [ankle[0] + 8 * k, ankle[1] - 6 * k], [ankle[0] + 24 * k, ankle[1] + 3 * k], [ankle[0] + 22 * k, ankle[1] + 8 * k], [ankle[0] - 8 * k, ankle[1] + 8 * k]];
  sh(ink, foot, bootCol, { w: lw, alpha: 0.95 });
  ink.line(top[0] - 9 * k, top[1] + 2 * k, top[0] + 9 * k, top[1], { w: 1 * k, alpha: 0.5, passes: 1 });
}

function drawHead(ink: Ink, o: Outfit, c: Pt, k: number, lw: number, tilt: number): void {
  const r = 17.5 * k;
  const [cx, cy] = c;
  const ctx = ink.ctx;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt * 0.5);
  ctx.translate(-cx, -cy);
  // cara (3/4 hacia la derecha): óvalo con mentón marcado
  const face: Pt[] = [];
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    let rx = r * 0.9, ry = r * 1.12;
    if (a > 5.6 || a < 1.3) { rx *= 1.16; }
    face.push([cx + Math.cos(a) * rx + (Math.sin(a) > 0.6 ? 2 * k : 0), cy + Math.sin(a) * ry]);
  }
  sh(ink, face, o.skin, { w: lw, alpha: 0.75 });
  // pómulo y sombra lateral
  ink.blot(cx + 6 * k, cy + 5 * k, 5 * k, mix(o.skin, '#8a4a3a', 0.4), 0.18, 10);
  ink.blot(cx - 12 * k, cy + 4 * k, 8 * k, mix(o.skin, '#1b1714', 0.4), 0.22, 10);
  const kf = k * 0.875;
  // rasgos
  const eyeY = cy - 1 * kf;
  const ghost = !!o.ghost;
  const featCol = ghost ? '#5f5c56' : '#211d1a';
  ink.line(cx + 3 * kf, eyeY - 6 * kf, cx + 10 * kf, eyeY - 7 * kf, { w: 1.6 * kf, alpha: 0.85, color: o.grey ? '#cfc8bb' : featCol, passes: 1, taper: true }); // ceja
  ink.line(cx + 13 * kf, eyeY - 6 * kf, cx + 17 * kf, eyeY - 6 * kf, { w: 1.2 * kf, alpha: 0.7, color: featCol, passes: 1, taper: true });
  const eye = (ex: number, ew: number) => {
    ink.stroke([[ex - ew, eyeY], [ex, eyeY - 1.6 * kf], [ex + ew, eyeY - 0.3 * kf]], { w: 1.3 * kf, color: featCol, alpha: 0.9, passes: 1, jitter: 0.2 });
    ink.blot(ex + 0.3 * kf, eyeY + 0.2 * kf, 1.3 * kf, ghost ? '#c7c3b9' : '#1e1a17', 0.95, 6);
  };
  eye(cx + 7 * kf, 3 * kf);
  eye(cx + 15.5 * kf, 2 * kf);
  ink.stroke([[cx + 16 * kf, eyeY + 1 * kf], [cx + 21 * kf, eyeY + 9 * kf], [cx + 17 * kf, eyeY + 10.5 * kf]], { w: 1 * kf, alpha: 0.7, color: featCol, passes: 1 }); // nariz
  ink.stroke([[cx + 9 * kf, cy + 15 * kf], [cx + 13 * kf, cy + 15.5 * kf], [cx + 16 * kf, cy + 14.5 * kf]], { w: 1.1 * kf, alpha: 0.7, color: mix(o.skin, '#5a2a24', 0.6), passes: 1, taper: true }); // boca
  if (o.beard) {
    ink.blot(cx + 6 * kf, cy + 16 * kf, 9 * kf, '#b8b2a6', 0.55, 12);
    ink.stroke([[cx + 6 * kf, cy + 11 * kf], [cx + 18 * kf, cy + 11 * kf]], { w: 2.6 * kf, color: '#d8d2c6', alpha: 0.9, passes: 1, taper: true });
  }
  // oreja
  ink.ellipse(cx - 6 * k, cy + 2 * k, 3 * k, 5 * k, mix(o.skin, '#1b1714', 0.15), { w: lw * 0.7 });
  // pelo
  const hairPts: Pt[] = [
    [cx - r * 1.02, cy + 6 * k], [cx - r * 1.05, cy - r * 0.6], [cx - r * 0.5, cy - r * 1.18], [cx + r * 0.3, cy - r * 1.2],
    [cx + r * 0.95, cy - r * 0.75], [cx + r * 0.75, cy - r * 0.55], [cx + r * 0.1, cy - r * 0.72], [cx - r * 0.2, cy - r * 0.45],
    [cx - r * 0.42, cy + 4 * k], [cx - r * 0.65, cy + 12 * k],
  ];
  if (o.hat) {
    sh(ink, [[cx - r * 1.3, cy - r * 0.62], [cx + r * 1.3, cy - r * 0.7], [cx + r * 1.2, cy - r * 0.5], [cx - r * 1.25, cy - r * 0.42]], '#3b362f', { w: lw });
    sh(ink, [[cx - r * 0.8, cy - r * 0.6], [cx - r * 0.75, cy - r * 1.35], [cx + r * 0.75, cy - r * 1.38], [cx + r * 0.8, cy - r * 0.66]], '#3b362f', { w: lw });
    ink.line(cx - r * 0.78, cy - r * 0.8, cx + r * 0.78, cy - r * 0.84, { w: 2.2 * k, color: '#62694c', passes: 1 });
    sh(ink, [[cx - r * 1.0, cy - r * 0.45], [cx - r * 0.5, cy - r * 0.48], [cx - r * 0.42, cy + 2 * k], [cx - r * 0.9, cy + 6 * k]], o.hair, { w: lw * 0.7, alpha: 0.8 });
  } else {
    sh(ink, hairPts, o.hair, { w: lw, alpha: 0.95 });
    // mechones
    for (let i = 0; i < 6; i++) {
      const a = Math.PI * 1.1 + i * 0.25;
      ink.line(cx + Math.cos(a) * r * 0.4, cy + Math.sin(a) * r * 0.4 - 6 * k, cx + Math.cos(a) * r * 1.05, cy + Math.sin(a) * r * 1.08, { w: 0.7 * k, alpha: 0.4, color: '#6a5d52', passes: 1, taper: true });
    }
    if (o.braid) {
      // mechón suelto sobre la frente y la sien
      ink.stroke([[cx + r * 0.3, cy - r * 0.9], [cx + r * 0.6, cy - r * 0.2], [cx + r * 0.45, cy + r * 0.2]], { w: 1.1 * k, color: o.hair, alpha: 0.85, passes: 1, taper: true });
    }
    if (o.bun) ink.ellipse(cx - r * 0.85, cy - r * 0.55, r * 0.42, r * 0.38, o.hair, { w: lw });
  }
  ctx.restore();
}

/** Lámina: retrato de busto para los diálogos (recorte ampliado de la figura). */
export function drawPortrait(ctx: CanvasRenderingContext2D, id: string, w: number, h: number): void {
  const o = OUTFITS[id];
  const sc = (h * 2.3) / o.height;
  // fondo de papel
  ctx.fillStyle = '#e6dcc6';
  ctx.fillRect(0, 0, w, h);
  const g = ctx.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h / 2, w * 0.8);
  g.addColorStop(0, 'rgba(255,248,230,0.5)');
  g.addColorStop(1, 'rgba(73,57,45,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const pose = id === 'mercedes' ? { ...STAND, headTilt: 0.02 } : STAND;
  drawFigure(ctx, id, pose, w * 0.42, h + o.height * sc * 0.6, sc, 11);
}
