'use client';

/**
 * The cursor.
 *
 * A small graphite dot that trails the pointer with a little lag, and opens
 * into a labelled lozenge when something is interactive. Position is written
 * straight to the element's transform from a rAF loop rather than through
 * React state — a cursor that re-renders is a cursor that stutters.
 */

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useWorld } from '@/lib/store';

export function Cursor() {
  const hover = useWorld((s) => s.hover);
  const isTouch = useWorld((s) => s.isTouch);
  const reading = useWorld((s) => s.reading);
  const phase = useWorld((s) => s.phase);
  const root = useRef<HTMLDivElement>(null);
  const target = useRef({ x: -100, y: -100 });
  const current = useRef({ x: -100, y: -100 });

  useEffect(() => {
    if (isTouch) return;
    const onMove = (e: PointerEvent) => {
      target.current.x = e.clientX;
      target.current.y = e.clientY;
    };
    window.addEventListener('pointermove', onMove, { passive: true });

    let raf = 0;
    const tick = () => {
      // Exponential follow. Enough lag to feel like a physical object.
      current.current.x += (target.current.x - current.current.x) * 0.24;
      current.current.y += (target.current.y - current.current.y) * 0.24;
      if (root.current) {
        root.current.style.transform = `translate3d(${current.current.x}px, ${current.current.y}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [isTouch]);

  useEffect(() => {
    if (isTouch) return;
    document.body.dataset.cursor = 'hidden';
    return () => {
      delete document.body.dataset.cursor;
    };
  }, [isTouch]);

  if (isTouch) return null;

  const active = Boolean(hover) && !reading && phase === 'open';

  return (
    <div ref={root} className="pointer-events-none fixed left-0 top-0 z-[60] will-change-transform">
      <div className="relative -translate-x-1/2 -translate-y-1/2">
        {/* Resting dot. */}
        <motion.div
          className="rounded-full bg-graphite"
          animate={{
            width: active ? 5 : 7,
            height: active ? 5 : 7,
            opacity: active ? 0.5 : 0.85,
          }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        />
        {/* Expanded ring plus verb. */}
        <AnimatePresence>
          {active && hover && (
            <motion.div
              className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center"
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.75 }}
              transition={{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full border border-graphite/45">
                <span className="ui-micro whitespace-nowrap text-graphite" style={{ fontSize: 8.5 }}>
                  {hover.verb}
                </span>
              </div>
              {hover.label && (
                <motion.span
                  className="ml-3 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.18em] text-graphite-soft"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.3, delay: 0.05 }}
                >
                  {hover.label}
                </motion.span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
