'use client';

/**
 * The reading layer.
 *
 * Long-form content is HTML, not 3D text — a case study has to be selectable,
 * scrollable and readable by a screen reader, and no amount of atmosphere is
 * worth losing that. The panel is treated as a sheet drawn from a plan chest:
 * it slides in over the world, which stays live behind it, so it reads as
 * another layer of the same space rather than a different page.
 */

import { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { sfx } from '@/lib/audio';
import { useWorld } from '@/lib/store';
import { releaseObject } from '@/lib/transits';
import { PROJECTS, projectById } from '@/data/projects';
import { ABOUT_OBJECTS, EXPERIENCE, EXPERIMENTS, SKILLS, ABOUT_INTRO } from '@/data/rooms-content';

interface Resolved {
  eyebrow: string;
  title: string;
  lede?: string;
  meta?: Array<{ label: string; value: string }>;
  sections: Array<{ heading: string; body?: string; items?: string[]; chips?: string[] }>;
  stats?: Array<{ value: string; label: string }>;
}

/** Map a reading target onto displayable content. */
function resolve(kind: string, id: string): Resolved | null {
  if (kind === 'project') {
    const p = projectById(id);
    if (!p) return null;
    return {
      eyebrow: `PROJECT ${p.index} · ${p.discipline}`,
      title: p.name,
      lede: p.tagline,
      meta: [
        { label: 'YEAR', value: p.year },
        { label: 'FIELD', value: p.discipline },
      ],
      stats: p.outcome,
      sections: [
        { heading: 'THE PROBLEM', body: p.problem },
        { heading: 'WHAT I BUILT', body: p.solution },
        { heading: 'TECHNOLOGY', chips: p.tech },
        {
          heading: 'KEY FEATURES',
          items: p.features.map((f) => `${f.title} — ${f.body}`),
        },
        { heading: 'MY ROLE', items: p.role },
      ],
    };
  }

  const [group, key] = id.split(':');

  if (group === 'skill') {
    const s = SKILLS.find((x) => x.id === key);
    if (!s) return null;
    return {
      eyebrow: `TOOL · ${s.level}`,
      title: s.name,
      lede: s.note,
      sections: [],
    };
  }

  if (group === 'about') {
    if (key === 'intro') {
      return {
        eyebrow: 'ABOUT',
        title: ABOUT_INTRO.name,
        lede: ABOUT_INTRO.line,
        sections: [{ heading: 'IN SHORT', chips: ABOUT_INTRO.roles }],
      };
    }
    const o = ABOUT_OBJECTS.find((x) => x.id === key);
    if (!o) return null;
    return {
      eyebrow: o.meta ?? 'ABOUT',
      title: o.title,
      lede: o.body,
      sections: [],
    };
  }

  if (group === 'experience') {
    const e = EXPERIENCE.find((x) => x.id === key);
    if (!e) return null;
    return {
      eyebrow: `${e.kind} · ${e.period}`,
      title: e.title,
      lede: e.body,
      meta: [
        { label: 'PERIOD', value: e.period },
        { label: 'CONTEXT', value: e.org },
      ],
      sections: [{ heading: 'INVOLVED', chips: e.tags }],
    };
  }

  if (group === 'experiment') {
    const e = EXPERIMENTS.find((x) => x.id === key);
    if (!e) return null;
    return {
      eyebrow: `EXPERIMENT · ${e.status}`,
      title: e.name,
      lede: e.body,
      meta: [
        { label: 'STATUS', value: e.status },
        { label: 'BUILT WITH', value: e.tag },
      ],
      sections: [],
    };
  }

  if (group === 'room') {
    const copy: Record<string, Resolved> = {
      skills: {
        eyebrow: 'NOTE · THE WORKSHOP',
        title: 'How to read this room',
        lede: 'Each tool on the pegboard is something I actually use, tagged with what I use it for.',
        sections: [
          {
            heading: 'WHY NOT PERCENTAGES',
            body: 'A skill bar at 85% is unfalsifiable and tells you nothing about whether I can solve your problem. A sentence about what I reach for and when is a claim you can check.',
          },
          { heading: 'THE TOOLS', chips: SKILLS.map((s) => s.name) },
        ],
      },
      experience: {
        eyebrow: 'NOTE · THE ARCHIVE',
        title: 'Read from the bottom',
        lede: 'The earliest work is at floor level and the present is overhead.',
        sections: [
          {
            heading: 'ON SELF-DIRECTED WORK',
            body: 'Most of what is filed here I started because I wanted it to exist, not because it was assigned. That is the honest description, and I would rather say it plainly than dress it up as something else.',
          },
        ],
      },
      experiments: {
        eyebrow: 'NOTE · THE LAB',
        title: 'Nothing here is finished',
        lede: 'Half of these do not work, and two of them never will.',
        sections: [
          {
            heading: 'WHY SHOW THEM',
            body: 'The four projects in the gallery are the survivors of a much larger and much worse population. Showing only the survivors would misrepresent how any of it got made.',
          },
          { heading: 'CURRENTLY ON THE WALL', chips: EXPERIMENTS.map((e) => e.name) },
        ],
      },
    };
    return copy[key] ?? null;
  }

  return null;
}

/** A drawn plate standing in for a screenshot, so the panel has a visual anchor. */
function VisualPlate({ seed, label }: { seed: number; label: string }) {
  const bars = useMemo(() => {
    let n = seed * 9973;
    const rnd = () => {
      n = (n * 1103515245 + 12345) & 0x7fffffff;
      return (n % 10000) / 10000;
    };
    return Array.from({ length: 26 }, () => ({
      x: 4 + rnd() * 78,
      y: 8 + rnd() * 76,
      w: 4 + rnd() * 22,
      h: 2 + rnd() * 7,
      o: 0.1 + rnd() * 0.3,
    }));
  }, [seed]);

  return (
    <figure className="sketch-frame relative overflow-hidden">
      <svg viewBox="0 0 100 92" className="block w-full" role="img" aria-label={`Schematic of ${label}`}>
        <rect x={0} y={0} width={100} height={92} fill="var(--color-paper-lit)" />
        <line x1={0} y1={7} x2={100} y2={7} stroke="var(--color-graphite)" strokeOpacity={0.3} strokeWidth={0.4} />
        {[2.5, 5.5, 8.5].map((cx) => (
          <circle key={cx} cx={cx} cy={3.6} r={1} fill="var(--color-graphite)" fillOpacity={0.3} />
        ))}
        {bars.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill="var(--color-graphite)" fillOpacity={b.o} rx={0.5} />
        ))}
        <path
          d="M 6 74 C 20 62, 30 80, 44 66 S 68 52, 94 60"
          fill="none"
          stroke="var(--color-accent)"
          strokeOpacity={0.65}
          strokeWidth={0.8}
        />
      </svg>
      <figcaption className="ui-micro border-t border-graphite/12 px-3 py-2 text-graphite-faint">
        SCHEMATIC · {label}
      </figcaption>
    </figure>
  );
}

export function ReadingPanel() {
  const reading = useWorld((s) => s.reading);
  const setReading = useWorld((s) => s.setReading);
  const content = reading ? resolve(reading.kind, reading.id) : null;

  const close = () => {
    sfx.paper();
    setReading(null);
    releaseObject();
  };

  useEffect(() => {
    if (!reading) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading]);

  const isProject = reading?.kind === 'project';
  const projectIndex = isProject ? PROJECTS.findIndex((p) => p.id === reading?.id) : -1;

  return (
    <AnimatePresence>
      {reading && content && (
        <>
          {/* Scrim. Light, because the world behind should stay legible. */}
          <motion.button
            type="button"
            aria-label="Close"
            className="fixed inset-0 z-40 cursor-default bg-graphite/15"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={close}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={content.title}
            className="fixed right-0 top-0 z-45 flex h-full w-full flex-col border-l border-graphite/20 bg-paper-lit sm:w-[min(620px,92vw)]"
            style={{ zIndex: 45 }}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.78, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Sheet header. */}
            <header className="flex items-start justify-between gap-4 border-b border-graphite/15 px-7 pb-5 pt-7 sm:px-9">
              <div className="min-w-0">
                <p className="ui-micro text-accent">{content.eyebrow}</p>
                <h2 className="mt-2 font-display text-[clamp(2rem,4.4vw,2.9rem)] leading-[1.02] text-graphite">
                  {content.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="mt-1 shrink-0 font-mono text-[10px] uppercase tracking-[0.18em] text-graphite-soft transition-colors hover:text-accent"
              >
                CLOSE ✕
              </button>
            </header>

            <div className="thin-scroll flex-1 overflow-y-auto px-7 py-7 sm:px-9">
              {content.lede && (
                <p className="max-w-[46ch] font-display text-[clamp(1.15rem,2.4vw,1.45rem)] leading-[1.45] text-graphite-mid">
                  {content.lede}
                </p>
              )}

              {content.meta && (
                <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4 border-y border-graphite/12 py-5">
                  {content.meta.map((m) => (
                    <div key={m.label}>
                      <dt className="ui-micro text-graphite-faint">{m.label}</dt>
                      <dd className="mt-1.5 font-mono text-xs uppercase tracking-[0.12em] text-graphite">{m.value}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {isProject && projectIndex >= 0 && (
                <div className="mt-8">
                  <VisualPlate seed={projectIndex + 3} label={content.title} />
                </div>
              )}

              {content.stats && content.stats.length > 0 && (
                <ul className="mt-8 grid grid-cols-1 gap-px overflow-hidden border border-graphite/15 bg-graphite/15 sm:grid-cols-3">
                  {content.stats.map((s) => (
                    <li key={s.label} className="bg-paper-lit px-4 py-5">
                      <p className="font-display text-[1.8rem] leading-none text-graphite">{s.value}</p>
                      <p className="ui-micro mt-2 text-graphite-faint">{s.label}</p>
                    </li>
                  ))}
                </ul>
              )}

              {content.sections.map((section) => (
                <section key={section.heading} className="mt-10">
                  <h3 className="ui-label flex items-center gap-3 text-graphite-soft">
                    {section.heading}
                    <span className="h-px flex-1 bg-graphite/15" />
                  </h3>

                  {section.body && (
                    <p className="mt-4 max-w-[58ch] font-mono text-[13px] leading-[1.75] text-graphite-mid">
                      {section.body}
                    </p>
                  )}

                  {section.items && (
                    <ul className="mt-4 space-y-3.5">
                      {section.items.map((item, i) => (
                        <li key={i} className="flex gap-3.5">
                          <span className="mt-[7px] h-1 w-1 shrink-0 bg-accent" />
                          <span className="max-w-[56ch] font-mono text-[13px] leading-[1.7] text-graphite-mid">
                            {item}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.chips && (
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {section.chips.map((chip) => (
                        <li
                          key={chip}
                          className="border border-graphite/25 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-graphite-mid"
                        >
                          {chip}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}

              {/* Move between case studies without going back to the wall. */}
              {isProject && (
                <nav className="mt-12 flex items-center justify-between border-t border-graphite/15 pt-6">
                  {[-1, 1].map((dir) => {
                    const next = PROJECTS[(projectIndex + dir + PROJECTS.length) % PROJECTS.length];
                    return (
                      <button
                        key={dir}
                        type="button"
                        onClick={() => {
                          sfx.paper();
                          setReading({ kind: 'project', id: next.id });
                        }}
                        className="group text-left"
                      >
                        <span className="ui-micro text-graphite-faint">
                          {dir === -1 ? '← PREVIOUS' : 'NEXT →'}
                        </span>
                        <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-graphite transition-colors group-hover:text-accent">
                          {next.name}
                        </span>
                      </button>
                    );
                  })}
                </nav>
              )}

              <p className="mt-10 font-mono text-[10px] uppercase tracking-[0.16em] text-graphite-faint">
                PRESS ESC TO RETURN TO THE ROOM
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
