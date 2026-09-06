'use client';

/**
 * The interface.
 *
 * Kept to the corners and to caption size. The only persistent elements are an
 * identifier, a location readout, and a plan showing where in the building you
 * are — the same plan the loading screen drew, so it reads as part of the world
 * rather than a game HUD. There is no navigation bar, because the doors are the
 * navigation.
 */

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { nav } from '@/lib/animState';
import { setSoundEnabled, sfx } from '@/lib/audio';
import { useWorld } from '@/lib/store';
import { exitRoom, faceDoor, leaveBuilding } from '@/lib/transits';
import { HALL, ROOMS, roomById, type RoomId } from '@/data/world';

/* Plan geometry, in SVG units. Mirrors the loading screen's drawing. */
const P = { x: 42, y: 9, w: 12, h: 76 };
const ROOM_BOX = { w: 22, h: 17, gap: 4 };
const zToY = (z: number) => P.y + P.h - ((Math.abs(z) - 2) / 46) * P.h;

function Minimap() {
  const zone = useWorld((s) => s.zone);
  const dot = useRef<SVGCircleElement>(null);
  const fov = useRef<SVGPathElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      if (dot.current) {
        // World x maps across the plan; z maps down it.
        const x = P.x + P.w / 2 + (nav.px / HALL.halfWidth) * (P.w / 2 + 22);
        const y = nav.pz > 0 ? P.y + P.h + Math.min(18, nav.pz * 0.7) : zToY(nav.pz);
        dot.current.setAttribute('cx', String(x));
        dot.current.setAttribute('cy', String(y));
        if (fov.current) {
          // A short whisker showing which way the visitor is facing.
          const dx = -Math.sin(nav.yaw) * 9;
          const dy = -Math.cos(nav.yaw) * -9;
          fov.current.setAttribute('d', `M ${x} ${y} L ${x + dx} ${y + dy}`);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <svg viewBox="0 0 96 106" className="h-[106px] w-[96px]" aria-hidden>
      {/* Corridor. */}
      <rect x={P.x} y={P.y} width={P.w} height={P.h} fill="none" stroke="var(--color-graphite)" strokeOpacity={0.42} strokeWidth={0.9} />
      {/* Approach. */}
      <path
        d={`M ${P.x + P.w / 2} ${P.y + P.h} L ${P.x + P.w / 2} ${P.y + P.h + 17}`}
        stroke="var(--color-graphite)"
        strokeOpacity={0.24}
        strokeWidth={0.8}
        strokeDasharray="2 3"
      />
      {ROOMS.map((room) => {
        const y = zToY(room.doorZ);
        const left = room.side === 'left';
        const x0 = left ? P.x - ROOM_BOX.gap - ROOM_BOX.w : P.x + P.w + ROOM_BOX.gap;
        const isHere = room.id === zone;
        return (
          <g key={room.id}>
            <rect
              x={x0}
              y={y - ROOM_BOX.h / 2}
              width={ROOM_BOX.w}
              height={ROOM_BOX.h}
              fill={isHere ? 'var(--color-accent)' : 'none'}
              fillOpacity={isHere ? 0.14 : 0}
              stroke={isHere ? 'var(--color-accent)' : 'var(--color-graphite)'}
              strokeOpacity={isHere ? 0.8 : 0.3}
              strokeWidth={0.9}
            />
            {/* Vestibule stub linking room to corridor. */}
            <path
              d={`M ${left ? P.x : P.x + P.w} ${y} L ${left ? x0 + ROOM_BOX.w : x0} ${y}`}
              stroke={isHere ? 'var(--color-accent)' : 'var(--color-graphite)'}
              strokeOpacity={isHere ? 0.7 : 0.28}
              strokeWidth={0.8}
            />
            <text
              x={x0 + ROOM_BOX.w / 2}
              y={y + 2.4}
              textAnchor="middle"
              style={{ fontSize: 6.5, fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}
              fill={isHere ? 'var(--color-accent)' : 'var(--color-graphite)'}
              fillOpacity={isHere ? 0.95 : 0.45}
            >
              {room.index}
            </text>
            {/* Door gap, punched through the corridor wall. */}
            <line
              x1={left ? P.x : P.x + P.w}
              y1={y - 3}
              x2={left ? P.x : P.x + P.w}
              y2={y + 3}
              stroke="var(--color-paper)"
              strokeWidth={1.8}
            />
          </g>
        );
      })}
      <path ref={fov} stroke="var(--color-accent)" strokeOpacity={0.6} strokeWidth={0.9} />
      <circle ref={dot} r={2.2} fill="var(--color-accent)" />
    </svg>
  );
}

function zoneLabel(zone: string) {
  if (zone === 'exterior') return 'THE FORECOURT';
  if (zone === 'hall') return 'THE CORRIDOR';
  return roomById(zone as RoomId)?.roomName ?? '—';
}

export function Hud() {
  const phase = useWorld((s) => s.phase);
  const zone = useWorld((s) => s.zone);
  const reading = useWorld((s) => s.reading);
  const soundOn = useWorld((s) => s.soundOn);
  const toggleSound = useWorld((s) => s.toggleSound);
  const hintDismissed = useWorld((s) => s.hintDismissed);
  const isTouch = useWorld((s) => s.isTouch);
  const toast = useWorld((s) => s.toast);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    setSoundEnabled(soundOn);
    if (soundOn) sfx.click();
  }, [soundOn]);

  const visible = phase === 'open' || phase === 'transit';
  const inRoom = zone !== 'hall' && zone !== 'exterior';

  /* Escape backs out one layer at a time: panel, then room. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const st = useWorld.getState();
      if (st.reading) return; // the panel handles its own dismissal
      if (st.phase !== 'open') return;
      if (st.zone !== 'hall' && st.zone !== 'exterior') exitRoom();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-30"
          initial={{ opacity: 0 }}
          animate={{ opacity: reading ? 0.25 : 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* ------------------------------------------------------ identifier */}
          <div className="absolute left-6 top-6 select-none sm:left-8 sm:top-7">
            <p className="font-display text-[22px] leading-none text-graphite">SID</p>
            <p className="ui-micro mt-1 text-graphite-faint">WORLD / 2026</p>
          </div>

          {/* --------------------------------------------------------- controls */}
          <div className="pointer-events-auto absolute right-6 top-6 flex items-center gap-2 sm:right-8 sm:top-7">
            <button
              type="button"
              onClick={toggleSound}
              aria-pressed={soundOn}
              aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}
              className="sketch-frame flex h-9 items-center gap-2 px-3 transition-colors hover:bg-paper-lit"
            >
              {/* Three bars that shorten when muted. */}
              <svg viewBox="0 0 14 12" className="h-3 w-3.5" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <rect
                    key={i}
                    x={i * 5}
                    y={soundOn ? 2 + i * 1.6 : 5}
                    width={3}
                    height={soundOn ? 8 - i * 1.6 : 2}
                    fill="var(--color-graphite)"
                    fillOpacity={soundOn ? 0.85 : 0.3}
                  />
                ))}
              </svg>
              <span className="ui-micro text-graphite-soft">{soundOn ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* ---------------------------------------------------- location + plan */}
          <div className="pointer-events-auto absolute bottom-6 left-6 flex flex-col items-start gap-3 sm:bottom-7 sm:left-8">
            {/* The plan sits above the readout so neither can crowd the other. */}
            <div className="hidden sm:block">
              <Minimap />
            </div>

            <div className="max-w-[260px]">
              <p className="ui-micro text-graphite-faint">YOU ARE IN</p>
              <p className="mt-1 font-mono text-[13px] uppercase tracking-[0.18em] text-graphite">
                {zoneLabel(zone)}
              </p>
              {/* The arrival line belongs with the location, not floating over
                  whatever is hanging on the far wall. */}
              <AnimatePresence>
                {toast && (
                  <motion.p
                    className="mt-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.14em] text-graphite-soft"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {toast}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex items-center gap-4">
              {inRoom && (
                <button
                  type="button"
                  onClick={() => exitRoom()}
                  className="group flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-accent"
                >
                  <span className="inline-block transition-transform duration-500 group-hover:-translate-x-1">←</span>
                  BACK TO CORRIDOR
                </button>
              )}
              {zone === 'hall' && (
                <button
                  type="button"
                  onClick={() => leaveBuilding()}
                  className="group flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-graphite-soft hover:text-accent"
                >
                  <span className="inline-block transition-transform duration-500 group-hover:-translate-y-0.5">↑</span>
                  STEP OUTSIDE
                </button>
              )}
              <button
                type="button"
                onClick={() => setMapOpen((v) => !v)}
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-graphite-soft hover:text-accent sm:hidden"
                aria-expanded={mapOpen}
              >
                PLAN
              </button>
            </div>

            <AnimatePresence>
              {mapOpen && (
                <motion.div
                  className="sketch-frame p-2 sm:hidden"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ duration: 0.4 }}
                >
                  <Minimap />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* -------------------------------------------------------- door index */}
          <AnimatePresence>
            {zone === 'hall' && !reading && (
              <motion.div
                className="pointer-events-auto absolute bottom-7 right-6 hidden sm:block sm:right-8"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="ui-micro mb-2 text-right text-graphite-faint">DOORS</p>
                <ul className="flex flex-col items-end gap-1.5">
                  {ROOMS.map((room) => (
                    <li key={room.id}>
                      <button
                        type="button"
                        onClick={() => faceDoor(room.id)}
                        className="group flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-graphite-soft transition-colors hover:text-graphite"
                      >
                        <span className="text-graphite-faint transition-colors group-hover:text-accent">
                          {room.index}
                        </span>
                        <span>{room.label}</span>
                        <span className="h-px w-4 bg-graphite/25 transition-all duration-500 group-hover:w-7 group-hover:bg-accent/70" />
                      </button>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ------------------------------------------------------------- hints */}
          <AnimatePresence>
            {!hintDismissed && !reading && (
              <motion.div
                className="absolute bottom-7 left-1/2 -translate-x-1/2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                <p className="sketch-frame px-4 py-2.5 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-graphite-soft">
                  {isTouch ? 'DRAG TO LOOK · TAP A DOOR TO ENTER' : 'W A S D TO WALK · DRAG TO LOOK · CLICK A DOOR'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

        </motion.div>
      )}
    </AnimatePresence>
  );
}
