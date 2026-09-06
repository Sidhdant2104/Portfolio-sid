'use client';

import { create } from 'zustand';
import type { RoomId, ZoneId } from '@/data/world';

/**
 * Discrete world state only.
 *
 * Per-frame values (camera position, yaw, sway, door angles) deliberately live
 * in mutable refs inside the rig, never here — pushing them through React would
 * re-render the tree sixty times a second.
 */

export type Phase =
  /** Textures are still being drawn. */
  | 'drawing'
  /** Drawn, waiting for the visitor to step in. */
  | 'threshold'
  /** Free to walk. */
  | 'open'
  /** A scripted camera move owns the view; input is ignored. */
  | 'transit';

export type NavMode = 'free' | 'guided';

export interface HoverTarget {
  id: string;
  /** Word shown inside the expanded cursor. */
  verb: 'ENTER' | 'VIEW' | 'EXPLORE' | 'OPEN' | 'BACK';
  label?: string;
}

export interface ReadingTarget {
  kind: 'project' | 'note' | 'contact';
  id: string;
  /** Screen-space origin the panel unfolds from, in px. */
  origin?: [number, number];
}

interface WorldState {
  phase: Phase;
  progress: number;
  zone: ZoneId;
  /** Room whose door leaf is currently swung open. */
  openDoor: RoomId | null;
  hover: HoverTarget | null;
  reading: ReadingTarget | null;
  navMode: NavMode;
  soundOn: boolean;
  reducedMotion: boolean;
  isTouch: boolean;
  /** Transient line of orientation text, e.g. on arriving in a room. */
  toast: string | null;
  /** Set once the visitor has walked far enough to not need the movement hint. */
  hintDismissed: boolean;

  setPhase: (p: Phase) => void;
  setProgress: (n: number) => void;
  setZone: (z: ZoneId) => void;
  setOpenDoor: (r: RoomId | null) => void;
  setHover: (h: HoverTarget | null) => void;
  setReading: (r: ReadingTarget | null) => void;
  setNavMode: (m: NavMode) => void;
  toggleSound: () => void;
  setReducedMotion: (v: boolean) => void;
  setIsTouch: (v: boolean) => void;
  setToast: (t: string | null) => void;
  dismissHint: () => void;
}

export const useWorld = create<WorldState>((set) => ({
  phase: 'drawing',
  progress: 0,
  zone: 'exterior',
  openDoor: null,
  hover: null,
  reading: null,
  navMode: 'free',
  soundOn: false,
  reducedMotion: false,
  isTouch: false,
  toast: null,
  hintDismissed: false,

  setPhase: (phase) => set({ phase }),
  setProgress: (progress) => set({ progress }),
  setZone: (zone) => set({ zone }),
  setOpenDoor: (openDoor) => set({ openDoor }),
  setHover: (hover) => set({ hover }),
  setReading: (reading) => set({ reading }),
  setNavMode: (navMode) => set({ navMode }),
  toggleSound: () => set((s) => ({ soundOn: !s.soundOn })),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setIsTouch: (isTouch) => set({ isTouch }),
  setToast: (toast) => set({ toast }),
  dismissHint: () => set({ hintDismissed: true }),
}));

/** Non-reactive reads, for use inside the render loop. */
export const worldState = () => useWorld.getState();
