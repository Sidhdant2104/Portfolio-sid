'use client';

/**
 * The empty box each room is furnished inside.
 *
 * Rooms are authored in a local frame so their contents can be positioned in
 * plain, readable numbers: local +x points away from the corridor, local z runs
 * along it, and the origin sits on the doorway threshold at floor level. Left
 * and right rooms differ only by a 180° rotation of the group, which avoids
 * negative scaling (and therefore avoids mirrored lettering).
 *
 *        local +z
 *            ▲
 *            │     far wall, x = ROOM_WIDTH
 *   ┌────────┼──────────────────┐
 *   │        │                  │
 *   ╡ (0,0)  ┼──────────────────┤ ──► local +x, into the room
 *   │  door  │                  │
 *   └────────┼──────────────────┘
 *      vestibule, x ∈ [-3.2, 0]
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ink, type Stroke } from '@/components/sketch/Ink';
import { ContactShade, Paper } from '@/components/sketch/Surface';
import { Wall } from '@/components/world/Wall';
import { RoomFrameProvider } from '@/components/world/roomFrame';
import { nav } from '@/lib/animState';
import { worldState } from '@/lib/store';
import { tints } from '@/lib/theme';
import { draftedWallTexture, paperTexture, plankTexture } from '@/lib/textures';
import { DOORWAY, ROOM_HALF_DEPTH, ROOM_WIDTH, VESTIBULE_DEPTH, HALL, sideSign, type RoomDef } from '@/data/world';

export const ROOM_LOCAL = {
  width: ROOM_WIDTH,
  halfDepth: ROOM_HALF_DEPTH,
  vestibule: VESTIBULE_DEPTH,
} as const;

/** Distance from the doorway beyond which a room is not drawn at all. */
const CULL_RADIUS = 30;

export interface RoomShellProps {
  room: RoomDef;
  children?: React.ReactNode;
  /** Floor value; rooms differ mostly by how dark the floor reads. */
  floorTint?: string;
  wallTint?: string;
  /** Skylight strip along the ceiling, for the taller rooms. */
  skylight?: boolean;
  /** Number of plank tiles across, for floors that should read finer or coarser. */
  plankSeed?: number;
  quality?: 'high' | 'low';
}

export function RoomShell({
  room,
  children,
  floorTint = tints.floor,
  wallTint = tints.wall,
  skylight = false,
  plankSeed = 3,
  quality = 'high',
}: RoomShellProps) {
  const s = sideSign(room.side);
  const group = useRef<THREE.Group>(null);
  const W = ROOM_WIDTH;
  const D = ROOM_HALF_DEPTH * 2;
  const H = room.ceiling;
  const V = VESTIBULE_DEPTH;

  const planks = useMemo(() => plankTexture(plankSeed, 4), [plankSeed]);
  const wallPaper = useMemo(() => draftedWallTexture(room.doorZ + 31), [room.doorZ]);
  const plain = useMemo(() => paperTexture(5), []);

  /* Culling. Geometry is cheap but not free, and nothing is gained by drawing a
     room the visitor cannot possibly see through a closed door. */
  useFrame(() => {
    if (!group.current) return;
    const st = worldState();
    const doorX = s * HALL.halfWidth;
    const dist = Math.hypot(nav.px - doorX, nav.pz - room.doorZ);
    group.current.visible = st.zone === room.id || dist < CULL_RADIUS;
  });

  /* Skirting around the room, split around the doorway. Two lines close
     together at the base of the walls do more to make the box read as built
     than any amount of shading. */
  const skirting = useMemo<Stroke[]>(() => {
    const out: Stroke[] = [];
    const dw = DOORWAY.width / 2;
    const line = (y: number) => {
      out.push([
        [W - 0.02, y, -D / 2],
        [W - 0.02, y, D / 2],
      ]);
      out.push([
        [0, y, -D / 2 + 0.02],
        [W, y, -D / 2 + 0.02],
      ]);
      out.push([
        [0, y, D / 2 - 0.02],
        [W, y, D / 2 - 0.02],
      ]);
      out.push([
        [0.02, y, -D / 2],
        [0.02, y, -dw],
      ]);
      out.push([
        [0.02, y, dw],
        [0.02, y, D / 2],
      ]);
    };
    line(0.005);
    line(0.11);
    return out;
  }, [W, D]);

  const ceilingStrokes = useMemo<Stroke[]>(() => {
    const out: Stroke[] = [];
    // Beams across the ceiling, which give the room a read on its own depth.
    const beams = Math.max(3, Math.round(W / 3.4));
    for (let i = 1; i < beams; i++) {
      const x = (i * W) / beams;
      out.push([
        [x, H - 0.01, -D / 2],
        [x, H - 0.01, D / 2],
      ]);
    }
    return out;
  }, [W, D, H]);

  return (
    <group ref={group} position={[s * (HALL.halfWidth + V), 0, room.doorZ]} rotation={[0, s === 1 ? 0 : Math.PI, 0]}>
      {/* ---------------------------------------------------------- vestibule */}
      <Paper
        size={[V, DOORWAY.width]}
        position={[-V / 2, 0.004, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        texture={planks}
        tint={floorTint}
        repeat={[V / 1.8, DOORWAY.width / 5]}
      />
      <Paper
        size={[V, DOORWAY.width]}
        position={[-V / 2, DOORWAY.height, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        texture={plain}
        tint={tints.ceiling}
        repeat={[1, 1]}
      />
      {[-1, 1].map((dir) => (
        <Paper
          key={dir}
          size={[V, DOORWAY.height]}
          position={[-V / 2, DOORWAY.height / 2, (dir * DOORWAY.width) / 2]}
          rotation={[0, dir === 1 ? Math.PI : 0, 0]}
          texture={plain}
          tint={dir === 1 ? '#f0ebe0' : '#f7f4ed'}
        />
      ))}
      <Ink
        strokes={[
          [
            [-V, DOORWAY.height, -DOORWAY.width / 2],
            [0, DOORWAY.height, -DOORWAY.width / 2],
          ],
          [
            [-V, DOORWAY.height, DOORWAY.width / 2],
            [0, DOORWAY.height, DOORWAY.width / 2],
          ],
          [
            [-V, 0.01, -DOORWAY.width / 2],
            [0, 0.01, -DOORWAY.width / 2],
          ],
          [
            [-V, 0.01, DOORWAY.width / 2],
            [0, 0.01, DOORWAY.width / 2],
          ],
        ]}
        width={1.5}
        wobble={0.008}
        seed={room.doorZ + 3}
        opacity={0.4}
      />

      {/* --------------------------------------------------------------- floor */}
      <Paper
        size={[W, D]}
        position={[W / 2, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        texture={planks}
        tint={floorTint}
        repeat={[W / 1.8, D / 5]}
      />

      {/* ------------------------------------------------------------- ceiling */}
      <Paper
        size={[W, D]}
        position={[W / 2, H, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        texture={plain}
        tint={tints.ceiling}
        repeat={[W / 4, D / 4]}
      />
      <Ink strokes={ceilingStrokes} width={1.3} wobble={0.01} seed={room.doorZ + 7} opacity={0.22} />

      {skylight && (
        <group>
          <mesh position={[W / 2, H - 0.04, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[W * 0.34, D * 0.72]} />
            <meshBasicMaterial color="#fffef9" toneMapped={false} fog={false} />
          </mesh>
          <Ink
            strokes={[
              [
                [W / 2 - (W * 0.34) / 2, H - 0.05, -(D * 0.72) / 2],
                [W / 2 + (W * 0.34) / 2, H - 0.05, -(D * 0.72) / 2],
                [W / 2 + (W * 0.34) / 2, H - 0.05, (D * 0.72) / 2],
                [W / 2 - (W * 0.34) / 2, H - 0.05, (D * 0.72) / 2],
                [W / 2 - (W * 0.34) / 2, H - 0.05, -(D * 0.72) / 2],
              ],
              // Glazing bars.
              ...Array.from({ length: 4 }, (_, i) => [
                [W / 2 - (W * 0.34) / 2, H - 0.05, -(D * 0.72) / 2 + ((i + 1) * D * 0.72) / 5],
                [W / 2 + (W * 0.34) / 2, H - 0.05, -(D * 0.72) / 2 + ((i + 1) * D * 0.72) / 5],
              ] as Stroke),
            ]}
            width={1.6}
            wobble={0.008}
            seed={room.doorZ + 11}
            opacity={0.5}
          />
          {/* Daylight falling onto the floor beneath the glazing. */}
          <mesh position={[W / 2, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[W * 0.42, D * 0.8]} />
            <meshBasicMaterial color="#fffdf6" transparent opacity={0.3} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      )}

      {/* --------------------------------------------------------------- walls */}
      {/* Near wall, with the opening back into the vestibule. */}
      <Wall
        length={D}
        height={H}
        apertures={[{ center: D / 2, width: DOORWAY.width, height: DOORWAY.height }]}
        position={[0, 0, D / 2]}
        rotation={[0, Math.PI / 2, 0]}
        texture={wallPaper}
        tint="#f7f4ed"
        tileSize={4.5}
        seed={room.doorZ + 13}
      />
      <Wall
        length={D}
        height={H}
        position={[W, 0, -D / 2]}
        rotation={[0, -Math.PI / 2, 0]}
        texture={wallPaper}
        tint="#e4dfd2"
        tileSize={4.5}
        seed={room.doorZ + 17}
      />
      <Wall
        length={W}
        height={H}
        position={[0, 0, -D / 2]}
        texture={wallPaper}
        tint={wallTint}
        tileSize={4.5}
        seed={room.doorZ + 19}
      />
      <Wall
        length={W}
        height={H}
        position={[W, 0, D / 2]}
        rotation={[0, Math.PI, 0]}
        texture={wallPaper}
        tint="#efebe0"
        tileSize={4.5}
        seed={room.doorZ + 23}
      />

      <Ink strokes={skirting} width={1.6} wobble={0.007} overshoot={0.02} seed={room.doorZ + 29} opacity={0.4} />

      {/* Shading where the walls meet the floor. */}
      {quality === 'high' && (
        <group>
          <ContactShade
            size={[D, 1.2]}
            position={[W - 0.05, 0.6, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            opacity={0.2}
            seed={2}
            repeat={[Math.max(2, Math.round(D / 2)), 1]}
          />
          <ContactShade
            size={[W, 1.2]}
            position={[W / 2, 0.6, -D / 2 + 0.05]}
            opacity={0.16}
            seed={3}
            repeat={[Math.max(2, Math.round(W / 2)), 1]}
          />
          <ContactShade
            size={[W, 1.2]}
            position={[W / 2, 0.6, D / 2 - 0.05]}
            rotation={[0, Math.PI, 0]}
            opacity={0.16}
            seed={4}
            repeat={[Math.max(2, Math.round(W / 2)), 1]}
          />
        </group>
      )}

      {/* Corner shading. Two vertical gradients per far corner is enough to
          stop the box reading as a flat cube. */}
      {quality === 'high' &&
        (
          [
            [W - 0.07, -D / 2 + 0.6, -Math.PI / 2],
            [W - 0.07, D / 2 - 0.6, -Math.PI / 2],
          ] as Array<[number, number, number]>
        ).map(([x, z, ry], i) => (
          <ContactShade
            key={i}
            size={[1.6, H]}
            position={[x, H / 2, z]}
            rotation={[0, ry, Math.PI / 2]}
            opacity={0.14}
            seed={i + 5}
            repeat={[2, 1]}
          />
        ))}

      <RoomFrameProvider room={room}>{children}</RoomFrameProvider>
    </group>
  );
}
