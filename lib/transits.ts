'use client';

/**
 * Scripted camera choreography.
 *
 * The rule every timeline here obeys: the camera never cuts, never fades to
 * another scene, and never stops moving while it crosses a threshold. Because
 * the building is one continuous space, "entering the projects room" is
 * literally a walk — approach the door, watch it swing, keep walking through
 * the aperture, decelerate on the far side.
 *
 * Position is driven from `onUpdate` along a pre-built curve rather than by
 * tweening x/z directly. That guarantees two consecutive phases of a walk can
 * never fight over the same property, and it means the corner between "turn to
 * face the door" and "stride through it" is rounded like a real footpath
 * instead of a right angle.
 */

import gsap from 'gsap';
import * as THREE from 'three';
import { nav, doors } from './animState';
import { useWorld } from './store';
import { camera as cameraTheme, fog } from './theme';
import { sfx } from './audio';
import {
  DOORWAY,
  HALL,
  doorApproach,
  roomBounds,
  roomById,
  sideSign,
  type RoomDef,
  type RoomId,
} from '@/data/world';

export const DOOR_OPEN_ANGLE = THREE.MathUtils.degToRad(97);
export const FRONT_OPEN_ANGLE = THREE.MathUtils.degToRad(88);

/** Which z-edge of the aperture the hinge sits on, in world terms. */
export function hingeSign(room: RoomDef) {
  return (room.hinge === 'left' ? -1 : 1) * sideSign(room.side);
}

/** Sign of the hinge rotation that swings the leaf away from the corridor. */
export function openDirection(room: RoomDef) {
  return room.hinge === 'left' ? 1 : -1;
}

/** Heading that squares the camera up with a side door. */
export function facingYawFor(room: RoomDef) {
  return (-sideSign(room.side) * Math.PI) / 2;
}

/** Rewrite a target angle to the rotationally-equivalent one nearest `current`. */
export function nearestAngle(current: number, target: number) {
  let t = target;
  while (t - current > Math.PI) t -= Math.PI * 2;
  while (t - current < -Math.PI) t += Math.PI * 2;
  return t;
}

const vec = (x: number, z: number, y = nav.py) => new THREE.Vector3(x, y, z);

/**
 * Drive nav.px/pz along a curve from an onUpdate callback. Nothing else tweens
 * those properties, so consecutive walk phases compose without overwrites.
 */
function walkAlong(
  tl: gsap.core.Timeline,
  curve: THREE.Curve<THREE.Vector3>,
  opts: { at: number; duration: number; ease: string },
) {
  const proxy = { t: 0 };
  tl.to(
    proxy,
    {
      t: 1,
      duration: opts.duration,
      ease: opts.ease,
      onUpdate: () => {
        const p = curve.getPointAt(Math.min(1, Math.max(0, proxy.t)));
        nav.px = p.x;
        nav.pz = p.z;
      },
    },
    opts.at,
  );
  return proxy;
}

/** A gently arcing approach from wherever the camera is to a chosen standing spot. */
function approachCurve(toX: number, toZ: number) {
  const from = vec(nav.px, nav.pz);
  const to = vec(toX, toZ);
  const mid = from.clone().lerp(to, 0.5);
  // Bias the midpoint along the current heading so the turn reads as a stride
  // rather than a pivot.
  const heading = new THREE.Vector3(-Math.sin(nav.yaw), 0, -Math.cos(nav.yaw));
  mid.addScaledVector(heading, from.distanceTo(to) * 0.12);
  mid.y = nav.py;
  return new THREE.CatmullRomCurve3([from, mid, to], false, 'catmullrom', 0.4);
}

let active: gsap.core.Timeline | null = null;

export function isTransiting() {
  return Boolean(active && active.isActive());
}

function begin() {
  const st = useWorld.getState();
  if (st.phase === 'transit') return null;
  active?.kill();
  st.setPhase('transit');
  st.setHover(null);
  return st;
}

function finish(zone: Parameters<ReturnType<typeof useWorld.getState>['setZone']>[0], toast?: string) {
  const st = useWorld.getState();
  st.setPhase('open');
  st.setZone(zone);
  if (toast) {
    st.setToast(toast);
    window.setTimeout(() => {
      if (useWorld.getState().toast === toast) useWorld.getState().setToast(null);
    }, 4200);
  }
  active = null;
}

/* ------------------------------------------------------- through the front door */

export function enterBuilding() {
  const st = begin();
  if (!st) return;
  const reduced = st.reducedMotion;
  const scale = reduced ? 0.42 : 1;

  const standX = 0;
  const standZ = 4.2;
  const arrivalZ = -4.6;

  const tl = gsap.timeline({ onComplete: () => finish('hall', 'THE CORRIDOR — six doors. Take any of them.') });
  active = tl;

  nav.yaw = nearestAngle(nav.yaw, 0);

  const walkUp = approachCurve(standX, standZ);
  const walkUpDur = 1.5 * scale;
  walkAlong(tl, walkUp, { at: 0, duration: walkUpDur, ease: 'power2.inOut' });
  tl.to(nav, { yaw: 0, pitch: 0, duration: walkUpDur * 0.85, ease: 'power2.inOut' }, 0);
  tl.to(nav, { swayAmount: reduced ? 0 : 0.4, duration: walkUpDur * 0.5 }, 0);

  const openAt = walkUpDur * 0.55;
  tl.to(doors.front, { angle: FRONT_OPEN_ANGLE, duration: 1.35 * scale, ease: 'power3.out' }, openAt);
  tl.to(doors.front, { glow: 1, duration: 0.9 * scale, ease: 'power2.out' }, openAt + 0.12 * scale);
  tl.call(() => sfx.door(), undefined, openAt);

  // Stride through: straight line from the standing spot, across the facade
  // plane, to a stop just inside the corridor.
  const through = new THREE.LineCurve3(vec(standX, standZ), vec(standX, arrivalZ));
  const throughAt = openAt + 0.5 * scale;
  walkAlong(tl, through, { at: throughAt, duration: 2.1 * scale, ease: 'power1.inOut' });

  tl.to(nav, { fov: cameraTheme.transitFov, duration: 0.9 * scale, ease: 'power2.in' }, throughAt);
  tl.to(nav, { fogDensity: fog.hallDensity, duration: 1.6 * scale, ease: 'power1.inOut' }, throughAt + 0.2 * scale);
  if (!reduced) {
    tl.to(nav, { veil: 0.3, duration: 0.5 * scale, ease: 'sine.inOut' }, throughAt + 0.55 * scale);
    tl.to(nav, { veil: 0, duration: 0.9 * scale, ease: 'sine.out' }, throughAt + 1.05 * scale);
  }
  tl.to(nav, { fov: cameraTheme.fov, duration: 1.1 * scale, ease: 'power2.out' }, throughAt + 1.2 * scale);
  tl.to(nav, { swayAmount: reduced ? 0 : 1, duration: 0.9 * scale }, throughAt + 1.3 * scale);
  // The front door eases shut once we are past it, so the corridor feels enclosed.
  tl.to(doors.front, { angle: FRONT_OPEN_ANGLE * 0.12, duration: 1.4 * scale, ease: 'power2.inOut' }, throughAt + 1.5 * scale);
  tl.to(doors.front, { glow: 0, duration: 1.2 * scale }, throughAt + 1.4 * scale);
}

/* ------------------------------------------------------------ through a side door */

export function enterRoom(id: RoomId) {
  const st = begin();
  if (!st) return;
  const reduced = st.reducedMotion;
  const scale = reduced ? 0.42 : 1;

  const room = roomById(id);
  const s = sideSign(room.side);
  const bounds = roomBounds(room);
  const [standX, standZ] = doorApproach(room);
  const [arrX, arrZ] = bounds.arrival;
  const facing = nearestAngle(nav.yaw, facingYawFor(room));

  const tl = gsap.timeline({ onComplete: () => finish(id, `${room.roomName} — ${room.blurb}`) });
  active = tl;
  useWorld.getState().setOpenDoor(id);

  /* 1 — APPROACH. Turn to face the door and close the distance to arm's length. */
  const dist = Math.hypot(nav.px - standX, nav.pz - standZ);
  const approachDur = THREE.MathUtils.clamp(0.7 + dist * 0.13, 0.75, 1.7) * scale;
  walkAlong(tl, approachCurve(standX, standZ), { at: 0, duration: approachDur, ease: 'power2.inOut' });
  tl.to(nav, { yaw: facing, pitch: 0, duration: approachDur * 0.88, ease: 'power2.inOut' }, 0);
  tl.to(nav, { swayAmount: reduced ? 0 : 0.35, duration: approachDur * 0.6, ease: 'power2.out' }, 0);

  /* 2 — OPEN. The leaf swings on its hinge while the camera is still settling,
        so the two motions overlap the way they would if you pushed a real door. */
  const openAt = approachDur * 0.6;
  const openDur = 1.15 * scale;
  tl.to(doors[id], { angle: openDirection(room) * DOOR_OPEN_ANGLE, duration: openDur, ease: 'power3.out' }, openAt);
  tl.to(doors[id], { glow: 1, duration: 0.85 * scale, ease: 'power2.out' }, openAt + 0.1 * scale);
  tl.to(doors[id], { attention: 0, duration: 0.4 * scale }, openAt);
  tl.call(() => sfx.door(), undefined, openAt + 0.05 * scale);

  /* 3 — ENTER. One unbroken line from the corridor, through the aperture, to a
        stop a few metres inside. FOV widens on the push and relaxes on arrival,
        which is what makes the doorway swell in the viewport. */
  const throughAt = openAt + openDur * 0.45;
  const through = new THREE.CatmullRomCurve3(
    [
      vec(standX, standZ),
      vec(bounds.doorwayX, room.doorZ),
      vec(bounds.vestibuleInnerX + s * 0.4, room.doorZ),
      vec(arrX, arrZ),
    ],
    false,
    'catmullrom',
    0.1,
  );
  walkAlong(tl, through, { at: throughAt, duration: 2.35 * scale, ease: 'power1.inOut' });

  tl.to(nav, { fov: cameraTheme.transitFov, duration: 1.0 * scale, ease: 'power2.in' }, throughAt);
  tl.to(nav, { fogDensity: fog.roomDensity, duration: 1.7 * scale, ease: 'power1.inOut' }, throughAt + 0.3 * scale);
  if (!reduced) {
    // Light adaptation, peaking as the facade plane passes the eye.
    tl.to(nav, { veil: 0.32, duration: 0.55 * scale, ease: 'sine.inOut' }, throughAt + 0.6 * scale);
    tl.to(nav, { veil: 0, duration: 1.0 * scale, ease: 'sine.out' }, throughAt + 1.15 * scale);
  }
  tl.to(nav, { fov: cameraTheme.fov, duration: 1.2 * scale, ease: 'power2.out' }, throughAt + 1.3 * scale);
  tl.to(nav, { swayAmount: reduced ? 0 : 1, duration: 1.0 * scale }, throughAt + 1.45 * scale);
  tl.to(doors[id], { glow: 0.35, duration: 1.4 * scale }, throughAt + 1.5 * scale);
}

/* ------------------------------------------------------------- back to the corridor */

export function exitRoom() {
  const st = begin();
  if (!st) return;
  const reduced = st.reducedMotion;
  const scale = reduced ? 0.42 : 1;

  const zone = st.zone;
  const room = roomById(zone as RoomId);
  if (!room) {
    finish('hall');
    return;
  }
  const s = sideSign(room.side);
  const bounds = roomBounds(room);
  const insideX = bounds.vestibuleInnerX + s * 2.4;
  const corridorX = -s * 0.6;

  const tl = gsap.timeline({
    onComplete: () => {
      useWorld.getState().setOpenDoor(null);
      finish('hall');
    },
  });
  active = tl;

  // Face back toward the doorway before walking out of it.
  const outYaw = nearestAngle(nav.yaw, facingYawFor(room) + Math.PI);
  const turnDur = 0.95 * scale;
  walkAlong(tl, approachCurve(insideX, room.doorZ), { at: 0, duration: turnDur, ease: 'power2.inOut' });
  tl.to(nav, { yaw: outYaw, pitch: 0, duration: turnDur, ease: 'power2.inOut' }, 0);
  tl.to(nav, { swayAmount: reduced ? 0 : 0.4, duration: turnDur * 0.6 }, 0);
  tl.to(doors[room.id], { glow: 1, duration: 0.6 * scale }, 0);

  const outAt = turnDur * 0.75;
  const out = new THREE.CatmullRomCurve3(
    [
      vec(insideX, room.doorZ),
      vec(bounds.doorwayX, room.doorZ),
      vec(corridorX, room.doorZ),
      // Finish angled down the corridor so the six doors are back in view.
      vec(corridorX * 0.4, room.doorZ - 2.6),
    ],
    false,
    'catmullrom',
    0.2,
  );
  walkAlong(tl, out, { at: outAt, duration: 2.3 * scale, ease: 'power1.inOut' });

  tl.to(nav, { fov: cameraTheme.transitFov - 4, duration: 0.9 * scale, ease: 'power2.in' }, outAt);
  tl.to(nav, { fogDensity: fog.hallDensity, duration: 1.6 * scale, ease: 'power1.inOut' }, outAt + 0.3 * scale);
  if (!reduced) {
    tl.to(nav, { veil: 0.26, duration: 0.5 * scale, ease: 'sine.inOut' }, outAt + 0.7 * scale);
    tl.to(nav, { veil: 0, duration: 0.95 * scale, ease: 'sine.out' }, outAt + 1.2 * scale);
  }
  // Turn to look down the corridor as we step out.
  tl.to(nav, { yaw: nearestAngle(outYaw, 0), duration: 1.5 * scale, ease: 'power2.inOut' }, outAt + 0.9 * scale);
  tl.to(nav, { fov: cameraTheme.fov, duration: 1.2 * scale, ease: 'power2.out' }, outAt + 1.3 * scale);
  tl.to(nav, { swayAmount: reduced ? 0 : 1, duration: 1.0 * scale }, outAt + 1.5 * scale);
  tl.to(doors[room.id], { angle: 0, duration: 1.5 * scale, ease: 'power2.inOut' }, outAt + 1.1 * scale);
  tl.to(doors[room.id], { glow: 0, duration: 1.2 * scale }, outAt + 1.2 * scale);
  tl.call(() => sfx.door(0.6), undefined, outAt + 1.2 * scale);
}

/* ------------------------------------------------------------------- objects */

/**
 * Walk up to something hanging on a wall and square up to it. Used before a
 * case study opens, so the reading panel arrives from a place you actually
 * stood in front of.
 */
export function approachObject(
  position: [number, number, number],
  normal: [number, number],
  standoff: number,
  onArrive?: () => void,
) {
  const st = begin();
  if (!st) return;
  const reduced = st.reducedMotion;
  const scale = reduced ? 0.4 : 1;
  const zone = st.zone;

  const targetX = position[0] + normal[0] * standoff;
  const targetZ = position[2] + normal[1] * standoff;
  // Look back along the surface normal, toward the object.
  const yaw = nearestAngle(nav.yaw, Math.atan2(-normal[0], -normal[1]));
  // Tilt to meet the object's height rather than staring straight ahead.
  const rise = position[1] - cameraTheme.eyeHeight;
  const pitch = THREE.MathUtils.clamp(Math.atan2(rise, standoff) * 0.75, -0.3, 0.3);

  const dist = Math.hypot(nav.px - targetX, nav.pz - targetZ);
  const dur = THREE.MathUtils.clamp(0.6 + dist * 0.16, 0.7, 1.9) * scale;

  const tl = gsap.timeline({
    onComplete: () => {
      finish(zone);
      onArrive?.();
    },
  });
  active = tl;

  walkAlong(tl, approachCurve(targetX, targetZ), { at: 0, duration: dur, ease: 'power2.inOut' });
  tl.to(nav, { yaw, pitch, duration: dur, ease: 'power2.inOut' }, 0);
  tl.to(nav, { fov: cameraTheme.fov - 5, duration: dur * 1.05, ease: 'power2.out' }, 0);
  tl.to(nav, { swayAmount: reduced ? 0 : 0.25, duration: dur * 0.7 }, 0);
}

/** Relax the framing after a reading panel closes. */
export function releaseObject() {
  gsap.to(nav, { fov: cameraTheme.fov, pitch: 0, duration: 1.1, ease: 'power2.out', overwrite: 'auto' });
  gsap.to(nav, { swayAmount: useWorld.getState().reducedMotion ? 0 : 1, duration: 0.9, overwrite: 'auto' });
}

/* ------------------------------------------------------------------ guided nav */

/** Step to a fixed spot in the corridor. Used by the guided/touch navigation. */
export function goToCorridor(z: number, lookAtYaw = 0) {
  const st = begin();
  if (!st) return;
  const scale = st.reducedMotion ? 0.42 : 1;
  const dist = Math.abs(nav.pz - z) + Math.abs(nav.px);
  const dur = THREE.MathUtils.clamp(0.7 + dist * 0.09, 0.8, 2.2) * scale;

  const tl = gsap.timeline({ onComplete: () => finish('hall') });
  active = tl;
  walkAlong(tl, approachCurve(0, THREE.MathUtils.clamp(z, HALL.zEnd + 1.4, -1.2)), {
    at: 0,
    duration: dur,
    ease: 'power2.inOut',
  });
  tl.to(nav, { yaw: nearestAngle(nav.yaw, lookAtYaw), pitch: 0, duration: dur, ease: 'power2.inOut' }, 0);
}

/** Square the camera up to a door without going through it. */
export function faceDoor(id: RoomId) {
  const st = begin();
  if (!st) return;
  const scale = st.reducedMotion ? 0.42 : 1;
  const room = roomById(id);
  const [x, z] = doorApproach(room);
  const dur = 1.2 * scale;
  const tl = gsap.timeline({ onComplete: () => finish('hall') });
  active = tl;
  walkAlong(tl, approachCurve(x, z), { at: 0, duration: dur, ease: 'power2.inOut' });
  tl.to(nav, { yaw: nearestAngle(nav.yaw, facingYawFor(room)), pitch: 0, duration: dur, ease: 'power2.inOut' }, 0);
}

/** Drop the camera back out onto the forecourt. */
export function leaveBuilding() {
  const st = begin();
  if (!st) return;
  const scale = st.reducedMotion ? 0.42 : 1;
  const tl = gsap.timeline({ onComplete: () => finish('exterior') });
  active = tl;
  const dur = 2.4 * scale;
  const out = new THREE.CatmullRomCurve3(
    [vec(nav.px, nav.pz), vec(0, -2.4), vec(0, 2.4), vec(0, 9)],
    false,
    'catmullrom',
    0.2,
  );
  tl.to(doors.front, { angle: FRONT_OPEN_ANGLE, duration: 1.0 * scale, ease: 'power3.out' }, 0);
  tl.call(() => sfx.door(), undefined, 0);
  walkAlong(tl, out, { at: 0.35 * scale, duration: dur, ease: 'power1.inOut' });
  tl.to(nav, { yaw: nearestAngle(nav.yaw, 0), pitch: 0, duration: dur * 0.6, ease: 'power2.inOut' }, 0);
  tl.to(nav, { fogDensity: fog.exteriorDensity, duration: dur * 0.8, ease: 'power1.inOut' }, 0.4 * scale);
  // Turn to look back at the facade on the way out.
  tl.to(nav, { yaw: nearestAngle(0, Math.PI), duration: 1.6 * scale, ease: 'power2.inOut' }, dur * 0.7);
  tl.to(doors.front, { angle: 0, duration: 1.4 * scale, ease: 'power2.inOut' }, dur * 0.75);
}

/** Proximity opening, used when the visitor walks up to a door themselves. */
export function nudgeDoorOpen(id: RoomId, open: boolean) {
  const room = roomById(id);
  const target = open ? openDirection(room) * DOOR_OPEN_ANGLE * 0.62 : 0;
  if (Math.abs(doors[id].angle - target) < 0.01) return;
  gsap.to(doors[id], { angle: target, duration: open ? 1.1 : 0.9, ease: open ? 'power3.out' : 'power2.inOut', overwrite: 'auto' });
  gsap.to(doors[id], { glow: open ? 0.75 : 0, duration: 0.8, overwrite: 'auto' });
  if (open) sfx.door(0.45);
}

export const DOOR_GEOMETRY = DOORWAY;
