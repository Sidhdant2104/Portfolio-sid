'use client';

/**
 * The corridor.
 *
 * The spine of the building and the only place all six destinations are
 * visible at once. Almost everything here is blank wall on purpose: the plank
 * floor does the heavy lifting, because its converging grain is what tells the
 * eye how far away the far end is. The doors are the only saturated objects in
 * the space, so they read as the things you are meant to touch.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { Ink, type Stroke } from '@/components/sketch/Ink';
import { ContactShade, Paper } from '@/components/sketch/Surface';
import { DoorAssembly } from '@/components/world/Door';
import { Wall } from '@/components/world/Wall';
import { identityWallTexture } from '@/lib/panels';
import { draftedWallTexture, paperTexture, plankTexture } from '@/lib/textures';
import { tints } from '@/lib/theme';
import { DOORWAY, HALL, ROOMS, sideSign } from '@/data/world';

const LENGTH = Math.abs(HALL.zEnd);
const WIDTH = HALL.halfWidth * 2;

/** Plank tile footprint in metres, used to keep floor tiling consistent. */
const PLANK_TILE_W = 1.8;
const PLANK_TILE_L = 5;

export function Hall() {
  const planks = useMemo(() => plankTexture(3, 4), []);
  const wallPaper = useMemo(() => draftedWallTexture(11), []);
  const plainPaper = useMemo(() => paperTexture(5), []);
  const identity = useMemo(() => identityWallTexture(), []);

  /* Wayfinding drawn straight onto the floor: a lane to each door, numbered. */
  const floorMarks = useMemo<Stroke[]>(() => {
    const out: Stroke[] = [];
    const y = 0.014;
    for (const room of ROOMS) {
      const s = sideSign(room.side);
      const z0 = room.doorZ - DOORWAY.width / 2;
      const z1 = room.doorZ + DOORWAY.width / 2;
      // Lanes run from the edge of the runner out to each doorway.
      out.push([
        [s * 1.15, y, z0],
        [s * (HALL.halfWidth - 0.12), y, z0],
      ]);
      out.push([
        [s * 1.15, y, z1],
        [s * (HALL.halfWidth - 0.12), y, z1],
      ]);
    }
    return out;
  }, []);

  /* Ceiling light troughs, spaced to give the corridor a measured rhythm. */
  const fixtures = useMemo(() => {
    const zs: number[] = [];
    for (let z = -4; z > HALL.zEnd + 3; z -= 6.4) zs.push(z);
    return zs;
  }, []);

  return (
    <group>
      {/* Floor. */}
      <Paper
        size={[WIDTH, LENGTH]}
        position={[0, 0, HALL.zEnd / 2]}
        rotation={[-Math.PI / 2, 0, 0]}
        texture={planks}
        tint={tints.floor}
        repeat={[WIDTH / PLANK_TILE_W, LENGTH / PLANK_TILE_L]}
      />
      {/* A runner down the middle. Its converging edges are the strongest depth
          cue in the building, and it gives the walk an obvious line to follow. */}
      <Paper
        size={[2.3, LENGTH - 3]}
        position={[0, 0.006, HALL.zEnd / 2 - 1]}
        rotation={[-Math.PI / 2, 0, 0]}
        texture={plainPaper}
        tint="#ddd6c5"
        repeat={[1, (LENGTH - 3) / 4]}
      />
      <Ink
        strokes={[
          [
            [-1.15, 0.012, -1.5],
            [-1.15, 0.012, HALL.zEnd + 1.5],
          ],
          [
            [1.15, 0.012, -1.5],
            [1.15, 0.012, HALL.zEnd + 1.5],
          ],
          [
            [-1.15, 0.012, -1.5],
            [1.15, 0.012, -1.5],
          ],
          [
            [-1.15, 0.012, HALL.zEnd + 1.5],
            [1.15, 0.012, HALL.zEnd + 1.5],
          ],
        ]}
        width={1.5}
        wobble={0.016}
        overshoot={0.06}
        seed={67}
        opacity={0.35}
      />
      <Ink strokes={floorMarks} width={1.3} wobble={0.014} overshoot={0.05} seed={71} opacity={0.28} />

      {/* Ceiling. */}
      <Paper
        size={[WIDTH, LENGTH]}
        position={[0, HALL.height, HALL.zEnd / 2]}
        rotation={[Math.PI / 2, 0, 0]}
        texture={plainPaper}
        tint={tints.ceiling}
        repeat={[WIDTH / 4, LENGTH / 4]}
      />
      {fixtures.map((z, i) => (
        <group key={i} position={[0, HALL.height - 0.06, z]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.6, 0.34]} />
            <meshBasicMaterial color="#fffdf7" toneMapped={false} fog={false} />
          </mesh>
          <Ink
            strokes={[
              [
                [-1.3, 0, -0.17],
                [1.3, 0, -0.17],
              ],
              [
                [-1.3, 0, 0.17],
                [1.3, 0, 0.17],
              ],
              [
                [-1.3, 0, -0.17],
                [-1.3, 0, 0.17],
              ],
              [
                [1.3, 0, -0.17],
                [1.3, 0, 0.17],
              ],
            ]}
            width={1.4}
            wobble={0.006}
            overshoot={0.02}
            seed={i + 3}
            opacity={0.45}
          />
        </group>
      ))}

      {/* Side walls, with the door apertures cut out. */}
      <Wall
        length={LENGTH}
        height={HALL.height}
        apertures={ROOMS.filter((r) => r.side === 'left').map((r) => ({
          center: -r.doorZ,
          width: DOORWAY.width,
          height: DOORWAY.height,
        }))}
        position={[-HALL.halfWidth, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        texture={wallPaper}
        tint={tints.wallLeft}
        tileSize={4.5}
        seed={13}
      />
      <Wall
        length={LENGTH}
        height={HALL.height}
        apertures={ROOMS.filter((r) => r.side === 'right').map((r) => ({
          center: LENGTH + r.doorZ,
          width: DOORWAY.width,
          height: DOORWAY.height,
        }))}
        position={[HALL.halfWidth, 0, HALL.zEnd]}
        rotation={[0, -Math.PI / 2, 0]}
        texture={wallPaper}
        tint={tints.wallRight}
        tileSize={4.5}
        seed={17}
      />

      {/* Far wall: the only place the name appears at size. */}
      <Wall
        length={WIDTH}
        height={HALL.height}
        position={[-HALL.halfWidth, 0, HALL.zEnd]}
        rotation={[0, 0, 0]}
        texture={plainPaper}
        tint={tints.wall}
        tileSize={4}
        seed={19}
      />
      <mesh position={[0, 2.3, HALL.zEnd + 0.05]}>
        <planeGeometry args={[6.2, 4.24]} />
        <meshBasicMaterial map={identity} transparent toneMapped={false} />
      </mesh>

      {/* Ceiling/wall junction shading down both sides. */}
      <ContactShade
        size={[LENGTH, 0.9]}
        position={[-HALL.halfWidth + 0.06, HALL.height - 0.45, HALL.zEnd / 2]}
        rotation={[0, Math.PI / 2, Math.PI]}
        opacity={0.16}
        seed={23}
        repeat={[14, 1]}
      />
      <ContactShade
        size={[LENGTH, 0.9]}
        position={[HALL.halfWidth - 0.06, HALL.height - 0.45, HALL.zEnd / 2]}
        rotation={[0, -Math.PI / 2, Math.PI]}
        opacity={0.16}
        seed={29}
        repeat={[14, 1]}
      />

      {ROOMS.map((room) => (
        <DoorAssembly key={room.id} room={room} />
      ))}
    </group>
  );
}

export { LENGTH as HALL_LENGTH, WIDTH as HALL_WIDTH };
export type { THREE };
