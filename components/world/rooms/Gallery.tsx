'use client';

/**
 * THE GALLERY — projects.
 *
 * Four works, and deliberately four *different kinds* of object: a machine
 * running on a plinth, a large piece hung on the long wall, a printed sheet
 * framed on the end wall, and a plan laid flat on a table. A row of four
 * identical frames would have been a card grid with extra steps.
 *
 * Selecting a work walks the camera up to it and squares it up before the case
 * study opens, so the reading panel always arrives from somewhere you stood.
 */

import { useMemo } from 'react';
import { Ink, boxEdges, type Stroke } from '@/components/sketch/Ink';
import { GroundShadow } from '@/components/sketch/Surface';
import { Bench, FramedWork, Monitor, Plinth, WallTitle } from '@/components/world/props';
import { useRoomFrame } from '@/components/world/roomFrame';
import { placardTexture, projectPosterTexture, roomTitleTexture, screenTexture } from '@/lib/panels';
import { useWorld } from '@/lib/store';
import { approachObject } from '@/lib/transits';
import { sfx } from '@/lib/audio';
import { PROJECTS } from '@/data/projects';
import { roomById } from '@/data/world';

const CEIL = 6.4;
/* Room extents, local. The layout is planned against the arrival sightline:
   you come to rest at x ≈ 3.4 facing +x, so the far wall is the hero and the
   two side walls are a head-turn away. */
const W = 14.5;
const HD = 5.6;

export function Gallery() {
  const { toWorld, toWorldDir } = useRoomFrame();
  const setReading = useWorld((st) => st.setReading);
  const room = roomById('projects');

  const title = useMemo(() => roomTitleTexture(room.roomName, room.index, room.blurb), [room]);

  const [jal, reel, blood, vibe] = PROJECTS;

  const screens = useMemo(
    () => ({
      jal: screenTexture(jal),
      reel: projectPosterTexture(reel),
      blood: projectPosterTexture(blood),
      vibe: projectPosterTexture(vibe),
    }),
    [jal, reel, blood, vibe],
  );

  const placards = useMemo(
    () => Object.fromEntries(PROJECTS.map((p) => [p.id, placardTexture(p)])),
    [],
  );

  /**
   * Walk up to a work, then open its case study. `normal` is the direction the
   * work faces, in room-local terms; the camera stops `standoff` metres out
   * along it.
   */
  const open = (
    projectId: string,
    local: [number, number, number],
    localNormal: [number, number],
    standoff: number,
  ) => {
    const world = toWorld(local[0], local[1], local[2]);
    const dir = toWorldDir(localNormal[0], localNormal[1]);
    approachObject(world, dir, standoff, () => {
      sfx.paper();
      setReading({ kind: 'project', id: projectId });
    });
  };

  /* Rails and hanging wire, the fittings a real gallery would have. */
  const fittings = useMemo<Stroke[]>(() => {
    const out: Stroke[] = [];
    // Picture rail on the far wall, and wires down to the hung piece.
    out.push([
      [W - 0.06, CEIL - 0.8, -HD + 0.5],
      [W - 0.06, CEIL - 0.8, HD - 0.5],
    ]);
    out.push([
      [W - 0.06, CEIL - 0.76, -HD + 0.5],
      [W - 0.06, CEIL - 0.76, HD - 0.5],
    ]);
    out.push([
      [W - 0.05, CEIL - 0.8, -1.55],
      [W - 0.05, 5.28, -1.4],
    ]);
    out.push([
      [W - 0.05, CEIL - 0.8, 1.55],
      [W - 0.05, 5.28, 1.4],
    ]);
    // Rails on both side walls too, so the room is consistently fitted out.
    for (const z of [-HD + 0.06, HD - 0.06]) {
      out.push([
        [1.4, CEIL - 0.8, z],
        [W - 1.4, CEIL - 0.8, z],
      ]);
    }
    return out;
  }, []);

  return (
    <group>
      {/* Room name, on the wall behind you — the label you find on the way out. */}
      <WallTitle texture={title} size={[5.6, 2.45]} position={[0.09, 3.5, -2.5]} rotationY={Math.PI / 2} />

      <Ink strokes={fittings} width={1.5} wobble={0.005} seed={11} opacity={0.4} />

      {/* ------------------------- 02 · the hero, hung on the wall you walk toward */}
      <FramedWork
        id="work-reel"
        texture={screens.reel}
        size={[3.1, 4.41]}
        position={[W - 0.09, 3.08, 0]}
        rotationY={-Math.PI / 2}
        frame={0.12}
        verb="VIEW"
        label={reel.name}
        seed={13}
        onSelect={() => open(reel.id, [W - 0.09, 2.9, 0], [-1, 0], 3.6)}
      />
      <FramedWork
        id="placard-reel"
        texture={placards[reel.id]}
        size={[1.15, 0.539]}
        position={[W - 0.07, 1.42, 2.5]}
        rotationY={-Math.PI / 2}
        framed={false}
        verb="VIEW"
        label={reel.name}
        seed={15}
        onSelect={() => open(reel.id, [W - 0.09, 2.9, 0], [-1, 0], 3.6)}
      />

      {/* --------------------- 01 · a working machine, on a plinth against the left */}
      <group position={[9.6, 0, -3.6]} rotation={[0, -0.85, 0]}>
        <Plinth size={[2.3, 0.94, 1.1]} position={[0, 0, 0]} tint="#efeae0" seed={3} />
        <Monitor
          id="work-jalrakshak"
          screen={screens.jal}
          size={[1.72, 1.06]}
          position={[0, 1.62, 0.02]}
          label={jal.name}
          seed={5}
          onSelect={() => open(jal.id, [9.58, 1.62, -3.59], [-0.75, 0.66], 2.6)}
        />
        {/* Keyboard, so the plinth reads as a workstation rather than a display case. */}
        <mesh position={[0, 0.965, 0.32]} rotation={[-0.06, 0, 0]}>
          <boxGeometry args={[0.86, 0.022, 0.28]} />
          <meshBasicMaterial color="#eae5d9" toneMapped={false} />
        </mesh>
        <Ink strokes={boxEdges(0.86, 0.022, 0.28, 0, 0.965, 0.32)} width={1.3} wobble={0.003} seed={7} opacity={0.55} />
        <FramedWork
          id="placard-jalrakshak"
          texture={placards[jal.id]}
          size={[1.05, 0.492]}
          position={[1.62, 1.28, 0.02]}
          framed={false}
          verb="VIEW"
          label={jal.name}
          seed={9}
          onSelect={() => open(jal.id, [9.58, 1.62, -3.59], [-0.75, 0.66], 2.6)}
        />
      </group>

      {/* -------------------------------- 03 · framed sheet, hung on the right wall */}
      <FramedWork
        id="work-bloodlink"
        texture={screens.blood}
        size={[1.9, 2.7]}
        position={[8.4, 2.5, HD - 0.09]}
        rotationY={Math.PI}
        frame={0.085}
        verb="VIEW"
        label={blood.name}
        seed={17}
        onSelect={() => open(blood.id, [8.4, 2.4, HD - 0.09], [0, -1], 3)}
      />
      <FramedWork
        id="placard-bloodlink"
        texture={placards[blood.id]}
        size={[1.05, 0.492]}
        position={[10.3, 1.42, HD - 0.07]}
        rotationY={Math.PI}
        framed={false}
        verb="VIEW"
        label={blood.name}
        seed={19}
        onSelect={() => open(blood.id, [8.4, 2.4, HD - 0.09], [0, -1], 3)}
      />

      {/* ------------------------------- 04 · plan laid flat on a table in the room */}
      <group position={[10.6, 0, 2.5]} rotation={[0, 0.62, 0]}>
        <Bench length={2.8} depth={1.6} height={0.86} position={[0, 0, 0]} tint="#eee9de" seed={21} />
        {/* The sheet lies flat, lifted at the far edge like a drawing on a board. */}
        <group position={[0, 0.94, 0.1]} rotation={[-Math.PI / 2 - 0.62, 0, 0]}>
          <FramedWork
            id="work-vibe"
            texture={screens.vibe}
            size={[1.5, 2.14]}
            position={[0, 0, 0]}
            rotationZ={Math.PI / 2}
            frame={0.05}
            verb="VIEW"
            label={vibe.name}
            seed={23}
            onSelect={() => open(vibe.id, [10.6, 1.4, 2.5], [-0.58, -0.81], 2.4)}
          />
        </group>
        <FramedWork
          id="placard-vibe"
          texture={placards[vibe.id]}
          size={[1.0, 0.469]}
          position={[0, 0.55, -0.81]}
          rotationY={Math.PI}
          framed={false}
          verb="VIEW"
          label={vibe.name}
          seed={25}
          onSelect={() => open(vibe.id, [10.6, 1.4, 2.5], [-0.58, -0.81], 2.4)}
        />
      </group>

      {/* A bench to look from. Galleries have them; it also gives scale. */}
      <group position={[8.4, 0, 3.4]} rotation={[0, 0.1, 0]}>
        <mesh position={[0, 0.44, 0]}>
          <boxGeometry args={[2.6, 0.09, 0.5]} />
          <meshBasicMaterial color="#ece7dc" toneMapped={false} />
        </mesh>
        {[-1, 1].map((sx) => (
          <mesh key={sx} position={[sx * 0.95, 0.22, 0]}>
            <boxGeometry args={[0.1, 0.44, 0.42]} />
            <meshBasicMaterial color="#e8e3d7" toneMapped={false} />
          </mesh>
        ))}
        <Ink
          strokes={[
            ...boxEdges(2.6, 0.09, 0.5, 0, 0.44, 0),
            ...boxEdges(0.1, 0.44, 0.42, -0.95, 0.22, 0),
            ...boxEdges(0.1, 0.44, 0.42, 0.95, 0.22, 0),
          ]}
          width={1.8}
          wobble={0.005}
          overshoot={0.018}
          passes={2}
          seed={27}
        />
        <GroundShadow size={[3.1, 1.2]} position={[0, 0.01, 0]} opacity={0.45} seed={29} />
      </group>
    </group>
  );
}
