'use client';

/**
 * Shared pointer bookkeeping.
 *
 * The same drag both turns the camera and could land on a clickable object, so
 * the two need to agree on what counts as a click. `dragging` flips once the
 * pointer has travelled far enough to be intent to look around, and mesh
 * handlers check it before acting.
 */

export const pointerFlags = {
  down: false,
  dragging: false,
  travel: 0,
  lastX: 0,
  lastY: 0,
};

/** True when a pointerup should be treated as a click rather than the end of a drag. */
export function wasClick() {
  return !pointerFlags.dragging;
}
