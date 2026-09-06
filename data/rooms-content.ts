/**
 * Content for the five non-gallery rooms.
 *
 * Each room's objects are declared here with their position in the room's local
 * space, so the environments are assembled from data and can be rearranged
 * without touching geometry code.
 *
 * Sid: everything below is written to be edited. The experience entries in
 * particular should be replaced with your real dates and titles.
 */

/* ------------------------------------------------------------------ skills */

export interface SkillTool {
  id: string;
  /** What the object on the bench is. */
  object: 'plane' | 'caliper' | 'chisel' | 'lens' | 'coil' | 'flask' | 'mallet' | 'square';
  name: string;
  level: string;
  /** What Sid actually does with it. Written as a sentence, not a bullet. */
  note: string;
  /** Slot along the bench, 0-based. */
  slot: number;
}

export const SKILLS: SkillTool[] = [
  {
    id: 'python',
    object: 'plane',
    name: 'PYTHON',
    level: 'PRIMARY',
    note: 'Where the thinking happens. Data pipelines, model training, anything that has to chew through a lot of readings before it means something.',
    slot: 0,
  },
  {
    id: 'ai',
    object: 'lens',
    name: 'AI / ML',
    level: 'PRIMARY',
    note: 'PyTorch for models, and a strong preference for the smallest one that answers the question. Anomaly detection and embeddings are the two I reach for most.',
    slot: 1,
  },
  {
    id: 'cv',
    object: 'lens',
    name: 'COMPUTER VISION',
    level: 'STRONG',
    note: 'OpenCV and CLIP. Scene detection, frame differencing, and image embeddings — most of Reel Analyzer and Vibe Finder live here.',
    slot: 2,
  },
  {
    id: 'javascript',
    object: 'chisel',
    name: 'TYPESCRIPT',
    level: 'PRIMARY',
    note: 'The shaping tool. Everything a person actually touches gets built here, and I would rather the types caught it than the user did.',
    slot: 3,
  },
  {
    id: 'react',
    object: 'square',
    name: 'REACT / NEXT',
    level: 'PRIMARY',
    note: 'Interfaces and interactive work. This room you are standing in is React, which is either a good argument or a warning.',
    slot: 4,
  },
  {
    id: 'node',
    object: 'coil',
    name: 'NODE.JS',
    level: 'STRONG',
    note: 'APIs, services and the wiring between them. Usually alongside Postgres and Prisma.',
    slot: 5,
  },
  {
    id: 'sql',
    object: 'caliper',
    name: 'SQL',
    level: 'STRONG',
    note: 'Postgres by default, Timescale when the data has a clock. I would rather design the schema first and be slow about it.',
    slot: 6,
  },
  {
    id: 'creative',
    object: 'flask',
    name: 'CREATIVE DEV',
    level: 'PRIMARY',
    note: 'GSAP, Three.js, canvas, shaders. Motion as a way of explaining something, not as decoration on top of it.',
    slot: 7,
  },
];

/* ------------------------------------------------------------------- about */

export interface AboutObject {
  id: string;
  /** Which prop on the desk carries this. */
  prop: 'notebook' | 'monitor' | 'guitar' | 'camera' | 'books' | 'mug' | 'plant' | 'sketch';
  title: string;
  /** Read like a diary entry, not a bio. */
  body: string;
  /** Small technical caption. */
  meta?: string;
}

export const ABOUT_INTRO = {
  name: 'SID',
  line: 'I like building things at the intersection of technology, AI, design and creativity.',
  roles: ['Creative developer', 'Computer engineering student', 'AI builder', 'Digital creator'],
};

export const ABOUT_OBJECTS: AboutObject[] = [
  {
    id: 'notebook',
    prop: 'notebook',
    title: 'THE NOTEBOOK',
    meta: 'MOSTLY UNFINISHED',
    body: 'Ideas get written here before they get built, which means most of them stay here. The useful thing about writing them down is finding out, a week later, which ones you still care about. The four projects hanging in the gallery are the ones that survived that test.',
  },
  {
    id: 'monitor',
    prop: 'monitor',
    title: 'THE MACHINE',
    meta: 'THE TECHNICAL PART',
    body: 'Computer engineering student, which mostly means I learned the layers underneath before I learned the layer on top — and I am glad about the order. I build across the stack because problems rarely stay in one part of it. Python and TypeScript are home; anything else I will pick up if the problem needs it.',
  },
  {
    id: 'guitar',
    prop: 'guitar',
    title: 'THE GUITAR',
    meta: 'PRACTICE, NOT PERFORMANCE',
    body: 'It is here for the same reason the notebook is. Playing badly at something is the only route to playing well at it, and having one discipline where that is obvious makes it easier to accept in the ones where it is not. Also, timing is timing — the reason the doors in this world open the way they do is a sense of rhythm, not a spec.',
  },
  {
    id: 'camera',
    prop: 'camera',
    title: 'THE CAMERA',
    meta: 'DIGITAL CREATOR',
    body: 'I make things that get watched as well as things that get used, and the two teach each other. Editing video is where I learned that pacing is a design decision — that you can lose someone in the third second, and that the fix is structural. Reel Analyzer exists because I wanted to measure that instead of feeling it.',
  },
  {
    id: 'books',
    prop: 'books',
    title: 'THE SHELF',
    meta: 'INPUTS',
    body: 'Architecture, interface design, and a stubborn number of books about how things are drawn. Most of what I know about hierarchy came from print, not from the web. This entire building is an argument for that.',
  },
  {
    id: 'sketch',
    prop: 'sketch',
    title: 'THE PLAN',
    meta: 'DRAWN BEFORE BUILT',
    body: 'The floor plan of this world, worked out on paper first: one corridor, six doors, rooms sized so you can see the far wall from the threshold. I draw before I build, because it is much cheaper to find out on paper that an idea is boring.',
  },
];

/* -------------------------------------------------------------- experience */

export interface ExperienceEntry {
  id: string;
  period: string;
  title: string;
  org: string;
  kind: 'EDUCATION' | 'BUILD' | 'PRACTICE';
  body: string;
  tags: string[];
}

export const EXPERIENCE: ExperienceEntry[] = [
  {
    id: 'engineering',
    period: 'ONGOING',
    title: 'Computer Engineering',
    org: 'UNDERGRADUATE',
    kind: 'EDUCATION',
    body: 'Systems, architecture, networks and the mathematics under machine learning. The part that changed how I build was learning what happens below the abstraction I was working in.',
    tags: ['Systems', 'Architecture', 'Mathematics'],
  },
  {
    id: 'vibe',
    period: '2026',
    title: 'Vibe Finder',
    org: 'SELF-DIRECTED',
    kind: 'BUILD',
    body: 'An experiment in searching for places by atmosphere rather than category. Taught me most of what I know about embeddings and vector search, largely by getting it wrong first.',
    tags: ['CLIP', 'Vector search', 'Next.js'],
  },
  {
    id: 'jal',
    period: '2025',
    title: 'JalRakshak',
    org: 'SELF-DIRECTED',
    kind: 'BUILD',
    body: 'Anomaly detection over water infrastructure telemetry. The hardest part was not the model — it was deciding what deserved to become an alert, which turned out to be a design problem.',
    tags: ['PyTorch', 'Time series', 'FastAPI'],
  },
  {
    id: 'reel',
    period: '2025',
    title: 'Reel Analyzer',
    org: 'SELF-DIRECTED',
    kind: 'BUILD',
    body: 'Video decomposition and pacing analysis. Came directly out of editing my own footage and wanting numbers for something I could only feel.',
    tags: ['OpenCV', 'Whisper', 'FFmpeg'],
  },
  {
    id: 'blood',
    period: '2024',
    title: 'BloodLink',
    org: 'SELF-DIRECTED',
    kind: 'BUILD',
    body: 'Blood bank logistics, built around expiry and compatibility. My first properly modelled domain, and the project that made me slow down and design schemas before writing endpoints.',
    tags: ['PostgreSQL', 'Prisma', 'Next.js'],
  },
  {
    id: 'creative',
    period: 'CONTINUOUS',
    title: 'Creative development',
    org: 'PRACTICE',
    kind: 'PRACTICE',
    body: 'Motion, interaction and the drawn image, kept up as a deliberate practice rather than a hobby. The lab across the corridor is where that runs, and this building is the largest thing it has produced.',
    tags: ['GSAP', 'Three.js', 'Canvas'],
  },
];

/* ------------------------------------------------------------- experiments */

export interface Experiment {
  id: string;
  name: string;
  status: 'WORKS' | 'HALF-BUILT' | 'ABANDONED' | 'IDEA';
  body: string;
  tag: string;
  /** Position in the lab, local metres, plus a rotation in degrees. */
  place: [number, number, number];
  tilt: number;
}

export const EXPERIMENTS: Experiment[] = [
  {
    id: 'hatch',
    name: 'HATCH SHADER',
    status: 'WORKS',
    body: 'A shader that replaces smooth shading with pencil hatching whose direction follows surface curvature. The contact shading in this building is a cheaper descendant of it.',
    tag: 'GLSL',
    place: [-5.4, 1.9, -3.4],
    tilt: -7,
  },
  {
    id: 'plan',
    name: 'PLAN-TO-SPACE',
    status: 'HALF-BUILT',
    body: 'Feed it a hand-drawn floor plan; it extrudes a walkable 3D space. Works on clean drawings, falls apart on real ones, which is where it currently sits.',
    tag: 'CV · THREE',
    place: [-1.6, 2.5, -4.6],
    tilt: 5,
  },
  {
    id: 'wpm',
    name: 'CADENCE METER',
    status: 'WORKS',
    body: 'Live speaking-rate readout from microphone input. Built in an evening to settle an argument about whether I talk too fast. I do.',
    tag: 'WEB AUDIO',
    place: [2.2, 1.6, -3.9],
    tilt: 9,
  },
  {
    id: 'tiny',
    name: 'TINY CLASSIFIER',
    status: 'WORKS',
    body: 'How small can a model get and still be useful? A deliberately undersized network trained until it stopped being embarrassing. Small models are more interesting than large ones.',
    tag: 'PYTORCH',
    place: [5.6, 2.3, -3.1],
    tilt: -5,
  },
  {
    id: 'grammar',
    name: 'SHAPE GRAMMAR',
    status: 'IDEA',
    body: 'Generate architectural elevations from a small rule set, in the same drawn language as this world. Currently three pages of notes and one very ugly prototype.',
    tag: 'GENERATIVE',
    place: [-3.5, 3.2, -5.1],
    tilt: 12,
  },
  {
    id: 'cursor',
    name: 'MAGNETIC FIELDS',
    status: 'ABANDONED',
    body: 'Cursor physics where interface elements exert real attraction. Felt wonderful for ten seconds and unusable after thirty. Kept as a reminder that delight has a half-life.',
    tag: 'INTERACTION',
    place: [3.9, 3.5, -5.4],
    tilt: -11,
  },
  {
    id: 'sonify',
    name: 'DATA SONIFIER',
    status: 'HALF-BUILT',
    body: 'Turns a time series into sound so you can hear an anomaly instead of seeing it. Surprisingly effective for periodic data, useless for everything else.',
    tag: 'WEB AUDIO',
    place: [0.4, 3.7, -5.6],
    tilt: 4,
  },
];

/* ----------------------------------------------------------------- contact */

export interface ContactLink {
  id: string;
  label: string;
  value: string;
  href: string;
}

export const CONTACT_HEADLINE = ["LET'S BUILD", 'SOMETHING', 'INTERESTING.'];

export const CONTACT_NOTE =
  'Open to collaborations, internships, and the kind of problem that does not have an obvious shape yet. I reply to email.';

/** Sid: replace these with your real handles before publishing. */
export const CONTACT_LINKS: ContactLink[] = [
  { id: 'email', label: 'EMAIL', value: 'hello@sid.dev', href: 'mailto:hello@sid.dev' },
  { id: 'github', label: 'GITHUB', value: '@sid', href: 'https://github.com/' },
  { id: 'linkedin', label: 'LINKEDIN', value: '/in/sid', href: 'https://linkedin.com/' },
  { id: 'instagram', label: 'INSTAGRAM', value: '@sid', href: 'https://instagram.com/' },
];
