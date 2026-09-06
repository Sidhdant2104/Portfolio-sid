'use client';

/**
 * Mutable per-frame state, deliberately outside React.
 *
 * GSAP tweens these numbers directly and the render loop reads them. Keeping
 * the camera and door angles here rather than in component state is what lets a
 * doorway transit be a single authored timeline instead of a cascade of
 * re-renders.
 */

import { ROOMS, type RoomId } from '@/data/world';
import { camera as cameraTheme, fog } from './theme';

export interface NavState {
  /** Eye position. */
  px: number;
  py: number;
  pz: number;
  /** Committed heading, in radians. 0 looks down the corridor (-z). */
  yaw: number;
  pitch: number;
  fov: number;
  /** Light-adaptation veil, 0..1. Peaks while crossing a threshold. */
  veil: number;
  fogDensity: number;
  /** Blend factor for the walk-bob and idle sway, 0..1. Dropped during transits. */
  swayAmount: number;
}

export const nav: NavState = {
  px: 0,
  py: cameraTheme.eyeHeight,
  pz: 21.5,
  yaw: 0,
  pitch: 0,
  fov: cameraTheme.fov,
  veil: 0,
  fogDensity: fog.exteriorDensity,
  swayAmount: 1,
};

export function resetNav() {
  nav.px = 0;
  nav.py = cameraTheme.eyeHeight;
  nav.pz = 17.5;
  nav.yaw = 0;
  nav.pitch = 0;
  nav.fov = cameraTheme.fov;
  nav.veil = 0;
  nav.fogDensity = fog.exteriorDensity;
  nav.swayAmount = 1;
}

export interface DoorState {
  /** Hinge angle in radians. 0 is shut. */
  angle: number;
  /** Hover/attention response, 0..1. Drives the nudge and the frame highlight. */
  attention: number;
  /** Light bleeding through the aperture, 0..1. */
  glow: number;
}

const makeDoorState = (): DoorState => ({ angle: 0, attention: 0, glow: 0 });

export const doors: Record<RoomId | 'front', DoorState> = {
  front: makeDoorState(),
  ...(Object.fromEntries(ROOMS.map((r) => [r.id, makeDoorState()])) as Record<RoomId, DoorState>),
};

export function resetDoors() {
  Object.values(doors).forEach((d) => {
    d.angle = 0;
    d.attention = 0;
    d.glow = 0;
  });
}

/** Per-object hover response, keyed by object id. Read by world meshes each frame. */
export const objectAttention: Record<string, number> = {};

export function attentionFor(id: string) {
  if (objectAttention[id] === undefined) objectAttention[id] = 0;
  return objectAttention[id];
}
