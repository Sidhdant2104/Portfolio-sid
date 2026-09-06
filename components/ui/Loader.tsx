'use client';

/**
 * The loading sequence.
 *
 * The world is genuinely being drawn during this — every wall, sign and poster
 * is a canvas being composited — so the loading screen draws the building's
 * floor plan at the same rate. By the time the visitor is let in they have
 * already seen the map: one corridor, six doors. It is the only place in the
 * experience where the architecture is shown from above.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import gsap from 'gsap';
import { nav } from '@/lib/animState';
import { drawWorld } from '@/lib/prewarm';
import { useWorld } from '@/lib/store';
import { camera as cameraTheme } from '@/lib/theme';
import { ROOMS } from '@/data/world';

/* Plan drawing, in SVG user units. The corridor runs down the middle. */
const PLAN = { x: 140, y: 34, w: 44, h: 250 };
const ROOM_W = 96;
const ROOM_H = 52;

interface PlanPart {
  d: string;
  /** Fraction of total progress at which this part starts drawing. */
  from: number;
  to: number;
  accent?: boolean;
  label?: { x: number; y: number; text: string; anchor: 'start' | 'end' };
}

function buildPlan(): PlanPart[] {
  const parts: PlanPart[] = [];
  const cx = PLAN.x + PLAN.w / 2;

  // Forecourt approach.
  parts.push({ d: `M ${cx} ${PLAN.y + PLAN.h + 46} L ${cx} ${PLAN.y + PLAN.h}`, from: 0, to: 0.08 });
  parts.push({
    d: `M ${cx - 26} ${PLAN.y + PLAN.h + 44} L ${cx + 26} ${PLAN.y + PLAN.h + 44}`,
    from: 0.03,
    to: 0.1,
  });

  // Corridor walls, drawn from the entrance upward.
  parts.push({ d: `M ${PLAN.x} ${PLAN.y + PLAN.h} L ${PLAN.x} ${PLAN.y}`, from: 0.08, to: 0.42 });
  parts.push({ d: `M ${PLAN.x + PLAN.w} ${PLAN.y + PLAN.h} L ${PLAN.x + PLAN.w} ${PLAN.y}`, from: 0.08, to: 0.42 });
  parts.push({ d: `M ${PLAN.x} ${PLAN.y} L ${PLAN.x + PLAN.w} ${PLAN.y}`, from: 0.4, to: 0.48 });

  // Rooms, in the order they appear down the corridor.
  const zToY = (z: number) => PLAN.y + PLAN.h - ((Math.abs(z) - 4) / 44) * PLAN.h;
  ROOMS.forEach((room, i) => {
    const y = zToY(room.doorZ);
    const left = room.side === 'left';
    const x0 = left ? PLAN.x - 22 - ROOM_W : PLAN.x + PLAN.w + 22;
    const from = 0.45 + i * 0.075;
    const to = from + 0.07;
    // Room box.
    parts.push({
      d: `M ${x0} ${y - ROOM_H / 2} L ${x0 + ROOM_W} ${y - ROOM_H / 2} L ${x0 + ROOM_W} ${y + ROOM_H / 2} L ${x0} ${y + ROOM_H / 2} Z`,
      from,
      to,
    });
    // Vestibule.
    const vx0 = left ? PLAN.x - 22 : PLAN.x + PLAN.w;
    parts.push({
      d: `M ${vx0} ${y - 7} L ${vx0 + 22} ${y - 7} M ${vx0} ${y + 7} L ${vx0 + 22} ${y + 7}`,
      from: from + 0.01,
      to: to + 0.01,
    });
    // Door swing, drawn in red pencil.
    const dx = left ? PLAN.x : PLAN.x + PLAN.w;
    parts.push({
      d: `M ${dx} ${y - 7} A 14 14 0 0 ${left ? 1 : 0} ${dx + (left ? -14 : 14)} ${y + 7}`,
      from: from + 0.02,
      to: to + 0.02,
      accent: true,
    });
    parts.push({
      d: `M ${dx} ${y - 7} L ${dx} ${y + 7}`,
      from: from + 0.02,
      to: to + 0.02,
      accent: true,
      label: {
        x: left ? x0 + 8 : x0 + ROOM_W - 8,
        y: y + 4,
        text: `${room.index} ${room.label}`,
        anchor: left ? 'start' : 'end',
      },
    });
  });

  return parts;
}

function PlanPath({ part, progress }: { part: PlanPart; progress: number }) {
  const ref = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);

  useEffect(() => {
    if (ref.current) setLen(ref.current.getTotalLength());
  }, [part.d]);

  const t = Math.max(0, Math.min(1, (progress - part.from) / Math.max(0.001, part.to - part.from)));
  // Ease so each stroke lands rather than stopping abruptly.
  const eased = t < 1 ? 1 - Math.pow(1 - t, 2.2) : 1;

  return (
    <path
      ref={ref}
      d={part.d}
      fill="none"
      stroke={part.accent ? 'var(--color-accent)' : 'var(--color-graphite)'}
      strokeWidth={part.accent ? 1.1 : 1.5}
      strokeLinecap="round"
      strokeOpacity={part.accent ? 0.75 : 0.85}
      strokeDasharray={len || 1}
      strokeDashoffset={(len || 1) * (1 - eased)}
    />
  );
}

export function Loader() {
  const phase = useWorld((s) => s.phase);
  const progress = useWorld((s) => s.progress);
  const setProgress = useWorld((s) => s.setProgress);
  const setPhase = useWorld((s) => s.setPhase);
  const reducedMotion = useWorld((s) => s.reducedMotion);
  const started = useRef(false);
  const parts = useMemo(buildPlan, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let cancelled = false;
    void drawWorld((f) => {
      if (!cancelled) setProgress(f);
    }).then(() => {
      if (!cancelled) setPhase('threshold');
    });
    return () => {
      cancelled = true;
    };
  }, [setProgress, setPhase]);

  const enter = () => {
    setPhase('open');
    if (reducedMotion) return;
    // A short push toward the building, so the first thing that happens is
    // movement rather than a menu closing.
    gsap.fromTo(
      nav,
      { pz: 24.5, fov: cameraTheme.fov - 6 },
      { pz: 21.5, fov: cameraTheme.fov, duration: 2.6, ease: 'power2.out' },
    );
  };

  const pct = Math.round(progress * 100);
  const visible = phase === 'drawing' || phase === 'threshold';
  const ready = phase === 'threshold';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-paper"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative flex w-full max-w-[1080px] flex-col items-center px-8">
            {/* Sheet header, as on a drawing. */}
            <div className="mb-6 flex w-full items-baseline justify-between text-graphite-faint sm:mb-10">
              <span className="ui-micro">SID — WORLD / 2026</span>
              <span className="ui-micro hidden sm:inline">GENERAL ARRANGEMENT · PLAN</span>
              <span className="ui-micro">SHEET 01</span>
            </div>

            <div className="flex w-full flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-center sm:gap-16">
              {/* The plan, drawing itself. */}
              <svg
                viewBox="0 0 380 380"
                className="h-[240px] w-[240px] shrink-0 sm:h-[380px] sm:w-[380px]"
                aria-hidden
              >
                <g transform="translate(46 24) scale(0.78)">
                  {parts.map((p, i) => (
                    <PlanPath key={i} part={p} progress={progress} />
                  ))}
                  {parts.map((p, i) =>
                    p.label && progress > p.to + 0.01 ? (
                      <text
                        key={`l${i}`}
                        x={p.label.x}
                        y={p.label.y}
                        textAnchor={p.label.anchor}
                        className="fill-graphite-soft"
                        style={{ fontSize: 9, letterSpacing: '0.14em', fontFamily: 'var(--font-mono)' }}
                      >
                        {p.label.text}
                      </text>
                    ) : null,
                  )}
                </g>
              </svg>

              {/* Status column. */}
              <div className="w-full max-w-[360px]">
                <p className="ui-label text-accent">{ready ? 'THE WORLD IS DRAWN' : "DRAWING SID'S WORLD"}</p>
                <h1 className="mt-3 whitespace-pre-line font-display text-[clamp(2.4rem,5vw,3.6rem)] leading-[0.95] text-graphite">
                  {ready ? 'Step inside.' : 'One corridor.\nSix doors.'}
                </h1>
                <div className="mt-6 h-px w-full bg-graphite/15">
                  <div
                    className="h-px bg-graphite/70 transition-[width] duration-300 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="ui-micro text-graphite-soft">
                    {ready ? 'READY' : 'COMPOSITING SURFACES'}
                  </span>
                  <span className="font-mono text-sm tabular-nums text-graphite-mid">
                    {String(pct).padStart(3, '0')}%
                  </span>
                </div>

                <AnimatePresence>
                  {ready && (
                    <motion.button
                      type="button"
                      onClick={enter}
                      data-enter
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                      className="sketch-frame group mt-8 flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-paper-lit"
                    >
                      <span className="ui-label text-graphite">ENTER</span>
                      <span className="font-mono text-xs text-graphite-soft transition-transform duration-500 group-hover:translate-x-1">
                        →
                      </span>
                    </motion.button>
                  )}
                </AnimatePresence>

                <p className="mt-6 max-w-[300px] font-mono text-[11px] leading-relaxed text-graphite-faint">
                  {ready
                    ? 'Walk with W A S D or the arrow keys. Drag to look. Click a door to go through it.'
                    : 'Every surface in this building is drawn at runtime. Nothing here is an image file.'}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
