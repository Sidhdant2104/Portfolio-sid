'use client';

/**
 * A door in the corridor wall.
 *
 * Built in a local frame where the leaf lies in the XY plane and local +z
 * points back at the corridor, then rotated into place. That keeps the hinge
 * maths readable: the leaf always swings toward local −z, away from the
 * visitor, so the camera can never collide with a door it just opened.
 *
 * Each door is constructed differently rather than tinted differently. The
 * workshop door is cross-braced, the archive door is slatted, the lab door is
 * patched and bolted — the joinery is what gives each space a character before
 * you have read a single word of the sign.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Ink, boxEdges, circleXY, rectXY, type Stroke } from '@/components/sketch/Ink';
import { Paper, LightSpill } from '@/components/sketch/Surface';
import { doors } from '@/lib/animState';
import { pointerFlags } from '@/lib/pointer';
import { useWorld, worldState } from '@/lib/store';
import { palette } from '@/lib/theme';
import { paperTexture, plateTexture, signTexture } from '@/lib/textures';
import { enterRoom, openDirection } from '@/lib/transits';
import { sfx } from '@/lib/audio';
import { DOORWAY, HALL, sideSign, type RoomDef } from '@/data/world';

const { width: W, height: H, wallThickness: T, leafThickness: LT } = DOORWAY;

/** Hanging sign board: height above the floor, and board size in metres. */
const SIGN_Y = H + 0.5;
const SIGN_W = 1.12;
const SIGN_H = 0.56;

/** Extra linework and hardware, per door. */
function leafDetail(room: RoomDef): { strokes: Stroke[]; glazing?: Array<[number, number, number, number]> } {
  const hw = W / 2 - 0.1;
  const strokes: Stroke[] = [];
  const glazing: Array<[number, number, number, number]> = [];
  const panel = (x0: number, y0: number, x1: number, y1: number) => {
    strokes.push(...rectXY(x0, y0, x1 - x0, y1 - y0, LT / 2 + 0.002));
  };

  switch (room.id) {
    case 'projects': {
      // Gallery door: three stacked panels and a glazed viewing slot at eye level.
      panel(-hw + 0.1, 0.22, hw - 0.1, 1.02);
      panel(-hw + 0.1, 1.16, hw - 0.1, 1.86);
      panel(-hw + 0.1, 2.44, hw - 0.1, H - 0.22);
      // Viewing slot, at eye level. Narrow, so it reads as a slot and not a label.
      glazing.push([-hw + 0.42, 2.02, hw - 0.42, 2.26]);
      strokes.push(...rectXY(-hw + 0.36, 1.96, hw * 2 - 0.72, 0.36, LT / 2 + 0.003));
      strokes.push([
        [0, 2.02, LT / 2 + 0.006],
        [0, 2.26, LT / 2 + 0.006],
      ]);
      break;
    }
    case 'skills': {
      /* Workshop door: ledged and braced, the way a shop door is actually
         made. Every member is drawn as a board with two edges — a lone
         diagonal line across the leaf reads as a scratch in the paint rather
         than as joinery. */
      const zb = LT / 2 + 0.002;
      // Vertical boarding, each joint with a shadow line beside it.
      for (let i = 1; i < 5; i++) {
        const x = -hw + (i * (hw * 2)) / 5;
        strokes.push([
          [x, 0.1, zb],
          [x, H - 0.1, zb],
        ]);
        strokes.push([
          [x + 0.02, 0.16, zb],
          [x + 0.02, H - 0.16, zb],
        ]);
      }
      // Two ledges, laid across the boards.
      const ledgeH = 0.15;
      const yLow = 0.5;
      const yHigh = H - 0.72;
      strokes.push(...rectXY(-hw + 0.13, yLow, hw * 2 - 0.26, ledgeH, zb + 0.004));
      strokes.push(...rectXY(-hw + 0.13, yHigh, hw * 2 - 0.26, ledgeH, zb + 0.004));
      /* Brace, rising from the foot of the hinge stile to the head of the
         latch stile, so it reads as working in compression. Drawn as a
         parallelogram between the two ledges. */
      const xFoot = room.hinge === 'left' ? -hw + 0.07 : hw - 0.07;
      const xHead = room.hinge === 'left' ? hw - 0.07 : -hw + 0.07;
      const run = xHead > xFoot ? 1 : -1;
      const band = 0.22;
      const yb = yLow + ledgeH;
      const yt = yHigh;
      strokes.push([
        [xFoot, yb, zb + 0.006],
        [xHead - run * band, yt, zb + 0.006],
        [xHead, yt, zb + 0.006],
        [xFoot + run * band, yb, zb + 0.006],
        [xFoot, yb, zb + 0.006],
      ]);
      break;
    }
    case 'about': {
      // Study door: two tall panels and a round light, like a front room.
      panel(-hw + 0.1, 0.2, hw - 0.1, 1.62);
      panel(-hw + 0.1, 1.78, hw - 0.1, 2.28);
      strokes.push(...circleXY(0, 2.68, 0.29, LT / 2 + 0.003, 22));
      strokes.push(...circleXY(0, 2.68, 0.24, LT / 2 + 0.003, 22));
      glazing.push([-0.235, 2.445, 0.235, 2.915]);
      break;
    }
    case 'experience': {
      // Archive door: horizontal slats, like a run of drawer fronts.
      for (let i = 1; i < 9; i++) {
        const y = 0.16 + (i * (H - 0.32)) / 9;
        strokes.push([
          [-hw + 0.08, y, LT / 2 + 0.002],
          [hw - 0.08, y, LT / 2 + 0.002],
        ]);
      }
      panel(-hw + 0.08, 0.16, hw - 0.08, H - 0.16);
      break;
    }
    case 'experiments': {
      // Lab door: patched, over-engineered, slightly wrong on purpose.
      panel(-hw + 0.1, 0.18, hw - 0.1, 1.3);
      strokes.push(...rectXY(-hw + 0.22, 1.5, 0.62, 0.44, LT / 2 + 0.003));
      strokes.push(...rectXY(-hw + 0.3, 1.56, 0.46, 0.3, LT / 2 + 0.004));
      // Corner patch, riveted on.
      strokes.push([
        [hw - 0.78, H - 0.22, LT / 2 + 0.003],
        [hw - 0.12, H - 0.22, LT / 2 + 0.003],
        [hw - 0.12, H - 0.92, LT / 2 + 0.003],
        [hw - 0.82, H - 0.88, LT / 2 + 0.003],
        [hw - 0.78, H - 0.22, LT / 2 + 0.003],
      ]);
      for (let i = 0; i < 4; i++) {
        const bx = hw - 0.7 + i * 0.19;
        strokes.push(...circleXY(bx, H - 0.55, 0.035, LT / 2 + 0.004, 8));
      }
      glazing.push([-hw + 0.3, 1.56, -hw + 0.76, 1.86]);
      break;
    }
    case 'contact': {
      // Signal room door: flush, one letter slot, one small grille. Quiet.
      panel(-hw + 0.14, 0.24, hw - 0.14, H - 0.24);
      strokes.push(...rectXY(-0.42, 1.16, 0.84, 0.11, LT / 2 + 0.004));
      for (let i = 0; i < 7; i++) {
        const y = 2.32 + i * 0.055;
        strokes.push([
          [-0.3, y, LT / 2 + 0.004],
          [0.3, y, LT / 2 + 0.004],
        ]);
      }
      strokes.push(...rectXY(-0.34, 2.29, 0.68, 0.44, LT / 2 + 0.003));
      break;
    }
  }
  return { strokes, glazing };
}

export function DoorAssembly({ room }: { room: RoomDef }) {
  const s = sideSign(room.side);
  const hingeLocalX = room.hinge === 'left' ? -W / 2 : W / 2;
  const leafOffset = -hingeLocalX; // leaf centre sits opposite the hinge
  const openSign = openDirection(room);

  const hinge = useRef<THREE.Group>(null);
  const signGroup = useRef<THREE.Group>(null);
  const apertureGlow = useRef<THREE.Mesh>(null);
  const spill = useRef<THREE.Group>(null);
  const frameInk = useRef<THREE.Group>(null);

  const setHover = useWorld((st) => st.setHover);

  const paper = useMemo(() => paperTexture(7), []);
  const sign = useMemo(
    () => signTexture({ title: room.roomName, index: room.index, seed: room.doorZ + 3 }),
    [room.roomName, room.index, room.doorZ],
  );
  const plate = useMemo(() => plateTexture(room.label, `DOOR ${room.index}`, room.doorZ + 11), [room.label, room.index, room.doorZ]);

  const detail = useMemo(() => leafDetail(room), [room.id]);

  /* Frame and jamb outlines. Authored once. */
  const frameStrokes = useMemo<Stroke[]>(() => {
    const out: Stroke[] = [];
    const architraveOut = 0.17;
    const zf = 0.03;
    // Architrave: an outer moulding and an inner reveal edge.
    out.push(...rectXY(-W / 2 - architraveOut, 0, W + architraveOut * 2, H + architraveOut, zf + 0.008));
    out.push(...rectXY(-W / 2 - 0.055, 0, W + 0.11, H + 0.055, zf + 0.006));
    out.push(...rectXY(-W / 2, 0, W, H, 0.004));
    // Jamb: the four inside faces of the aperture, receding into the wall.
    const jz = -T;
    out.push([
      [-W / 2, 0, 0],
      [-W / 2, 0, jz],
    ]);
    out.push([
      [W / 2, 0, 0],
      [W / 2, 0, jz],
    ]);
    out.push([
      [-W / 2, H, 0],
      [-W / 2, H, jz],
    ]);
    out.push([
      [W / 2, H, 0],
      [W / 2, H, jz],
    ]);
    out.push(...rectXY(-W / 2, 0, W, H, jz));
    // A threshold strip on the floor.
    out.push([
      [-W / 2, 0.012, 0.02],
      [W / 2, 0.012, 0.02],
    ]);
    return out;
  }, []);

  useFrame((_, delta) => {
    const st = doors[room.id];
    const dt = Math.min(delta, 1 / 30);

    if (hinge.current) {
      // Hover gives a small extra push, as if the door were already yielding.
      const nudge = st.attention * openSign * 0.055;
      hinge.current.rotation.y = st.angle + nudge;
    }
    if (signGroup.current) {
      // The sign board swings a little on its brackets when noticed.
      signGroup.current.rotation.z = Math.sin(performance.now() / 900) * 0.004 + st.attention * 0.012;
      signGroup.current.position.y = SIGN_Y + 0.02 * st.attention;
    }
    if (apertureGlow.current) {
      const mat = apertureGlow.current.material as THREE.MeshBasicMaterial;
      const target = Math.max(st.glow, Math.abs(st.angle) / 1.6);
      mat.opacity += (Math.min(1, target) * 0.94 - mat.opacity) * Math.min(1, dt / 0.18);
      apertureGlow.current.visible = mat.opacity > 0.01;
    }
    if (spill.current) {
      spill.current.visible = st.glow > 0.02;
      spill.current.scale.setScalar(0.7 + st.glow * 0.45);
    }
    if (frameInk.current) {
      /* Attention warms the frame line toward the red pencil. Kept well short
         of the full accent: at full strength the architrave stops reading as
         an annotation over a drawing and starts reading as a UI highlight. */
      frameInk.current.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material & { color?: THREE.Color; opacity?: number };
        if (m?.color) {
          m.color.lerpColors(new THREE.Color(palette.graphite), new THREE.Color(palette.accent), st.attention * 0.58);
        }
      });
    }
  });

  /* A ray is not stopped by a wall — R3F only tests objects that carry
     handlers — so a door has to refuse contact from anywhere but the corridor
     it opens off. Otherwise the facade and the room walls are transparent to
     the cursor. */
  const inCorridor = () => worldState().phase === 'open' && worldState().zone === 'hall';

  const onOver = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    if (!inCorridor()) return;
    setHover({ id: `door-${room.id}`, verb: 'ENTER', label: room.roomName });
    sfx.hover();
    gsapTo(room.id, 1);
    document.body.style.cursor = 'none';
  };

  const onOut = () => {
    if (!inCorridor()) return;
    setHover(null);
    gsapTo(room.id, 0);
  };

  const onClick = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation();
    if (!pointerFlags.dragging && inCorridor()) {
      sfx.click();
      setHover(null);
      gsapTo(room.id, 0);
      enterRoom(room.id);
    }
  };

  return (
    <group position={[s * HALL.halfWidth, 0, room.doorZ]} rotation={[0, (-s * Math.PI) / 2, 0]}>
      {/* Aperture backing: a bright plane deep in the reveal. This is what
          blows out to white as the leaf swings and the camera pushes in. */}
      <mesh ref={apertureGlow} position={[0, H / 2, -T - 0.01]} visible={false}>
        <planeGeometry args={[W - 0.02, H - 0.02]} />
        <meshBasicMaterial color="#fffdf6" transparent opacity={0} toneMapped={false} fog={false} depthWrite={false} />
      </mesh>

      {/* Jamb reveal: the four inner faces of the hole through the wall. */}
      <Paper size={[T, H]} position={[-W / 2, H / 2, -T / 2]} rotation={[0, Math.PI / 2, 0]} texture={paper} tint="#e4dfd2" />
      <Paper size={[T, H]} position={[W / 2, H / 2, -T / 2]} rotation={[0, -Math.PI / 2, 0]} texture={paper} tint="#f0ece1" />
      <Paper size={[W, T]} position={[0, H, -T / 2]} rotation={[Math.PI / 2, 0, 0]} texture={paper} tint="#ded8ca" />
      <Paper size={[W, T]} position={[0, 0.008, -T / 2]} rotation={[-Math.PI / 2, 0, 0]} texture={paper} tint="#e8e3d6" />

      {/* Architrave moulding. */}
      <Paper size={[W + 0.34, 0.17]} position={[0, H + 0.085, 0.016]} texture={paper} tint="#f6f3ec" />
      <Paper size={[0.17, H + 0.17]} position={[-W / 2 - 0.085, (H + 0.17) / 2, 0.016]} texture={paper} tint="#f8f5ef" />
      <Paper size={[0.17, H + 0.17]} position={[W / 2 + 0.085, (H + 0.17) / 2, 0.016]} texture={paper} tint="#efebe1" />

      <group ref={frameInk}>
        <Ink strokes={frameStrokes} width={2.1} wobble={0.009} overshoot={0.035} passes={2} seed={room.doorZ + 5} />
      </group>

      {/* The leaf, on its hinge. */}
      <group ref={hinge} position={[hingeLocalX, 0, -LT * 0.5 - 0.012]}>
        <mesh position={[leafOffset, H / 2, 0]}>
          <boxGeometry args={[W - 0.03, H - 0.02, LT]} />
          <meshBasicMaterial color={room.tint} toneMapped={false} />
        </mesh>
        <group position={[leafOffset, 0, 0]}>
          <Ink
            strokes={boxEdges(W - 0.03, H - 0.02, LT, 0, H / 2, 0)}
            width={2.2}
            wobble={0.007}
            overshoot={0.028}
            passes={2}
            seed={room.doorZ + 9}
          />
          <Ink strokes={detail.strokes} width={1.5} wobble={0.006} overshoot={0.018} seed={room.doorZ + 17} opacity={0.72} />
          {/* Glazing reads as a brighter, slightly reflective pane. */}
          {detail.glazing?.map(([x0, y0, x1, y1], i) => (
            <mesh key={i} position={[(x0 + x1) / 2, (y0 + y1) / 2, LT / 2 + 0.005]}>
              <planeGeometry args={[x1 - x0, y1 - y0]} />
              {/* Reeded glass: brighter than the leaf, but not paper-white. */}
              <meshBasicMaterial color="#e8e6dc" transparent opacity={0.92} toneMapped={false} />
            </mesh>
          ))}
          {/* Handle: a plate and a lever, on the side away from the hinge. */}
          <group position={[room.hinge === 'left' ? W / 2 - 0.24 : -W / 2 + 0.24, 1.06, 0]}>
            <mesh position={[0, 0, LT / 2 + 0.012]}>
              <boxGeometry args={[0.075, 0.24, 0.022]} />
              <meshBasicMaterial color="#8a8277" toneMapped={false} />
            </mesh>
            <mesh position={[room.hinge === 'left' ? -0.075 : 0.075, 0.012, LT / 2 + 0.05]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.019, 0.019, 0.17, 8]} />
              <meshBasicMaterial color="#6f6862" toneMapped={false} />
            </mesh>
            <Ink
              strokes={boxEdges(0.075, 0.24, 0.022, 0, 0, LT / 2 + 0.012)}
              width={1.2}
              wobble={0.002}
              overshoot={0.006}
              seed={room.doorZ + 23}
              opacity={0.8}
            />
          </group>
          {/* Hinges, on the pivot side. */}
          {[0.42, H / 2, H - 0.42].map((y, i) => (
            <mesh key={i} position={[room.hinge === 'left' ? -W / 2 + 0.03 : W / 2 - 0.03, y, LT / 2 - 0.005]}>
              <boxGeometry args={[0.07, 0.16, 0.03]} />
              <meshBasicMaterial color="#7c746b" toneMapped={false} />
            </mesh>
          ))}
        </group>
      </group>

      {/* Hanging sign above the door. */}
      <group ref={signGroup} position={[0, SIGN_Y, 0.06]}>
        <mesh>
          <planeGeometry args={[SIGN_W, SIGN_H]} />
          <meshBasicMaterial map={sign} transparent toneMapped={false} />
        </mesh>
        {/* Brackets back to the wall. */}
        <Ink
          strokes={[
            [
              [-SIGN_W * 0.34, SIGN_H / 2, 0],
              [-SIGN_W * 0.34, SIGN_H / 2 + 0.17, -0.02],
              [SIGN_W * 0.34, SIGN_H / 2 + 0.17, -0.02],
              [SIGN_W * 0.34, SIGN_H / 2, 0],
            ],
            [
              [0, SIGN_H / 2 + 0.17, -0.02],
              [0, SIGN_H / 2 + 0.26, -0.03],
            ],
          ]}
          width={1.7}
          wobble={0.006}
          seed={room.doorZ + 31}
        />
      </group>

      {/* Stencilled label plate beside the architrave. */}
      <mesh position={[W / 2 + 0.62, 1.42, 0.02]}>
        <planeGeometry args={[0.78, 0.244]} />
        <meshBasicMaterial map={plate} transparent toneMapped={false} />
      </mesh>

      {/* Light thrown into the corridor once the door is open. */}
      <group ref={spill} visible={false}>
        <LightSpill size={[W * 1.5, 3.4]} position={[0, 0.02, 1.7]} rotation={[-Math.PI / 2, 0, 0]} opacity={0.5} />
      </group>

      {/* Interaction surface: one plane covering the doorway and its frame. */}
      <mesh
        position={[0, H / 2, 0.1]}
        onPointerOver={onOver}
        onPointerOut={onOut}
        onClick={onClick}
        visible={false}
      >
        <planeGeometry args={[W + 0.4, H + 0.2]} />
        <meshBasicMaterial />
      </mesh>
    </group>
  );
}

/* Kept out of the component so hover tweens do not re-create per render. */
import gsap from 'gsap';
function gsapTo(id: string, attention: number) {
  gsap.to(doors[id as keyof typeof doors], {
    attention,
    duration: attention > 0 ? 0.4 : 0.55,
    ease: attention > 0 ? 'power2.out' : 'power2.inOut',
    overwrite: 'auto',
  });
}
