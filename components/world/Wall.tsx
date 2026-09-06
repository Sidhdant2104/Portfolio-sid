'use client';

/**
 * A wall with holes in it.
 *
 * Rather than boolean-subtracting geometry, the wall is split into the solid
 * panels that remain around each aperture: full-height sections between
 * openings, plus a header over each one. That keeps every surface a plane (one
 * quad, no triangulation cost) and means the aperture edges land exactly where
 * the door frames expect them.
 *
 * Local frame: `u` runs along the wall from the origin on local +x, `v` runs up
 * on local +y, and the wall faces local +z. Callers rotate it into place.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { Ink, type Stroke } from '@/components/sketch/Ink';
import { ContactShade, Paper } from '@/components/sketch/Surface';

export interface Aperture {
  /** Centre along the wall, in local u. */
  center: number;
  width: number;
  height: number;
}

interface Panel {
  u0: number;
  u1: number;
  v0: number;
  v1: number;
}

/** Split the wall into the solid rectangles left over around the apertures. */
export function wallPanels(length: number, height: number, apertures: Aperture[]): Panel[] {
  const holes = [...apertures].sort((a, b) => a.center - b.center);
  const panels: Panel[] = [];
  let cursor = 0;

  for (const hole of holes) {
    const left = hole.center - hole.width / 2;
    const right = hole.center + hole.width / 2;
    if (left > cursor) panels.push({ u0: cursor, u1: left, v0: 0, v1: height });
    if (hole.height < height) panels.push({ u0: left, u1: right, v0: hole.height, v1: height });
    cursor = right;
  }
  if (cursor < length) panels.push({ u0: cursor, u1: length, v0: 0, v1: height });
  return panels;
}

export interface WallProps {
  length: number;
  height: number;
  apertures?: Aperture[];
  position: [number, number, number];
  rotation?: [number, number, number];
  texture?: THREE.Texture | null;
  tint?: string;
  /** World units per texture tile, so tiling stays consistent across walls. */
  tileSize?: number;
  /** Draws the skirting board and its contact shading. */
  skirting?: boolean;
  /** Outlines the top edge, for rooms where the wall/ceiling junction is visible. */
  capLine?: boolean;
  seed?: number;
  /** Extra strokes in wall-local coordinates. */
  detail?: Stroke[];
}

export function Wall({
  length,
  height,
  apertures = [],
  position,
  rotation,
  texture,
  tint = '#f6f3ec',
  tileSize = 4,
  skirting = true,
  capLine = true,
  seed = 1,
  detail,
}: WallProps) {
  const panels = useMemo(() => wallPanels(length, height, apertures), [length, height, JSON.stringify(apertures)]);

  const strokes = useMemo<Stroke[]>(() => {
    const out: Stroke[] = [];
    if (capLine) {
      out.push([
        [0, height, 0.006],
        [length, height, 0.006],
      ]);
    }
    // Aperture reveals get their own outline so the hole reads as cut, not painted.
    for (const a of apertures) {
      const l = a.center - a.width / 2;
      const r = a.center + a.width / 2;
      out.push([
        [l, 0, 0.006],
        [l, a.height, 0.006],
      ]);
      out.push([
        [r, 0, 0.006],
        [r, a.height, 0.006],
      ]);
      out.push([
        [l, a.height, 0.006],
        [r, a.height, 0.006],
      ]);
    }
    if (skirting) {
      out.push([
        [0, 0.13, 0.03],
        [length, 0.13, 0.03],
      ]);
    }
    if (detail) out.push(...detail);
    return out;
  }, [length, height, JSON.stringify(apertures), capLine, skirting, JSON.stringify(detail)]);

  return (
    <group position={position} rotation={rotation}>
      {panels.map((p, i) => {
        const w = p.u1 - p.u0;
        const h = p.v1 - p.v0;
        if (w <= 0.001 || h <= 0.001) return null;
        return (
          <Paper
            key={i}
            size={[w, h]}
            position={[p.u0 + w / 2, p.v0 + h / 2, 0]}
            texture={texture}
            tint={tint}
            repeat={[Math.max(0.4, w / tileSize), Math.max(0.4, h / tileSize)]}
          />
        );
      })}

      {skirting && (
        <>
          {/* Skirting board, standing proud of the wall. */}
          <mesh position={[length / 2, 0.065, 0.026]}>
            <boxGeometry args={[length, 0.13, 0.052]} />
            <meshBasicMaterial color="#eae5d8" toneMapped={false} />
          </mesh>
          <ContactShade
            size={[length, 0.62]}
            position={[length / 2, 0.31, 0.055]}
            opacity={0.3}
            seed={seed}
            repeat={[Math.max(2, length / 3), 1]}
          />
        </>
      )}

      <Ink strokes={strokes} width={1.6} wobble={0.01} overshoot={0.03} seed={seed} opacity={0.55} />
    </group>
  );
}
