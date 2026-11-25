// Ink — pequeño motor de ilustración procedural en Canvas 2D.
// Simula tinta (contornos temblorosos, varias pasadas), aguadas de acuarela
// (rellenos superpuestos con bordes oscurecidos y granulado), tramado y manchas.
// Todo es determinista (Rng con semilla) para que cada escena se vea siempre igual.
import { Rng } from '../core/rng';
import { Palette, rgba, mix } from '../core/palette';

export type Pt = [number, number];

export interface StrokeOpts {
  w?: number;
  color?: string;
  alpha?: number;
  jitter?: number;
  passes?: number;
  closed?: boolean;
  taper?: boolean;
}

export class Ink {
  constructor(public ctx: CanvasRenderingContext2D, public rng: Rng, public pal: Palette) {}

  // ---------- trazos ----------
  private wobble(points: Pt[], jitter: number, closed: boolean): Pt[] {
    const out: Pt[] = [];
    const pts = closed ? [...points, points[0]] : points;
    for (let i = 0; i < pts.length - 1; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[i + 1];
      const len = Math.hypot(x2 - x1, y2 - y1);
      const n = Math.max(1, Math.round(len / 22));
      const nx = -(y2 - y1) / (len || 1), ny = (x2 - x1) / (len || 1);
      let off = this.rng.range(-jitter, jitter) * 0.5;
      for (let j = 0; j < n; j++) {
        const t = j / n;
        off = off * 0.6 + this.rng.range(-jitter, jitter) * 0.4;
        out.push([x1 + (x2 - x1) * t + nx * off, y1 + (y2 - y1) * t + ny * off]);
      }
    }
    const last = pts[pts.length - 1];
    out.push([last[0] + this.rng.range(-jitter, jitter) * 0.3, last[1] + this.rng.range(-jitter, jitter) * 0.3]);
    return out;
  }

  stroke(points: Pt[], o: StrokeOpts = {}): void {
    const c = this.ctx;
    const w = o.w ?? 1.6, color = o.color ?? this.pal.ink, alpha = o.alpha ?? 0.85;
    const jitter = o.jitter ?? 1.2, passes = o.passes ?? 2;
    c.save();
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = color;
    for (let p = 0; p < passes; p++) {
      const wp = this.wobble(points, jitter, !!o.closed);
      c.globalAlpha = alpha * (p === 0 ? 1 : 0.45);
      if (o.taper) {
        for (let i = 0; i < wp.length - 1; i++) {
          const t = i / (wp.length - 1);
          c.lineWidth = Math.max(0.3, w * (p === 0 ? 1 : 0.6) * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.08)));
          c.beginPath();
          c.moveTo(wp[i][0], wp[i][1]);
          c.lineTo(wp[i + 1][0], wp[i + 1][1]);
          c.stroke();
        }
      } else {
        c.lineWidth = w * (p === 0 ? 1 : 0.6) * this.rng.range(0.85, 1.1);
        c.beginPath();
        c.moveTo(wp[0][0], wp[0][1]);
        for (let i = 1; i < wp.length; i++) c.lineTo(wp[i][0], wp[i][1]);
        c.stroke();
      }
    }
    c.restore();
  }

  line(x1: number, y1: number, x2: number, y2: number, o: StrokeOpts = {}): void {
    this.stroke([[x1, y1], [x2, y2]], o);
  }

  rectLine(x: number, y: number, w: number, h: number, o: StrokeOpts = {}): void {
    this.stroke([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], { ...o, closed: true });
  }

  // ---------- rellenos ----------
  fillPoly(points: Pt[], color: string, alpha = 1): void {
    const c = this.ctx;
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i++) c.lineTo(points[i][0], points[i][1]);
    c.closePath();
    c.fill();
    c.restore();
  }

  /** Aguada tipo acuarela: base + capas irregulares + borde oscurecido + granulado. */
  wash(points: Pt[], color: string, alpha = 1, opts: { grain?: number; edge?: number; layers?: number } = {}): void {
    const c = this.ctx;
    this.fillPoly(points, color, alpha);
    const layers = opts.layers ?? 3;
    const dark = mix(color, this.pal.ink, 0.35);
    const light = mix(color, this.pal.paper, 0.25);
    const bb = bbox(points);
    c.save();
    clipPoly(c, points);
    for (let i = 0; i < layers; i++) {
      // manchas de pigmento dentro de la forma
      const n = Math.ceil((bb.w * bb.h) / 18000) + 1;
      for (let j = 0; j < n; j++) {
        const cx = this.rng.range(bb.x, bb.x + bb.w), cy = this.rng.range(bb.y, bb.y + bb.h);
        const r = this.rng.range(20, Math.max(30, Math.min(bb.w, bb.h) * 0.6));
        const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
        const col = this.rng.chance(0.5) ? dark : light;
        g.addColorStop(0, rgba(col, 0.10 * alpha));
        g.addColorStop(1, rgba(col, 0));
        c.fillStyle = g;
        c.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
    }
    // borde oscurecido (acumulación de pigmento)
    const edge = opts.edge ?? 0.35;
    if (edge > 0) {
      c.globalAlpha = edge * alpha;
      c.strokeStyle = dark;
      c.lineWidth = 5;
      c.shadowColor = dark;
      c.shadowBlur = 6;
      c.beginPath();
      c.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i++) c.lineTo(points[i][0], points[i][1]);
      c.closePath();
      c.stroke();
      c.shadowBlur = 0;
    }
    c.restore();
    const grain = opts.grain ?? 0.5;
    if (grain > 0) this.grainIn(points, dark, grain * alpha);
  }

  washRect(x: number, y: number, w: number, h: number, color: string, alpha = 1, opts = {}): void {
    this.wash([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], color, alpha, opts);
  }

  grainIn(points: Pt[], color: string, amount = 0.5): void {
    const c = this.ctx;
    const bb = bbox(points);
    const n = Math.floor((bb.w * bb.h) / 260 * amount);
    c.save();
    clipPoly(c, points);
    c.fillStyle = color;
    for (let i = 0; i < n; i++) {
      c.globalAlpha = this.rng.range(0.04, 0.16);
      const s = this.rng.range(0.6, 1.8);
      c.fillRect(this.rng.range(bb.x, bb.x + bb.w), this.rng.range(bb.y, bb.y + bb.h), s, s);
    }
    c.restore();
  }

  /** Tramado a pluma dentro de un polígono. */
  hatch(points: Pt[], angle = -0.8, spacing = 7, o: StrokeOpts = {}): void {
    const c = this.ctx;
    const bb = bbox(points);
    c.save();
    clipPoly(c, points);
    const diag = Math.hypot(bb.w, bb.h);
    const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2;
    const ca = Math.cos(angle), sa = Math.sin(angle);
    for (let d = -diag / 2; d < diag / 2; d += spacing * this.rng.range(0.8, 1.25)) {
      const px = cx - sa * d, py = cy + ca * d;
      const x1 = px - ca * diag / 2, y1 = py - sa * diag / 2;
      const x2 = px + ca * diag / 2, y2 = py + sa * diag / 2;
      this.stroke([[x1, y1], [x2, y2]], { w: o.w ?? 0.7, alpha: o.alpha ?? 0.35, color: o.color, jitter: 0.8, passes: 1 });
    }
    c.restore();
  }

  hatchRect(x: number, y: number, w: number, h: number, angle = -0.8, spacing = 7, o: StrokeOpts = {}): void {
    this.hatch([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], angle, spacing, o);
  }

  /** Mancha irregular (humedad, tinta, moho). */
  blot(cx: number, cy: number, r: number, color: string, alpha = 0.4, spikes = 14): void {
    const pts: Pt[] = [];
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * Math.PI * 2;
      const rr = r * this.rng.range(0.55, 1.15);
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * this.rng.range(0.7, 1)]);
    }
    const c = this.ctx;
    c.save();
    c.globalAlpha = alpha;
    c.fillStyle = color;
    c.shadowColor = color;
    c.shadowBlur = r * 0.4;
    c.beginPath();
    // curva suave por puntos medios
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
      if (i === 0) c.moveTo(mx, my); else c.quadraticCurveTo(p[0], p[1], mx, my);
    }
    c.quadraticCurveTo(pts[0][0], pts[0][1], (pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
    c.fill();
    c.restore();
  }

  /** Mancha de humedad con aureola (borde más oscuro, centro más claro). */
  dampStain(cx: number, cy: number, r: number, color: string, alpha = 0.35): void {
    this.blot(cx, cy, r, color, alpha * 0.5, 18);
    this.blot(cx + this.rng.range(-r * 0.2, r * 0.2), cy + this.rng.range(-r * 0.1, r * 0.2), r * 0.7, color, alpha * 0.35, 16);
    const c = this.ctx;
    c.save();
    c.globalAlpha = alpha * 0.6;
    c.strokeStyle = mix(color, this.pal.ink, 0.3);
    c.lineWidth = 1.2;
    c.beginPath();
    const n = 20;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * (0.95 + 0.2 * Math.sin(a * 3 + cx));
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr * 0.85;
      if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
    }
    c.stroke();
    c.restore();
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, fill?: string, o: StrokeOpts & { fillAlpha?: number } = {}): Pt[] {
    const pts: Pt[] = [];
    const n = Math.max(12, Math.round((rx + ry) / 4));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    if (fill) this.wash(pts, fill, o.fillAlpha ?? 1, { grain: 0.3 });
    if (o.w !== 0) this.stroke(pts, { ...o, closed: true });
    return pts;
  }

  /** Bloque relleno + contorno: la unidad básica de mueble/arquitectura. */
  box(x: number, y: number, w: number, h: number, fill: string, o: StrokeOpts & { fillAlpha?: number; hatch?: boolean; shade?: number } = {}): void {
    const pts: Pt[] = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
    this.wash(pts, fill, o.fillAlpha ?? 1);
    if (o.shade) this.shadeIn(pts, o.shade, 0);
    if (o.hatch) this.hatch(pts, -0.9, 6, { alpha: 0.18 });
    if (o.w !== 0) this.stroke(pts, { ...o, closed: true });
  }

  shape(points: Pt[], fill: string, o: StrokeOpts & { fillAlpha?: number; hatch?: boolean; smooth?: number; shade?: number; shadeAngle?: number } = {}): void {
    const pts = o.smooth ? smooth(points, o.smooth) : points;
    this.wash(pts, fill, o.fillAlpha ?? 1);
    if (o.shade) this.shadeIn(pts, o.shade, o.shadeAngle ?? 0);
    if (o.hatch) this.hatch(pts, -0.9, 6, { alpha: 0.18 });
    if (o.w !== 0) this.stroke(pts, { ...o, closed: true });
  }

  /** Sombreado de volumen: degradé oscuro desde un lado de la forma (luz desde la derecha por defecto). */
  shadeIn(points: Pt[], amount = 0.4, angle = 0): void {
    const c = this.ctx;
    const bb = bbox(points);
    const cx = bb.x + bb.w / 2, cy = bb.y + bb.h / 2;
    const r = Math.max(bb.w, bb.h) / 2;
    const dx = Math.cos(angle) * r, dy = Math.sin(angle) * r;
    const g = c.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    g.addColorStop(0, rgba(this.pal.shadow, amount));
    g.addColorStop(0.55, rgba(this.pal.shadow, amount * 0.15));
    g.addColorStop(1, rgba(this.pal.paper, amount * 0.25));
    c.save();
    clipPoly(c, points);
    c.fillStyle = g;
    c.fillRect(bb.x - 2, bb.y - 2, bb.w + 4, bb.h + 4);
    c.restore();
  }

  /** Gradiente vertical suave (cielos, penumbras de pared). */
  vgrad(x: number, y: number, w: number, h: number, stops: [number, string, number][]): void {
    const c = this.ctx;
    const g = c.createLinearGradient(0, y, 0, y + h);
    for (const [t, col, a] of stops) g.addColorStop(t, rgba(col, a));
    c.save();
    c.fillStyle = g;
    c.fillRect(x, y, w, h);
    c.restore();
  }

  radial(cx: number, cy: number, r: number, color: string, a0: number, a1 = 0): void {
    const c = this.ctx;
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rgba(color, a0));
    g.addColorStop(1, rgba(color, a1));
    c.save();
    c.fillStyle = g;
    c.fillRect(cx - r, cy - r, r * 2, r * 2);
    c.restore();
  }

  /** Arco de medio punto como lista de puntos (ventanas, puertas). */
  archPts(x: number, y: number, w: number, h: number, steps = 16): Pt[] {
    const r = w / 2;
    const pts: Pt[] = [[x, y + h]];
    for (let i = 0; i <= steps; i++) {
      const a = Math.PI + (i / steps) * Math.PI;
      pts.push([x + r + Math.cos(a) * r, y + r + Math.sin(a) * r]);
    }
    pts.push([x + w, y + h]);
    return pts;
  }

  /** Grieta ramificada. */
  crack(x: number, y: number, len: number, angle: number, o: StrokeOpts = {}, depth = 0): void {
    const pts: Pt[] = [[x, y]];
    let cx = x, cy = y, a = angle;
    const segs = Math.max(3, Math.round(len / 12));
    for (let i = 0; i < segs; i++) {
      a += this.rng.range(-0.5, 0.5);
      cx += Math.cos(a) * (len / segs);
      cy += Math.sin(a) * (len / segs);
      pts.push([cx, cy]);
      if (depth < 2 && this.rng.chance(0.18)) this.crack(cx, cy, len * 0.4, a + this.rng.range(-1, 1), o, depth + 1);
    }
    this.stroke(pts, { w: (o.w ?? 1) * (depth ? 0.6 : 1), alpha: o.alpha ?? 0.6, jitter: 0.3, passes: 1, taper: true, color: o.color });
  }

  /** Telaraña en una esquina. corner: 'tl' | 'tr'. */
  cobweb(x: number, y: number, size: number, corner: 'tl' | 'tr', alpha = 0.35): void {
    const sx = corner === 'tl' ? 1 : -1;
    const spokes = 6;
    const ends: Pt[] = [];
    for (let i = 0; i < spokes; i++) {
      const a = (i / (spokes - 1)) * (Math.PI / 2);
      const ex = x + sx * Math.cos(a) * size, ey = y + Math.sin(a) * size;
      ends.push([ex, ey]);
      this.line(x, y, ex, ey, { w: 0.5, alpha, color: this.pal.paper, jitter: 0.4, passes: 1 });
    }
    for (let r = 0.25; r <= 1; r += 0.22) {
      const ring: Pt[] = ends.map(([ex, ey]) => [x + (ex - x) * r, y + (ey - y) * r + 3 * r] as Pt);
      this.stroke(ring, { w: 0.5, alpha: alpha * 0.9, color: this.pal.paper, jitter: 0.6, passes: 1 });
    }
  }

  /** Mata de musgo / hierba sobre una línea base. */
  moss(x: number, y: number, w: number, h = 14, color?: string): void {
    const col = color ?? this.pal.plant;
    for (let i = 0; i < w / 5; i++) {
      const px = x + this.rng.range(0, w), r = this.rng.range(3, h * 0.6);
      this.blot(px, y - r * 0.3, r, this.rng.chance(0.5) ? col : mix(col, this.pal.ink, 0.3), 0.5, 8);
    }
    for (let i = 0; i < w / 9; i++) {
      const px = x + this.rng.range(0, w);
      this.stroke([[px, y], [px + this.rng.range(-4, 4), y - this.rng.range(h * 0.5, h * 1.4)]], {
        w: 0.8, alpha: 0.55, color: mix(col, this.pal.ink, 0.4), passes: 1, taper: true,
      });
    }
  }

  /** Enredadera colgante. */
  vine(x: number, y: number, len: number, color?: string): void {
    const col = color ?? this.pal.plant;
    const pts: Pt[] = [];
    let cx = x, cy = y;
    for (let i = 0; i < len / 10; i++) {
      cx += this.rng.range(-4, 4);
      cy += 10;
      pts.push([cx, cy]);
      if (this.rng.chance(0.6)) this.blot(cx + this.rng.range(-6, 6), cy, this.rng.range(2.5, 5), col, 0.65, 7);
    }
    this.stroke([[x, y], ...pts], { w: 0.9, alpha: 0.6, color: mix(col, this.pal.ink, 0.5), passes: 1 });
  }

  /** Goteo de tinta desde arriba (anomalía). */
  inkDrip(x: number, y: number, len: number, w = 6): void {
    const c = this.ctx;
    c.save();
    c.fillStyle = this.pal.ink;
    c.globalAlpha = 0.85;
    c.beginPath();
    c.moveTo(x - w / 2, y);
    c.bezierCurveTo(x - w / 2, y + len * 0.6, x - w * 0.25, y + len * 0.85, x - w * 0.35, y + len);
    c.arc(x, y + len, w * 0.4, Math.PI, 0, true);
    c.bezierCurveTo(x + w * 0.25, y + len * 0.85, x + w / 2, y + len * 0.6, x + w / 2, y);
    c.closePath();
    c.fill();
    c.restore();
  }

  /** Papel tapiz con motivo de rombos/flores, recortado al área. */
  wallpaper(x: number, y: number, w: number, h: number, base: string, motif: string, step = 46): void {
    this.washRect(x, y, w, h, base, 1, { grain: 0.4, edge: 0 });
    const c = this.ctx;
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    for (let yy = y + step / 2; yy < y + h; yy += step) {
      for (let xx = x + ((Math.round((yy - y) / step) % 2) * step) / 2; xx < x + w + step; xx += step) {
        // pequeño motivo floral: cuatro pétalos y un punto
        c.globalAlpha = 0.22;
        c.fillStyle = motif;
        for (let k = 0; k < 4; k++) {
          const a = (k * Math.PI) / 2 + 0.3;
          c.beginPath();
          c.ellipse(xx + Math.cos(a) * 4, yy + Math.sin(a) * 4, 3.4, 1.6, a, 0, Math.PI * 2);
          c.fill();
        }
        c.globalAlpha = 0.14;
        c.strokeStyle = motif;
        c.lineWidth = 0.8;
        c.beginPath();
        c.moveTo(xx, yy - step / 2 + 6);
        c.quadraticCurveTo(xx + 8, yy - step / 4, xx, yy - 7);
        c.stroke();
      }
    }
    c.restore();
  }

  /** Piso en perspectiva (un punto de fuga en vpX). */
  floorPerspective(x0: number, x1: number, yTop: number, yBot: number, vpX: number, vpY: number, color: string, kind: 'parquet' | 'tiles' | 'stone' | 'boards' = 'parquet'): void {
    const pts: Pt[] = [[x0, yTop], [x1, yTop], [x1, yBot], [x0, yBot]];
    this.wash(pts, color, 1, { grain: 0.7, edge: 0 });
    const c = this.ctx;
    c.save();
    clipPoly(c, pts);
    const dark = mix(color, this.pal.ink, 0.45);
    // líneas que fugan
    const spacing = kind === 'tiles' ? 90 : kind === 'stone' ? 120 : 60;
    for (let bx = x0 - 2000; bx < x1 + 2000; bx += spacing) {
      const t = (yTop - vpY) / (yBot - vpY);
      const topX = vpX + (bx - vpX) * t;
      this.line(topX, yTop, bx, yBot, { w: 0.8, alpha: 0.28, color: dark, passes: 1, jitter: 0.8 });
    }
    // líneas horizontales (espaciadas por perspectiva)
    let yy = yTop;
    let step = kind === 'boards' ? 6 : 10;
    while (yy < yBot) {
      this.line(x0, yy, x1, yy, { w: 0.7, alpha: kind === 'boards' ? 0.12 : 0.25, color: dark, passes: 1, jitter: 0.6 });
      yy += step;
      step *= kind === 'stone' ? 1.35 : 1.22;
    }
    if (kind === 'tiles') {
      // ajedrezado tenue
      c.globalAlpha = 0.12;
    }
    c.restore();
  }
}

export function bbox(points: Pt[]): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) {
    if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Suavizado de Chaikin para contornos orgánicos. */
export function smooth(points: Pt[], iterations = 2): Pt[] {
  let pts = points;
  for (let it = 0; it < iterations; it++) {
    const out: Pt[] = [];
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i], q = pts[(i + 1) % pts.length];
      out.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25], [p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
    }
    pts = out;
  }
  return pts;
}

export function clipPoly(c: CanvasRenderingContext2D, points: Pt[]): void {
  c.beginPath();
  c.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) c.lineTo(points[i][0], points[i][1]);
  c.closePath();
  c.clip();
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d')!;
  return [cv, ctx];
}
