/**
 * Single source of truth for the art direction.
 *
 * The world is drawn as if on warm sketchbook paper: graphite linework, paper
 * fills, and one accent that behaves like a red architect's pencil. Anything
 * that reads as "screen colour" (saturated blues, glows, neon) is deliberately
 * absent — the futurism is meant to come from the interaction, not the palette.
 */

export const palette = {
  paper: '#f2efe7',
  paperLit: '#faf8f2',
  paperDeep: '#e6e1d4',
  paperShade: '#d8d2c3',

  graphite: '#23201c',
  graphiteMid: '#4c463e',
  graphiteSoft: '#7d7568',
  graphiteFaint: '#a9a293',

  /** Red pencil. Used for annotation, focus and "you are here". */
  accent: '#c1440e',
  accentSoft: '#d97a4e',
} as const;

/** Muted surface tints so each space has its own light without adding colour noise. */
export const tints = {
  floor: '#e9e4d7',
  wall: '#f4f1e9',
  wallLeft: '#f7f4ed',
  wallRight: '#e9e5da',
  ceiling: '#fbf9f4',
  sky: '#f5f3ed',
} as const;

export const fog = {
  color: '#f4f1e9',
  /* Hall haze. Enough that the far end blooms out and the corridor reads as
     deep, but not so much that the name on the end wall is lost. */
  hallDensity: 0.018,
  roomDensity: 0.015,
  exteriorDensity: 0.011,
} as const;

export const camera = {
  eyeHeight: 1.62,
  fov: 52,
  /** FOV widens during a doorway transit to exaggerate the forward push. */
  transitFov: 62,
} as const;
