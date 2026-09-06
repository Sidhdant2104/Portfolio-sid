'use client';

/**
 * Draw every surface before the world is mounted.
 *
 * All the textures are generated on the CPU from `lib/draw`, so doing it lazily
 * would mean a stutter the first time the visitor looked at each new wall.
 * Instead the whole building is drawn up front, in small batches with a yield
 * between each so the loading screen keeps animating — which is also what the
 * loading screen is honestly reporting.
 */

import {
  brickTexture,
  contactShadeTexture,
  draftedWallTexture,
  groundShadowTexture,
  lightSpillTexture,
  paperTexture,
  pavingTexture,
  plankTexture,
  plateTexture,
  signTexture,
} from './textures';
import { bushTexture, catTexture, cloudTexture, groundTexture, treeTexture } from './nature';
import {
  archiveCardTexture,
  contactHeadlineTexture,
  contactPlateTexture,
  facadePlateTexture,
  identityWallTexture,
  labCardTexture,
  noteTexture,
  placardTexture,
  projectPosterTexture,
  roomTitleTexture,
  screenTexture,
  toolTagTexture,
} from './panels';
import { PROJECTS } from '@/data/projects';
import {
  ABOUT_INTRO,
  CONTACT_HEADLINE,
  CONTACT_LINKS,
  CONTACT_NOTE,
  EXPERIENCE,
  EXPERIMENTS,
  SKILLS,
} from '@/data/rooms-content';
import { ROOMS } from '@/data/world';

/** Wait for the webfonts, so baked lettering is never drawn in a fallback face. */
async function waitForFonts() {
  if (typeof document === 'undefined' || !document.fonts) return;
  await Promise.all([
    document.fonts.load("400 48px 'Instrument Serif'"),
    document.fonts.load("400 24px 'IBM Plex Mono'"),
    document.fonts.load("500 24px 'IBM Plex Mono'"),
    document.fonts.load("600 24px 'IBM Plex Mono'"),
  ]).catch(() => undefined);
  await document.fonts.ready;
}

const yieldToPaint = () =>
  new Promise<void>((resolve) => {
    // Two frames: one to let the progress bar repaint, one to let it be seen.
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

/**
 * Each entry is one visible step of progress. Ordered roughly by how soon the
 * visitor will see the result, so an impatient visitor is never looking at
 * something undrawn.
 */
function buildTasks(): Array<() => void> {
  const tasks: Array<() => void> = [];

  // Shell surfaces.
  tasks.push(() => void paperTexture(5));
  tasks.push(() => void paperTexture(7));
  tasks.push(() => void plankTexture(3, 4));
  tasks.push(() => void brickTexture(9));
  tasks.push(() => void pavingTexture(13));
  tasks.push(() => void groundTexture(17));
  tasks.push(() => void draftedWallTexture(11));
  tasks.push(() => void contactShadeTexture(1));
  tasks.push(() => void groundShadowTexture(1));
  tasks.push(() => void lightSpillTexture());

  // Forecourt.
  tasks.push(() => void facadePlateTexture());
  tasks.push(() => void treeTexture(3));
  tasks.push(() => void treeTexture(7));
  tasks.push(() => void treeTexture(11));
  tasks.push(() => {
    bushTexture(5);
    bushTexture(9);
    bushTexture(13);
    bushTexture(17);
  });
  tasks.push(() => {
    [3, 7, 11, 13, 17].forEach((s) => cloudTexture(s));
  });
  tasks.push(() => void catTexture());

  // Corridor.
  tasks.push(() => void identityWallTexture());
  for (const room of ROOMS) {
    tasks.push(() => {
      signTexture({ title: room.roomName, index: room.index, seed: room.doorZ + 3 });
      plateTexture(room.label, `DOOR ${room.index}`, room.doorZ + 11);
      draftedWallTexture(room.doorZ + 31);
      roomTitleTexture(room.roomName, room.index, room.blurb);
    });
  }

  // Gallery.
  for (const p of PROJECTS) {
    tasks.push(() => {
      projectPosterTexture(p);
      placardTexture(p);
    });
  }
  tasks.push(() => void screenTexture(PROJECTS[0]));

  // Room floors.
  tasks.push(() => {
    [23, 29, 31, 37, 41].forEach((s) => plankTexture(s, 4));
  });

  // Workshop.
  tasks.push(() => {
    SKILLS.forEach((s) => toolTagTexture(s.id, s.name, s.level));
  });

  // Study.
  tasks.push(() => {
    noteTexture(
      'about-intro',
      ABOUT_INTRO.name,
      `${ABOUT_INTRO.line}  ${ABOUT_INTRO.roles.join(' · ')}.`,
      { meta: 'WHO', accent: true, w: 760, h: 470 },
    );
    noteTexture(
      'about-plan-surface',
      'FLOOR PLAN',
      'One corridor. Six doors. Rooms sized so you can read the far wall from the threshold. Drawn before any of it was built.',
      { meta: 'SHEET 01', w: 700, h: 500 },
    );
  });

  // Archive.
  tasks.push(() => {
    EXPERIENCE.forEach((e) => archiveCardTexture(e.id, e.period, e.title, e.org, e.kind, e.tags));
  });

  // Lab.
  tasks.push(() => {
    EXPERIMENTS.forEach((e) => labCardTexture(e.id, e.name, e.status, e.tag));
  });

  // Signal room.
  tasks.push(() => {
    contactHeadlineTexture(CONTACT_HEADLINE, CONTACT_NOTE);
    CONTACT_LINKS.forEach((l) => contactPlateTexture(l.label, l.value));
  });

  // Room notes.
  tasks.push(() => {
    noteTexture(
      'workshop-intro',
      'HOW TO READ THIS ROOM',
      'Each tool is something I use, tagged with what it is for rather than a percentage. Percentages are a way of not answering the question. Take one down and read the note.',
      { meta: 'NOTE', accent: true, w: 700, h: 470 },
    );
    noteTexture(
      'archive-intro',
      'READ FROM THE BOTTOM',
      'Earliest at floor level, most recent overhead. Most of this is self-directed work, which is the honest description — I built these because I wanted them to exist.',
      { meta: 'NOTE', accent: true, w: 700, h: 460 },
    );
    noteTexture(
      'lab-intro',
      'NOTHING HERE IS FINISHED',
      'That is the point. Half of these do not work and two of them never will. They are here because the four projects across the corridor came out of a room that looks like this one.',
      { meta: 'NOTE', accent: true, w: 720, h: 470 },
    );
  });

  return tasks;
}

export async function drawWorld(onProgress: (fraction: number) => void) {
  onProgress(0.02);
  await waitForFonts();
  onProgress(0.06);

  const tasks = buildTasks();
  for (let i = 0; i < tasks.length; i++) {
    try {
      tasks[i]();
    } catch {
      // A single unbuildable surface should never stop the visitor getting in.
    }
    onProgress(0.06 + (0.94 * (i + 1)) / tasks.length);
    await yieldToPaint();
  }
  onProgress(1);
}
