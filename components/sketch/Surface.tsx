'use client';

/**
 * Flat surfaces.
 *
 * Everything is unlit on purpose. Real lighting on this geometry would produce
 * smooth CG gradients that fight the drawn linework, so instead each surface
 * carries a fixed tint chosen the way an illustrator picks values — floors
 * darker than walls, near walls lighter than far ones — and all the texture
 * comes from drawn hatching. Cheaper, and it stays inside the drawing.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { contactShadeTexture, groundShadowTexture, lightSpillTexture } from '@/lib/textures';

export interface PaperProps {
  /** Plane size. */
  size: [number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  texture?: THREE.Texture | null;
  /** Multiplied over the texture. This is where surface value is set. */
  tint?: string;
  /** Texture tiling. */
  repeat?: [number, number];
  opacity?: number;
  side?: THREE.Side;
  transparent?: boolean;
  fog?: boolean;
  renderOrder?: number;
  depthWrite?: boolean;
}

export function Paper({
  size,
  position,
  rotation,
  texture,
  tint = '#ffffff',
  repeat,
  opacity = 1,
  side = THREE.FrontSide,
  transparent = false,
  fog = true,
  renderOrder,
  depthWrite = true,
}: PaperProps) {
  // Tiling differs per instance, so a repeated texture needs its own clone to
  // avoid one surface's repeat leaking into another's.
  const map = useMemo(() => {
    if (!texture) return null;
    if (!repeat) return texture;
    const t = texture.clone();
    t.needsUpdate = true;
    t.repeat.set(repeat[0], repeat[1]);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return t;
  }, [texture, repeat?.[0], repeat?.[1]]);

  return (
    <mesh position={position} rotation={rotation} renderOrder={renderOrder}>
      <planeGeometry args={size} />
      <meshBasicMaterial
        map={map ?? undefined}
        color={tint}
        opacity={opacity}
        transparent={transparent || opacity < 1}
        side={side}
        fog={fog}
        depthWrite={depthWrite}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * Hatched shading along a surface junction. A thin strip sitting just off the
 * wall, fading upward — the drawn equivalent of an ambient occlusion pass.
 */
export function ContactShade({
  size,
  position,
  rotation,
  opacity = 0.5,
  seed = 1,
  repeat = [4, 1],
}: {
  size: [number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  opacity?: number;
  seed?: number;
  repeat?: [number, number];
}) {
  const tex = useMemo(() => {
    const t = contactShadeTexture(seed).clone();
    t.repeat.set(repeat[0], repeat[1]);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.needsUpdate = true;
    return t;
  }, [seed, repeat[0], repeat[1]]);

  return (
    <mesh position={position} rotation={rotation} renderOrder={2}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} color="#8d857a" toneMapped={false} />
    </mesh>
  );
}

/** Graphite pool under an object, to stop it floating. */
export function GroundShadow({
  size,
  position,
  opacity = 0.7,
  seed = 1,
}: {
  size: [number, number];
  position: [number, number, number];
  opacity?: number;
  seed?: number;
}) {
  const tex = useMemo(() => groundShadowTexture(seed), [seed]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} renderOrder={3}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** Light thrown across the floor by an open doorway or window. */
export function LightSpill({
  size,
  position,
  rotation = [-Math.PI / 2, 0, 0],
  opacity = 0.8,
}: {
  size: [number, number];
  position: [number, number, number];
  rotation?: [number, number, number];
  opacity?: number;
}) {
  const tex = useMemo(() => lightSpillTexture(), []);
  return (
    <mesh position={position} rotation={rotation} renderOrder={4}>
      <planeGeometry args={size} />
      <meshBasicMaterial
        map={tex}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  );
}

/**
 * A flat volume with drawn edges. Used for anything with thickness — door
 * leaves, benches, plinths — where a plane would read as paper-thin.
 */
export function Slab({
  size,
  position,
  rotation,
  tint = '#faf8f2',
  texture,
  repeat,
}: {
  size: [number, number, number];
  position?: [number, number, number];
  rotation?: [number, number, number];
  tint?: string;
  texture?: THREE.Texture | null;
  repeat?: [number, number];
}) {
  const map = useMemo(() => {
    if (!texture) return null;
    if (!repeat) return texture;
    const t = texture.clone();
    t.repeat.set(repeat[0], repeat[1]);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;
    return t;
  }, [texture, repeat?.[0], repeat?.[1]]);

  return (
    <mesh position={position} rotation={rotation}>
      <boxGeometry args={size} />
      <meshBasicMaterial map={map ?? undefined} color={tint} toneMapped={false} />
    </mesh>
  );
}
