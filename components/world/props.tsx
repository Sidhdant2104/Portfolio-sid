'use client';

/**
 * Reusable furnishings.
 *
 * Every room is built from the same small vocabulary — a framed thing on a
 * wall, a plinth, a bench, a screen — so the building feels like one designed
 * space rather than six unrelated scenes. Interaction is shared too: anything
 * hoverable lifts very slightly, warms its outline toward the red pencil, and
 * tells the cursor which verb to show.
 */

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';
import { Ink, boxEdges, rectXY, type Stroke } from '@/components/sketch/Ink';
import { GroundShadow, Paper } from '@/components/sketch/Surface';
import { useOptionalRoomFrame } from '@/components/world/roomFrame';
import { objectAttention } from '@/lib/animState';
import { pointerFlags } from '@/lib/pointer';
import { useWorld, worldState, type HoverTarget } from '@/lib/store';
import { palette } from '@/lib/theme';
import { sfx } from '@/lib/audio';

/* ------------------------------------------------------------------- hover */

export function useObjectHover(id: string, verb: HoverTarget['verb'], label?: string) {
  const setHover = useWorld((st) => st.setHover);
  const roomId = useOptionalRoomFrame()?.room.id;
  if (objectAttention[id] === undefined) objectAttention[id] = 0;

  /* R3F only raycasts objects that carry pointer handlers, which means a solid
     wall does not stop a ray. Without a zone test, every readable object in
     the building is hoverable from the corridor, through thirty metres of
     masonry — the corridor wall would report "OPEN · LINKEDIN". */
  const reachable = useMemo(
    () => () => {
      const st = worldState();
      if (st.phase !== 'open' || st.reading) return false;
      if (roomId && st.zone !== roomId) return false;
      return true;
    },
    [roomId],
  );

  const handlers = useMemo(
    () => ({
      onPointerOver: (e: { stopPropagation: () => void }) => {
        e.stopPropagation();
        if (!reachable()) return;
        setHover({ id, verb, label });
        sfx.hover();
        gsap.to(objectAttention, { [id]: 1, duration: 0.38, ease: 'power2.out', overwrite: 'auto' });
      },
      onPointerOut: () => {
        if (!reachable()) return;
        setHover(null);
        gsap.to(objectAttention, { [id]: 0, duration: 0.5, ease: 'power2.inOut', overwrite: 'auto' });
      },
    }),
    [id, verb, label, setHover, reachable],
  );

  const click = (fn: () => void) => (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (pointerFlags.dragging) return;
    if (!reachable()) return;
    sfx.click();
    setHover(null);
    gsap.to(objectAttention, { [id]: 0, duration: 0.3, overwrite: 'auto' });
    fn();
  };

  return { handlers, click };
}

/** Drives an object's hover response: a small lift, and a warming outline. */
function useAttentionMotion(
  id: string,
  refs: {
    group?: React.RefObject<THREE.Group | null>;
    ink?: React.RefObject<THREE.Group | null>;
    lift?: number;
    tiltAmount?: number;
  },
) {
  const base = useRef<number | null>(null);
  const graphite = useMemo(() => new THREE.Color(palette.graphite), []);
  const accent = useMemo(() => new THREE.Color(palette.accent), []);

  useFrame(() => {
    const a = objectAttention[id] ?? 0;
    if (refs.group?.current) {
      if (base.current === null) base.current = refs.group.current.position.y;
      refs.group.current.position.y = base.current + a * (refs.lift ?? 0.028);
      if (refs.tiltAmount) refs.group.current.rotation.x = -a * refs.tiltAmount;
    }
    if (refs.ink?.current) {
      refs.ink.current.traverse((o) => {
        const m = (o as THREE.Mesh).material as THREE.Material & { color?: THREE.Color };
        if (m?.color) m.color.lerpColors(graphite, accent, a * 0.9);
      });
    }
  });
}

/* -------------------------------------------------------------- framed work */

export interface FramedWorkProps {
  id: string;
  texture: THREE.Texture;
  /** Panel size in metres. */
  size: [number, number];
  position: [number, number, number];
  /** Rotation about Y, radians. The frame faces local +z before rotation. */
  rotationY?: number;
  rotationZ?: number;
  verb?: HoverTarget['verb'];
  label?: string;
  onSelect?: () => void;
  /** Frame profile depth. Chunkier frames read as more important. */
  frame?: number;
  /** Set false for unframed pinned sheets. */
  framed?: boolean;
  seed?: number;
}

/**
 * A flat work hung on a wall: a poster, a card, a plate, a pinned sheet. The
 * single most-used object in the building.
 */
export function FramedWork({
  id,
  texture,
  size,
  position,
  rotationY = 0,
  rotationZ = 0,
  verb = 'VIEW',
  label,
  onSelect,
  frame = 0.06,
  framed = true,
  seed = 1,
}: FramedWorkProps) {
  const group = useRef<THREE.Group>(null);
  const ink = useRef<THREE.Group>(null);
  const { handlers, click } = useObjectHover(id, verb, label);
  useAttentionMotion(id, { group, ink, lift: 0.03 });

  const [w, h] = size;
  const strokes = useMemo<Stroke[]>(() => {
    const out: Stroke[] = [];
    if (framed) {
      out.push(...rectXY(-w / 2 - frame, -h / 2 - frame, w + frame * 2, h + frame * 2, frame * 0.5 + 0.004));
      out.push(...rectXY(-w / 2, -h / 2, w, h, frame * 0.5 + 0.006));
    } else {
      out.push(...rectXY(-w / 2, -h / 2, w, h, 0.006));
    }
    return out;
  }, [w, h, frame, framed]);

  return (
    <group ref={group} position={position} rotation={[0, rotationY, rotationZ]}>
      {framed && (
        <>
          {/* Frame moulding: a shallow box behind the sheet. */}
          <mesh position={[0, 0, -frame * 0.25]}>
            <boxGeometry args={[w + frame * 2, h + frame * 2, frame]} />
            <meshBasicMaterial color="#efebe0" toneMapped={false} />
          </mesh>
          <Ink
            strokes={boxEdges(w + frame * 2, h + frame * 2, frame, 0, 0, -frame * 0.25)}
            width={1.5}
            wobble={0.004}
            overshoot={0.012}
            seed={seed + 3}
            opacity={0.5}
          />
        </>
      )}
      <mesh position={[0, 0, framed ? frame * 0.28 : 0.004]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
      <group ref={ink}>
        <Ink strokes={strokes} width={1.9} wobble={0.004} overshoot={0.014} passes={2} seed={seed} />
      </group>

      {onSelect && (
        <mesh position={[0, 0, frame * 0.5 + 0.03]} visible={false} {...handlers} onClick={click(onSelect)}>
          <planeGeometry args={[w + frame * 2, h + frame * 2]} />
          <meshBasicMaterial />
        </mesh>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ plinth */

export function Plinth({
  size = [0.9, 1.0, 0.9],
  position,
  tint = '#f1ede3',
  seed = 1,
}: {
  size?: [number, number, number];
  position: [number, number, number];
  tint?: string;
  seed?: number;
}) {
  const [w, h, d] = size;
  return (
    <group position={position}>
      <mesh position={[0, h / 2, 0]}>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial color={tint} toneMapped={false} />
      </mesh>
      <Ink strokes={boxEdges(w, h, d, 0, h / 2, 0)} width={1.9} wobble={0.005} overshoot={0.02} passes={2} seed={seed} />
      <GroundShadow size={[w * 1.9, d * 1.9]} position={[0, 0.01, 0]} opacity={0.55} seed={seed} />
    </group>
  );
}

/** A long work surface on legs. The workshop bench and the study desk both use it. */
export function Bench({
  length,
  depth = 1.05,
  height = 0.92,
  position,
  rotationY = 0,
  tint = '#eee9de',
  seed = 1,
  drawers = 0,
}: {
  length: number;
  depth?: number;
  height?: number;
  position: [number, number, number];
  rotationY?: number;
  tint?: string;
  seed?: number;
  drawers?: number;
}) {
  const topT = 0.075;
  const strokes = useMemo<Stroke[]>(() => {
    const out: Stroke[] = [];
    out.push(...boxEdges(length, topT, depth, 0, height - topT / 2, 0));
    // Aprons and legs.
    const legInset = 0.28;
    const legs: Array<[number, number]> = [
      [-length / 2 + legInset, -depth / 2 + legInset],
      [length / 2 - legInset, -depth / 2 + legInset],
      [-length / 2 + legInset, depth / 2 - legInset],
      [length / 2 - legInset, depth / 2 - legInset],
    ];
    for (const [lx, lz] of legs) {
      out.push(...boxEdges(0.1, height - topT, 0.1, lx, (height - topT) / 2, lz));
    }
    out.push([
      [-length / 2, height - topT - 0.14, -depth / 2 + 0.02],
      [length / 2, height - topT - 0.14, -depth / 2 + 0.02],
    ]);
    for (let i = 0; i < drawers; i++) {
      const cx = -length / 2 + (length / drawers) * (i + 0.5);
      out.push(...rectXY(cx - length / drawers / 2 + 0.06, height - topT - 0.5, length / drawers - 0.12, 0.34, depth / 2 + 0.006));
    }
    return out;
  }, [length, depth, height, drawers]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, height - topT / 2, 0]}>
        <boxGeometry args={[length, topT, depth]} />
        <meshBasicMaterial color={tint} toneMapped={false} />
      </mesh>
      <mesh position={[0, (height - topT) / 2, -depth / 2 + 0.06]}>
        <boxGeometry args={[length - 0.3, height - topT - 0.18, 0.08]} />
        <meshBasicMaterial color="#eae5da" toneMapped={false} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh
            key={`${sx}${sz}`}
            position={[(sx * (length - 0.56)) / 2, (height - topT) / 2, (sz * (depth - 0.56)) / 2]}
          >
            <boxGeometry args={[0.1, height - topT, 0.1]} />
            <meshBasicMaterial color="#e7e2d6" toneMapped={false} />
          </mesh>
        )),
      )}
      <Ink strokes={strokes} width={1.8} wobble={0.005} overshoot={0.018} passes={2} seed={seed} />
      <GroundShadow size={[length * 1.15, depth * 2.1]} position={[0, 0.01, 0]} opacity={0.5} seed={seed + 1} />
    </group>
  );
}

/** A monitor on a stand, showing a drawn screen. */
export function Monitor({
  id,
  screen,
  size = [1.6, 0.98],
  position,
  rotationY = 0,
  onSelect,
  label,
  seed = 1,
}: {
  id: string;
  screen: THREE.Texture;
  size?: [number, number];
  position: [number, number, number];
  rotationY?: number;
  onSelect?: () => void;
  label?: string;
  seed?: number;
}) {
  const [w, h] = size;
  const bezel = 0.06;
  const group = useRef<THREE.Group>(null);
  const ink = useRef<THREE.Group>(null);
  const { handlers, click } = useObjectHover(id, 'VIEW', label);
  useAttentionMotion(id, { group, ink, lift: 0.02 });

  const strokes = useMemo<Stroke[]>(
    () => [
      ...boxEdges(w + bezel * 2, h + bezel * 2, 0.09, 0, 0, 0),
      ...rectXY(-w / 2, -h / 2, w, h, 0.05),
    ],
    [w, h],
  );

  return (
    <group ref={group} position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <boxGeometry args={[w + bezel * 2, h + bezel * 2, 0.09]} />
        <meshBasicMaterial color="#f0ece2" toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, 0.047]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial map={screen} toneMapped={false} />
      </mesh>
      <group ref={ink}>
        <Ink strokes={strokes} width={2} wobble={0.004} overshoot={0.015} passes={2} seed={seed} />
      </group>
      {/* Neck and foot. */}
      <mesh position={[0, -h / 2 - 0.24, -0.02]}>
        <boxGeometry args={[0.14, 0.42, 0.1]} />
        <meshBasicMaterial color="#e9e4d8" toneMapped={false} />
      </mesh>
      <mesh position={[0, -h / 2 - 0.47, 0.02]}>
        <boxGeometry args={[0.72, 0.045, 0.3]} />
        <meshBasicMaterial color="#e9e4d8" toneMapped={false} />
      </mesh>
      <Ink
        strokes={[
          ...boxEdges(0.14, 0.42, 0.1, 0, -h / 2 - 0.24, -0.02),
          ...boxEdges(0.72, 0.045, 0.3, 0, -h / 2 - 0.47, 0.02),
        ]}
        width={1.5}
        wobble={0.004}
        overshoot={0.012}
        seed={seed + 5}
        opacity={0.6}
      />
      {onSelect && (
        <mesh position={[0, 0, 0.1]} visible={false} {...handlers} onClick={click(onSelect)}>
          <planeGeometry args={[w + bezel * 2, h + bezel * 2]} />
          <meshBasicMaterial />
        </mesh>
      )}
    </group>
  );
}

/** Open shelving, filled with drawn spines. */
export function Shelf({
  width,
  height,
  position,
  rotationY = 0,
  shelves = 4,
  seed = 1,
  fill = 0.8,
}: {
  width: number;
  height: number;
  position: [number, number, number];
  rotationY?: number;
  shelves?: number;
  seed?: number;
  fill?: number;
}) {
  const depth = 0.36;
  const strokes = useMemo<Stroke[]>(() => {
    const out: Stroke[] = [];
    out.push(...boxEdges(width, height, depth, 0, height / 2, 0));
    for (let i = 1; i < shelves; i++) {
      const y = (i * height) / shelves;
      out.push([
        [-width / 2, y, depth / 2],
        [width / 2, y, depth / 2],
      ]);
      out.push([
        [-width / 2, y, -depth / 2],
        [width / 2, y, -depth / 2],
      ]);
    }
    return out;
  }, [width, height, shelves]);

  /* Book spines: varied widths and heights, deterministic per shelf. */
  const books = useMemo(() => {
    const out: Array<{ x: number; y: number; w: number; h: number; tint: string; lean: number }> = [];
    let n = seed * 977;
    const rnd = () => {
      n = (n * 1103515245 + 12345) & 0x7fffffff;
      return (n % 10000) / 10000;
    };
    const tints = ['#e4dccb', '#dcd4c2', '#e9e2d2', '#d6cebc', '#eee7d8'];
    for (let s = 0; s < shelves; s++) {
      const shelfY = (s * height) / shelves;
      const shelfH = height / shelves - 0.06;
      let x = -width / 2 + 0.08;
      while (x < width / 2 - 0.14) {
        if (rnd() > fill) {
          x += 0.1 + rnd() * 0.2;
          continue;
        }
        const w = 0.035 + rnd() * 0.075;
        const h = shelfH * (0.62 + rnd() * 0.32);
        const lean = rnd() > 0.9 ? (rnd() - 0.5) * 0.28 : 0;
        out.push({ x: x + w / 2, y: shelfY + h / 2 + 0.02, w, h, tint: tints[Math.floor(rnd() * tints.length)], lean });
        x += w + 0.008;
      }
    }
    return out;
  }, [width, height, shelves, seed, fill]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh position={[0, height / 2, -depth / 2 + 0.02]}>
        <boxGeometry args={[width, height, 0.04]} />
        <meshBasicMaterial color="#f2eee4" toneMapped={false} />
      </mesh>
      {Array.from({ length: shelves + 1 }, (_, i) => (
        <mesh key={i} position={[0, (i * height) / shelves, 0]}>
          <boxGeometry args={[width, 0.035, depth]} />
          <meshBasicMaterial color="#ece7dc" toneMapped={false} />
        </mesh>
      ))}
      {books.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, 0.02]} rotation={[0, 0, b.lean]}>
          <boxGeometry args={[b.w, b.h, depth * 0.72]} />
          <meshBasicMaterial color={b.tint} toneMapped={false} />
        </mesh>
      ))}
      <Ink strokes={strokes} width={1.7} wobble={0.005} overshoot={0.016} passes={2} seed={seed} />
      {/* One light outline pass over the spines so they read as drawn objects. */}
      <Ink
        strokes={books.map((b) => [
          [b.x - b.w / 2, b.y - b.h / 2, depth * 0.38],
          [b.x - b.w / 2, b.y + b.h / 2, depth * 0.38],
        ] as Stroke)}
        width={1.1}
        wobble={0.003}
        seed={seed + 7}
        opacity={0.4}
      />
      <GroundShadow size={[width * 1.1, depth * 3]} position={[0, 0.01, 0]} opacity={0.45} seed={seed + 3} />
    </group>
  );
}

/** A room title, painted directly onto a wall. */
export function WallTitle({
  texture,
  size,
  position,
  rotationY = 0,
}: {
  texture: THREE.Texture;
  size: [number, number];
  position: [number, number, number];
  rotationY?: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Paper size={size} texture={texture} transparent tint="#ffffff" />
    </group>
  );
}
