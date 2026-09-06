/**
 * Movement is constrained by a union of axis-aligned walkable volumes rather
 * than by mesh collision. The building is orthogonal, so boxes describe it
 * exactly, and testing a point against a handful of boxes costs nothing.
 *
 * The volumes are already inset by the camera's body radius — they describe
 * where the *eye* may go, not where the room is. Connecting volumes are
 * deliberately overlapped by more than the body radius so the camera can pass
 * between them; a doorway is simply the one place two volumes touch.
 */

import { HALL, ROOMS, VESTIBULE_DEPTH, ROOM_WIDTH, ROOM_HALF_DEPTH, sideSign, type RoomDef, type ZoneId } from '@/data/world';

export interface Volume {
  zone: ZoneId;
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  /** When present, the volume is only walkable while this returns true. */
  gate?: 'frontDoor' | RoomDef['id'];
}

const span = (a: number, b: number) => ({ min: Math.min(a, b), max: Math.max(a, b) });

export const FORECOURT: Volume = { zone: 'exterior', xMin: -12.5, xMax: 12.5, zMin: 0.6, zMax: 25 };

export const FRONT_DOORWAY: Volume = {
  zone: 'hall',
  xMin: -0.78,
  xMax: 0.78,
  zMin: -1.5,
  zMax: 1.6,
  gate: 'frontDoor',
};

export const HALL_VOLUME: Volume = {
  zone: 'hall',
  xMin: -HALL.halfWidth + 0.4,
  xMax: HALL.halfWidth - 0.4,
  zMin: HALL.zEnd + 0.8,
  zMax: -0.5,
};

function roomVolumes(room: RoomDef): Volume[] {
  const s = sideSign(room.side);
  const vestibule = span(s * 2.9, s * (HALL.halfWidth + VESTIBULE_DEPTH + 0.6));
  const interior = span(s * (HALL.halfWidth + VESTIBULE_DEPTH - 0.2), s * (HALL.halfWidth + VESTIBULE_DEPTH + ROOM_WIDTH - 0.7));
  return [
    {
      zone: room.id,
      xMin: vestibule.min,
      xMax: vestibule.max,
      zMin: room.doorZ - 0.72,
      zMax: room.doorZ + 0.72,
      gate: room.id,
    },
    {
      zone: room.id,
      xMin: interior.min,
      xMax: interior.max,
      zMin: room.doorZ - ROOM_HALF_DEPTH + 0.6,
      zMax: room.doorZ + ROOM_HALF_DEPTH - 0.6,
    },
  ];
}

export const VOLUMES: Volume[] = [FORECOURT, FRONT_DOORWAY, HALL_VOLUME, ...ROOMS.flatMap(roomVolumes)];

/** Volumes sorted so the most specific zone wins when several contain the point. */
const PRIORITY: Record<string, number> = { exterior: 0, hall: 1 };
const priorityOf = (z: ZoneId) => PRIORITY[z] ?? 2;

export interface GateState {
  frontDoor: boolean;
  openDoor: string | null;
}

function passable(v: Volume, gates: GateState) {
  if (!v.gate) return true;
  if (v.gate === 'frontDoor') return gates.frontDoor;
  return gates.openDoor === v.gate;
}

export function contains(v: Volume, x: number, z: number) {
  return x >= v.xMin && x <= v.xMax && z >= v.zMin && z <= v.zMax;
}

export function isWalkable(x: number, z: number, gates: GateState) {
  for (const v of VOLUMES) {
    if (!passable(v, gates)) continue;
    if (contains(v, x, z)) return true;
  }
  return false;
}

/** The zone the point sits in, preferring rooms over the corridor it opens off. */
export function zoneAt(x: number, z: number, gates: GateState): ZoneId {
  let best: ZoneId = 'exterior';
  let bestPriority = -1;
  for (const v of VOLUMES) {
    if (!contains(v, x, z)) continue;
    // Gated volumes still report their zone once you are inside them, otherwise
    // closing a door behind you would teleport your location readout.
    if (v.gate && v.gate !== 'frontDoor' && !passable(v, gates)) continue;
    const p = priorityOf(v.zone);
    if (p > bestPriority) {
      bestPriority = p;
      best = v.zone;
    }
  }
  return best;
}

/**
 * Resolve a movement attempt. Axes are tested independently so that sliding
 * along a wall feels natural instead of stopping dead on any contact.
 */
export function resolveMove(fromX: number, fromZ: number, toX: number, toZ: number, gates: GateState) {
  let x = fromX;
  let z = fromZ;
  if (isWalkable(toX, z, gates)) x = toX;
  if (isWalkable(x, toZ, gates)) z = toZ;
  // Diagonal attempt failed on both axes but the target itself is fine — this
  // happens crossing the seam between two volumes, so allow it.
  if (x === fromX && z === fromZ && isWalkable(toX, toZ, gates)) {
    x = toX;
    z = toZ;
  }
  return { x, z };
}
