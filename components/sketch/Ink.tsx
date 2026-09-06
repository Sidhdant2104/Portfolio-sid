'use client';

/**
 * Hand-drawn linework in 3D.
 *
 * Automatically wireframing geometry is exactly what makes 3D read as a
 * wireframe rather than a drawing, so outlines here are authored explicitly as
 * polylines. Each stroke is then subdivided and pushed off-true by a
 * deterministic amount, and optionally drawn twice slightly off-register — the
 * combination of wobble, corner overshoot and a doubled stroke is what sells
 * "someone drew this" instead of "a computer computed this".
 *
 * All strokes handed to one <Ink> collapse into a single line geometry, so a
 * whole wall's worth of outline costs one draw call.
 */

import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import * as THREE from 'three';
import { hash1s } from '@/lib/rand';
import { palette } from '@/lib/theme';

export type Pt = [number, number, number];
/** An open polyline. Two points is the common case: a single edge. */
export type Stroke = Pt[];

export interface InkProps {
  strokes: Stroke[];
  color?: string;
  /** Screen-space width in pixels, so lines stay legible at any distance. */
  width?: number;
  opacity?: number;
  /** Peak deviation from true, in world units. */
  wobble?: number;
  /** How far each stroke runs past its ends, in world units. */
  overshoot?: number;
  /** 2 gives the re-traced pencil look. */
  passes?: number;
  seed?: number;
  /** Subdivisions per stroke segment. More = wavier. */
  detail?: number;
  /** Closes each polyline back to its first point. */
  closed?: boolean;
  renderOrder?: number;
  depthTest?: boolean;
  transparent?: boolean;
}

const tmpDir = new THREE.Vector3();
const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();

/** A stable unit vector perpendicular to `dir`. */
function perpendicular(dir: THREE.Vector3, out: THREE.Vector3) {
  // Cross with whichever axis the direction is least aligned to, so the result
  // never degenerates.
  const ax = Math.abs(dir.x);
  const ay = Math.abs(dir.y);
  const az = Math.abs(dir.z);
  if (ax <= ay && ax <= az) out.set(1, 0, 0);
  else if (ay <= az) out.set(0, 1, 0);
  else out.set(0, 0, 1);
  return out.cross(dir).normalize();
}

function buildSegments(props: InkProps): number[] {
  const {
    strokes,
    wobble = 0.012,
    overshoot = 0,
    passes = 1,
    seed = 1,
    detail = 5,
    closed = false,
  } = props;

  const out: number[] = [];
  let counter = seed * 7919;

  for (let s = 0; s < strokes.length; s++) {
    const raw = strokes[s];
    if (raw.length < 2) continue;
    const pts = closed ? [...raw, raw[0]] : raw;

    for (let pass = 0; pass < passes; pass++) {
      // Extra passes are lighter and sit slightly off-register.
      const passScale = pass === 0 ? 1 : 1.5;
      const passBias = pass === 0 ? 0 : hash1s(counter + 977) * wobble * 1.2;

      for (let i = 0; i < pts.length - 1; i++) {
        counter += 31;
        tmpA.set(pts[i][0], pts[i][1], pts[i][2]);
        tmpB.set(pts[i + 1][0], pts[i + 1][1], pts[i + 1][2]);
        tmpDir.subVectors(tmpB, tmpA);
        const len = tmpDir.length();
        if (len < 1e-6) continue;
        tmpDir.divideScalar(len);

        const p1 = perpendicular(tmpDir, new THREE.Vector3());
        const p2 = new THREE.Vector3().crossVectors(tmpDir, p1).normalize();

        // Overshoot both ends by an uneven amount.
        const overA = overshoot * (0.5 + Math.abs(hash1s(counter + 3)) * 0.9);
        const overB = overshoot * (0.5 + Math.abs(hash1s(counter + 5)) * 0.9);
        const start = tmpA.clone().addScaledVector(tmpDir, -overA);
        const end = tmpB.clone().addScaledVector(tmpDir, overB);

        const steps = Math.max(1, detail);
        // A low-frequency bow across the stroke plus per-node tremor.
        const bow1 = hash1s(counter + 11) * wobble * passScale;
        const bow2 = hash1s(counter + 13) * wobble * passScale;

        let prev: THREE.Vector3 | null = null;
        for (let k = 0; k <= steps; k++) {
          const t = k / steps;
          const arch = Math.sin(t * Math.PI);
          const o1 = bow1 * arch + hash1s(counter + k * 7 + 101) * wobble * 0.45 * passScale + passBias;
          const o2 = bow2 * arch + hash1s(counter + k * 7 + 211) * wobble * 0.45 * passScale;
          const p = start
            .clone()
            .lerp(end, t)
            .addScaledVector(p1, o1)
            .addScaledVector(p2, o2);
          if (prev) out.push(prev.x, prev.y, prev.z, p.x, p.y, p.z);
          prev = p;
        }
      }
    }
  }
  return out;
}

export function Ink(props: InkProps) {
  const {
    color = palette.graphite,
    width = 1.7,
    opacity = 0.92,
    renderOrder,
    depthTest = true,
    transparent = true,
  } = props;

  const points = useMemo(() => buildSegments(props), [JSON.stringify(props)]);

  if (points.length === 0) return null;

  return (
    <Line
      points={points}
      segments
      color={color}
      lineWidth={width}
      transparent={transparent}
      opacity={opacity}
      depthTest={depthTest}
      renderOrder={renderOrder}
      polygonOffset
      polygonOffsetFactor={-4}
      polygonOffsetUnits={-4}
      toneMapped={false}
    />
  );
}

/* --------------------------------------------------------------- shorthands */

/** Rectangle outline in the XY plane at a given z. */
export function rectXY(x: number, y: number, w: number, h: number, z = 0): Stroke[] {
  return [
    [
      [x, y, z],
      [x + w, y, z],
    ],
    [
      [x + w, y, z],
      [x + w, y + h, z],
    ],
    [
      [x + w, y + h, z],
      [x, y + h, z],
    ],
    [
      [x, y + h, z],
      [x, y, z],
    ],
  ];
}

/** Rectangle outline in the ZY plane at a given x. */
export function rectZY(z: number, y: number, d: number, h: number, x = 0): Stroke[] {
  return [
    [
      [x, y, z],
      [x, y, z + d],
    ],
    [
      [x, y, z + d],
      [x, y + h, z + d],
    ],
    [
      [x, y + h, z + d],
      [x, y + h, z],
    ],
    [
      [x, y + h, z],
      [x, y, z],
    ],
  ];
}

/** Rectangle outline in the XZ plane at a given y. */
export function rectXZ(x: number, z: number, w: number, d: number, y = 0): Stroke[] {
  return [
    [
      [x, y, z],
      [x + w, y, z],
    ],
    [
      [x + w, y, z],
      [x + w, y, z + d],
    ],
    [
      [x + w, y, z + d],
      [x, y, z + d],
    ],
    [
      [x, y, z + d],
      [x, y, z],
    ],
  ];
}

/** The twelve edges of an axis-aligned box, centred on the origin. */
export function boxEdges(w: number, h: number, d: number, cx = 0, cy = 0, cz = 0): Stroke[] {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  const z0 = cz - d / 2;
  const z1 = cz + d / 2;
  const corners: Pt[] = [
    [x0, y0, z0],
    [x1, y0, z0],
    [x1, y0, z1],
    [x0, y0, z1],
    [x0, y1, z0],
    [x1, y1, z0],
    [x1, y1, z1],
    [x0, y1, z1],
  ];
  const pairs: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ];
  return pairs.map(([a, b]) => [corners[a], corners[b]]);
}

/** A circle approximated as a polyline, in the XY plane. */
export function circleXY(cx: number, cy: number, r: number, z = 0, segments = 24): Stroke[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, z]);
  }
  return [pts];
}

/** The same, lying flat — for anything with a round top: stools, mugs, plinths. */
export function circleXZ(cx: number, cz: number, r: number, y = 0, segments = 24): Stroke[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push([cx + Math.cos(a) * r, y, cz + Math.sin(a) * r]);
  }
  return [pts];
}
