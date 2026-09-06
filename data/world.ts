/**
 * The world is one continuous building in a single coordinate system, measured
 * in metres, y-up. Nothing here is a "page" or a "section": the camera walks
 * from the forecourt, through the front door, down a corridor, and through
 * whichever side door it chooses. Rooms occupy real, non-overlapping space, so
 * a doorway transit is literally just the camera moving forward.
 *
 *                                        z = -56  identity wall
 *                     ┌──────────┐   ▲
 *      THE LAB        │  corridor │   │   THE SIGNAL ROOM
 *   x<0, z ≈ -39  ◄───┤          ├───►   x>0, z ≈ -39
 *                     │          │
 *      THE STUDY      │          │       THE ARCHIVE
 *   x<0, z ≈ -25  ◄───┤          ├───►   x>0, z ≈ -25
 *                     │          │
 *      THE GALLERY    │          │       THE WORKSHOP
 *   x<0, z ≈ -11  ◄───┤          ├───►   x>0, z ≈ -11
 *                     └────┬─────┘
 *                     front door, z = 0
 *                          │
 *                     forecourt, z > 0
 */

export const HALL = {
  /** Interior half-width: side walls sit at x = ±4. */
  halfWidth: 4,
  /* Low enough that a 3.2 m doorway dominates the wall it sits in. A taller
     corridor made the doors read as incidental, which is the opposite of what
     they are. */
  height: 4.6,
  /** The facade plane. Everything at z > 0 is outdoors. */
  zStart: 0,
  /** Far end, where the identity wall closes the corridor. */
  zEnd: -50,
} as const;

export const DOORWAY = {
  width: 2.05,
  height: 3.2,
  /** Thickness of the wall the doorway is cut through. */
  wallThickness: 0.34,
  leafThickness: 0.09,
} as const;

export const VESTIBULE_DEPTH = 3.2;
/* Rooms are sized so that from the arrival point the far wall reads as the
   principal face and both side walls are within a head-turn. Larger than this
   and the contents scatter into an empty hall; smaller and the camera cannot
   walk far enough for approaching an object to feel like a walk. */
export const ROOM_WIDTH = 14.5;
export const ROOM_HALF_DEPTH = 5.6;

export const FRONT_DOOR = {
  width: 2.3,
  height: 3.4,
} as const;

export type RoomId = 'projects' | 'skills' | 'about' | 'experience' | 'experiments' | 'contact';
export type ZoneId = 'exterior' | 'hall' | RoomId;

export interface RoomDef {
  id: RoomId;
  /** Two-digit ordinal shown on the door and in the HUD. */
  index: string;
  /** What the door leads to, in portfolio terms. */
  label: string;
  /** What the space is called, in world terms. This is what the sign says. */
  roomName: string;
  /** One line of orientation, shown when the room is entered. */
  blurb: string;
  side: 'left' | 'right';
  /** Centre of the doorway along the corridor. */
  doorZ: number;
  /** Muted leaf colour. Gives each door its own character without adding colour noise. */
  tint: string;
  /** Which edge the hinge is on, seen from the corridor. */
  hinge: 'left' | 'right';
  /** Interior ceiling height. Varying this is most of what makes rooms feel different. */
  ceiling: number;
}

export const ROOMS: RoomDef[] = [
  {
    id: 'projects',
    index: '01',
    label: 'PROJECTS',
    roomName: 'THE GALLERY',
    blurb: 'Four things I built, hung where you can walk up to them.',
    side: 'left',
    doorZ: -11,
    tint: '#c2ac96',
    hinge: 'left',
    ceiling: 6.4,
  },
  {
    id: 'skills',
    index: '02',
    label: 'SKILLS',
    roomName: 'THE WORKSHOP',
    blurb: 'Tools on a bench. Pick one up to see what I do with it.',
    side: 'right',
    doorZ: -11,
    /* Warm putty, not the blue-grey it used to be: it was the only cold
       colour in the building and it pulled the eye straight off the tan
       gallery door opposite. Darker than the other leaves, so the boarding
       still separates it from the sage archive door further down. */
    tint: '#9c9581',
    hinge: 'right',
    ceiling: 4.5,
  },
  {
    id: 'about',
    index: '03',
    label: 'ABOUT',
    roomName: 'THE STUDY',
    blurb: 'My desk. The objects on it are the honest version of a bio.',
    side: 'left',
    doorZ: -25,
    tint: '#c0a980',
    hinge: 'right',
    ceiling: 4.0,
  },
  {
    id: 'experience',
    index: '04',
    label: 'EXPERIENCE',
    roomName: 'THE ARCHIVE',
    blurb: 'A timeline, filed vertically. Read it from the bottom up.',
    side: 'right',
    doorZ: -25,
    tint: '#a5ac9b',
    hinge: 'left',
    ceiling: 6.0,
  },
  {
    id: 'experiments',
    index: '05',
    label: 'EXPERIMENTS',
    roomName: 'THE LAB',
    blurb: 'Unfinished, unreasonable, mostly for me. Touch anything.',
    side: 'left',
    doorZ: -39,
    tint: '#bd8f74',
    hinge: 'left',
    ceiling: 5.2,
  },
  {
    id: 'contact',
    index: '06',
    label: 'CONTACT',
    roomName: 'THE SIGNAL ROOM',
    blurb: 'One desk, one lamp, one open line.',
    side: 'right',
    doorZ: -39,
    tint: '#8f8c85',
    hinge: 'right',
    ceiling: 5.6,
  },
];

export const roomById = (id: RoomId) => ROOMS.find((r) => r.id === id)!;

/** Sign direction: -1 for rooms extending in -x, +1 for +x. */
export const sideSign = (side: 'left' | 'right') => (side === 'left' ? -1 : 1);

export interface RoomBounds {
  /** Interior extents, wall faces inclusive. */
  xMin: number;
  xMax: number;
  zMin: number;
  zMax: number;
  height: number;
  /** Wall plane the doorway is cut into (x of the corridor-side wall). */
  doorwayX: number;
  /** Face of the room-side vestibule opening. */
  vestibuleInnerX: number;
  /** Where the camera comes to rest after walking in. */
  arrival: [number, number];
}

export function roomBounds(room: RoomDef): RoomBounds {
  const s = sideSign(room.side);
  const doorwayX = s * HALL.halfWidth;
  const vestibuleInnerX = s * (HALL.halfWidth + VESTIBULE_DEPTH);
  const inner = vestibuleInnerX;
  const outer = s * (HALL.halfWidth + VESTIBULE_DEPTH + ROOM_WIDTH);
  return {
    xMin: Math.min(inner, outer),
    xMax: Math.max(inner, outer),
    zMin: room.doorZ - ROOM_HALF_DEPTH,
    zMax: room.doorZ + ROOM_HALF_DEPTH,
    height: room.ceiling,
    doorwayX,
    vestibuleInnerX,
    arrival: [s * (HALL.halfWidth + VESTIBULE_DEPTH + 3.4), room.doorZ],
  };
}

/** Corridor position from which a door is squarely framed. */
export function doorApproach(room: RoomDef): [number, number] {
  const s = sideSign(room.side);
  return [s * (HALL.halfWidth - 3.1), room.doorZ];
}

/** Corridor stations the guided navigation steps between. */
export const HALL_STATIONS: Array<{ z: number; label: string }> = [
  { z: -3.5, label: 'ENTRANCE' },
  { z: -11, label: 'DOORS 01 / 02' },
  { z: -25, label: 'DOORS 03 / 04' },
  { z: -39, label: 'DOORS 05 / 06' },
  { z: -47, label: 'THE END WALL' },
];

export const IDENTITY = {
  name: 'SID',
  roles: ['CREATIVE DEVELOPER', 'AI BUILDER', 'DIGITAL CREATOR'],
  /** Shown small, under the name, on the end wall. */
  note: 'Computer engineering student. Builds because he is curious.',
} as const;
