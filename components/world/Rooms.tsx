'use client';

/**
 * Every room, mounted at once.
 *
 * They all live in the same scene graph permanently; visibility culling in
 * `RoomShell` keeps the cost down. Mounting and unmounting on entry would
 * reintroduce exactly the load-a-new-page feeling the whole build exists to
 * avoid.
 */

import { RoomShell } from '@/components/world/RoomShell';
import { Gallery } from '@/components/world/rooms/Gallery';
import { Workshop } from '@/components/world/rooms/Workshop';
import { Study } from '@/components/world/rooms/Study';
import { Archive } from '@/components/world/rooms/Archive';
import { Lab } from '@/components/world/rooms/Lab';
import { SignalRoom } from '@/components/world/rooms/SignalRoom';
import { ROOMS, type RoomId } from '@/data/world';

/** Per-room shell settings. The differences here are most of what makes each space feel distinct. */
const SHELL: Record<RoomId, { floorTint: string; wallTint: string; skylight: boolean; plankSeed: number }> = {
  projects: { floorTint: '#dfd9c9', wallTint: '#f7f4ee', skylight: true, plankSeed: 3 },
  skills: { floorTint: '#d5cebc', wallTint: '#ede8de', skylight: false, plankSeed: 23 },
  about: { floorTint: '#dbd4c2', wallTint: '#f1ede2', skylight: false, plankSeed: 29 },
  experience: { floorTint: '#e1dbcb', wallTint: '#f4f1e9', skylight: true, plankSeed: 31 },
  experiments: { floorTint: '#d7d0be', wallTint: '#eae5da', skylight: false, plankSeed: 37 },
  contact: { floorTint: '#e2ddce', wallTint: '#f8f6f0', skylight: true, plankSeed: 41 },
};

const INTERIOR: Record<RoomId, React.ComponentType> = {
  projects: Gallery,
  skills: Workshop,
  about: Study,
  experience: Archive,
  experiments: Lab,
  contact: SignalRoom,
};

export function Rooms({ quality }: { quality: 'high' | 'low' }) {
  return (
    <>
      {ROOMS.map((room) => {
        const Interior = INTERIOR[room.id];
        return (
          <RoomShell key={room.id} room={room} quality={quality} {...SHELL[room.id]}>
            <Interior />
          </RoomShell>
        );
      })}
    </>
  );
}
