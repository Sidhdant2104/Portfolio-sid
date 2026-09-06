'use client';

/**
 * THE STUDY — about.
 *
 * A desk, a shelf, a guitar and a camera. The bio is not written on a wall;
 * it is distributed across the objects, and you get it by picking things up.
 * The room is the lowest-ceilinged in the building on purpose — after the
 * gallery it should feel like stepping into somewhere private.
 */

import { useMemo } from 'react';
import { Ink, boxEdges, circleXY, circleXZ, rectXY, type Stroke } from '@/components/sketch/Ink';
import { GroundShadow, LightSpill, Paper } from '@/components/sketch/Surface';
import { Bench, FramedWork, Monitor, Shelf, WallTitle, useObjectHover } from '@/components/world/props';
import { useRoomFrame } from '@/components/world/roomFrame';
import { noteTexture, roomTitleTexture } from '@/lib/panels';
import { screenTexture } from '@/lib/panels';
import { paperTexture } from '@/lib/textures';
import { useWorld } from '@/lib/store';
import { approachObject } from '@/lib/transits';
import { sfx } from '@/lib/audio';
import { ABOUT_INTRO, ABOUT_OBJECTS } from '@/data/rooms-content';
import { PROJECTS } from '@/data/projects';
import { roomById } from '@/data/world';

/* Room extents, local. The desk is set against the far wall so it is the first
   thing in view, and the personal objects fan out from it. */
const W = 14.5;
const HD = 5.6;
/* Objects on the far wall face −x, which is a −90° turn from the default +z. */
const FACE_IN = -Math.PI / 2;
const DESK_X = W - 0.8;

/** Wraps any prop so it opens its note when clicked. */
function Readable({
  id,
  label,
  local,
  normal,
  standoff = 2.1,
  hit,
  children,
}: {
  id: string;
  label: string;
  local: [number, number, number];
  normal: [number, number];
  standoff?: number;
  hit: [number, number];
  children: React.ReactNode;
}) {
  const { toWorld, toWorldDir } = useRoomFrame();
  const setReading = useWorld((st) => st.setReading);
  const { handlers, click } = useObjectHover(`about-${id}`, 'EXPLORE', label);

  const open = () => {
    approachObject(toWorld(...local), toWorldDir(normal[0], normal[1]), standoff, () => {
      sfx.paper();
      setReading({ kind: 'note', id: `about:${id}` });
    });
  };

  return (
    <group>
      {children}
      <mesh
        position={[local[0] + normal[0] * 0.3, local[1], local[2] + normal[1] * 0.3]}
        rotation={[0, Math.atan2(normal[0], normal[1]), 0]}
        visible={false}
        {...handlers}
        onClick={click(open)}
      >
        <planeGeometry args={hit} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

export function Study() {
  const room = roomById('about');
  const title = useMemo(() => roomTitleTexture(room.roomName, room.index, room.blurb), [room]);
  const intro = useMemo(
    () =>
      noteTexture(
        'about-intro',
        ABOUT_INTRO.name,
        `${ABOUT_INTRO.line}  ${ABOUT_INTRO.roles.join(' · ')}.`,
        { meta: 'WHO', accent: true, w: 760, h: 470 },
      ),
    [],
  );
  const planSheet = useMemo(
    () =>
      noteTexture(
        'about-plan-surface',
        'FLOOR PLAN',
        'One corridor. Six doors. Rooms sized so you can read the far wall from the threshold. Drawn before any of it was built.',
        { meta: 'SHEET 01', w: 700, h: 500 },
      ),
    [],
  );
  const deskScreen = useMemo(() => screenTexture(PROJECTS[0]), []);
  const board = useMemo(() => paperTexture(11), []);

  const byId = useMemo(() => Object.fromEntries(ABOUT_OBJECTS.map((o) => [o.id, o])), []);

  /* Guitar, drawn in outline on its stand. */
  const guitar = useMemo<Stroke[]>(() => {
    const out: Stroke[] = [];
    // Body: two overlapping rounded lobes.
    out.push(circleXY(0, 0.42, 0.3, 0, 26)[0]);
    out.push(circleXY(0, 0.78, 0.235, 0, 24)[0]);
    out.push(circleXY(0, 0.6, 0.085, 0, 16)[0]);
    // Neck and head.
    out.push(...rectXY(-0.05, 0.98, 0.1, 0.78, 0));
    out.push(...rectXY(-0.075, 1.76, 0.15, 0.17, 0));
    // Strings.
    for (let i = 0; i < 4; i++) {
      const x = -0.033 + i * 0.022;
      out.push([
        [x, 0.32, 0.012],
        [x, 1.76, 0.012],
      ]);
    }
    // Bridge.
    out.push([
      [-0.09, 0.33, 0.014],
      [0.09, 0.33, 0.014],
    ]);
    return out;
  }, []);

  return (
    <group>
      <WallTitle texture={title} size={[4.8, 2.1]} position={[0.09, 2.4, -2.1]} rotationY={Math.PI / 2} />

      {/* A rug, to make the working end of the room feel occupied. */}
      <mesh position={[W - 2.6, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5.4, 3.2]} />
        <meshBasicMaterial color="#ded7c6" toneMapped={false} />
      </mesh>
      <Ink
        strokes={[
          ...rectXY(-2.7, -1.6, 5.4, 3.2, 0).map(
            (s) => s.map(([x, y]) => [W - 2.6 + y, 0.012, x] as [number, number, number]) as Stroke,
          ),
        ]}
        width={1.6}
        wobble={0.02}
        overshoot={0.05}
        seed={49}
        opacity={0.35}
      />

      {/* ------------------------------------------------------------- the desk */}
      <Bench
        length={4.6}
        depth={1.45}
        height={0.76}
        position={[DESK_X, 0, 0]}
        rotationY={FACE_IN}
        tint="#eae4d7"
        seed={51}
        drawers={3}
      />

      <Readable
        id="monitor"
        label={byId.monitor.title}
        local={[DESK_X - 0.3, 1.3, -0.55]}
        normal={[-1, 0]}
        hit={[1.9, 1.2]}
      >
        <Monitor
          id="about-monitor-screen"
          screen={deskScreen}
          size={[1.32, 0.82]}
          position={[DESK_X - 0.2, 1.34, -0.55]}
          rotationY={FACE_IN}
          label={byId.monitor.title}
          seed={53}
        />
      </Readable>

      {/* Notebook, open, at an angle. */}
      <Readable
        id="notebook"
        label={byId.notebook.title}
        local={[DESK_X - 0.45, 0.82, 1.15]}
        normal={[-1, 0]}
        standoff={1.7}
        hit={[0.9, 0.7]}
      >
        <group position={[DESK_X - 0.45, 0.765, 1.15]} rotation={[0, FACE_IN + 0.3, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.62, 0.44]} />
            <meshBasicMaterial color="#fdfbf5" toneMapped={false} />
          </mesh>
          <Ink
            strokes={[
              ...rectXY(-0.31, -0.22, 0.62, 0.44, 0.004),
              [
                [0, -0.22, 0.005],
                [0, 0.22, 0.005],
              ],
              // A few lines of handwriting, abstracted.
              ...Array.from({ length: 7 }, (_, i) => [
                [-0.27, 0.16 - i * 0.05, 0.006],
                [-0.05 - (i % 3) * 0.04, 0.16 - i * 0.05, 0.006],
              ] as Stroke),
              ...Array.from({ length: 5 }, (_, i) => [
                [0.05, 0.13 - i * 0.05, 0.006],
                [0.26 - (i % 2) * 0.06, 0.13 - i * 0.05, 0.006],
              ] as Stroke),
            ]}
            width={1.4}
            wobble={0.003}
            seed={55}
            opacity={0.5}
          />
          {/* Pencil across the page. */}
          <mesh position={[0.1, 0.012, -0.14]} rotation={[0, 0.5, Math.PI / 2]}>
            <cylinderGeometry args={[0.008, 0.008, 0.34, 6]} />
            <meshBasicMaterial color="#c1440e" toneMapped={false} />
          </mesh>
        </group>
      </Readable>

      {/* Camera body on the desk. */}
      <Readable
        id="camera"
        label={byId.camera.title}
        local={[DESK_X - 0.5, 0.92, -1.85]}
        normal={[-1, 0]}
        standoff={1.7}
        hit={[0.8, 0.8]}
      >
        <group position={[DESK_X - 0.5, 0.76, -1.85]} rotation={[0, FACE_IN + 0.42, 0]}>
          <mesh position={[0, 0.11, 0]}>
            <boxGeometry args={[0.4, 0.22, 0.19]} />
            <meshBasicMaterial color="#e8e2d4" toneMapped={false} />
          </mesh>
          <mesh position={[0.03, 0.11, 0.15]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.085, 0.095, 0.16, 16]} />
            <meshBasicMaterial color="#ece6d9" toneMapped={false} />
          </mesh>
          <mesh position={[-0.11, 0.235, 0]}>
            <boxGeometry args={[0.1, 0.05, 0.1]} />
            <meshBasicMaterial color="#e5dfd1" toneMapped={false} />
          </mesh>
          <Ink
            strokes={[
              ...boxEdges(0.4, 0.22, 0.19, 0, 0.11, 0),
              ...boxEdges(0.1, 0.05, 0.1, -0.11, 0.235, 0),
              ...circleXY(0.03, 0.11, 0.085, 0.232, 16),
              ...circleXY(0.03, 0.11, 0.055, 0.234, 14),
            ]}
            width={1.6}
            wobble={0.003}
            overshoot={0.01}
            passes={2}
            seed={57}
          />
        </group>
      </Readable>

      {/* A mug, purely for inhabitation. */}
      <group position={[DESK_X - 0.42, 0.76, 0.5]}>
        <mesh position={[0, 0.05, 0]}>
          <cylinderGeometry args={[0.045, 0.04, 0.1, 14]} />
          <meshBasicMaterial color="#f4f0e6" toneMapped={false} />
        </mesh>
        <Ink
          strokes={[
            ...circleXZ(0, 0, 0.045, 0.1, 14),
            ...circleXZ(0, 0, 0.04, 0.002, 14),
            [
              [-0.045, 0.1, 0],
              [-0.04, 0.002, 0],
            ],
            [
              [0.045, 0.1, 0],
              [0.04, 0.002, 0],
            ],
            // Handle.
            [
              [0.045, 0.078, 0],
              [0.085, 0.066, 0],
              [0.082, 0.03, 0],
              [0.043, 0.022, 0],
            ],
          ]}
          width={1.4}
          wobble={0.002}
          seed={59}
          opacity={0.6}
        />
      </group>

      {/* --------------------------------------------------------- the bookshelf */}
      <Readable
        id="books"
        label={byId.books.title}
        local={[9.2, 1.5, HD - 0.2]}
        normal={[0, -1]}
        standoff={2.2}
        hit={[3.0, 2.4]}
      >
        <Shelf width={3.4} height={2.5} position={[9.2, 0, HD - 0.2]} rotationY={Math.PI} shelves={5} seed={61} fill={0.86} />
      </Readable>

      {/* ------------------------------------------------------------ the guitar */}
      <Readable
        id="guitar"
        label={byId.guitar.title}
        local={[10.5, 1.0, -HD + 0.9]}
        normal={[0.2, 0.98]}
        standoff={2.1}
        hit={[1.1, 2.1]}
      >
        <group position={[10.5, 0.14, -HD + 0.9]} rotation={[0, 0.32, 0.05]}>
          <Ink strokes={guitar} width={2.2} wobble={0.005} overshoot={0.012} passes={2} seed={63} />
          {/* Stand. */}
          <Ink
            strokes={[
              [
                [-0.3, 0, -0.1],
                [0, 0.26, 0.06],
                [0.3, 0, -0.1],
              ],
              [
                [0, 0.26, 0.06],
                [0, 0, 0.24],
              ],
            ]}
            width={1.8}
            wobble={0.004}
            seed={65}
            opacity={0.7}
          />
          <GroundShadow size={[1.0, 0.7]} position={[0, -0.13, 0.02]} opacity={0.4} seed={67} />
        </group>
      </Readable>

      {/* --------------------------------------------------- pinned sheets on wall */}
      {/* A board above the desk. The bio lives on it, pinned, alongside the
          kind of half-finished paper that accumulates over a desk. */}
      <group position={[W - 0.07, 0, 0]} rotation={[0, FACE_IN, 0]}>
        <Paper size={[4.6, 1.9]} position={[0, 2.55, 0]} texture={board} tint="#e5dfd0" />
        <Ink
          strokes={[...rectXY(-2.3, 1.6, 4.6, 1.9, 0.01), ...rectXY(-2.26, 1.64, 4.52, 1.82, 0.012)]}
          width={1.6}
          wobble={0.007}
          overshoot={0.025}
          seed={68}
          opacity={0.45}
        />
        {/* Scraps pinned around the bio sheet. */}
        <Ink
          strokes={[
            ...rectXY(1.16, 2.52, 0.86, 0.62, 0.015),
            ...rectXY(1.24, 1.78, 0.7, 0.5, 0.015),
            ...Array.from({ length: 6 }, (_, i) => [
              [1.24, 2.98 - i * 0.08, 0.017],
              [1.94 - (i % 3) * 0.14, 2.98 - i * 0.08, 0.017],
            ] as Stroke),
            ...circleXY(-1.6, 3.24, 0.03, 0.018, 8),
            ...circleXY(0.62, 3.24, 0.03, 0.018, 8),
          ]}
          width={1.4}
          wobble={0.006}
          seed={70}
          opacity={0.4}
        />
      </group>
      <FramedWork
        id="about-intro-sheet"
        texture={intro}
        size={[2.4, 1.484]}
        position={[W - 0.11, 2.52, -0.62]}
        rotationY={FACE_IN}
        framed={false}
        verb="OPEN"
        label="SID"
        seed={69}
        onSelect={() => useWorld.getState().setReading({ kind: 'note', id: 'about:intro' })}
      />

      {/* A chair and a lamp in the middle of the room, so the walk from the
          door to the desk passes through something. */}
      <group position={[8.4, 0, 2.7]} rotation={[0, -1.1, 0]}>
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[0.82, 0.34, 0.8]} />
          <meshBasicMaterial color="#e7e1d2" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.74, -0.34]}>
          <boxGeometry args={[0.82, 0.66, 0.14]} />
          <meshBasicMaterial color="#e4ded0" toneMapped={false} />
        </mesh>
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * 0.36, 0.62, 0.02]}>
            <boxGeometry args={[0.12, 0.42, 0.76]} />
            <meshBasicMaterial color="#e9e3d5" toneMapped={false} />
          </mesh>
        ))}
        <Ink
          strokes={[
            ...boxEdges(0.82, 0.34, 0.8, 0, 0.4, 0),
            ...boxEdges(0.82, 0.66, 0.14, 0, 0.74, -0.34),
            ...boxEdges(0.12, 0.42, 0.76, -0.36, 0.62, 0.02),
            ...boxEdges(0.12, 0.42, 0.76, 0.36, 0.62, 0.02),
          ]}
          width={1.8}
          wobble={0.005}
          overshoot={0.016}
          passes={2}
          seed={77}
        />
        <GroundShadow size={[1.5, 1.5]} position={[0, 0.01, 0]} opacity={0.45} seed={79} />
      </group>
      <group position={[9.9, 0, 3.9]}>
        <Ink
          strokes={[
            [
              [0, 0.02, 0],
              [0.04, 1.62, 0.02],
            ],
            [
              [-0.24, 0.03, -0.16],
              [0.26, 0.03, 0.14],
            ],
            [
              [-0.3, 1.72, -0.02],
              [0.34, 1.72, 0.06],
              [0.24, 2.02, 0.04],
              [-0.2, 2.02, -0.01],
              [-0.3, 1.72, -0.02],
            ],
          ]}
          width={2}
          wobble={0.006}
          overshoot={0.018}
          passes={2}
          seed={81}
        />
        <mesh position={[0.02, 1.7, 0.02]}>
          <sphereGeometry args={[0.09, 12, 10]} />
          <meshBasicMaterial color="#fffdf4" toneMapped={false} fog={false} />
        </mesh>
        <LightSpill size={[2.6, 2.6]} position={[0.02, 0.02, 0.02]} opacity={0.26} />
      </group>
      <Readable
        id="sketch"
        label={byId.sketch.title}
        local={[8.4, 2.0, -HD + 0.1]}
        normal={[0, 1]}
        standoff={2.3}
        hit={[1.7, 1.3]}
      >
        <FramedWork
          id="about-plan"
          texture={planSheet}
          size={[1.55, 1.107]}
          position={[8.4, 2.0, -HD + 0.08]}
          frame={0.055}
          verb="EXPLORE"
          label={byId.sketch.title}
          seed={71}
        />
      </Readable>

      {/* Chair, pushed back from the desk. */}
      <group position={[DESK_X - 1.62, 0, -0.35]} rotation={[0, FACE_IN + 0.28, 0]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.52, 0.06, 0.5]} />
          <meshBasicMaterial color="#eae5d9" toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.78, 0.23]}>
          <boxGeometry args={[0.5, 0.6, 0.05]} />
          <meshBasicMaterial color="#e9e3d6" toneMapped={false} />
        </mesh>
        <Ink
          strokes={[
            ...boxEdges(0.52, 0.06, 0.5, 0, 0.45, 0),
            ...boxEdges(0.5, 0.6, 0.05, 0, 0.78, 0.23),
            ...[
              [-0.22, -0.22],
              [0.22, -0.22],
              [-0.22, 0.2],
              [0.22, 0.2],
            ].map(
              ([lx, lz]) =>
                [
                  [lx, 0.42, lz],
                  [lx, 0, lz],
                ] as Stroke,
            ),
          ]}
          width={1.7}
          wobble={0.004}
          overshoot={0.014}
          passes={2}
          seed={73}
        />
        <GroundShadow size={[0.9, 0.9]} position={[0, 0.01, 0]} opacity={0.4} seed={75} />
      </group>
    </group>
  );
}
