'use client';

/**
 * THE ARCHIVE — experience.
 *
 * A timeline filed vertically. The oldest work sits lowest and the present is
 * overhead, so reading the room means looking up — which is a more honest
 * shape for a career in progress than a horizontal line with an arrow on it.
 */

import { useMemo } from 'react';
import { Ink, boxEdges, rectXY, type Stroke } from '@/components/sketch/Ink';
import { GroundShadow } from '@/components/sketch/Surface';
import { FramedWork, WallTitle } from '@/components/world/props';
import { useRoomFrame } from '@/components/world/roomFrame';
import { archiveCardTexture, noteTexture, roomTitleTexture } from '@/lib/panels';
import { useWorld } from '@/lib/store';
import { approachObject } from '@/lib/transits';
import { sfx } from '@/lib/audio';
import { EXPERIENCE } from '@/data/rooms-content';
import { roomById } from '@/data/world';

/* Room extents, local. The timeline climbs the far wall, so arriving in the
   room means arriving at the bottom of it and looking up. */
const W = 14.5;
const HD = 5.6;
const CEIL = 6.0;
/** Content on the far wall is authored in a flat u/y frame, then rotated in. */
const FACE_IN = -Math.PI / 2;

export function Archive() {
  const room = roomById('experience');
  const { toWorld, toWorldDir } = useRoomFrame();
  const setReading = useWorld((st) => st.setReading);
  const title = useMemo(() => roomTitleTexture(room.roomName, room.index, room.blurb), [room]);
  const note = useMemo(
    () =>
      noteTexture(
        'archive-intro',
        'READ FROM THE BOTTOM',
        'Earliest at floor level, most recent overhead. Most of this is self-directed work, which is the honest description — I built these because I wanted them to exist.',
        { meta: 'NOTE', accent: true, w: 700, h: 460 },
      ),
    [],
  );

  const cards = useMemo(
    () =>
      EXPERIENCE.map((e) => ({
        entry: e,
        texture: archiveCardTexture(e.id, e.period, e.title, e.org, e.kind, e.tags),
      })),
    [],
  );

  /**
   * Cards climb the long wall in a staggered column. Reversed so the earliest
   * entry is at the bottom.
   */
  const placed = useMemo(() => {
    const ordered = [...cards].reverse();
    const n = Math.max(1, ordered.length - 1);
    return ordered.map((c, i) => ({
      ...c,
      // u runs along the far wall; y climbs from floor level to overhead.
      u: -4.5 + (i * 8.4) / n,
      y: 1.24 + (i * 3.4) / n,
    }));
  }, [cards]);

  const open = (id: string, u: number, y: number) => {
    approachObject(toWorld(W - 0.06, y, u), toWorldDir(-1, 0), 3.1, () => {
      sfx.paper();
      setReading({ kind: 'note', id: `experience:${id}` });
    });
  };

  /* A drawn armature connecting the cards: the timeline made physical. */
  const rig = useMemo<Stroke[]>(() => {
    const out: Stroke[] = [];
    for (let i = 0; i < placed.length; i++) {
      const p = placed[i];
      // Hanger from the card up to a rail.
      out.push([
        [p.u, p.y + 0.62, 0.03],
        [p.u, p.y + 0.94, 0.03],
      ]);
      if (i < placed.length - 1) {
        const n = placed[i + 1];
        out.push([
          [p.u, p.y + 0.94, 0.03],
          [n.u, n.y + 0.94, 0.03],
        ]);
      }
      // Year tick on the rail.
      out.push([
        [p.u - 0.12, p.y + 0.94, 0.03],
        [p.u + 0.12, p.y + 0.94, 0.03],
      ]);
    }
    return out;
  }, [placed]);

  return (
    <group>
      <WallTitle texture={title} size={[5.4, 2.36]} position={[0.09, 3.3, -2.4]} rotationY={Math.PI / 2} />

      {/* ------------------------------------------------ the timeline, climbing */}
      <group position={[W, 0, 0]} rotation={[0, FACE_IN, 0]}>
        <Ink strokes={rig} width={1.7} wobble={0.005} overshoot={0.015} seed={81} opacity={0.55} />
        {placed.map((p, i) => (
          <FramedWork
            key={p.entry.id}
            id={`archive-${p.entry.id}`}
            texture={p.texture}
            size={[1.94, 1.072]}
            position={[p.u, p.y, 0]}
            rotationZ={i % 2 === 0 ? 0.008 : -0.01}
            frame={0.055}
            verb="VIEW"
            label={p.entry.title}
            seed={83 + i}
            onSelect={() => open(p.entry.id, p.u, p.y)}
          />
        ))}
      </group>

      {/* Filing cabinets along the side wall — the rest of the archive,
          implied rather than shown. */}
      {[0, 1, 2, 3].map((i) => {
        const x = 2.8 + i * 2.5;
        return (
          <group key={i} position={[x, 0, HD - 0.4]} rotation={[0, Math.PI, 0]}>
            <mesh position={[0, 0.68, 0]}>
              <boxGeometry args={[1.1, 1.36, 0.66]} />
              <meshBasicMaterial color="#ebe6da" toneMapped={false} />
            </mesh>
            <Ink
              strokes={[
                ...boxEdges(1.1, 1.36, 0.66, 0, 0.68, 0),
                ...Array.from({ length: 4 }, (_, d) =>
                  rectXY(-0.46, 0.1 + d * 0.32, 0.92, 0.27, 0.335),
                ).flat(),
                // Drawer pulls.
                ...Array.from(
                  { length: 4 },
                  (_, d) =>
                    [
                      [-0.11, 0.235 + d * 0.32, 0.345],
                      [0.11, 0.235 + d * 0.32, 0.345],
                    ] as Stroke,
                ),
              ]}
              width={1.7}
              wobble={0.004}
              overshoot={0.014}
              passes={2}
              seed={91 + i}
            />
            <GroundShadow size={[1.6, 1.2]} position={[0, 0.01, 0]} opacity={0.45} seed={95 + i} />
            {/* Boxes stacked on top of a couple of them. */}
            {i % 2 === 0 && (
              <group position={[0.06, 1.36, 0.02]} rotation={[0, 0.16, 0]}>
                <mesh position={[0, 0.16, 0]}>
                  <boxGeometry args={[0.86, 0.32, 0.54]} />
                  <meshBasicMaterial color="#e6e0d2" toneMapped={false} />
                </mesh>
                <Ink strokes={boxEdges(0.86, 0.32, 0.54, 0, 0.16, 0)} width={1.6} wobble={0.004} seed={99 + i} opacity={0.7} />
              </group>
            )}
          </group>
        );
      })}

      {/* Boxes waiting to be filed, left on the floor along the walk in. */}
      {(
        [
          [8.0, 2.6, 0.3, 0],
          [8.5, 2.9, -0.22, 0.38],
          [10.4, 2.1, 0.62, 0],
        ] as Array<[number, number, number, number]>
      ).map(([x, z, rot, lift], i) => (
        <group key={i} position={[x, lift, z]} rotation={[0, rot, 0]}>
          <mesh position={[0, 0.19, 0]}>
            <boxGeometry args={[0.82, 0.38, 0.56]} />
            <meshBasicMaterial color="#e6e0d2" toneMapped={false} />
          </mesh>
          <Ink
            strokes={[
              ...boxEdges(0.82, 0.38, 0.56, 0, 0.19, 0),
              ...rectXY(-0.24, 0.12, 0.48, 0.14, 0.285),
            ]}
            width={1.7}
            wobble={0.005}
            overshoot={0.014}
            passes={2}
            seed={107 + i}
          />
          {lift === 0 && <GroundShadow size={[1.2, 0.9]} position={[0, 0.01, 0]} opacity={0.42} seed={111 + i} />}
        </group>
      ))}

      {/* A ladder leaning where the timeline goes out of reach. */}
      <group position={[W - 0.55, 0, 5.15]} rotation={[0, FACE_IN, -0.075]}>
        <Ink
          strokes={[
            [
              [-0.26, 0, 0],
              [-0.26, CEIL - 1.2, 0],
            ],
            [
              [0.26, 0, 0],
              [0.26, CEIL - 1.2, 0],
            ],
            ...Array.from(
              { length: 13 },
              (_, i) =>
                [
                  [-0.26, 0.3 + i * 0.32, 0],
                  [0.26, 0.3 + i * 0.32, 0],
                ] as Stroke,
            ),
          ]}
          width={2}
          wobble={0.005}
          overshoot={0.016}
          passes={2}
          seed={101}
        />
        <GroundShadow size={[0.9, 0.6]} position={[0, 0.01, 0.1]} opacity={0.35} seed={103} />
      </group>

      <FramedWork
        id="archive-note"
        texture={note}
        size={[1.5, 0.986]}
        position={[3.1, 1.72, -HD + 0.08]}
        framed={false}
        verb="OPEN"
        label="READ FROM THE BOTTOM"
        seed={105}
        onSelect={() => useWorld.getState().setReading({ kind: 'note', id: 'room:experience' })}
      />
    </group>
  );
}
