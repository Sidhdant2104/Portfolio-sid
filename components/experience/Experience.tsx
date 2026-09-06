'use client';

/**
 * The single WebGL scene.
 *
 * There is only ever one canvas and one scene graph, because there is only one
 * building. Rooms are not swapped in and out — they exist at real coordinates
 * off the corridor, and are simply culled when the visitor is nowhere near
 * them. That is what allows a doorway transition to be a continuous camera
 * move rather than a scene change.
 */

import { Canvas } from '@react-three/fiber';
import { AdaptiveDpr, Preload } from '@react-three/drei';
import * as THREE from 'three';
import { CameraRig } from './CameraRig';
import { Exterior } from '@/components/world/Exterior';
import { Hall } from '@/components/world/Hall';
import { Rooms } from '@/components/world/Rooms';
import { camera as cameraTheme, fog } from '@/lib/theme';
import { nav } from '@/lib/animState';

export function Experience({ quality }: { quality: 'high' | 'low' }) {
  return (
    <Canvas
      /* Perspective is the whole point, so the camera is authored, not defaulted. */
      camera={{ fov: cameraTheme.fov, near: 0.08, far: 220, position: [nav.px, nav.py, nav.pz] }}
      dpr={quality === 'high' ? [1, 1.75] : [0.8, 1.15]}
      gl={{
        antialias: quality === 'high',
        alpha: false,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true,
      }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor(new THREE.Color(fog.color));
        scene.background = new THREE.Color(fog.color);
      }}
      /* Flat: no tone mapping, no colour management surprises. The palette is
         chosen in sRGB and must arrive on screen unchanged. */
      flat
      legacy={false}
    >
      <fogExp2 attach="fog" args={[fog.color, fog.exteriorDensity]} />
      {/* A little ambient light exists only for the few lit materials; the
          world is deliberately unlit and flat-shaded. */}
      <ambientLight intensity={1} />

      <CameraRig />

      <Exterior />
      <Hall />
      <Rooms quality={quality} />

      <Preload all />
      <AdaptiveDpr pixelated={false} />
    </Canvas>
  );
}
