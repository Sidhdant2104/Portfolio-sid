'use client';

/**
 * Development-only handle on the world.
 *
 * Walking to the far end of the building to check a wall is not a reasonable
 * inner loop, so in development the transits and the reading layer are exposed
 * for scripted inspection. Stripped from production builds.
 */

import { nav } from './animState';
import { useWorld, type ReadingTarget } from './store';
import { enterRoom, exitRoom, goToCorridor, leaveBuilding } from './transits';
import { HALL, roomBounds, roomById, type RoomId } from '@/data/world';

export function installDevBridge() {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return;
  Object.assign(window, {
    __world: {
      enter: (id: RoomId) => enterRoom(id),
      exit: () => exitRoom(),
      outside: () => leaveBuilding(),
      corridor: (z = -11) => goToCorridor(z),
      read: (target: ReadingTarget) => useWorld.getState().setReading(target),
      /** Place the camera without any choreography. Negative yaw looks right. */
      jump: (zone: 'hall' | 'exterior' | RoomId, z = -6, yaw?: number) => {
        const st = useWorld.getState();
        let facing = yaw ?? 0;
        if (zone === 'exterior') {
          nav.px = 0;
          nav.pz = 21.5;
        } else if (zone === 'hall') {
          nav.px = 0;
          nav.pz = Math.max(HALL.zEnd + 2, z);
        } else {
          const room = roomById(zone);
          const b = roomBounds(room);
          nav.px = b.arrival[0];
          nav.pz = b.arrival[1];
          /* Face into the room, as the doorway transit leaves you — otherwise
             a jump lands looking at a side wall and everything appears empty. */
          if (yaw === undefined) facing = room.side === 'left' ? Math.PI / 2 : -Math.PI / 2;
          st.setOpenDoor(zone);
        }
        nav.yaw = facing;
        nav.pitch = 0;
        st.setZone(zone);
        st.setPhase('open');
      },
      state: () => ({ ...useWorld.getState(), nav: { ...nav } }),
    },
  });
}
