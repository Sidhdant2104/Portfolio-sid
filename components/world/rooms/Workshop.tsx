'use client';

/**
 * THE WORKSHOP — skills.
 *
 * A pegboard over a bench. Each skill is a tool hanging on a hook with a
 * written tag, because "Python — 90%" tells you nothing and a tool with a note
 * about what it gets used for tells you the thing you actually wanted to know.
 * Nothing here is a progress bar.
 */

import { useMemo } from 'react';
import { Ink, boxEdges, circleXY, circleXZ, rectXY, type Stroke } from '@/components/sketch/Ink';
import { GroundShadow, Paper } from '@/components/sketch/Surface';
import { Bench, FramedWork, WallTitle, useObjectHover } from '@/components/world/props';
import { useRoomFrame } from '@/components/world/roomFrame';
import { noteTexture, roomTitleTexture, toolTagTexture } from '@/lib/panels';
import { paperTexture } from '@/lib/textures';
import { useWorld } from '@/lib/store';
import { approachObject } from '@/lib/transits';
import { sfx } from '@/lib/audio';
import { SKILLS, type SkillTool } from '@/data/rooms-content';
import { roomById } from '@/data/world';

/* Room extents, local. The bench and pegboard are on the far wall so they are
   what you are looking at the moment you arrive. */
const W = 14.5;
const HD = 5.6;
const CEIL = 4.5;

/**
 * Wall frame for the far wall.
 *
 * Everything on that wall is authored in a flat 2D frame — u along the wall, y
 * up — and this converts a point in it back to room-local space. That keeps the
 * tool positions readable as a row of numbers instead of a set of rotations.
 */
const wallPoint = (u: number, y: number, depth = 0.06): [number, number, number] => [W - depth, y, u];

const BOARD_Y = 2.05;

/** Drawn silhouette for each tool. Small, but the variety is the point. */
function ToolShape({ kind, seed }: { kind: SkillTool['object']; seed: number }) {
  const strokes = useMemo<Stroke[]>(() => {
    switch (kind) {
      case 'plane':
        return [
          ...rectXY(-0.17, -0.06, 0.34, 0.12, 0),
          [
            [-0.05, 0.06, 0],
            [0.02, 0.17, 0],
            [0.08, 0.06, 0],
          ],
          [
            [-0.17, 0, 0],
            [0.17, 0, 0],
          ],
        ];
      case 'caliper':
        return [
          [
            [-0.02, 0.18, 0],
            [-0.12, -0.15, 0],
          ],
          [
            [0.02, 0.18, 0],
            [0.12, -0.15, 0],
          ],
          ...circleXY(0, 0.18, 0.035, 0, 12),
          [
            [-0.08, 0.02, 0],
            [0.08, 0.02, 0],
          ],
        ];
      case 'chisel':
        return [
          ...rectXY(-0.035, -0.02, 0.07, 0.2, 0),
          [
            [-0.035, -0.02, 0],
            [-0.02, -0.18, 0],
            [0.02, -0.18, 0],
            [0.035, -0.02, 0],
          ],
        ];
      case 'lens':
        return [
          ...circleXY(0, 0.06, 0.12, 0, 20),
          ...circleXY(0, 0.06, 0.095, 0, 20),
          [
            [0, -0.06, 0],
            [0, -0.19, 0],
          ],
          [
            [-0.03, -0.19, 0],
            [0.03, -0.19, 0],
          ],
        ];
      case 'coil':
        return Array.from({ length: 5 }, (_, i) => circleXY(0, 0.14 - i * 0.07, 0.1 - i * 0.004, 0, 16)[0]).map(
          (s) => s,
        ) as Stroke[];
      case 'flask':
        return [
          [
            [-0.045, 0.18, 0],
            [-0.045, 0.05, 0],
            [-0.13, -0.16, 0],
            [0.13, -0.16, 0],
            [0.045, 0.05, 0],
            [0.045, 0.18, 0],
          ],
          [
            [-0.06, 0.18, 0],
            [0.06, 0.18, 0],
          ],
          [
            [-0.1, -0.07, 0],
            [0.1, -0.07, 0],
          ],
        ];
      case 'mallet':
        return [
          ...rectXY(-0.13, 0.06, 0.26, 0.13, 0),
          [
            [0, 0.06, 0],
            [0, -0.19, 0],
          ],
        ];
      case 'square':
      default:
        return [
          [
            [-0.14, 0.15, 0],
            [-0.14, -0.15, 0],
            [0.16, -0.15, 0],
          ],
          [
            [-0.1, 0.11, 0],
            [-0.1, -0.11, 0],
            [0.12, -0.11, 0],
          ],
        ];
    }
  }, [kind]);

  return <Ink strokes={strokes} width={2} wobble={0.004} overshoot={0.01} passes={2} seed={seed} />;
}

function Tool({ skill, index, count }: { skill: SkillTool; index: number; count: number }) {
  const { toWorld, toWorldDir } = useRoomFrame();
  const setReading = useWorld((st) => st.setReading);
  const tag = useMemo(() => toolTagTexture(skill.id, skill.name, skill.level), [skill]);
  // Spread along the wall, and stagger the hooks so the row is not a grid.
  const u = -3.55 + (index * 7.1) / Math.max(1, count - 1);
  const y = BOARD_Y + (index % 2 === 0 ? 0.6 : 0.1);
  const { handlers, click } = useObjectHover(`tool-${skill.id}`, 'EXPLORE', skill.name);

  const open = () => {
    const [rx, ry, rz] = wallPoint(u, y);
    const world = toWorld(rx, ry, rz);
    const dir = toWorldDir(-1, 0);
    approachObject(world, dir, 2.2, () => {
      sfx.paper();
      setReading({ kind: 'note', id: `skill:${skill.id}` });
    });
  };

  return (
    <group position={[u, y, 0.09]}>
      {/* Hook. */}
      <Ink
        strokes={[
          [
            [0, 0.5, 0.02],
            [0, 0.42, 0.05],
            [0.05, 0.4, 0.05],
          ],
        ]}
        width={1.8}
        wobble={0.003}
        seed={index + 3}
        opacity={0.6}
      />
      <group position={[0, 0.16, 0.05]} scale={1.3}>
        <ToolShape kind={skill.object} seed={index * 7 + 3} />
      </group>
      {/* Tag hanging beneath the tool. */}
      <group position={[0.1, -0.36, 0.04]} rotation={[0, 0, -0.06]}>
        <FramedWork
          id={`tag-${skill.id}`}
          texture={tag}
          size={[0.96, 0.343]}
          position={[0, 0, 0]}
          framed={false}
          verb="EXPLORE"
          label={skill.name}
          seed={index * 11 + 5}
          onSelect={open}
        />
      </group>
      {/* One larger hit area covering tool and tag together. */}
      <mesh position={[0, -0.06, 0.12]} visible={false} {...handlers} onClick={click(open)}>
        <planeGeometry args={[1.0, 0.98]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

export function Workshop() {
  const room = roomById('skills');
  const title = useMemo(() => roomTitleTexture(room.roomName, room.index, room.blurb), [room]);
  const paper = useMemo(() => paperTexture(5), []);

  const BOARD_W = 8.6;
  const BOARD_H = 2.5;

  /* Pegboard: a field of drilled holes, drawn. */
  const pegHoles = useMemo<Stroke[]>(() => {
    const out: Stroke[] = [];
    const cols = Math.floor(BOARD_W / 0.42);
    const rows = Math.floor(BOARD_H / 0.32);
    for (let iu = 0; iu < cols; iu++) {
      for (let iy = 0; iy < rows; iy++) {
        const u = -BOARD_W / 2 + 0.28 + iu * 0.42;
        const y = BOARD_Y - 0.34 + iy * 0.32;
        out.push(circleXY(u, y, 0.021, 0.01, 7)[0]);
      }
    }
    return out;
  }, [BOARD_W, BOARD_H]);

  const boardEdge = useMemo<Stroke[]>(
    () => rectXY(-BOARD_W / 2, BOARD_Y - 0.52, BOARD_W, BOARD_H, 0.02),
    [BOARD_W, BOARD_H],
  );

  const note = useMemo(
    () =>
      noteTexture(
        'workshop-intro',
        'HOW TO READ THIS ROOM',
        'Each tool is something I use, tagged with what it is for rather than a percentage. Percentages are a way of not answering the question. Take one down and read the note.',
        { meta: 'NOTE', accent: true, w: 700, h: 470 },
      ),
    [],
  );

  return (
    <group>
      {/* Room name, on the wall behind you as you come in. */}
      <WallTitle texture={title} size={[5.2, 2.28]} position={[0.09, 2.6, -2.3]} rotationY={Math.PI / 2} />

      {/* ------------------------------------------------- the wall of tools */}
      <group position={[W, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <Paper size={[BOARD_W, BOARD_H]} position={[0, BOARD_Y + 0.73, 0.02]} texture={paper} tint="#e8e2d4" />
        <Ink strokes={pegHoles} width={1} wobble={0.001} seed={31} opacity={0.2} />
        <Ink strokes={boardEdge} width={1.7} wobble={0.006} overshoot={0.025} seed={33} opacity={0.5} />

        {SKILLS.map((skill, i) => (
          <Tool key={skill.id} skill={skill} index={i} count={SKILLS.length} />
        ))}
      </group>

      {/* Bench beneath the board, running along the far wall. Shorter than the
          board so the board reads as the thing above it, not a matching pair. */}
      <group position={[W - 0.68, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <Bench length={6.4} depth={1.1} height={0.95} position={[0, 0, 0]} tint="#e5dfd0" seed={35} drawers={4} />
      </group>

      {/* A second bench in the room, with work left out on it. */}
      <group position={[10.6, 0, 3.2]} rotation={[0, 0.34, 0]}>
        <Bench length={3.0} depth={1.1} height={0.9} position={[0, 0, 0]} tint="#ece7db" seed={37} />
        {/* Parts and offcuts. */}
        {[
          [-1.05, 0.05, 0.32, 0.14],
          [-0.4, 0.06, 0.5, 0.2],
          [0.5, 0.04, 0.26, 0.4],
          [1.1, 0.08, 0.36, 0.24],
        ].map(([x, h, w, d], i) => (
          <group key={i}>
            <mesh position={[x, 0.9 + (h as number) / 2, (i % 2 === 0 ? -1 : 1) * 0.24]}>
              <boxGeometry args={[w as number, h as number, d as number]} />
              <meshBasicMaterial color="#e5dfd1" toneMapped={false} />
            </mesh>
            <Ink
              strokes={boxEdges(
                w as number,
                h as number,
                d as number,
                x as number,
                0.9 + (h as number) / 2,
                (i % 2 === 0 ? -1 : 1) * 0.24,
              )}
              width={1.5}
              wobble={0.004}
              overshoot={0.012}
              seed={i + 41}
              opacity={0.65}
            />
          </group>
        ))}
      </group>

      {/* A stool pulled out from the bench, and the shavings that go with it. */}
      <group position={[11.4, 0, 1.2]} rotation={[0, 0.5, 0]}>
        <mesh position={[0, 0.66, 0]}>
          <cylinderGeometry args={[0.23, 0.23, 0.055, 16]} />
          <meshBasicMaterial color="#e9e3d5" toneMapped={false} />
        </mesh>
        <Ink
          strokes={[
            ...circleXZ(0, 0, 0.23, 0.688, 18),
            ...circleXZ(0, 0, 0.23, 0.632, 18),
            ...(
              [
                [-0.18, -0.12],
                [0.19, -0.11],
                [0.02, 0.21],
              ] as Array<[number, number]>
            ).map(
              ([lx, lz]) =>
                [
                  [lx * 0.75, 0.63, lz * 0.75],
                  [lx * 1.35, 0, lz * 1.35],
                ] as Stroke,
            ),
            // Stretcher between two of the legs.
            [
              [-0.19, 0.26, -0.12],
              [0.2, 0.26, -0.11],
            ],
          ]}
          width={1.8}
          wobble={0.005}
          overshoot={0.014}
          passes={2}
          seed={51}
        />
        <GroundShadow size={[0.7, 0.7]} position={[0, 0.01, 0]} opacity={0.4} seed={53} />
      </group>

      {/* Timber and stock leaning in the corner. Workshops accumulate. Each
          length gets a second edge so it reads as a board rather than a wire. */}
      <group position={[W - 1.5, 0, -HD + 0.45]}>
        <GroundShadow size={[1.5, 1.0]} position={[-0.2, 0.01, 0]} opacity={0.4} seed={49} />
        <Ink
          strokes={(
            [
              [0, 0, -0.62, CEIL - 1.5, 0.09],
              [0.22, 0.08, -0.44, CEIL - 1.9, 0.07],
              [-0.24, -0.1, -0.86, CEIL - 2.4, 0.11],
            ] as Array<[number, number, number, number, number]>
          ).flatMap(([x0, z0, x1, top, t]) => [
            [
              [x0 - t, 0.02, z0],
              [x1 - t, top, z0 - 0.08],
            ],
            [
              [x0 + t, 0.02, z0],
              [x1 + t, top, z0 - 0.08],
            ],
            [
              [x1 - t, top, z0 - 0.08],
              [x1 + t, top, z0 - 0.08],
            ],
          ] as Stroke[])}
          width={1.9}
          wobble={0.008}
          overshoot={0.02}
          passes={2}
          seed={47}
          opacity={0.6}
        />
      </group>

      {/* The note explaining the room's logic, hung where you pass it. */}
      <FramedWork
        id="workshop-note"
        texture={note}
        size={[1.5, 1.007]}
        position={[2.9, 1.72, HD - 0.08]}
        rotationY={Math.PI}
        framed={false}
        verb="OPEN"
        label="HOW TO READ THIS ROOM"
        seed={45}
        onSelect={() => useWorld.getState().setReading({ kind: 'note', id: 'room:skills' })}
      />
    </group>
  );
}
