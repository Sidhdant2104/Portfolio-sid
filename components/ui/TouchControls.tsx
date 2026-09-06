'use client';

/**
 * Touch navigation.
 *
 * Not the desktop experience shrunk: there is no keyboard, so walking gets its
 * own control. Dragging anywhere looks around (handled by the rig), a hold on
 * the pad walks, and a door list is available because reaching a door six
 * doorways down a corridor by thumb is tedious. The world stays the same world.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { nav } from '@/lib/animState';
import { resolveMove } from '@/lib/collision';
import { doors } from '@/lib/animState';
import { useWorld } from '@/lib/store';
import { enterRoom, faceDoor, goToCorridor } from '@/lib/transits';
import { ROOMS } from '@/data/world';

const TOUCH_SPEED = 2.1;

export function TouchControls() {
  const isTouch = useWorld((s) => s.isTouch);
  const phase = useWorld((s) => s.phase);
  const zone = useWorld((s) => s.zone);
  const reading = useWorld((s) => s.reading);
  const [doorsOpen, setDoorsOpen] = useState(false);
  const held = useRef<0 | 1 | -1>(0);

  /* Walking loop, driven by however long the pad is held. */
  useEffect(() => {
    if (!isTouch) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;
      const st = useWorld.getState();
      if (held.current !== 0 && st.phase === 'open' && !st.reading) {
        const fx = -Math.sin(nav.yaw) * held.current * TOUCH_SPEED * dt;
        const fz = -Math.cos(nav.yaw) * held.current * TOUCH_SPEED * dt;
        const gates = { frontDoor: doors.front.angle > 0.35, openDoor: st.openDoor };
        const next = resolveMove(nav.px, nav.pz, nav.px + fx, nav.pz + fz, gates);
        nav.px = next.x;
        nav.pz = next.z;
        if (!st.hintDismissed) st.dismissHint();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isTouch]);

  if (!isTouch) return null;

  const hidden = phase !== 'open' || Boolean(reading);

  const pad = (dir: 1 | -1, glyph: string, label: string) => (
    <button
      type="button"
      aria-label={label}
      className="sketch-frame flex h-14 w-14 items-center justify-center font-mono text-lg text-graphite active:bg-paper-deep"
      onPointerDown={(e) => {
        e.preventDefault();
        held.current = dir;
      }}
      onPointerUp={() => {
        held.current = 0;
      }}
      onPointerLeave={() => {
        held.current = 0;
      }}
      onPointerCancel={() => {
        held.current = 0;
      }}
    >
      {glyph}
    </button>
  );

  return (
    <AnimatePresence>
      {!hidden && (
        <motion.div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-35 px-5 pb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
        >
          <div className="pointer-events-auto flex items-end justify-between">
            <div className="flex flex-col gap-2">
              {pad(1, '↑', 'Walk forward')}
              {pad(-1, '↓', 'Walk backward')}
            </div>

            <div className="flex flex-col items-end gap-2">
              {zone !== 'exterior' && (
                <button
                  type="button"
                  onClick={() => setDoorsOpen((v) => !v)}
                  className="sketch-frame px-4 py-3"
                  aria-expanded={doorsOpen}
                >
                  <span className="ui-micro text-graphite-soft">DOORS</span>
                </button>
              )}
              <AnimatePresence>
                {doorsOpen && (
                  <motion.ul
                    className="sketch-frame w-[210px] divide-y divide-graphite/12"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.35 }}
                  >
                    {ROOMS.map((room) => (
                      <li key={room.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between px-4 py-3 text-left"
                          onClick={() => {
                            setDoorsOpen(false);
                            if (zone === room.id) return;
                            // On touch, tapping the list walks you in.
                            if (zone === 'hall') enterRoom(room.id);
                            else {
                              goToCorridor(room.doorZ);
                              window.setTimeout(() => faceDoor(room.id), 60);
                            }
                          }}
                        >
                          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-graphite">
                            {room.label}
                          </span>
                          <span className="ui-micro text-accent">{room.index}</span>
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
