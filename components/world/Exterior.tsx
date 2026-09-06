'use client';

/**
 * The forecourt and the facade.
 *
 * The opening view. There is no hero text over the top of it — the building
 * itself carries the name, on a plate above the door, at the size a real
 * building would. The visitor's first decision is a spatial one: walk up to
 * the door.
 *
 * The facade is also the corridor's entry wall, so the front door is a real
 * aperture through a real wall rather than a scene boundary.
 */

import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Ink, boxEdges, circleXY, rectXY, type Stroke } from '@/components/sketch/Ink';
import { ContactShade, GroundShadow, LightSpill, Paper } from '@/components/sketch/Surface';
import { Wall } from '@/components/world/Wall';
import { doors } from '@/lib/animState';
import { pointerFlags } from '@/lib/pointer';
import { useWorld, worldState } from '@/lib/store';
import { palette, tints } from '@/lib/theme';
import { brickTexture, paperTexture, pavingTexture, plateTexture } from '@/lib/textures';
import { bushTexture, catTexture, cloudTexture, groundTexture, treeTexture } from '@/lib/nature';
import { facadePlateTexture } from '@/lib/panels';
import { enterBuilding } from '@/lib/transits';
import { sfx } from '@/lib/audio';
import { FRONT_DOOR, HALL } from '@/data/world';
import gsap from 'gsap';

/* The elevation is deliberately short and wide enough to be read whole from the
   far end of the path: you must be able to see the roofline against the sky,
   or the opening view is a wall rather than a building. */
const FACADE_W = 26;
const FACADE_H = 7.6;
/** Parapet cap, sitting just proud of the wall face. */
const PARAPET_H = 0.42;
/** How far the side wings return, so the building has mass from an angle. */
const WING_D = 7;
const FD_W = FRONT_DOOR.width;
const FD_H = FRONT_DOOR.height;
const WALL_T = 0.44;
const LEAF_T = 0.1;

/** A plane that turns about Y only, so drawn foliage always faces the viewer. */
function YBillboard({
  children,
  position,
}: {
  children: React.ReactNode;
  position: [number, number, number];
}) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  useFrame(() => {
    if (!ref.current) return;
    const dx = camera.position.x - ref.current.position.x;
    const dz = camera.position.z - ref.current.position.z;
    ref.current.rotation.y = Math.atan2(dx, dz);
  });
  return (
    <group ref={ref} position={position}>
      {children}
    </group>
  );
}

function Tree({ position, height, seed }: { position: [number, number, number]; height: number; seed: number }) {
  const tex = useMemo(() => treeTexture(seed), [seed]);
  return (
    <>
      <YBillboard position={position}>
        <mesh position={[0, height / 2, 0]}>
          <planeGeometry args={[height, height]} />
          <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      </YBillboard>
      <GroundShadow size={[height * 0.55, height * 0.3]} position={[position[0], 0.012, position[2]]} opacity={0.5} seed={seed} />
    </>
  );
}

function Bush({ position, size, seed }: { position: [number, number, number]; size: number; seed: number }) {
  const tex = useMemo(() => bushTexture(seed), [seed]);
  return (
    <YBillboard position={position}>
      <mesh position={[0, size * 0.42, 0]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </YBillboard>
  );
}

function Cloud({ position, width, seed }: { position: [number, number, number]; width: number; seed: number }) {
  const tex = useMemo(() => cloudTexture(seed), [seed]);
  const ref = useRef<THREE.Group>(null);
  const drift = useMemo(() => 0.006 + (seed % 5) * 0.0018, [seed]);
  useFrame((_, dt) => {
    if (!ref.current || worldState().reducedMotion) return;
    // Barely-there drift, so the sky is not frozen.
    ref.current.position.x += drift * dt * 12;
    if (ref.current.position.x > 60) ref.current.position.x = -60;
  });
  return (
    <group ref={ref} position={position}>
      <mesh>
        <planeGeometry args={[width, width * 0.5]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} opacity={0.85} />
      </mesh>
    </group>
  );
}

/**
 * A forecourt lamp: stepped plinth, tapered column, glazed lantern, cap.
 *
 * Everything is drawn with two edges. Against a near-white sky a single line
 * has no weight and the whole thing collapses into a scratch, which is exactly
 * what a bare pole and a floating shade looked like.
 */
function Lamp({ position }: { position: [number, number, number] }) {
  const strokes = useMemo<Stroke[]>(() => {
    const out: Stroke[] = [];
    // Plinth, two steps.
    out.push(...rectXY(-0.2, 0, 0.4, 0.16));
    out.push(...rectXY(-0.14, 0.16, 0.28, 0.1));
    // Column, tapering. Both edges, or it is a line and not a column.
    out.push([
      [-0.09, 0.26, 0],
      [-0.055, 3.41, 0],
    ]);
    out.push([
      [0.09, 0.26, 0],
      [0.055, 3.41, 0],
    ]);
    // Collar where the lantern sits down onto the column.
    out.push(...rectXY(-0.14, 3.38, 0.28, 0.07));
    // Lantern: splayed sides, a glazing bar each side, a bottom rail.
    out.push([
      [-0.24, 3.45, 0],
      [-0.15, 3.95, 0],
      [0.15, 3.95, 0],
      [0.24, 3.45, 0],
      [-0.24, 3.45, 0],
    ]);
    out.push([
      [-0.08, 3.45, 0.01],
      [-0.05, 3.95, 0.01],
    ]);
    out.push([
      [0.08, 3.45, 0.01],
      [0.05, 3.95, 0.01],
    ]);
    out.push([
      [-0.225, 3.52, 0.01],
      [0.225, 3.52, 0.01],
    ]);
    // Cap and finial.
    out.push([
      [-0.29, 3.94, 0],
      [0, 4.16, 0],
      [0.29, 3.94, 0],
      [-0.29, 3.94, 0],
    ]);
    out.push(...circleXY(0, 4.21, 0.05, 0, 10));
    return out;
  }, []);

  return (
    <group position={position}>
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.4, 0.16, 0.4]} />
        <meshBasicMaterial color="#eae5d8" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.21, 0]}>
        <boxGeometry args={[0.28, 0.1, 0.28]} />
        <meshBasicMaterial color="#f1ede2" toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.835, 0]}>
        <cylinderGeometry args={[0.055, 0.09, 3.15, 10]} />
        <meshBasicMaterial color="#f2efe7" toneMapped={false} />
      </mesh>
      <mesh position={[0, 3.415, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.07, 10]} />
        <meshBasicMaterial color="#e8e3d6" toneMapped={false} />
      </mesh>
      {/* Lantern. Warm, because it is the one light in the opening view. */}
      <mesh position={[0, 3.7, 0]}>
        <cylinderGeometry args={[0.15, 0.24, 0.5, 8, 1, true]} />
        <meshBasicMaterial color="#fcf5e1" side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, 4.05, 0]}>
        <coneGeometry args={[0.29, 0.21, 8]} />
        <meshBasicMaterial color="#f4f1e9" toneMapped={false} />
      </mesh>
      <mesh position={[0, 4.21, 0]}>
        <sphereGeometry args={[0.05, 8, 6]} />
        <meshBasicMaterial color="#efebe0" toneMapped={false} />
      </mesh>
      <Ink strokes={strokes} width={2} wobble={0.005} overshoot={0.018} passes={2} seed={79} />
      <LightSpill size={[3.2, 3.2]} position={[0, 0.02, 0]} opacity={0.26} />
      <GroundShadow size={[0.7, 0.4]} position={[0.12, 0.014, 0.06]} opacity={0.42} seed={83} />
    </group>
  );
}

/** The double front door, on real hinges. */
function FrontDoor() {
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const glow = useRef<THREE.Mesh>(null);
  const spill = useRef<THREE.Group>(null);
  const setHover = useWorld((st) => st.setHover);

  const leafStrokes = useMemo<Stroke[]>(() => {
    const lw = FD_W / 2;
    const out: Stroke[] = [];
    out.push(...boxEdges(lw - 0.02, FD_H - 0.02, LEAF_T, 0, FD_H / 2, 0));
    // Two long panels per leaf, plus a glazed upper light.
    out.push(...rectXY(-lw / 2 + 0.09, 0.2, lw - 0.18, 1.5, LEAF_T / 2 + 0.003));
    out.push(...rectXY(-lw / 2 + 0.09, 1.82, lw - 0.18, 0.62, LEAF_T / 2 + 0.003));
    out.push(...rectXY(-lw / 2 + 0.09, 2.6, lw - 0.18, FD_H - 2.82, LEAF_T / 2 + 0.003));
    return out;
  }, []);

  useFrame((_, delta) => {
    const st = doors.front;
    const dt = Math.min(delta, 1 / 30);
    const nudge = st.attention * 0.05;
    if (left.current) left.current.rotation.y = st.angle + nudge;
    if (right.current) right.current.rotation.y = -st.angle - nudge;
    if (glow.current) {
      const mat = glow.current.material as THREE.MeshBasicMaterial;
      const target = Math.max(st.glow, Math.abs(st.angle) / 1.5);
      mat.opacity += (Math.min(1, target) * 0.95 - mat.opacity) * Math.min(1, dt / 0.2);
      glow.current.visible = mat.opacity > 0.01;
    }
    if (spill.current) {
      spill.current.visible = st.glow > 0.02;
      spill.current.scale.setScalar(0.75 + st.glow * 0.4);
    }
  });

  const leaf = (side: -1 | 1) => (
    <group
      ref={side === -1 ? left : right}
      position={[(side * FD_W) / 2, 0, -LEAF_T / 2 - 0.014]}
    >
      <group position={[(-side * FD_W) / 4, 0, 0]}>
        <mesh position={[0, FD_H / 2, 0]}>
          <boxGeometry args={[FD_W / 2 - 0.02, FD_H - 0.02, LEAF_T]} />
          <meshBasicMaterial color="#c6ab8a" toneMapped={false} />
        </mesh>
        {/* Upper light, glazed. */}
        <mesh position={[0, 2.6 + (FD_H - 2.82) / 2, LEAF_T / 2 + 0.006]}>
          <planeGeometry args={[FD_W / 2 - 0.18, FD_H - 2.82]} />
          <meshBasicMaterial color="#fdfbf5" transparent opacity={0.88} toneMapped={false} />
        </mesh>
        <Ink strokes={leafStrokes} width={2.1} wobble={0.007} overshoot={0.028} passes={2} seed={side === -1 ? 41 : 43} />
        {/* Long pull handle, on the meeting stile. */}
        <mesh position={[(-side * (FD_W / 2 - 0.2)) / 2, 1.42, LEAF_T / 2 + 0.035]} rotation={[0, 0, 0]}>
          <cylinderGeometry args={[0.021, 0.021, 0.62, 8]} />
          <meshBasicMaterial color="#7a736a" toneMapped={false} />
        </mesh>
      </group>
    </group>
  );

  return (
    <group position={[0, 0, 0]}>
      {/* Bright interior beyond the aperture. */}
      <mesh ref={glow} position={[0, FD_H / 2, -WALL_T - 0.02]} visible={false}>
        <planeGeometry args={[FD_W - 0.04, FD_H - 0.04]} />
        <meshBasicMaterial color="#fffdf6" transparent opacity={0} toneMapped={false} fog={false} depthWrite={false} />
      </mesh>

      {/* Reveal through the wall thickness. */}
      <Paper size={[WALL_T, FD_H]} position={[-FD_W / 2, FD_H / 2, -WALL_T / 2]} rotation={[0, Math.PI / 2, 0]} tint="#e6e1d4" />
      <Paper size={[WALL_T, FD_H]} position={[FD_W / 2, FD_H / 2, -WALL_T / 2]} rotation={[0, -Math.PI / 2, 0]} tint="#efeade" />
      <Paper size={[FD_W, WALL_T]} position={[0, FD_H, -WALL_T / 2]} rotation={[Math.PI / 2, 0, 0]} tint="#ded8ca" />

      {leaf(-1)}
      {leaf(1)}

      <Ink
        strokes={[
          ...rectXY(-FD_W / 2 - 0.22, 0, FD_W + 0.44, FD_H + 0.22, 0.03),
          ...rectXY(-FD_W / 2 - 0.07, 0, FD_W + 0.14, FD_H + 0.07, 0.022),
          ...rectXY(-FD_W / 2, 0, FD_W, FD_H, 0.006),
        ]}
        width={2.4}
        wobble={0.009}
        overshoot={0.04}
        passes={2}
        seed={47}
      />

      <group ref={spill} visible={false}>
        <LightSpill size={[FD_W * 1.5, 4]} position={[0, 0.02, 2]} opacity={0.45} />
      </group>

      <mesh
        position={[0, FD_H / 2, 0.14]}
        visible={false}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (worldState().phase !== 'open' || worldState().zone !== 'exterior') return;
          setHover({ id: 'front-door', verb: 'ENTER', label: "SID'S WORLD" });
          sfx.hover();
          gsap.to(doors.front, { attention: 1, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
        }}
        onPointerOut={() => {
          setHover(null);
          gsap.to(doors.front, { attention: 0, duration: 0.55, overwrite: 'auto' });
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (pointerFlags.dragging) return;
          if (worldState().phase !== 'open' || worldState().zone !== 'exterior') return;
          sfx.click();
          setHover(null);
          gsap.to(doors.front, { attention: 0, duration: 0.3, overwrite: 'auto' });
          enterBuilding();
        }}
      >
        <planeGeometry args={[FD_W + 0.6, FD_H + 0.3]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

export function Exterior() {
  const brick = useMemo(() => brickTexture(9), []);
  const paper = useMemo(() => paperTexture(5), []);
  const paving = useMemo(() => pavingTexture(13), []);
  const ground = useMemo(() => groundTexture(17), []);
  const plate = useMemo(() => facadePlateTexture(), []);
  const cat = useMemo(() => catTexture(), []);
  const postSign = useMemo(() => plateTexture('SID · WORLD 2026', 'ENTRANCE →', 131), []);

  /* Windows and brick detailing drawn onto the facade.
     Two storeys, on a regular bay spacing interrupted by the entrance — the
     order is what stops the elevation reading as a texture swatch. */
  const { facadeDetail, litWindows } = useMemo(() => {
    const out: Stroke[] = [];
    const lit: Array<[number, number, number, number]> = [];
    const bays = [-11.4, -8, -4.6, 4.6, 8, 11.4];
    const w = 1.44;
    const h = 2.06;

    const windowAt = (cx: number, cy: number, blinds: number, isLit: boolean) => {
      out.push(...rectXY(cx - w / 2, cy, w, h, 0.03));
      // Reveal and sill, so each opening has a little depth.
      out.push(...rectXY(cx - w / 2 - 0.085, cy - 0.085, w + 0.17, h + 0.17, 0.022));
      out.push([
        [cx, cy, 0.032],
        [cx, cy + h, 0.032],
      ]);
      out.push([
        [cx - w / 2, cy + h * 0.54, 0.032],
        [cx + w / 2, cy + h * 0.54, 0.032],
      ]);
      out.push([
        [cx - w / 2 - 0.16, cy - 0.085, 0.055],
        [cx + w / 2 + 0.16, cy - 0.085, 0.055],
      ]);
      // A blind pulled part-way down: cheap, and it makes the building inhabited.
      if (blinds > 0.02) {
        const by = cy + h - h * blinds;
        out.push([
          [cx - w / 2 + 0.03, by, 0.034],
          [cx + w / 2 - 0.03, by, 0.034],
        ]);
        for (let i = 1; i < 4; i++) {
          const y = by + (h * blinds * i) / 4;
          out.push([
            [cx - w / 2 + 0.05, y, 0.034],
            [cx + w / 2 - 0.05, y, 0.034],
          ]);
        }
      }
      if (isLit) lit.push([cx - w / 2 + 0.02, cy + 0.02, w - 0.04, h - 0.04]);
    };

    bays.forEach((cx, i) => {
      windowAt(cx, 1.55, i === 1 ? 0.34 : i === 4 ? 0.18 : 0, i === 4);
      windowAt(cx, 5.05, i === 2 ? 0.5 : i === 3 ? 0.12 : 0, i === 0);
    });
    // One window directly over the entrance, on the upper floor only.
    windowAt(0, 5.05, 0, false);

    // String course between the storeys, and the parapet cap above.
    out.push([
      [-FACADE_W / 2, 4.32, 0.045],
      [FACADE_W / 2, 4.32, 0.045],
    ]);
    out.push([
      [-FACADE_W / 2, 4.24, 0.03],
      [FACADE_W / 2, 4.24, 0.03],
    ]);
    out.push([
      [-FACADE_W / 2, FACADE_H, 0.05],
      [FACADE_W / 2, FACADE_H, 0.05],
    ]);
    return { facadeDetail: out, litWindows: lit };
  }, []);

  return (
    <group>
      {/* Ground. Wide enough that its far edge dissolves in haze rather than
          arriving as a hard line across the view. */}
      <Paper
        size={[240, 240]}
        position={[0, 0, 62]}
        rotation={[-Math.PI / 2, 0, 0]}
        texture={ground}
        tint="#efece2"
        repeat={[28, 28]}
      />
      {/* Approach path, running the length of the forecourt. */}
      <Paper
        size={[4.1, 27]}
        position={[0, 0.008, 13.9]}
        rotation={[-Math.PI / 2, 0, 0]}
        texture={paving}
        tint="#e7e2d5"
        repeat={[1.4, 9]}
      />
      <Ink
        strokes={[
          [
            [-2.05, 0.016, 0.6],
            [-2.05, 0.016, 27],
          ],
          [
            [2.05, 0.016, 0.6],
            [2.05, 0.016, 27],
          ],
        ]}
        width={1.5}
        wobble={0.02}
        seed={53}
        opacity={0.4}
      />

      {/* Threshold step. */}
      <mesh position={[0, 0.075, 0.92]}>
        <boxGeometry args={[FD_W + 1.5, 0.15, 1.3]} />
        <meshBasicMaterial color="#e9e4d7" toneMapped={false} />
      </mesh>
      <Ink strokes={boxEdges(FD_W + 1.5, 0.15, 1.3, 0, 0.075, 0.92)} width={1.8} wobble={0.006} overshoot={0.03} seed={59} />

      {/* Facade: brick outside, paper inside. */}
      <Wall
        length={FACADE_W}
        height={FACADE_H}
        apertures={[{ center: FACADE_W / 2, width: FD_W, height: FD_H }]}
        position={[-FACADE_W / 2, 0, 0]}
        texture={brick}
        tint="#f3f0e8"
        tileSize={2.6}
        skirting={false}
        capLine={false}
        seed={61}
        detail={facadeDetail.map((s) => s.map(([x, y, z]) => [x + FACADE_W / 2, y, z]) as Stroke)}
      />

      {/* Lit windows: a few panes warmer than the rest, so somebody is in. */}
      {litWindows.map(([x, y, w, h], i) => (
        <mesh key={i} position={[x + w / 2, y + h / 2, 0.02]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color="#fdf6e2" toneMapped={false} />
        </mesh>
      ))}

      {/* Parapet cap: the line the sky meets. */}
      <mesh position={[0, FACADE_H + PARAPET_H / 2, 0.06]}>
        <boxGeometry args={[FACADE_W + 0.5, PARAPET_H, 0.36]} />
        <meshBasicMaterial color="#f6f3ec" toneMapped={false} />
      </mesh>
      <Ink
        strokes={boxEdges(FACADE_W + 0.5, PARAPET_H, 0.36, 0, FACADE_H + PARAPET_H / 2, 0.06)}
        width={2.2}
        wobble={0.008}
        overshoot={0.05}
        passes={2}
        seed={107}
      />

      {/* Side wings, returning into the distance so the building has depth. */}
      {[-1, 1].map((dir) => (
        <group key={dir}>
          <Paper
            size={[WING_D, FACADE_H]}
            position={[(dir * FACADE_W) / 2, FACADE_H / 2, -WING_D / 2]}
            rotation={[0, dir === 1 ? -Math.PI / 2 : Math.PI / 2, 0]}
            texture={brick}
            tint={dir === 1 ? '#eae5da' : '#f0ede4'}
            repeat={[WING_D / 2.6, FACADE_H / 2.6]}
          />
          <mesh position={[(dir * (FACADE_W + 0.5)) / 2, FACADE_H + PARAPET_H / 2, -WING_D / 2]}>
            <boxGeometry args={[0.36, PARAPET_H, WING_D]} />
            <meshBasicMaterial color="#f4f1e9" toneMapped={false} />
          </mesh>
          <Ink
            strokes={[
              [
                [(dir * FACADE_W) / 2, FACADE_H, 0],
                [(dir * FACADE_W) / 2, FACADE_H, -WING_D],
              ],
              [
                [(dir * FACADE_W) / 2, 0, -WING_D],
                [(dir * FACADE_W) / 2, FACADE_H + PARAPET_H, -WING_D],
              ],
              [
                [(dir * FACADE_W) / 2, 0, 0],
                [(dir * FACADE_W) / 2, FACADE_H + PARAPET_H, 0],
              ],
            ]}
            width={2.1}
            wobble={0.01}
            overshoot={0.04}
            seed={109 + dir}
          />
        </group>
      ))}
      <Wall
        length={HALL.halfWidth * 2}
        height={HALL.height}
        apertures={[{ center: HALL.halfWidth, width: FD_W, height: FD_H }]}
        position={[HALL.halfWidth, 0, -WALL_T]}
        rotation={[0, Math.PI, 0]}
        texture={paper}
        tint={tints.wall}
        tileSize={4}
        seed={67}
      />

      <FrontDoor />

      {/* Nameplate over the door. */}
      <mesh position={[0, FD_H + 0.78, 0.07]}>
        <planeGeometry args={[3.4, 1.06]} />
        <meshBasicMaterial map={plate} transparent toneMapped={false} />
      </mesh>
      <Ink
        strokes={[
          [
            [-1.2, FD_H + 1.31, 0.05],
            [-1.2, FD_H + 1.5, -0.02],
            [1.2, FD_H + 1.5, -0.02],
            [1.2, FD_H + 1.31, 0.05],
          ],
        ]}
        width={1.8}
        wobble={0.006}
        seed={71}
      />

      {/* Facade grounding. */}
      <ContactShade
        size={[FACADE_W, 1.1]}
        position={[0, 0.55, 0.09]}
        opacity={0.22}
        seed={73}
        repeat={[12, 1]}
      />

      {/* Planting.
          The two flanking trees do the compositional work, and they only work
          if both actually land inside the frame: the elevation is 26 m wide,
          so a tree has to stand clear of x = ±13 to be seen past it, but not
          so far out that it falls outside the frustum from the head of the
          path. The pair below is matched in size on purpose — one tall tree on
          one side and nothing on the other tips the whole view sideways. */}
      <Tree position={[-15.2, 0, -2]} height={12} seed={3} />
      <Tree position={[16, 0, -4.5]} height={12.4} seed={7} />
      {/* Further out, for the look-around rather than the opening frame. */}
      <Tree position={[-19.5, 0, 9]} height={10.5} seed={11} />
      <Tree position={[20.5, 0, 13]} height={9.5} seed={19} />
      <Bush position={[-6.6, 0, 1.4]} size={1.5} seed={5} />
      <Bush position={[-9.9, 0, 1.5]} size={1.3} seed={9} />
      <Bush position={[6.1, 0, 1.4]} size={1.6} seed={13} />
      <Bush position={[9.6, 0, 1.6]} size={1.35} seed={17} />
      {/* A scrubby line closing the far side of the forecourt. */}
      {[-15, -9.5, -4, 4, 9.5, 15].map((x, i) => (
        <Bush key={x} position={[x, 0, 26.5]} size={1.9 + (i % 3) * 0.3} seed={21 + i * 4} />
      ))}

      {/* Lamp post, for scale and for the light it throws on the paving.
          Drawn as a lantern on a tapered column: a single vertical line reads
          as a scratch on the sky, so every part of it has two edges. */}
      <Lamp position={[-5.4, 0, 6.6]} />

      {/* A small post sign at the head of the path. Identity at the scale a
          building actually carries it — no hero text over the view. */}
      <group position={[2.9, 0, 9.4]} rotation={[0, -0.34, 0]}>
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[0.1, 1.24, 0.1]} />
          <meshBasicMaterial color="#e3ded1" toneMapped={false} />
        </mesh>
        <mesh position={[0, 1.44, 0.02]}>
          <planeGeometry args={[1.5, 0.47]} />
          <meshBasicMaterial map={postSign} transparent toneMapped={false} />
        </mesh>
        <Ink
          strokes={[
            ...rectXY(-0.75, 1.205, 1.5, 0.47, 0.03),
            [
              [0, 0, 0],
              [0, 1.22, 0],
            ],
          ]}
          width={1.9}
          wobble={0.006}
          overshoot={0.02}
          seed={113}
        />
        <GroundShadow size={[0.5, 0.3]} position={[0, 0.012, 0]} opacity={0.35} seed={117} />
      </group>

      {/* The cat. No purpose. Stays. */}
      <YBillboard position={[-2.55, 0, 1.85]}>
        <mesh position={[0, 0.58, 0]}>
          <planeGeometry args={[1.16, 1.16]} />
          <meshBasicMaterial map={cat} transparent toneMapped={false} depthWrite={false} />
        </mesh>
      </YBillboard>
      <GroundShadow size={[0.9, 0.34]} position={[-2.55, 0.014, 1.85]} opacity={0.4} seed={121} />

      {/* Sky.
          A cloud behind the building is only in the picture if it clears the
          parapet, and the sight line over an 8 m parapet from eye height rises
          fast — so these are set high and far rather than at a comfortable
          drawing height. Two more sit out past the elevation, where they can
          be seen down at roof level. */}
      <Cloud position={[-12, 18.5, -20]} width={20} seed={3} />
      <Cloud position={[9.5, 19.5, -28]} width={25} seed={7} />
      <Cloud position={[-2, 24, -40]} width={17} seed={11} />
      <Cloud position={[-19, 9, -6]} width={22} seed={13} />
      <Cloud position={[21, 11, -12]} width={19} seed={17} />
    </group>
  );
}

export { palette };
