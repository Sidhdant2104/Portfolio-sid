'use client';

/**
 * THE LAB — experiments.
 *
 * The only room permitted to be untidy. Cards are pinned at wrong angles,
 * strung together with cable, and half of them are stamped ABANDONED. It is
 * the room that says the four polished projects in the gallery are the
 * survivors of a much larger and much worse population.
 */

import { useMemo } from 'react';
import { Ink, boxEdges, circleXY, rectXY, type Stroke } from '@/components/sketch/Ink';
import { GroundShadow } from '@/components/sketch/Surface';
import { Bench, FramedWork, WallTitle } from '@/components/world/props';
import { useRoomFrame } from '@/components/world/roomFrame';
import { labCardTexture, noteTexture, roomTitleTexture } from '@/lib/panels';
import { useWorld } from '@/lib/store';
import { approachObject } from '@/lib/transits';
import { sfx } from '@/lib/audio';
import { EXPERIMENTS } from '@/data/rooms-content';
import { roomById } from '@/data/world';
import { makeRng } from '@/lib/rand';

/* Room extents, local. Cards go on the far wall so the mess is what you walk
   into; the benches and the rig fill the floor you have to walk around. */
const W = 14.5;
const HD = 5.6;
const FACE_IN = -Math.PI / 2;

export function Lab() {
  const room = roomById('experiments');
  const { toWorld, toWorldDir } = useRoomFrame();
  const setReading = useWorld((st) => st.setReading);
  const title = useMemo(() => roomTitleTexture(room.roomName, room.index, room.blurb), [room]);
  const note = useMemo(
    () =>
      noteTexture(
        'lab-intro',
        'NOTHING HERE IS FINISHED',
        'That is the point. Half of these do not work and two of them never will. They are here because the four projects across the corridor came out of a room that looks like this one.',
        { meta: 'NOTE', accent: true, w: 720, h: 470 },
      ),
    [],
  );

  /* Whiteboard scrawl: illegible on purpose, and deterministic so it never
     redraws itself while you are looking at it. */
  const workings = useMemo<Stroke[]>(() => {
    const rng = makeRng(1997);
    const out: Stroke[] = [...rectXY(-2.0, -1.2, 4.0, 2.4, 0.006)];
    for (let i = 0; i < 26; i++) {
      const x = -1.8 + rng() * 3.1;
      const y = -1.0 + rng() * 2.0;
      out.push([
        [x, y, 0.008],
        [x + 0.14 + rng() * 0.64, y + (rng() - 0.5) * 0.1, 0.008],
      ]);
    }
    for (let i = 0; i < 5; i++) {
      const x = -1.6 + rng() * 2.8;
      const y = -0.9 + rng() * 1.8;
      out.push(circleXY(x, y, 0.11 + rng() * 0.18, 0.008, 14)[0]);
    }
    out.push([
      [-1.3, 0.36, 0.01],
      [0.2, -0.28, 0.01],
    ]);
    return out;
  }, []);

  /* Scatter the cards across the far wall — irregular, but deterministic. */
  const placed = useMemo(() => {
    const rng = makeRng(4517);
    const n = Math.max(1, EXPERIMENTS.length - 1);
    return EXPERIMENTS.map((e, i) => ({
      entry: e,
      texture: labCardTexture(e.id, e.name, e.status, e.tag),
      u: -4.1 + (i * 8.2) / n + (rng() - 0.5) * 0.55,
      y: 1.45 + (i % 3) * 1.14 + (rng() - 0.5) * 0.34,
      tilt: (e.tilt * Math.PI) / 180,
    }));
  }, []);

  const open = (id: string, y: number, u: number) => {
    approachObject(toWorld(W - 0.06, y, u), toWorldDir(-1, 0), 2.5, () => {
      sfx.paper();
      setReading({ kind: 'note', id: `experiment:${id}` });
    });
  };

  /* Cable strung between pins, sagging. */
  const cabling = useMemo<Stroke[]>(() => {
    const out: Stroke[] = [];
    for (let i = 0; i < placed.length - 1; i++) {
      const a = placed[i];
      const b = placed[i + 1];
      const midU = (a.u + b.u) / 2;
      const midY = Math.min(a.y, b.y) - 0.42;
      out.push([
        [a.u, a.y + 0.5, 0.04],
        [midU, midY + 0.9, 0.04],
        [b.u, b.y + 0.5, 0.04],
      ]);
    }
    // Pins.
    for (const p of placed) out.push(circleXY(p.u, p.y + 0.5, 0.028, 0.05, 8)[0]);
    return out;
  }, [placed]);

  /* Junk on the benches. Random-looking, seeded. */
  const junk = useMemo(() => {
    const rng = makeRng(881);
    return Array.from({ length: 20 }, (_, i) => ({
      x: 2.4 + rng() * 11.2,
      z: HD - 1.55 + rng() * 1.1,
      w: 0.14 + rng() * 0.42,
      h: 0.06 + rng() * 0.36,
      d: 0.12 + rng() * 0.34,
      rot: (rng() - 0.5) * 1.4,
      key: i,
    }));
  }, []);

  return (
    <group>
      <WallTitle texture={title} size={[5.4, 2.36]} position={[0.09, 3.0, -2.4]} rotationY={Math.PI / 2} />

      {/* ---------------------------------------------- the wall of loose ends */}
      <group position={[W, 0, 0]} rotation={[0, FACE_IN, 0]}>
        <Ink strokes={cabling} width={1.5} wobble={0.012} seed={111} opacity={0.5} />
        {placed.map((p, i) => (
          <FramedWork
            key={p.entry.id}
            id={`lab-${p.entry.id}`}
            texture={p.texture}
            size={[1.68, 1.2]}
            position={[p.u, p.y, 0]}
            rotationZ={p.tilt}
            framed={false}
            verb="EXPLORE"
            label={p.entry.name}
            seed={113 + i}
            onSelect={() => open(p.entry.id, p.y, p.u)}
          />
        ))}
      </group>

      {/* Two benches shoved together along the side wall, covered in parts. */}
      <Bench length={7.2} depth={1.4} height={0.88} position={[5.2, 0, HD - 1.0]} tint="#e7e1d3" seed={121} />
      <Bench length={4.6} depth={1.3} height={0.82} position={[11.4, 0, HD - 1.1]} rotationY={0.1} tint="#e9e3d5" seed={123} />

      {junk.map((j) => (
        <group key={j.key} position={[j.x, 0.88 + j.h / 2, j.z]} rotation={[0, j.rot, 0]}>
          <mesh>
            <boxGeometry args={[j.w, j.h, j.d]} />
            <meshBasicMaterial color="#e4ded0" toneMapped={false} />
          </mesh>
          <Ink strokes={boxEdges(j.w, j.h, j.d)} width={1.4} wobble={0.004} overshoot={0.01} seed={j.key + 131} opacity={0.6} />
        </group>
      ))}

      {/* A rig of poles and clamps in the middle of the floor — the thing
          currently being built. */}
      <group position={[9.0, 0, -1.3]} rotation={[0, 0.4, 0]} scale={0.7}>
        <Ink
          strokes={[
            [
              [0, 0, 0],
              [0, 2.3, 0],
            ],
            [
              [-0.9, 0, 0.5],
              [-0.9, 1.7, 0.5],
            ],
            [
              [0.85, 0, -0.4],
              [0.85, 1.95, -0.4],
            ],
            [
              [0, 2.3, 0],
              [-0.9, 1.7, 0.5],
            ],
            [
              [0, 2.3, 0],
              [0.85, 1.95, -0.4],
            ],
            [
              [-0.9, 1.7, 0.5],
              [0.85, 1.95, -0.4],
            ],
            [
              [-1.1, 0.02, 0.62],
              [1.05, 0.02, -0.5],
            ],
            ...rectXY(-0.34, 1.02, 0.68, 0.46, 0),
          ]}
          width={2.1}
          wobble={0.006}
          overshoot={0.02}
          passes={2}
          seed={141}
        />
        <GroundShadow size={[2.6, 2.0]} position={[0, 0.01, 0]} opacity={0.35} seed={143} />
      </group>

      {/* Whiteboard on the side wall, covered in the usual illegible workings. */}
      <group position={[8.6, 2.3, -HD + 0.08]}>
        <mesh>
          <planeGeometry args={[4.0, 2.4]} />
          <meshBasicMaterial color="#fcfaf5" toneMapped={false} />
        </mesh>
        <Ink strokes={workings} width={1.5} wobble={0.008} seed={151} opacity={0.45} />
      </group>

      <FramedWork
        id="lab-note"
        texture={note}
        size={[1.55, 1.012]}
        position={[3.0, 1.74, -HD + 0.08]}
        framed={false}
        verb="OPEN"
        label="NOTHING HERE IS FINISHED"
        seed={161}
        onSelect={() => useWorld.getState().setReading({ kind: 'note', id: 'room:experiments' })}
      />
    </group>
  );
}
