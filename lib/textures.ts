/**
 * Procedural surface textures.
 *
 * No image files ship with this world. Every surface is drawn once into a
 * canvas at load time and cached. That keeps the payload tiny and, because the
 * linework comes from `lib/draw`, every surface carries the same hand tremor.
 */

'use client';

import * as THREE from 'three';
import { hatch, line, paperGrain, rect, driftText } from './draw';
import { makeRng } from './rand';
import { palette } from './theme';

export const FONT_MONO = "'IBM Plex Mono', ui-monospace, monospace";
export const FONT_SERIF = "'Instrument Serif', Georgia, serif";

export function makeCanvas(w: number, h: number) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return { canvas, ctx };
}

export function toTexture(
  canvas: HTMLCanvasElement,
  opts: { repeat?: [number, number]; wrap?: THREE.Wrapping; anisotropy?: number } = {},
) {
  const tex = new THREE.CanvasTexture(canvas);
  const wrap = opts.wrap ?? THREE.RepeatWrapping;
  tex.wrapS = wrap;
  tex.wrapT = wrap;
  if (opts.repeat) tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  tex.anisotropy = opts.anisotropy ?? 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/* ------------------------------------------------------------------ cache */

const cache = new Map<string, THREE.Texture>();

/** Memoised texture factory. Keyed by string so repeated surfaces share GPU memory. */
export function cached(key: string, make: () => THREE.Texture): THREE.Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const tex = make();
  cache.set(key, tex);
  return tex;
}

export function disposeTextureCache() {
  cache.forEach((t) => t.dispose());
  cache.clear();
}

/* ------------------------------------------------------------------ paper */

/** Base sketchbook paper. Tileable, extremely low contrast. */
export function paperTexture(seed = 1, size = 512) {
  return cached(`paper:${seed}:${size}`, () => {
    const { canvas, ctx } = makeCanvas(size, size);
    ctx.fillStyle = palette.paperLit;
    ctx.fillRect(0, 0, size, size);
    paperGrain(ctx, size, size, { seed, density: 0.09, alpha: 0.06 });
    return toTexture(canvas, { repeat: [1, 1] });
  });
}

/**
 * Wall paper with faint drafting annotation — dimension ticks and construction
 * lines in red pencil. Reads as an architect's sheet on close inspection and as
 * plain paper from a distance.
 */
export function draftedWallTexture(seed = 1, size = 1024) {
  return cached(`draftwall:${seed}:${size}`, () => {
    const { canvas, ctx } = makeCanvas(size, size);
    ctx.fillStyle = palette.paperLit;
    ctx.fillRect(0, 0, size, size);
    paperGrain(ctx, size, size, { seed, density: 0.08, alpha: 0.055 });

    const rng = makeRng(seed * 4211);
    // Faint construction grid — barely there, but it stops the wall reading as flat colour.
    for (let i = 0; i < 5; i++) {
      const y = rng() * size;
      line(ctx, 0, y, size, y, { color: palette.graphite, width: 0.8, alpha: 0.05, wobble: 1.6, steps: 16, seed: i * 31 + seed });
    }
    for (let i = 0; i < 3; i++) {
      const x = rng() * size;
      line(ctx, x, 0, x, size, { color: palette.graphite, width: 0.8, alpha: 0.04, wobble: 1.6, steps: 16, seed: i * 57 + seed });
    }
    // A single red-pencil dimension run.
    const dy = size * (0.2 + rng() * 0.6);
    const dx0 = size * 0.12;
    const dx1 = size * 0.62;
    line(ctx, dx0, dy, dx1, dy, { color: palette.accent, width: 0.9, alpha: 0.16, wobble: 0.7, seed: seed * 13 });
    line(ctx, dx0, dy - 7, dx0, dy + 7, { color: palette.accent, width: 0.9, alpha: 0.16, wobble: 0.5, seed: seed * 17 });
    line(ctx, dx1, dy - 7, dx1, dy + 7, { color: palette.accent, width: 0.9, alpha: 0.16, wobble: 0.5, seed: seed * 19 });
    return toTexture(canvas, { repeat: [1, 1] });
  });
}

/* ------------------------------------------------------------------ floors */

/**
 * Tileable plank flooring. This is the single most important surface in the
 * world: its converging grain lines are what make the corridor read as deep
 * space, exactly as in the reference.
 */
export function plankTexture(seed = 1, planks = 4, w = 1024, h = 1024) {
  return cached(`plank:${seed}:${planks}:${w}x${h}`, () => {
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = palette.paperLit;
    ctx.fillRect(0, 0, w, h);

    const pw = w / planks;
    const rng = makeRng(seed * 8171);

    for (let p = 0; p < planks; p++) {
      const x0 = p * pw;
      // Each plank gets a slightly different paper value so the floor has rhythm.
      const v = 0.965 + rng() * 0.035;
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = `rgb(${Math.round(250 * v)},${Math.round(248 * v)},${Math.round(242 * v)})`;
      ctx.fillRect(x0, 0, pw, h);
      ctx.restore();

      // Long grain. Density varies per plank; lines run the full tile height so
      // the vertical seam stays invisible when tiled.
      const grainCount = 5 + Math.floor(rng() * 7);
      for (let g = 0; g < grainCount; g++) {
        const gx = x0 + pw * (0.08 + rng() * 0.84);
        const bow = (rng() - 0.5) * pw * 0.16;
        ctx.save();
        ctx.strokeStyle = palette.graphite;
        ctx.globalAlpha = 0.06 + rng() * 0.13;
        ctx.lineWidth = 0.7 + rng() * 0.7;
        ctx.beginPath();
        const steps = 26;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          // sin() keeps the ends at the same x, preserving vertical tiling.
          const x = gx + Math.sin(t * Math.PI * (1 + Math.floor(rng() * 2))) * bow;
          const y = t * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }

      // Knots.
      if (rng() > 0.55) {
        const kx = x0 + pw * (0.25 + rng() * 0.5);
        const ky = rng() * h;
        for (let k = 0; k < 3; k++) {
          ctx.save();
          ctx.strokeStyle = palette.graphite;
          ctx.globalAlpha = 0.12 - k * 0.03;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.ellipse(kx, ky, 3 + k * 3.5, 7 + k * 8, rng() * 0.4, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      // Plank seam — the darkest line, drawn twice for a pressed-in look.
      line(ctx, x0, 0, x0, h, {
        color: palette.graphite,
        width: 1.5,
        alpha: 0.36,
        wobble: 1.1,
        steps: 20,
        passes: 2,
        seed: seed * 91 + p,
      });
    }

    // End joints. Kept off the tile edges so they don't double up when tiling.
    for (let j = 0; j < planks; j++) {
      if (rng() > 0.55) continue;
      const x0 = j * pw;
      const y = h * (0.2 + rng() * 0.6);
      line(ctx, x0 + 1, y, x0 + pw - 1, y, {
        color: palette.graphite,
        width: 1.2,
        alpha: 0.26,
        wobble: 0.8,
        seed: seed * 311 + j,
      });
    }

    paperGrain(ctx, w, h, { seed: seed + 5, density: 0.05, alpha: 0.05 });
    return toTexture(canvas, { repeat: [1, 1] });
  });
}

/** Hand-drawn paving slabs for the exterior approach path. */
export function pavingTexture(seed = 1, size = 512) {
  return cached(`paving:${seed}:${size}`, () => {
    const { canvas, ctx } = makeCanvas(size, size);
    ctx.fillStyle = palette.paper;
    ctx.fillRect(0, 0, size, size);
    const rng = makeRng(seed * 3389);
    const cols = 3;
    const rows = 3;
    const cw = size / cols;
    const ch = size / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * cw;
        const y = r * ch;
        const inset = 3 + rng() * 3;
        rect(ctx, x + inset, y + inset, cw - inset * 2, ch - inset * 2, {
          color: palette.graphite,
          width: 1.2,
          alpha: 0.3,
          wobble: 1.6,
          overshoot: 0,
          seed: r * 31 + c + seed,
        });
        if (rng() > 0.6) {
          hatch(ctx, x + inset, y + inset, cw - inset * 2, ch - inset * 2, {
            spacing: 9,
            alpha: 0.07,
            angle: rng() > 0.5 ? -0.8 : 0.8,
            seed: r * 7 + c + seed,
          });
        }
      }
    }
    paperGrain(ctx, size, size, { seed, density: 0.07, alpha: 0.06 });
    return toTexture(canvas, { repeat: [1, 1] });
  });
}

/** Running-bond brickwork for the exterior facade. */
export function brickTexture(seed = 1, size = 512) {
  return cached(`brick:${seed}:${size}`, () => {
    const { canvas, ctx } = makeCanvas(size, size);
    ctx.fillStyle = palette.paperLit;
    ctx.fillRect(0, 0, size, size);

    const rng = makeRng(seed * 6421);
    const rows = 8;
    const bh = size / rows;
    const bw = size / 4;

    for (let r = 0; r < rows; r++) {
      const y = r * bh;
      const offset = r % 2 === 0 ? 0 : bw / 2;
      for (let c = -1; c < 5; c++) {
        const x = c * bw + offset;
        rect(ctx, x + 1.5, y + 1.5, bw - 3, bh - 3, {
          color: palette.graphite,
          width: 1.1,
          alpha: 0.28 + rng() * 0.12,
          wobble: 1.3,
          overshoot: 1.5,
          seed: r * 41 + c * 7 + seed,
        });
        // Only some bricks are shaded, which is how a person would draw it.
        if (rng() > 0.68) {
          hatch(ctx, x + 3, y + 3, bw - 6, bh - 6, {
            spacing: 6,
            alpha: 0.09,
            angle: -0.7,
            seed: r * 13 + c + seed,
          });
        }
      }
    }
    paperGrain(ctx, size, size, { seed, density: 0.06, alpha: 0.05 });
    return toTexture(canvas, { repeat: [1, 1] });
  });
}

/* ------------------------------------------------------------- shading aids */

/**
 * A one-sided hatched gradient, used as contact shading where surfaces meet.
 * Applied to thin planes hugging wall/floor junctions — the trick that makes
 * flat-shaded geometry read as an inked drawing with weight.
 */
export function contactShadeTexture(seed = 1, size = 256) {
  return cached(`contact:${seed}:${size}`, () => {
    const { canvas, ctx } = makeCanvas(size, size);
    ctx.clearRect(0, 0, size, size);
    hatch(ctx, 0, 0, size, size, {
      spacing: 7,
      alpha: 0.5,
      angle: -Math.PI / 3.2,
      width: 1.1,
      seed,
      skip: 0.06,
    });
    // Fade out upward so the shading dissipates away from the junction.
    const g = ctx.createLinearGradient(0, size, 0, 0);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
    return toTexture(canvas, { wrap: THREE.RepeatWrapping });
  });
}

/** Soft elliptical graphite pool for grounding objects. */
export function groundShadowTexture(seed = 1, size = 256) {
  return cached(`gshadow:${seed}:${size}`, () => {
    const { canvas, ctx } = makeCanvas(size, size);
    ctx.clearRect(0, 0, size, size);
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(35,32,28,0.42)');
    g.addColorStop(0.45, 'rgba(35,32,28,0.18)');
    g.addColorStop(1, 'rgba(35,32,28,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    hatch(ctx, 0, 0, size, size, { spacing: 8, alpha: 0.1, angle: -0.9, seed });
    // Clip the hatching to the pool so it doesn't sit in a hard square.
    const mask = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    mask.addColorStop(0, 'rgba(0,0,0,1)');
    mask.addColorStop(0.7, 'rgba(0,0,0,0.7)');
    mask.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = mask;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** Warm light spill on the floor, cast through an open doorway. */
export function lightSpillTexture(size = 256) {
  return cached(`spill:${size}`, () => {
    const { canvas, ctx } = makeCanvas(size, size);
    const g = ctx.createLinearGradient(0, 0, 0, size);
    g.addColorStop(0, 'rgba(255,253,246,0.85)');
    g.addColorStop(0.55, 'rgba(255,252,244,0.35)');
    g.addColorStop(1, 'rgba(255,252,244,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    const side = ctx.createLinearGradient(0, 0, size, 0);
    side.addColorStop(0, 'rgba(0,0,0,0)');
    side.addColorStop(0.2, 'rgba(0,0,0,1)');
    side.addColorStop(0.8, 'rgba(0,0,0,1)');
    side.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = side;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'source-over';
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/* ------------------------------------------------------------------- signage */

export interface SignOptions {
  title: string;
  index?: string;
  width?: number;
  height?: number;
  seed?: number;
  /** Draws the hanging bracket ironwork above the board. */
  accent?: boolean;
}

/**
 * A hanging sign board with hand-lettered text. Text is baked into the texture
 * rather than rendered as 3D glyphs — one draw call, and the lettering can
 * carry the same drift as the rest of the linework.
 */
export function signTexture({ title, index, width = 512, height = 256, seed = 1, accent = true }: SignOptions) {
  return cached(`sign:${title}:${index ?? ''}:${width}x${height}`, () => {
    const { canvas, ctx } = makeCanvas(width, height);
    ctx.fillStyle = palette.paperLit;
    ctx.fillRect(0, 0, width, height);
    paperGrain(ctx, width, height, { seed, density: 0.08, alpha: 0.07 });

    const pad = 16;
    rect(ctx, pad, pad, width - pad * 2, height - pad * 2, {
      color: palette.graphite,
      width: 3,
      alpha: 0.85,
      wobble: 1.4,
      overshoot: 6,
      passes: 2,
      seed: seed * 3,
    });
    rect(ctx, pad + 9, pad + 9, width - (pad + 9) * 2, height - (pad + 9) * 2, {
      color: palette.graphite,
      width: 1.1,
      alpha: 0.35,
      wobble: 1.2,
      overshoot: 3,
      seed: seed * 5,
    });

    const hasIndex = Boolean(index);
    const titleY = hasIndex ? height * 0.52 : height * 0.6;
    driftText(ctx, title, width / 2, titleY, {
      font: `700 ${Math.round(height * 0.26)}px ${FONT_MONO}`,
      color: palette.graphite,
      align: 'center',
      drift: 1.1,
      tracking: height * 0.02,
      seed: seed * 7,
    });

    if (index) {
      line(ctx, width * 0.4, height * 0.63, width * 0.6, height * 0.63, {
        color: palette.graphite,
        width: 1.4,
        alpha: 0.5,
        wobble: 1,
        seed: seed * 11,
      });
      driftText(ctx, index, width / 2, height * 0.79, {
        font: `500 ${Math.round(height * 0.13)}px ${FONT_MONO}`,
        color: accent ? palette.accent : palette.graphiteSoft,
        align: 'center',
        drift: 0.6,
        tracking: height * 0.03,
        seed: seed * 13,
      });
    }

    hatch(ctx, pad, height - pad - 22, width - pad * 2, 22, { spacing: 7, alpha: 0.07, seed: seed * 17 });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** Small engraved plate, e.g. object labels inside rooms. */
export function plateTexture(label: string, sub?: string, seed = 1) {
  return cached(`plate:${label}:${sub ?? ''}`, () => {
    const w = 512;
    const h = 160;
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = palette.paperLit;
    ctx.fillRect(0, 0, w, h);
    paperGrain(ctx, w, h, { seed, density: 0.06, alpha: 0.06 });
    rect(ctx, 8, 8, w - 16, h - 16, {
      color: palette.graphite,
      width: 1.6,
      alpha: 0.6,
      wobble: 1.1,
      overshoot: 4,
      seed: seed * 3,
    });
    driftText(ctx, label, w / 2, sub ? h * 0.46 : h * 0.6, {
      font: `600 ${Math.round(h * 0.27)}px ${FONT_MONO}`,
      color: palette.graphite,
      align: 'center',
      tracking: 2,
      drift: 0.8,
      seed: seed * 5,
    });
    if (sub) {
      driftText(ctx, sub, w / 2, h * 0.76, {
        font: `400 ${Math.round(h * 0.15)}px ${FONT_MONO}`,
        color: palette.graphiteSoft,
        align: 'center',
        tracking: 3,
        drift: 0.5,
        seed: seed * 7,
      });
    }
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}
