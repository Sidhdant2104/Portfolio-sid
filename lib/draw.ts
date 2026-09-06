/**
 * Hand-drawing primitives for 2D canvases.
 *
 * Everything the world is surfaced with — walls, floors, signs, posters,
 * screens — is drawn at runtime with these helpers rather than shipped as
 * image assets. That keeps the whole environment a few kilobytes of code, lets
 * every surface be generated at the right resolution for its size, and (most
 * importantly) means the linework can carry real hand-drawn tells: wobble,
 * corner overshoot, doubled strokes and uneven pressure.
 */

import { makeRng } from './rand';

export type Ctx = CanvasRenderingContext2D;

export interface StrokeOptions {
  color?: string;
  width?: number;
  /** Peak perpendicular deviation of the line, in pixels. */
  wobble?: number;
  /** How far the stroke runs past each end, in pixels. Hand-drawn corners overshoot. */
  overshoot?: number;
  /** Number of overlaid strokes. 2 gives the doubled-pencil look. */
  passes?: number;
  alpha?: number;
  seed?: number;
  /** Subdivisions along the line. More = looser, wavier line. */
  steps?: number;
}

const DEFAULTS: Required<Omit<StrokeOptions, 'seed'>> = {
  color: '#23201c',
  width: 1.6,
  wobble: 1.2,
  overshoot: 0,
  passes: 1,
  alpha: 0.9,
  steps: 10,
};

/**
 * A straight-ish line drawn as if by hand: deviates from true, varies in
 * pressure along its length, and can overshoot its endpoints.
 */
export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, opts: StrokeOptions = {}) {
  const o = { ...DEFAULTS, ...opts };
  const seed = opts.seed ?? 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  // Unit vectors along and perpendicular to the line.
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  for (let pass = 0; pass < o.passes; pass++) {
    const rng = makeRng(seed * 7919 + pass * 104729);
    // Extra passes sit slightly off-register and lighter, like a re-traced line.
    const passOff = pass === 0 ? 0 : (rng() - 0.5) * o.width * 1.5;
    const ax = x1 - ux * o.overshoot * (0.6 + rng() * 0.8);
    const ay = y1 - uy * o.overshoot * (0.6 + rng() * 0.8);
    const bx = x2 + ux * o.overshoot * (0.6 + rng() * 0.8);
    const by = y2 + uy * o.overshoot * (0.6 + rng() * 0.8);

    ctx.save();
    ctx.strokeStyle = o.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = o.alpha * (pass === 0 ? 1 : 0.45);
    ctx.lineWidth = o.width * (pass === 0 ? 1 : 0.8);
    ctx.beginPath();

    const steps = Math.max(2, o.steps);
    // Two offset control values per pass give a low-frequency bow plus
    // higher-frequency tremor, which is roughly how a real stroke deviates.
    const bow = (rng() - 0.5) * o.wobble * 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const arch = Math.sin(t * Math.PI) * bow;
      const tremor = (rng() - 0.5) * o.wobble;
      const off = arch + tremor + passOff;
      const x = ax + (bx - ax) * t + px * off;
      const y = ay + (by - ay) * t + py * off;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

/** A rectangle drawn as four independent overshooting strokes. */
export function rect(ctx: Ctx, x: number, y: number, w: number, h: number, opts: StrokeOptions = {}) {
  const seed = opts.seed ?? 1;
  const o: StrokeOptions = { overshoot: Math.min(w, h) * 0.02 + 2, ...opts };
  line(ctx, x, y, x + w, y, { ...o, seed: seed * 3 + 1 });
  line(ctx, x + w, y, x + w, y + h, { ...o, seed: seed * 3 + 2 });
  line(ctx, x + w, y + h, x, y + h, { ...o, seed: seed * 3 + 3 });
  line(ctx, x, y + h, x, y, { ...o, seed: seed * 3 + 4 });
}

/** An ellipse traced by hand — radius breathes slightly around the sweep. */
export function ellipse(
  ctx: Ctx,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  opts: StrokeOptions & { sweep?: number; rotate?: number } = {},
) {
  const o = { ...DEFAULTS, ...opts };
  const seed = opts.seed ?? 1;
  const sweep = opts.sweep ?? Math.PI * 2;
  const rot = opts.rotate ?? 0;

  for (let pass = 0; pass < o.passes; pass++) {
    const rng = makeRng(seed * 6151 + pass * 3571);
    const start = rot + (pass === 0 ? 0 : (rng() - 0.5) * 0.4);
    ctx.save();
    ctx.strokeStyle = o.color;
    ctx.lineCap = 'round';
    ctx.globalAlpha = o.alpha * (pass === 0 ? 1 : 0.45);
    ctx.lineWidth = o.width * (pass === 0 ? 1 : 0.8);
    ctx.beginPath();
    const steps = Math.max(14, Math.round(sweep * 9));
    // Overshoot the sweep a touch so the loop doesn't close perfectly.
    const over = sweep >= Math.PI * 2 ? 0.12 + rng() * 0.14 : 0;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = start + t * (sweep + over);
      const wob = (rng() - 0.5) * o.wobble + Math.sin(a * 2.7 + seed) * o.wobble * 0.5;
      const x = cx + Math.cos(a) * (rx + wob);
      const y = cy + Math.sin(a) * (ry + wob);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  }
}

/** An open hand-drawn polyline through the given points. */
export function path(ctx: Ctx, pts: Array<[number, number]>, opts: StrokeOptions = {}) {
  const seed = opts.seed ?? 1;
  for (let i = 0; i < pts.length - 1; i++) {
    line(ctx, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], {
      overshoot: 0,
      ...opts,
      seed: seed * 131 + i,
    });
  }
}

export interface HatchOptions {
  angle?: number;
  spacing?: number;
  color?: string;
  width?: number;
  alpha?: number;
  wobble?: number;
  seed?: number;
  /** 0..1 chance a given line is skipped, so the shading breathes. */
  skip?: number;
}

/** Pencil hatching clipped to the given rectangle. The workhorse for shading. */
export function hatch(ctx: Ctx, x: number, y: number, w: number, h: number, opts: HatchOptions = {}) {
  const {
    angle = -Math.PI / 4,
    spacing = 7,
    color = '#23201c',
    width = 0.9,
    alpha = 0.16,
    wobble = 1.1,
    seed = 1,
    skip = 0.12,
  } = opts;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();

  const rng = makeRng(seed * 2749);
  const diag = Math.hypot(w, h);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const px = -uy;
  const py = ux;
  const count = Math.ceil(diag / spacing) + 2;

  for (let i = -count; i <= count; i++) {
    if (rng() < skip) continue;
    const off = i * spacing + (rng() - 0.5) * spacing * 0.4;
    const mx = cx + px * off;
    const my = cy + py * off;
    // Vary length so hatching frays out rather than filling a hard block.
    const half = diag * (0.42 + rng() * 0.16);
    line(ctx, mx - ux * half, my - uy * half, mx + ux * half, my + uy * half, {
      color,
      width: width * (0.7 + rng() * 0.6),
      wobble,
      alpha: alpha * (0.6 + rng() * 0.7),
      seed: Math.floor(rng() * 1e6),
      steps: 6,
    });
  }
  ctx.restore();
}

/** Paper fibre: fine speckle plus a few soft blotches. Very low contrast by design. */
export function paperGrain(ctx: Ctx, w: number, h: number, opts: { seed?: number; density?: number; alpha?: number } = {}) {
  const { seed = 1, density = 0.055, alpha = 0.05 } = opts;
  const rng = makeRng(seed * 9973);
  const count = Math.floor(w * h * density * 0.01);

  ctx.save();
  for (let i = 0; i < count; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = rng() * 1.5 + 0.2;
    ctx.globalAlpha = alpha * rng();
    ctx.fillStyle = rng() > 0.35 ? '#23201c' : '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  /* Soft tonal blotches give the paper an uneven, aged wash. Kept small and
     few: a tile of this texture covers four and a half metres of corridor
     wall, so a blotch a third of the tile across arrives on the wall as a
     metre-wide damp patch, and eighteen of them overlapping made the corridor
     look water-damaged rather than drawn. */
  for (let i = 0; i < 11; i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = (0.05 + rng() * 0.13) * Math.min(w, h);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = rng() > 0.5;
    g.addColorStop(0, dark ? 'rgba(35,32,28,0.022)' : 'rgba(255,255,255,0.04)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.restore();
}

/**
 * Text with a slight baseline drift and per-glyph rotation, so lettering looks
 * placed by hand rather than typeset. Returns the measured width.
 */
export function driftText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  opts: {
    font: string;
    color?: string;
    align?: 'left' | 'center' | 'right';
    drift?: number;
    tracking?: number;
    alpha?: number;
    seed?: number;
  },
) {
  const { font, color = '#23201c', align = 'left', drift = 0.7, tracking = 0, alpha = 1, seed = 1 } = opts;
  ctx.save();
  ctx.font = font;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.globalAlpha = alpha;

  const chars = [...text];
  const widths = chars.map((c) => ctx.measureText(c).width + tracking);
  const total = widths.reduce((a, b) => a + b, 0);
  let cursor = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;

  const rng = makeRng(seed * 5381);
  chars.forEach((c, i) => {
    const dy = (rng() - 0.5) * drift * 2;
    const rot = (rng() - 0.5) * drift * 0.012;
    ctx.save();
    ctx.translate(cursor, y + dy);
    ctx.rotate(rot);
    ctx.fillText(c, 0, 0);
    ctx.restore();
    cursor += widths[i];
  });
  ctx.restore();
  return total;
}

/** Wrap text to a width and draw it as drifting lines. Returns the y after the last line. */
export function driftParagraph(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  opts: { font: string; lineHeight: number; color?: string; alpha?: number; seed?: number; align?: 'left' | 'center' },
) {
  const { font, lineHeight, color, alpha, seed = 1, align = 'left' } = opts;
  ctx.save();
  ctx.font = font;
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  ctx.restore();

  lines.forEach((l, i) => {
    driftText(ctx, l, x, y + i * lineHeight, { font, color, alpha, seed: seed + i * 17, align, drift: 0.5 });
  });
  return y + lines.length * lineHeight;
}

/**
 * A soft graphite shadow pool. Drawn as stacked hatching rather than a blur so
 * it stays inside the drawing's visual language.
 */
export function shadowPool(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, opts: { seed?: number; alpha?: number } = {}) {
  const { seed = 1, alpha = 0.2 } = opts;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
  g.addColorStop(0, `rgba(35,32,28,${alpha})`);
  g.addColorStop(0.6, `rgba(35,32,28,${alpha * 0.35})`);
  g.addColorStop(1, 'rgba(35,32,28,0)');
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / Math.max(rx, 0.001));
  ctx.translate(-cx, -cy);
  ctx.fillStyle = g;
  ctx.fillRect(cx - rx * 1.2, cy - rx * 1.2, rx * 2.4, rx * 2.4);
  ctx.restore();
  void seed;
}
