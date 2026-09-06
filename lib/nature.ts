'use client';

/**
 * Organic shapes for the forecourt.
 *
 * Trees, shrubs and clouds have no straight edges, so they are drawn into
 * transparent canvases and mounted on planes rather than modelled. At the
 * scale they are seen — background silhouettes across a courtyard — a drawn
 * outline reads better than any geometry would, and costs one quad each.
 */

import * as THREE from 'three';
import { line, paperGrain } from './draw';
import { makeRng } from './rand';
import { palette } from './theme';
import { cached, makeCanvas, toTexture } from './textures';

type Ctx = CanvasRenderingContext2D;

/** A closed wobbly blob, used for foliage masses and cloud lobes. */
function lobe(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, seed: number, lobes = 9) {
  const rng = makeRng(seed * 7717);
  const pts: Array<[number, number]> = [];
  const steps = lobes * 4;
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    // Low-frequency lumps plus fine noise gives a hand-drawn silhouette.
    const lump = 1 + Math.sin(a * lobes * 0.5 + seed) * 0.11 + Math.sin(a * lobes + seed * 2) * 0.07;
    const jitter = 1 + (rng() - 0.5) * 0.07;
    pts.push([cx + Math.cos(a) * rx * lump * jitter, cy + Math.sin(a) * ry * lump * jitter]);
  }
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y);
    else {
      const [px, py] = pts[i - 1];
      ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
    }
  });
  ctx.closePath();
  return pts;
}

/**
 * Fill a path already on the context with continuous scribble.
 *
 * A solid fill would read as a white blob against a near-white building, which
 * is the failure mode of drawn foliage. A scribble reads as mass while still
 * letting the wall behind show through, which is how foliage is actually
 * indicated on an architectural elevation.
 */
function scribbleFill(
  ctx: Ctx,
  bounds: { x0: number; y0: number; x1: number; y1: number },
  seed: number,
  opts: { density?: number; alpha?: number; width?: number } = {},
) {
  const rng = makeRng(seed * 2213);
  const { density = 0.7, alpha = 0.3, width = 1.6 } = opts;
  ctx.save();
  ctx.clip();
  const w = bounds.x1 - bounds.x0;
  const h = bounds.y1 - bounds.y0;
  const count = Math.round((w * h * density) / 1400);
  ctx.strokeStyle = palette.graphite;
  ctx.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    // Short arcs, clustered — the way a pencil indicates a canopy.
    const cx = bounds.x0 + rng() * w;
    const cy = bounds.y0 + rng() * h;
    const r = 5 + rng() * 16;
    const a0 = rng() * Math.PI * 2;
    ctx.globalAlpha = alpha * (0.4 + rng() * 0.8);
    ctx.lineWidth = width * (0.6 + rng() * 0.8);
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a0 + 1.1 + rng() * 1.9);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * A tree in elevation: trunk, recursive branches, and a scribbled canopy.
 * Drawn with a very light wash so the building behind stays readable.
 */
export function treeTexture(seed = 1, size = 1024) {
  return cached(`tree:${seed}:${size}`, () => {
    const { canvas, ctx } = makeCanvas(size, size);
    ctx.clearRect(0, 0, size, size);
    const rng = makeRng(seed * 4441);

    // Branches first, so the canopy scribble settles over them.
    const baseX = size * 0.5;
    const baseY = size * 0.985;
    const branch = (x: number, y: number, angle: number, len: number, width: number, depth: number) => {
      if (depth > 5 || len < 7) return;
      const ex = x + Math.cos(angle) * len;
      const ey = y + Math.sin(angle) * len;
      line(ctx, x, y, ex, ey, {
        color: palette.graphite,
        width,
        alpha: 0.62,
        wobble: len * 0.05,
        steps: 8,
        seed: Math.floor(rng() * 1e6),
      });
      const spread = 0.4 + rng() * 0.32;
      branch(ex, ey, angle - spread, len * (0.6 + rng() * 0.17), width * 0.64, depth + 1);
      branch(ex, ey, angle + spread * (0.7 + rng() * 0.6), len * (0.6 + rng() * 0.17), width * 0.64, depth + 1);
      if (rng() > 0.64) branch(ex, ey, angle + (rng() - 0.5) * 0.3, len * 0.48, width * 0.5, depth + 1);
    };
    branch(baseX, baseY, -Math.PI / 2 + 0.04, size * 0.27, 8, 0);

    /* Canopy: two overlapping masses, each a faint wash plus scribble. Two
       rather than one so the silhouette is not a single readable ellipse. */
    const masses: Array<[number, number, number, number, number]> = [
      [0.5, 0.31, 0.37, 0.25, 0],
      [0.36, 0.44, 0.2, 0.15, 7],
      [0.66, 0.42, 0.17, 0.13, 13],
    ];
    for (const [fx, fy, frx, fry, ds] of masses) {
      const cx = size * fx;
      const cy = size * fy;
      const rx = size * frx;
      const ry = size * fry;
      ctx.save();
      lobe(ctx, cx, cy, rx, ry, seed + ds, 11);
      ctx.fillStyle = 'rgba(250,248,242,0.42)';
      ctx.fill();
      ctx.restore();

      ctx.save();
      lobe(ctx, cx, cy, rx, ry, seed + ds, 11);
      scribbleFill(
        ctx,
        { x0: cx - rx * 1.2, y0: cy - ry * 1.2, x1: cx + rx * 1.2, y1: cy + ry * 1.2 },
        seed + ds,
        { density: 0.8, alpha: 0.24, width: 1.5 },
      );
      ctx.restore();

      // Broken outline: drawn in segments so it never looks die-cut.
      ctx.save();
      const pts = lobe(ctx, cx, cy, rx, ry, seed + ds, 11);
      ctx.beginPath();
      ctx.strokeStyle = palette.graphite;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.4;
      const rng2 = makeRng((seed + ds) * 331);
      for (let i = 0; i < pts.length - 1; i++) {
        if (rng2() < 0.32) continue;
        ctx.moveTo(pts[i][0], pts[i][1]);
        ctx.lineTo(pts[i + 1][0], pts[i + 1][1]);
      }
      ctx.stroke();
      ctx.restore();
      void pts;
    }

    // Root flare.
    line(ctx, baseX - 24, baseY - 2, baseX + 24, baseY - 2, {
      color: palette.graphite,
      width: 1.8,
      alpha: 0.42,
      wobble: 2,
      seed: 91,
    });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** A low shrub. Same scribble logic as the canopy, at a smaller scale. */
export function bushTexture(seed = 1, size = 512) {
  return cached(`bush:${seed}:${size}`, () => {
    const { canvas, ctx } = makeCanvas(size, size);
    ctx.clearRect(0, 0, size, size);
    for (let i = 0; i < 3; i++) {
      const cx = size * (0.3 + i * 0.19);
      const cy = size * (0.63 - (i % 2) * 0.09);
      const rx = size * (0.21 - i * 0.025);
      const ry = size * (0.19 - i * 0.025);

      ctx.save();
      lobe(ctx, cx, cy, rx, ry, seed + i * 13, 7);
      ctx.fillStyle = 'rgba(250,248,242,0.4)';
      ctx.fill();
      ctx.restore();

      ctx.save();
      lobe(ctx, cx, cy, rx, ry, seed + i * 13, 7);
      scribbleFill(
        ctx,
        { x0: cx - rx * 1.2, y0: cy - ry * 1.2, x1: cx + rx * 1.2, y1: cy + ry * 1.2 },
        seed + i * 5,
        { density: 1.5, alpha: 0.26, width: 1.3 },
      );
      ctx.restore();

      ctx.save();
      const pts = lobe(ctx, cx, cy, rx, ry, seed + i * 13, 7);
      ctx.beginPath();
      ctx.strokeStyle = palette.graphite;
      ctx.lineWidth = 1.9;
      ctx.globalAlpha = 0.38 - i * 0.06;
      const rng2 = makeRng((seed + i) * 733);
      for (let k = 0; k < pts.length - 1; k++) {
        if (rng2() < 0.28) continue;
        ctx.moveTo(pts[k][0], pts[k][1]);
        ctx.lineTo(pts[k + 1][0], pts[k + 1][1]);
      }
      ctx.stroke();
      ctx.restore();
    }
    line(ctx, size * 0.14, size * 0.8, size * 0.86, size * 0.8, {
      color: palette.graphite,
      width: 1.5,
      alpha: 0.32,
      wobble: 3,
      seed: seed + 3,
    });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** A drawn cloud. Very low contrast — it should barely separate from the paper. */
export function cloudTexture(seed = 1, size = 1024) {
  return cached(`cloud:${seed}:${size}`, () => {
    const { canvas, ctx } = makeCanvas(size, Math.round(size * 0.5));
    const h = Math.round(size * 0.5);
    ctx.clearRect(0, 0, size, h);
    const rng = makeRng(seed * 3313);
    const lobes = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < lobes; i++) {
      const cx = size * (0.22 + (i / lobes) * 0.58 + rng() * 0.06);
      const cy = h * (0.58 - rng() * 0.16);
      const r = size * (0.1 + rng() * 0.07);
      ctx.save();
      lobe(ctx, cx, cy, r, r * (0.6 + rng() * 0.25), seed + i * 17, 6);
      ctx.fillStyle = 'rgba(253,252,248,0.9)';
      ctx.fill();
      ctx.strokeStyle = palette.graphite;
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.restore();
    }
    // Flat base, the way clouds get drawn.
    line(ctx, size * 0.2, h * 0.62, size * 0.82, h * 0.62, {
      color: palette.graphite,
      width: 1.6,
      alpha: 0.14,
      wobble: 3,
      seed: seed + 5,
    });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** Coarse ground: scattered strokes suggesting gravel and grass tufts. */
export function groundTexture(seed = 1, size = 512) {
  return cached(`ground:${seed}:${size}`, () => {
    const { canvas, ctx } = makeCanvas(size, size);
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, size, size);
    const rng = makeRng(seed * 5527);
    for (let i = 0; i < 180; i++) {
      const x = rng() * size;
      const y = rng() * size;
      const len = 4 + rng() * 14;
      const a = -Math.PI / 2 + (rng() - 0.5) * 0.9;
      line(ctx, x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, {
        color: palette.graphite,
        width: 0.9,
        alpha: 0.07 + rng() * 0.1,
        wobble: 0.8,
        steps: 4,
        seed: i + seed,
      });
    }
    paperGrain(ctx, size, size, { seed, density: 0.07, alpha: 0.06 });
    return toTexture(canvas, { repeat: [1, 1] });
  });
}

/**
 * A stray cat, sitting. Small, deliberate, and the one thing in the world with
 * no informational purpose whatsoever.
 */
export function catTexture(size = 512) {
  return cached('cat', () => {
    const { canvas, ctx } = makeCanvas(size, size);
    ctx.clearRect(0, 0, size, size);
    const s = size / 512;
    const ink = { color: palette.graphite, width: 2.4 * s, alpha: 0.8, wobble: 1.4 };

    // Body and head as one silhouette.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(190 * s, 460 * s);
    ctx.bezierCurveTo(150 * s, 400 * s, 158 * s, 300 * s, 196 * s, 258 * s);
    ctx.bezierCurveTo(188 * s, 216 * s, 196 * s, 176 * s, 214 * s, 156 * s);
    ctx.lineTo(238 * s, 196 * s);
    ctx.bezierCurveTo(262 * s, 186 * s, 292 * s, 188 * s, 312 * s, 200 * s);
    ctx.lineTo(340 * s, 158 * s);
    ctx.bezierCurveTo(356 * s, 182 * s, 360 * s, 224 * s, 350 * s, 260 * s);
    ctx.bezierCurveTo(392 * s, 306 * s, 396 * s, 402 * s, 366 * s, 460 * s);
    ctx.closePath();
    // Tinted rather than white, so the silhouette separates from the facade.
    ctx.fillStyle = 'rgba(222,216,202,0.92)';
    ctx.fill();
    ctx.strokeStyle = palette.graphite;
    ctx.globalAlpha = 0.82;
    ctx.lineWidth = 2.6 * s;
    ctx.stroke();
    ctx.restore();

    // Tail, curling round the front.
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(360 * s, 452 * s);
    ctx.bezierCurveTo(420 * s, 448 * s, 424 * s, 386 * s, 386 * s, 372 * s);
    ctx.strokeStyle = palette.graphite;
    ctx.globalAlpha = 0.75;
    ctx.lineWidth = 6 * s;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.restore();

    // Eyes and nose.
    [242, 306].forEach((x, i) => {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x * s, 232 * s, 5 * s, 7 * s, 0, 0, Math.PI * 2);
      ctx.fillStyle = palette.graphite;
      ctx.globalAlpha = 0.8;
      ctx.fill();
      ctx.restore();
      void i;
    });
    line(ctx, 268 * s, 254 * s, 280 * s, 254 * s, { ...ink, width: 1.8 * s });
    // Whiskers.
    [-1, 1].forEach((dir) => {
      for (let i = 0; i < 2; i++) {
        line(
          ctx,
          (274 + dir * 14) * s,
          (250 + i * 10) * s,
          (274 + dir * 66) * s,
          (240 + i * 20) * s,
          { color: palette.graphite, width: 1.2 * s, alpha: 0.4, wobble: 1.2, seed: i * 7 + dir + 2 },
        );
      }
    });
    // Ground contact.
    line(ctx, 176 * s, 462 * s, 380 * s, 462 * s, { color: palette.graphite, width: 2 * s, alpha: 0.4, wobble: 1.6, seed: 11 });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}
