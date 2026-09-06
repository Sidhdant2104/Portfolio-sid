'use client';

/**
 * Local-to-world bridge for room interiors.
 *
 * Interiors are authored entirely in room-local coordinates, but the camera
 * choreography works in world space. This context hands each interior the
 * conversion so a click on a painting can say "walk to two metres in front of
 * me" without the room having to know where in the building it sits.
 */

import { createContext, useContext, useMemo } from 'react';
import { HALL, VESTIBULE_DEPTH, sideSign, type RoomDef } from '@/data/world';

export interface RoomFrame {
  room: RoomDef;
  /** Room-local point to world point. */
  toWorld: (x: number, y: number, z: number) => [number, number, number];
  /** Room-local direction on the floor plane to world direction. */
  toWorldDir: (x: number, z: number) => [number, number];
}

const RoomFrameContext = createContext<RoomFrame | null>(null);

export function RoomFrameProvider({ room, children }: { room: RoomDef; children: React.ReactNode }) {
  const value = useMemo<RoomFrame>(() => {
    const s = sideSign(room.side);
    const ox = s * (HALL.halfWidth + VESTIBULE_DEPTH);
    const oz = room.doorZ;
    // Left-hand rooms are the same group rotated 180° about Y, so both axes flip.
    const flip = s === 1 ? 1 : -1;
    return {
      room,
      toWorld: (x, y, z) => [ox + x * flip, y, oz + z * flip],
      toWorldDir: (x, z) => [x * flip, z * flip],
    };
  }, [room]);

  return <RoomFrameContext.Provider value={value}>{children}</RoomFrameContext.Provider>;
}

export function useRoomFrame() {
  const ctx = useContext(RoomFrameContext);
  if (!ctx) throw new Error('useRoomFrame must be used inside a RoomShell');
  return ctx;
}

/** For shared props that may also be used outside any room. */
export function useOptionalRoomFrame() {
  return useContext(RoomFrameContext);
}
