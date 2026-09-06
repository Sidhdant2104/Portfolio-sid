'use client';

/**
 * First-person rig.
 *
 * Deliberately not a game FPS: there is no pointer lock (which would kill the
 * custom cursor and make objects unclickable), and the mouse only leans the
 * view rather than driving it one-to-one. Walking is on the keys; turning is on
 * drag, arrows, or simply clicking what you want to look at. Motion is
 * velocity-smoothed in both directions so starts and stops carry weight.
 */

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { nav, doors } from '@/lib/animState';
import { pointerFlags } from '@/lib/pointer';
import { resolveMove, zoneAt } from '@/lib/collision';
import { useWorld, worldState } from '@/lib/store';
import { camera as cameraTheme } from '@/lib/theme';
import { noise1 } from '@/lib/rand';
import { doorApproach, ROOMS, sideSign, type RoomId, type ZoneId } from '@/data/world';
import { facingYawFor, nearestAngle, nudgeDoorOpen } from '@/lib/transits';
import { sfx } from '@/lib/audio';

const WALK_SPEED = 2.35;
const RUN_SPEED = 3.7;
const ACCEL_TAU = 0.16;
const TURN_SPEED = 1.5;
const LOOK_YAW_RANGE = 0.34;
const LOOK_PITCH_RANGE = 0.15;
const LOOK_TAU = 0.22;
const DRAG_SENSITIVITY = 0.0031;

/** How close, and how squarely, you must stand for a door to open by itself. */
const PROXIMITY_RANGE = 3.4;
const PROXIMITY_DOT = 0.45;

export function CameraRig() {
  const { camera, scene } = useThree();
  const veil = useRef<THREE.Mesh>(null);

  const keys = useRef<Record<string, boolean>>({});
  const pointer = useRef({ nx: 0, ny: 0 });
  const look = useRef({ yaw: 0, pitch: 0 });
  const vel = useRef(new THREE.Vector3());
  const turnVel = useRef(0);
  const bob = useRef({ phase: 0, lastStep: 0 });
  const travelled = useRef(0);
  const proximity = useRef<RoomId | null>(null);
  const zoneRef = useRef<ZoneId>('exterior');

  /* --------------------------------------------------------------- input */

  useEffect(() => {
    camera.rotation.order = 'YXZ';
    if (camera instanceof THREE.PerspectiveCamera) camera.fov = nav.fov;

    const onKeyDown = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const onBlur = () => {
      keys.current = {};
    };

    const onPointerMove = (e: PointerEvent) => {
      pointer.current.nx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.ny = (e.clientY / window.innerHeight) * 2 - 1;
      if (pointerFlags.down) {
        const dx = e.clientX - pointerFlags.lastX;
        const dy = e.clientY - pointerFlags.lastY;
        pointerFlags.travel += Math.abs(dx) + Math.abs(dy);
        if (pointerFlags.travel > 8) pointerFlags.dragging = true;
        if (pointerFlags.dragging && worldState().phase === 'open') {
          nav.yaw -= dx * DRAG_SENSITIVITY;
          nav.pitch = THREE.MathUtils.clamp(nav.pitch - dy * DRAG_SENSITIVITY * 0.62, -0.42, 0.42);
        }
      }
      pointerFlags.lastX = e.clientX;
      pointerFlags.lastY = e.clientY;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      pointerFlags.down = true;
      pointerFlags.dragging = false;
      pointerFlags.travel = 0;
      pointerFlags.lastX = e.clientX;
      pointerFlags.lastY = e.clientY;
    };
    const onPointerUp = () => {
      pointerFlags.down = false;
      // Cleared on the next frame so mesh click handlers can still see it.
      requestAnimationFrame(() => {
        pointerFlags.dragging = false;
      });
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [camera]);

  /* ---------------------------------------------------------------- loop */

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 1 / 30);
    const st = worldState();
    const free = st.phase === 'open' && !st.reading;
    const reduced = st.reducedMotion;

    /* Walking. Only while the visitor has control. */
    if (free) {
      const k = keys.current;
      const fwd = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
      const strafe = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0);
      const turn = (k.ArrowLeft || k.KeyQ ? 1 : 0) - (k.ArrowRight || k.KeyE ? 1 : 0);
      const speed = k.ShiftLeft || k.ShiftRight ? RUN_SPEED : WALK_SPEED;

      turnVel.current += (turn * TURN_SPEED - turnVel.current) * Math.min(1, dt / 0.14);
      nav.yaw += turnVel.current * dt;

      // Move relative to where the eye is actually pointing, look-lean included.
      const heading = nav.yaw + look.current.yaw;
      const fx = -Math.sin(heading);
      const fz = -Math.cos(heading);
      const rx = Math.cos(heading);
      const rz = -Math.sin(heading);

      const desired = new THREE.Vector3(fx * fwd + rx * strafe, 0, fz * fwd + rz * strafe);
      if (desired.lengthSq() > 0) desired.normalize().multiplyScalar(speed);

      const blend = Math.min(1, dt / ACCEL_TAU);
      vel.current.lerp(desired, blend);
      if (vel.current.lengthSq() < 1e-5) vel.current.set(0, 0, 0);

      if (vel.current.lengthSq() > 0) {
        const gates = { frontDoor: doors.front.angle > 0.35, openDoor: st.openDoor };
        const next = resolveMove(
          nav.px,
          nav.pz,
          nav.px + vel.current.x * dt,
          nav.pz + vel.current.z * dt,
          gates,
        );
        const moved = Math.hypot(next.x - nav.px, next.z - nav.pz);
        travelled.current += moved;
        nav.px = next.x;
        nav.pz = next.z;
        if (travelled.current > 6 && !st.hintDismissed) st.dismissHint();
      }
    } else {
      vel.current.multiplyScalar(Math.max(0, 1 - dt / 0.2));
      turnVel.current = 0;
    }

    /* Mouse lean. Suppressed while dragging, so the two do not compound. */
    const leanTarget = free && !pointerFlags.dragging && !st.isTouch;
    const targetLookYaw = leanTarget ? -pointer.current.nx * LOOK_YAW_RANGE : 0;
    const targetLookPitch = leanTarget ? -pointer.current.ny * LOOK_PITCH_RANGE : 0;
    const lookBlend = Math.min(1, dt / LOOK_TAU);
    look.current.yaw += (targetLookYaw - look.current.yaw) * lookBlend;
    look.current.pitch += (targetLookPitch - look.current.pitch) * lookBlend;

    /* Gait and idle sway. Small enough to feel alive, not enough to nauseate. */
    const speedNow = Math.hypot(vel.current.x, vel.current.z);
    let bobY = 0;
    let roll = 0;
    if (!reduced) {
      const amount = nav.swayAmount;
      if (speedNow > 0.15) {
        bob.current.phase += dt * speedNow * 2.55;
        bobY = Math.sin(bob.current.phase * 2) * 0.021 * amount;
        roll = Math.sin(bob.current.phase) * 0.0055 * amount;
        // One footfall per half-cycle.
        const steps = Math.floor(bob.current.phase / Math.PI);
        if (steps !== bob.current.lastStep) {
          bob.current.lastStep = steps;
          sfx.step(Math.min(1, speedNow / WALK_SPEED) * 0.7);
        }
      }
      const t = performance.now() / 1000;
      bobY += noise1(t * 0.28, 3) * 0.009 * amount;
      roll += noise1(t * 0.19, 7) * 0.0022 * amount;
      nav.pitch += 0;
      camera.rotation.z = roll;
    } else {
      camera.rotation.z = 0;
    }

    /* Compose the view. */
    camera.position.set(nav.px, nav.py + bobY, nav.pz);
    camera.rotation.y = nav.yaw + look.current.yaw;
    camera.rotation.x = THREE.MathUtils.clamp(nav.pitch + look.current.pitch, -0.62, 0.62);
    if (camera instanceof THREE.PerspectiveCamera && Math.abs(camera.fov - nav.fov) > 0.01) {
      camera.fov = nav.fov;
      camera.updateProjectionMatrix();
    }

    /* Atmosphere. */
    if (scene.fog instanceof THREE.FogExp2) {
      scene.fog.density += (nav.fogDensity - scene.fog.density) * Math.min(1, dt / 0.5);
    }
    if (veil.current) {
      const mat = veil.current.material as THREE.MeshBasicMaterial;
      mat.opacity = nav.veil;
      veil.current.visible = nav.veil > 0.002;
      // Pinned just in front of the lens, after the camera transform is final.
      veil.current.position.copy(camera.position);
      veil.current.quaternion.copy(camera.quaternion);
      veil.current.translateZ(-0.3);
    }

    /* Location readout. */
    const gates = { frontDoor: doors.front.angle > 0.35, openDoor: st.openDoor };
    const zone = zoneAt(nav.px, nav.pz, gates);
    if (zone !== zoneRef.current) {
      zoneRef.current = zone;
      st.setZone(zone);
    }

    /* Doors open as you walk up to them, and shut behind you. */
    if (st.phase === 'open' && zone === 'hall') {
      let best: RoomId | null = null;
      let bestDist = Infinity;
      for (const room of ROOMS) {
        const [ax, az] = doorApproach(room);
        const d = Math.hypot(nav.px - ax, nav.pz - az);
        if (d > PROXIMITY_RANGE) continue;
        // Only if the door is actually in front of the visitor.
        const want = facingYawFor(room);
        const delta = Math.abs(nearestAngle(camera.rotation.y, want) - camera.rotation.y);
        const facing = Math.cos(delta);
        if (facing < PROXIMITY_DOT) continue;
        if (d < bestDist) {
          bestDist = d;
          best = room.id;
        }
      }
      if (best !== proximity.current) {
        if (proximity.current) nudgeDoorOpen(proximity.current, false);
        if (best) nudgeDoorOpen(best, true);
        proximity.current = best;
        useWorld.getState().setOpenDoor(best);
      }
    } else if (zone !== 'hall' && proximity.current && zone !== proximity.current) {
      proximity.current = null;
    }
  });

  return (
    <mesh ref={veil} renderOrder={9999} frustumCulled={false} visible={false}>
      <planeGeometry args={[4, 4]} />
      <meshBasicMaterial
        color="#fffdf6"
        transparent
        opacity={0}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}

/** Snap the rig to a spot without animation. Used to set up the opening view. */
export function placeCamera(x: number, z: number, yaw: number, pitch = 0) {
  nav.px = x;
  nav.pz = z;
  nav.py = cameraTheme.eyeHeight;
  nav.yaw = yaw;
  nav.pitch = pitch;
}

export { sideSign };
