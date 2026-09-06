/**
 * Projects, as data.
 *
 * The gallery builds itself from this array: each entry knows where it hangs,
 * what kind of object represents it, and everything its case study needs.
 * Adding a fifth project means adding a fifth object here — the room will make
 * space for it.
 *
 * Sid: the copy below is yours to sharpen. `outcome` figures in particular
 * should be replaced with real numbers wherever you have them.
 */

export type ProjectVisual = 'monitor' | 'wallwork' | 'poster' | 'maptable';

export interface CaseStudyFeature {
  title: string;
  body: string;
}

export interface CaseStudyOutcome {
  value: string;
  label: string;
}

export interface Project {
  id: string;
  index: string;
  name: string;
  /** One line, shown on the placard and at the top of the case study. */
  tagline: string;
  year: string;
  discipline: string;
  /** How the project appears physically in the gallery. */
  visual: ProjectVisual;
  problem: string;
  solution: string;
  tech: string[];
  features: CaseStudyFeature[];
  role: string[];
  outcome: CaseStudyOutcome[];
  /** Short caption drawn onto the object's own surface in-world. */
  surfaceNote: string;
}

export const PROJECTS: Project[] = [
  {
    id: 'jalrakshak',
    index: '01',
    name: 'JALRAKSHAK',
    tagline: 'AI-powered monitoring for water infrastructure that mostly runs unwatched.',
    year: '2025',
    discipline: 'APPLIED AI · SENSING',
    visual: 'monitor',
    problem:
      'Municipal water networks fail quietly. A pipe starts leaking, a pump drifts out of spec, or quality slips below threshold, and nobody finds out until the complaints arrive. The sensor data usually exists — it just arrives as thousands of readings a day that no operator has time to read.',
    solution:
      'A monitoring layer that watches the telemetry instead of asking a person to. Readings stream in, get normalised, and are scored continuously against learned per-sensor baselines. Anomalies are ranked by how much they matter rather than how unusual they look, so an operator opens the dashboard to a short ordered list of things worth their attention, each with the trace that triggered it.',
    tech: ['Python', 'FastAPI', 'PyTorch', 'Pandas', 'PostgreSQL', 'TimescaleDB', 'React', 'MQTT'],
    features: [
      {
        title: 'Per-sensor baselines',
        body: 'Every sensor learns its own normal, including its daily and weekly rhythm, so a night-time drop in a residential zone is not reported as a fault.',
      },
      {
        title: 'Leak localisation',
        body: 'Pressure and flow residuals across neighbouring nodes are correlated to narrow a suspected leak down to a pipe segment rather than a district.',
      },
      {
        title: 'Quality thresholds that explain themselves',
        body: 'Turbidity, pH and chlorine are tracked together; an alert states which parameter moved, by how much, and what it usually does at that hour.',
      },
      {
        title: 'Ranked decision support',
        body: 'Alerts carry a severity derived from affected population and time-to-escalation, so triage order is the default view rather than a manual sort.',
      },
    ],
    role: [
      'Designed the anomaly-scoring approach and the baseline model per sensor class.',
      'Built the ingestion and scoring services, and the time-series schema behind them.',
      'Designed and built the operator dashboard, including the alert triage view.',
    ],
    outcome: [
      { value: '4', label: 'sensor classes modelled' },
      { value: '<2 min', label: 'ingest to alert' },
      { value: 'Segment', label: 'leak localisation granularity' },
    ],
    surfaceNote: 'LIVE · 12 NODES · 3 ALERTS',
  },
  {
    id: 'reel-analyzer',
    index: '02',
    name: 'REEL ANALYZER',
    tagline: 'Takes a video apart and tells you why it holds attention — or where it loses it.',
    year: '2025',
    discipline: 'COMPUTER VISION · AUDIO',
    visual: 'wallwork',
    problem:
      'Creators are told to study their own videos, but "study" usually means scrubbing a timeline and guessing. The things that actually govern retention — how often the shot changes, how fast someone talks, where the silences fall, whether the first two seconds contain a reason to stay — are all measurable, and none of them are surfaced by the tools people already use.',
    solution:
      'An analysis pipeline that decomposes a video into structure, speech and pacing, then reports the parts a creator can act on. Scene boundaries come from frame-difference detection, speech is transcribed and aligned to the timeline, and the two are combined into a pacing profile: words per minute over time, cut frequency per section, dead air, and the hook window at the top.',
    tech: ['Python', 'OpenCV', 'FFmpeg', 'Whisper', 'NumPy', 'FastAPI', 'Next.js', 'D3'],
    features: [
      {
        title: 'Scene segmentation',
        body: 'Shot boundaries detected from histogram and frame-difference signals, giving an objective cut-rate for any section of the timeline.',
      },
      {
        title: 'Transcription and alignment',
        body: 'Speech-to-text aligned back onto the video clock, so every sentence has a position and a duration to reason about.',
      },
      {
        title: 'Pacing profile',
        body: 'Speaking rate plotted over time against cut density, which is what exposes the stretch in the middle where a video sags.',
      },
      {
        title: 'Hook analysis',
        body: 'The opening window is scored separately: what appears, what is said, and how quickly the first cut lands.',
      },
    ],
    role: [
      'Built the video and audio processing pipeline end to end.',
      'Designed the pacing metrics, including how speaking rate and cut density are combined.',
      'Built the analysis UI, including the timeline visualisation.',
    ],
    outcome: [
      { value: '6', label: 'signals extracted per video' },
      { value: 'Frame', label: 'timeline alignment accuracy' },
      { value: 'Timeline', label: 'output, not a single score' },
    ],
    surfaceNote: 'SCENES 24 · WPM 172 · HOOK 1.8s',
  },
  {
    id: 'bloodlink',
    index: '03',
    name: 'BLOODLINK',
    tagline: 'Blood bank and donation logistics, built around the constraint that blood expires.',
    year: '2024',
    discipline: 'PLATFORM · LOGISTICS',
    visual: 'poster',
    problem:
      'Blood banks run on a perishable, type-matched inventory with demand that arrives without warning. The coordination that decides whether a unit reaches a patient or expires on a shelf is often still phone calls and spreadsheets — which means shortages and wastage can happen in the same city on the same day.',
    solution:
      'A platform that treats donors, inventory and requests as one system. Donor records carry eligibility windows so the right people are contacted at the right time; inventory is tracked by type and expiry so units are allocated oldest-viable-first; and hospital requests are matched against real stock with substitution rules applied, rather than being answered from memory.',
    tech: ['Next.js', 'TypeScript', 'Node.js', 'PostgreSQL', 'Prisma', 'Tailwind CSS'],
    features: [
      {
        title: 'Eligibility-aware donor registry',
        body: 'Each donor has a next-eligible date derived from their last donation, so campaign outreach only reaches people who can actually give.',
      },
      {
        title: 'Expiry-first allocation',
        body: 'Units are held with type and expiry, and fulfilment defaults to the oldest still-viable match to push wastage down.',
      },
      {
        title: 'Compatibility matching',
        body: 'Requests resolve against ABO/Rh substitution rules, so a near-match can be offered instead of a flat refusal.',
      },
      {
        title: 'Request lifecycle',
        body: 'Hospital requests move through a defined set of states with an audit trail, which is what makes the numbers trustworthy.',
      },
    ],
    role: [
      'Modelled the domain: donors, units, compatibility and request states.',
      'Built the full stack, from schema and API through to the operator interface.',
      'Designed the allocation logic that prioritises expiry over convenience.',
    ],
    outcome: [
      { value: '8', label: 'blood groups with substitution rules' },
      { value: 'Audited', label: 'every request state change' },
      { value: 'FIFO', label: 'expiry-first allocation default' },
    ],
    surfaceNote: 'DONATE · MATCH · DELIVER',
  },
  {
    id: 'vibe-finder',
    index: '04',
    name: 'VIBE FINDER',
    tagline: 'Finds places the way people actually find them now — by how they look on a feed.',
    year: '2026',
    discipline: 'EXPERIMENTAL · DISCOVERY',
    visual: 'maptable',
    problem:
      'Ratings tell you a place is a 4.3. They do not tell you it is loud, or that the light is good at six, or that it is the sort of room you would actually want to sit in. People have quietly stopped using review sites for this and started using short-form video instead — but video is not searchable, and a feed is not a map.',
    solution:
      'A discovery platform that treats social content as the primary signal. Posts about a place are collected and read for atmosphere rather than sentiment, producing a small set of descriptive tags — quiet, green, late, cheap, good light — which become the thing you search. Results are shown as content first: you see the room before you see its name.',
    tech: ['Next.js', 'TypeScript', 'Python', 'CLIP', 'Vector search', 'PostgreSQL', 'Mapbox'],
    features: [
      {
        title: 'Vibe tagging from content',
        body: 'Images and captions are embedded and clustered into atmosphere tags, so places are described the way visitors describe them rather than by category.',
      },
      {
        title: 'Search by feeling',
        body: 'Queries like "quiet, good for working, open late" resolve against the tag space instead of requiring the right keyword.',
      },
      {
        title: 'Content-first results',
        body: 'Each result leads with the media that earned it its tags, because a photograph settles the question faster than a paragraph.',
      },
      {
        title: 'Map and feed as one view',
        body: 'Spatial browsing and feed browsing share state, so narrowing one narrows the other.',
      },
    ],
    role: [
      'Came up with the premise and designed the tag taxonomy.',
      'Built the embedding and clustering pipeline behind vibe extraction.',
      'Built the front end, including the linked map and feed.',
    ],
    outcome: [
      { value: '12', label: 'atmosphere tags in the taxonomy' },
      { value: 'Vector', label: 'search over embedded content' },
      { value: 'In progress', label: 'still an experiment, honestly' },
    ],
    surfaceNote: 'QUIET · GREEN · LATE · GOOD LIGHT',
  },
];

export const projectById = (id: string) => PROJECTS.find((p) => p.id === id);
