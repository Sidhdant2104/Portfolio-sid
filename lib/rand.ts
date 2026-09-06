/**
 * Deterministic pseudo-randomness.
 *
 * Every wobble, grain fleck and jittered line in the world is derived from a
 * seed so the drawing is identical on every render and across reloads. A world
 * that re-scribbles itself each frame reads as noise, not as a drawing.
 */

/** Mulberry32 — small, fast, good enough distribution for texture work. */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable hash of an integer to [0,1). Useful for per-vertex jitter. */
export function hash1(n: number) {
  let t = (n + 0x9e3779b9) >>> 0;
  t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
  t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
  return ((t ^ (t >>> 15)) >>> 0) / 4294967296;
}

/** Stable hash to [-1,1). */
export function hash1s(n: number) {
  return hash1(n) * 2 - 1;
}

/** Cheap 1D value noise with smooth interpolation — for slow organic drift. */
export function noise1(x: number, seed = 0) {
  const i = Math.floor(x);
  const f = x - i;
  const s = f * f * (3 - 2 * f);
  const a = hash1s(i + seed * 8191);
  const b = hash1s(i + 1 + seed * 8191);
  return a + (b - a) * s;
}
