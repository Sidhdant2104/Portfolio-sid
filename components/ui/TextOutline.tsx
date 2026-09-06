'use client';

/**
 * The whole portfolio as plain, linear HTML.
 *
 * Visually hidden but present in the document and reachable by keyboard, so the
 * content survives without WebGL: screen readers, crawlers, and anyone who
 * would rather read than walk get the real text rather than an apology. It is
 * the same data the rooms are built from, so the two cannot drift apart.
 */

import { PROJECTS } from '@/data/projects';
import {
  ABOUT_INTRO,
  ABOUT_OBJECTS,
  CONTACT_LINKS,
  CONTACT_NOTE,
  EXPERIENCE,
  EXPERIMENTS,
  SKILLS,
} from '@/data/rooms-content';
import { IDENTITY } from '@/data/world';

export function TextOutline() {
  return (
    <div className="sr-only">
      <h1>
        {IDENTITY.name} — {IDENTITY.roles.join(', ')}
      </h1>
      <p>{IDENTITY.note}</p>
      <p>
        This portfolio is an explorable 3D building. If you would rather read it, everything in it is written
        out below.
      </p>

      <section aria-labelledby="outline-projects">
        <h2 id="outline-projects">Projects</h2>
        {PROJECTS.map((p) => (
          <article key={p.id}>
            <h3>
              {p.name} ({p.year}) — {p.discipline}
            </h3>
            <p>{p.tagline}</p>
            <h4>Problem</h4>
            <p>{p.problem}</p>
            <h4>Solution</h4>
            <p>{p.solution}</p>
            <h4>Technology</h4>
            <p>{p.tech.join(', ')}</p>
            <h4>Key features</h4>
            <ul>
              {p.features.map((f) => (
                <li key={f.title}>
                  <strong>{f.title}</strong> — {f.body}
                </li>
              ))}
            </ul>
            <h4>My role</h4>
            <ul>
              {p.role.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            <h4>Outcome</h4>
            <ul>
              {p.outcome.map((o) => (
                <li key={o.label}>
                  {o.value} — {o.label}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section aria-labelledby="outline-skills">
        <h2 id="outline-skills">Skills</h2>
        <ul>
          {SKILLS.map((s) => (
            <li key={s.id}>
              <strong>
                {s.name} ({s.level})
              </strong>{' '}
              — {s.note}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="outline-about">
        <h2 id="outline-about">About</h2>
        <p>{ABOUT_INTRO.line}</p>
        <p>{ABOUT_INTRO.roles.join(', ')}</p>
        {ABOUT_OBJECTS.map((o) => (
          <article key={o.id}>
            <h3>{o.title}</h3>
            <p>{o.body}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="outline-experience">
        <h2 id="outline-experience">Experience</h2>
        {EXPERIENCE.map((e) => (
          <article key={e.id}>
            <h3>
              {e.title} — {e.org} ({e.period})
            </h3>
            <p>{e.body}</p>
            <p>{e.tags.join(', ')}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="outline-experiments">
        <h2 id="outline-experiments">Experiments</h2>
        {EXPERIMENTS.map((e) => (
          <article key={e.id}>
            <h3>
              {e.name} — {e.status}
            </h3>
            <p>{e.body}</p>
          </article>
        ))}
      </section>

      <section aria-labelledby="outline-contact">
        <h2 id="outline-contact">Contact</h2>
        <p>{CONTACT_NOTE}</p>
        <ul>
          {CONTACT_LINKS.map((l) => (
            <li key={l.id}>
              <a href={l.href}>
                {l.label}: {l.value}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
