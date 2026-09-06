'use client';

/**
 * Content-bearing surfaces: the drawn "artwork" of the world.
 *
 * Anything with words on it — the end wall, project placards, screens, notes,
 * the timeline — is composited into a canvas here. Baking text into a texture
 * rather than rendering 3D glyphs means one draw call per object, and lets the
 * lettering pick up the same hand drift as the linework around it.
 */

import * as THREE from 'three';
import { driftParagraph, driftText, hatch, line, paperGrain, rect, ellipse } from './draw';
import { makeRng } from './rand';
import { palette } from './theme';
import { FONT_MONO, FONT_SERIF, cached, makeCanvas, toTexture } from './textures';
import { IDENTITY } from '@/data/world';
import type { Project } from '@/data/projects';

/* --------------------------------------------------------------- end wall */

/** The corridor's far wall: the name, the roles, and a drafting note. */
export function identityWallTexture() {
  return cached('identity-wall', () => {
    const w = 2048;
    const h = 1400;
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = palette.paperLit;
    ctx.fillRect(0, 0, w, h);
    paperGrain(ctx, w, h, { seed: 21, density: 0.05, alpha: 0.05 });

    const cx = w / 2;

    // The name, cut large and outlined rather than filled, like signage
    // painted onto plaster.
    ctx.save();
    ctx.font = `400 ${Math.round(h * 0.46)}px ${FONT_SERIF}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 3.2;
    ctx.strokeStyle = palette.graphite;
    ctx.globalAlpha = 0.9;
    ctx.strokeText(IDENTITY.name, cx, h * 0.54);
    ctx.globalAlpha = 0.045;
    ctx.fillStyle = palette.graphite;
    ctx.fillText(IDENTITY.name, cx, h * 0.54);
    ctx.restore();

    // Hatched drop-shadow inside the letterforms, offset like a print misregister.
    ctx.save();
    ctx.font = `400 ${Math.round(h * 0.46)}px ${FONT_SERIF}`;
    ctx.textAlign = 'center';
    ctx.beginPath();
    // Clip to the glyphs so the hatching only shows inside them.
    const metrics = ctx.measureText(IDENTITY.name);
    ctx.rect(cx - metrics.width / 2 - 20, h * 0.1, metrics.width + 40, h * 0.5);
    ctx.clip();
    ctx.globalAlpha = 1;
    hatch(ctx, cx - metrics.width / 2, h * 0.12, metrics.width, h * 0.44, {
      spacing: 11,
      alpha: 0.05,
      angle: -Math.PI / 3,
      seed: 5,
    });
    ctx.restore();

    // Roles, spaced as one tracked line.
    const roles = IDENTITY.roles.join('   ·   ');
    driftText(ctx, roles, cx, h * 0.665, {
      font: `500 ${Math.round(h * 0.043)}px ${FONT_MONO}`,
      color: palette.graphiteMid,
      align: 'center',
      tracking: h * 0.012,
      drift: 0.7,
      seed: 9,
    });

    line(ctx, cx - w * 0.13, h * 0.705, cx + w * 0.13, h * 0.705, {
      color: palette.accent,
      width: 1.6,
      alpha: 0.5,
      wobble: 1,
      seed: 13,
    });

    driftText(ctx, IDENTITY.note, cx, h * 0.755, {
      font: `400 ${Math.round(h * 0.032)}px ${FONT_MONO}`,
      color: palette.graphiteSoft,
      align: 'center',
      tracking: 1.5,
      drift: 0.5,
      seed: 17,
    });

    // Drafting annotation in the corner, as if the wall were a sheet.
    driftText(ctx, 'SHEET 01 — SECTION A', w * 0.055, h * 0.94, {
      font: `400 ${Math.round(h * 0.022)}px ${FONT_MONO}`,
      color: palette.graphiteFaint,
      tracking: 2,
      drift: 0.4,
      seed: 19,
    });
    driftText(ctx, 'SCALE 1:1', w * 0.945, h * 0.94, {
      font: `400 ${Math.round(h * 0.022)}px ${FONT_MONO}`,
      color: palette.graphiteFaint,
      align: 'right',
      tracking: 2,
      drift: 0.4,
      seed: 23,
    });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/**
 * A room's name, painted straight onto its wall at architectural scale, with
 * the door number and a line of orientation underneath.
 */
export function roomTitleTexture(name: string, index: string, blurb: string) {
  return cached(`room-title:${name}`, () => {
    const w = 1600;
    const h = 700;
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.clearRect(0, 0, w, h);

    driftText(ctx, index, 12, h * 0.3, {
      font: `600 ${Math.round(h * 0.13)}px ${FONT_MONO}`,
      color: palette.accent,
      tracking: h * 0.02,
      drift: 0.6,
      seed: 3,
    });

    // Outlined display lettering, as if stencilled on plaster.
    ctx.save();
    ctx.font = `400 ${Math.round(h * 0.42)}px ${FONT_SERIF}`;
    ctx.textBaseline = 'alphabetic';
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = palette.graphite;
    ctx.globalAlpha = 0.88;
    ctx.strokeText(name, 12, h * 0.72);
    ctx.globalAlpha = 0.055;
    ctx.fillStyle = palette.graphite;
    ctx.fillText(name, 12, h * 0.72);
    const width = ctx.measureText(name).width;
    ctx.restore();

    line(ctx, 14, h * 0.8, 14 + width, h * 0.8, {
      color: palette.graphite,
      width: 1.6,
      alpha: 0.35,
      wobble: 1.2,
      seed: 5,
    });
    driftParagraph(ctx, blurb, 14, h * 0.9, Math.max(width, w * 0.5), {
      font: `400 ${Math.round(h * 0.045)}px ${FONT_MONO}`,
      lineHeight: h * 0.062,
      color: palette.graphiteSoft,
      seed: 7,
    });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/* ------------------------------------------------------------- gallery work */

/**
 * A framed project poster: index, name, tagline, discipline, and a drawn
 * abstraction standing in for a screenshot. Deliberately not a UI mockup —
 * a diagram reads better at a distance and does not date.
 */
export function projectPosterTexture(project: Project) {
  return cached(`poster:${project.id}`, () => {
    const w = 900;
    const h = 1280;
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = palette.paperLit;
    ctx.fillRect(0, 0, w, h);
    paperGrain(ctx, w, h, { seed: 31, density: 0.07, alpha: 0.06 });

    const m = 62;
    rect(ctx, m, m, w - m * 2, h - m * 2, {
      color: palette.graphite,
      width: 1.6,
      alpha: 0.4,
      wobble: 1.2,
      overshoot: 5,
      seed: 3,
    });

    driftText(ctx, project.index, m + 14, m + 62, {
      font: `600 ${Math.round(h * 0.038)}px ${FONT_MONO}`,
      color: palette.accent,
      tracking: 3,
      drift: 0.6,
      seed: 5,
    });
    driftText(ctx, project.year, w - m - 14, m + 62, {
      font: `400 ${Math.round(h * 0.026)}px ${FONT_MONO}`,
      color: palette.graphiteSoft,
      align: 'right',
      tracking: 3,
      drift: 0.4,
      seed: 7,
    });

    // Diagram plate: a drawn abstraction of what the project does.
    const plateY = m + 108;
    const plateH = h * 0.4;
    rect(ctx, m + 14, plateY, w - m * 2 - 28, plateH, {
      color: palette.graphite,
      width: 1.2,
      alpha: 0.3,
      wobble: 1,
      seed: 11,
    });
    drawProjectDiagram(ctx, project, m + 14, plateY, w - m * 2 - 28, plateH);

    // Name, set large.
    const nameY = plateY + plateH + h * 0.085;
    driftText(ctx, project.name, m + 14, nameY, {
      font: `400 ${Math.round(h * 0.072)}px ${FONT_SERIF}`,
      color: palette.graphite,
      tracking: 1,
      drift: 0.9,
      seed: 13,
    });

    line(ctx, m + 14, nameY + 22, w - m - 14, nameY + 22, {
      color: palette.graphite,
      width: 1.2,
      alpha: 0.35,
      wobble: 1,
      seed: 17,
    });

    const afterTag = driftParagraph(ctx, project.tagline, m + 14, nameY + 66, w - m * 2 - 28, {
      font: `400 ${Math.round(h * 0.029)}px ${FONT_MONO}`,
      lineHeight: h * 0.042,
      color: palette.graphiteMid,
      seed: 19,
    });

    driftText(ctx, project.discipline, m + 14, afterTag + h * 0.03, {
      font: `500 ${Math.round(h * 0.022)}px ${FONT_MONO}`,
      color: palette.graphiteFaint,
      tracking: 3.5,
      drift: 0.4,
      seed: 23,
    });

    // Tech stack, as a short tracked run at the foot of the sheet.
    driftText(ctx, project.tech.slice(0, 5).join(' / '), m + 14, h - m - 26, {
      font: `400 ${Math.round(h * 0.021)}px ${FONT_MONO}`,
      color: palette.graphiteSoft,
      tracking: 1.5,
      drift: 0.4,
      seed: 29,
    });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** Per-project drawn diagram. Each one describes its actual mechanism. */
function drawProjectDiagram(
  ctx: CanvasRenderingContext2D,
  project: Project,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const rng = makeRng(project.id.length * 977);
  const ink = { color: palette.graphite, width: 1.3, alpha: 0.55, wobble: 1.1 };

  if (project.id === 'jalrakshak') {
    // A pipe network with nodes, one flagged.
    const nodes: Array<[number, number]> = [
      [0.16, 0.68],
      [0.34, 0.36],
      [0.52, 0.66],
      [0.7, 0.32],
      [0.86, 0.6],
    ];
    for (let i = 0; i < nodes.length - 1; i++) {
      line(
        ctx,
        x + nodes[i][0] * w,
        y + nodes[i][1] * h,
        x + nodes[i + 1][0] * w,
        y + nodes[i + 1][1] * h,
        { ...ink, width: 2.2, seed: i + 1 },
      );
    }
    nodes.forEach(([nx, ny], i) => {
      const flagged = i === 3;
      ellipse(ctx, x + nx * w, y + ny * h, 13, 13, {
        ...ink,
        color: flagged ? palette.accent : palette.graphite,
        width: flagged ? 2.4 : 1.6,
        alpha: 0.8,
        seed: i + 11,
      });
      if (flagged) {
        ellipse(ctx, x + nx * w, y + ny * h, 26, 26, { color: palette.accent, width: 1.2, alpha: 0.4, wobble: 1.5, seed: 41 });
        driftText(ctx, 'ANOMALY', x + nx * w + 34, y + ny * h + 4, {
          font: `500 12px ${FONT_MONO}`,
          color: palette.accent,
          tracking: 1.5,
          drift: 0.4,
          seed: 43,
        });
      }
    });
    // Sensor trace along the bottom.
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const base = Math.sin(t * Math.PI * 3.4) * 0.06 + (t > 0.72 ? (t - 0.72) * 0.5 : 0);
      pts.push([x + (0.08 + t * 0.84) * w, y + (0.9 - base) * h]);
    }
    ctx.save();
    ctx.strokeStyle = palette.graphiteMid;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
    ctx.restore();
  } else if (project.id === 'reel-analyzer') {
    // A filmstrip with cut markers and a pacing curve beneath.
    const stripY = y + h * 0.2;
    const stripH = h * 0.26;
    const frames = 7;
    for (let i = 0; i < frames; i++) {
      const fx = x + w * 0.08 + (i * w * 0.84) / frames;
      const fw = (w * 0.84) / frames - 6;
      rect(ctx, fx, stripY, fw, stripH, { ...ink, width: 1.4, seed: i + 3 });
      if (i === 2 || i === 5) {
        line(ctx, fx, stripY - 12, fx, stripY + stripH + 12, {
          color: palette.accent,
          width: 2,
          alpha: 0.75,
          wobble: 0.6,
          seed: i + 31,
        });
      }
      hatch(ctx, fx + 3, stripY + 3, fw - 6, stripH - 6, { spacing: 9, alpha: 0.06, seed: i + 7 });
    }
    // Speaking-rate curve.
    ctx.save();
    ctx.strokeStyle = palette.graphite;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const v = 0.5 + Math.sin(t * 7) * 0.16 + Math.sin(t * 2.3) * 0.2 - (t > 0.55 && t < 0.78 ? 0.22 : 0);
      const px = x + (0.08 + t * 0.84) * w;
      const py = y + h * 0.66 + (1 - v) * h * 0.26;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();
    driftText(ctx, 'WPM', x + w * 0.08, y + h * 0.63, {
      font: `500 12px ${FONT_MONO}`,
      color: palette.graphiteSoft,
      tracking: 2,
      drift: 0.3,
      seed: 53,
    });
  } else if (project.id === 'bloodlink') {
    // Inventory as a rack of units with expiry bars, and a compatibility fan.
    const cols = 6;
    for (let i = 0; i < cols; i++) {
      const bx = x + w * 0.08 + i * (w * 0.4) / cols;
      const bw = (w * 0.4) / cols - 7;
      const fill = 0.3 + ((i * 37) % 7) / 10;
      rect(ctx, bx, y + h * 0.24, bw, h * 0.5, { ...ink, width: 1.3, seed: i + 5 });
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = i === 4 ? palette.accent : palette.graphite;
      ctx.fillRect(bx + 2, y + h * 0.24 + h * 0.5 * (1 - fill), bw - 4, h * 0.5 * fill);
      ctx.restore();
      if (i === 4) {
        line(ctx, bx - 4, y + h * 0.24 + h * 0.5 * (1 - fill), bx + bw + 4, y + h * 0.24 + h * 0.5 * (1 - fill), {
          color: palette.accent,
          width: 1.8,
          alpha: 0.8,
          wobble: 0.6,
          seed: 61,
        });
      }
    }
    // Compatibility fan on the right.
    const ox = x + w * 0.62;
    const oy = y + h * 0.5;
    ellipse(ctx, ox, oy, 16, 16, { ...ink, width: 2, alpha: 0.8, seed: 63 });
    const targets: Array<[number, number]> = [
      [0.9, 0.24],
      [0.94, 0.5],
      [0.9, 0.76],
    ];
    targets.forEach(([tx, ty], i) => {
      line(ctx, ox + 18, oy, x + tx * w - 14, y + ty * h, { ...ink, width: 1.2, alpha: 0.4, seed: i + 71 });
      ellipse(ctx, x + tx * w, y + ty * h, 11, 11, { ...ink, width: 1.4, alpha: 0.6, seed: i + 81 });
    });
    driftText(ctx, 'EXPIRY', x + w * 0.08, y + h * 0.19, {
      font: `500 12px ${FONT_MONO}`,
      color: palette.graphiteSoft,
      tracking: 2,
      drift: 0.3,
      seed: 91,
    });
  } else {
    // Vibe Finder: a scatter of places in tag space, one cluster circled.
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i < 34; i++) pts.push([0.1 + rng() * 0.8, 0.14 + rng() * 0.72, 4 + rng() * 5]);
    pts.forEach(([px, py, r], i) => {
      ellipse(ctx, x + px * w, y + py * h, r, r, {
        color: palette.graphite,
        width: 1.1,
        alpha: 0.35 + rng() * 0.3,
        wobble: 0.8,
        seed: i + 3,
      });
    });
    ellipse(ctx, x + w * 0.62, y + h * 0.4, w * 0.17, h * 0.22, {
      color: palette.accent,
      width: 1.8,
      alpha: 0.6,
      wobble: 2.2,
      seed: 101,
    });
    driftText(ctx, 'QUIET · GOOD LIGHT', x + w * 0.62, y + h * 0.14, {
      font: `500 12px ${FONT_MONO}`,
      color: palette.accent,
      align: 'center',
      tracking: 1.5,
      drift: 0.4,
      seed: 103,
    });
    // A coastline-ish map line under the scatter.
    const mpts: Array<[number, number]> = [];
    for (let i = 0; i <= 30; i++) {
      const t = i / 30;
      mpts.push([x + (0.06 + t * 0.88) * w, y + (0.9 + Math.sin(t * 5 + 1) * 0.05) * h]);
    }
    ctx.save();
    ctx.strokeStyle = palette.graphiteFaint;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    mpts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/** Gallery placard: the label mounted beside a hung work. */
export function placardTexture(project: Project) {
  return cached(`placard:${project.id}`, () => {
    const w = 640;
    const h = 300;
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = palette.paperLit;
    ctx.fillRect(0, 0, w, h);
    paperGrain(ctx, w, h, { seed: 37, density: 0.06, alpha: 0.05 });
    rect(ctx, 10, 10, w - 20, h - 20, {
      color: palette.graphite,
      width: 1.4,
      alpha: 0.45,
      wobble: 1,
      overshoot: 4,
      seed: 3,
    });

    driftText(ctx, project.index, 34, 68, {
      font: `600 34px ${FONT_MONO}`,
      color: palette.accent,
      tracking: 3,
      drift: 0.5,
      seed: 5,
    });
    driftText(ctx, project.name, 34, 132, {
      font: `400 52px ${FONT_SERIF}`,
      color: palette.graphite,
      drift: 0.7,
      seed: 7,
    });
    line(ctx, 34, 152, w - 34, 152, { color: palette.graphite, width: 1.1, alpha: 0.3, wobble: 0.8, seed: 11 });
    driftParagraph(ctx, project.tagline, 34, 186, w - 68, {
      font: `400 21px ${FONT_MONO}`,
      lineHeight: 30,
      color: palette.graphiteMid,
      seed: 13,
    });
    driftText(ctx, 'VIEW CASE STUDY →', 34, h - 32, {
      font: `500 19px ${FONT_MONO}`,
      color: palette.accent,
      tracking: 2,
      drift: 0.4,
      seed: 17,
    });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/**
 * A monitor's screen, drawn as a schematic dashboard rather than a screenshot.
 * Used for the project that appears as a working machine in the gallery.
 */
export function screenTexture(project: Project) {
  return cached(`screen:${project.id}`, () => {
    const w = 1024;
    const h = 640;
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = '#fbf9f3';
    ctx.fillRect(0, 0, w, h);

    // Chrome bar.
    line(ctx, 0, 44, w, 44, { color: palette.graphite, width: 1.4, alpha: 0.4, wobble: 0.6, seed: 3 });
    [22, 46, 70].forEach((cx, i) => ellipse(ctx, cx, 22, 6, 6, { color: palette.graphite, width: 1.2, alpha: 0.4, seed: i + 5 }));
    driftText(ctx, project.name, w / 2, 30, {
      font: `500 19px ${FONT_MONO}`,
      color: palette.graphiteMid,
      align: 'center',
      tracking: 3,
      drift: 0.4,
      seed: 7,
    });

    // Left rail.
    line(ctx, 168, 44, 168, h, { color: palette.graphite, width: 1.2, alpha: 0.3, wobble: 0.6, seed: 11 });
    ['OVERVIEW', 'NODES', 'ALERTS', 'QUALITY', 'REPORTS'].forEach((item, i) => {
      const y = 92 + i * 44;
      driftText(ctx, item, 26, y, {
        font: `400 16px ${FONT_MONO}`,
        color: i === 2 ? palette.accent : palette.graphiteSoft,
        tracking: 1.5,
        drift: 0.3,
        seed: i + 13,
      });
      if (i === 2) line(ctx, 22, y + 8, 140, y + 8, { color: palette.accent, width: 1.4, alpha: 0.5, wobble: 0.6, seed: 19 });
    });

    // Stat tiles.
    const tiles = project.outcome.slice(0, 3);
    tiles.forEach((t, i) => {
      const tx = 200 + i * 270;
      rect(ctx, tx, 74, 244, 108, { color: palette.graphite, width: 1.2, alpha: 0.32, wobble: 0.8, seed: i + 23 });
      driftText(ctx, t.value, tx + 18, 132, {
        font: `400 44px ${FONT_SERIF}`,
        color: palette.graphite,
        drift: 0.5,
        seed: i + 29,
      });
      driftText(ctx, t.label.toUpperCase(), tx + 18, 162, {
        font: `400 13px ${FONT_MONO}`,
        color: palette.graphiteSoft,
        tracking: 1.2,
        drift: 0.3,
        seed: i + 31,
      });
    });

    // Trace panel.
    rect(ctx, 200, 206, 784, 250, { color: palette.graphite, width: 1.2, alpha: 0.32, wobble: 0.8, seed: 37 });
    ctx.save();
    ctx.beginPath();
    ctx.rect(200, 206, 784, 250);
    ctx.clip();
    for (let s = 0; s < 3; s++) {
      ctx.strokeStyle = s === 1 ? palette.accent : palette.graphiteMid;
      ctx.globalAlpha = s === 1 ? 0.75 : 0.4;
      ctx.lineWidth = s === 1 ? 1.9 : 1.3;
      ctx.beginPath();
      for (let i = 0; i <= 90; i++) {
        const t = i / 90;
        const spike = s === 1 && t > 0.68 && t < 0.76 ? 0.34 : 0;
        const v = 0.5 + Math.sin(t * 9 + s * 2) * 0.13 + Math.sin(t * 3.1 + s) * 0.1 + spike;
        const px = 210 + t * 764;
        const py = 206 + 250 - v * 250;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Footer status.
    driftText(ctx, project.surfaceNote, 200, h - 22, {
      font: `400 15px ${FONT_MONO}`,
      color: palette.graphiteSoft,
      tracking: 2,
      drift: 0.3,
      seed: 41,
    });
    paperGrain(ctx, w, h, { seed: 43, density: 0.03, alpha: 0.035 });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/* ------------------------------------------------------------- note sheets */

/** A torn note sheet with a heading and a short body. Used all over the rooms. */
export function noteTexture(
  key: string,
  heading: string,
  body: string,
  opts: { meta?: string; accent?: boolean; w?: number; h?: number } = {},
) {
  const { meta, accent = false, w = 720, h = 520 } = opts;
  return cached(`note:${key}`, () => {
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = palette.paperLit;
    ctx.fillRect(0, 0, w, h);
    paperGrain(ctx, w, h, { seed: 47, density: 0.08, alpha: 0.07 });

    rect(ctx, 16, 16, w - 32, h - 32, {
      color: palette.graphite,
      width: 1.4,
      alpha: 0.4,
      wobble: 1.2,
      overshoot: 5,
      seed: 3,
    });

    if (meta) {
      driftText(ctx, meta, 44, 62, {
        font: `500 18px ${FONT_MONO}`,
        color: accent ? palette.accent : palette.graphiteFaint,
        tracking: 3,
        drift: 0.4,
        seed: 5,
      });
    }
    driftText(ctx, heading, 44, meta ? 122 : 92, {
      font: `400 46px ${FONT_SERIF}`,
      color: palette.graphite,
      drift: 0.7,
      seed: 7,
    });
    line(ctx, 44, meta ? 142 : 112, w - 44, meta ? 142 : 112, {
      color: palette.graphite,
      width: 1.1,
      alpha: 0.3,
      wobble: 0.9,
      seed: 11,
    });
    driftParagraph(ctx, body, 44, meta ? 184 : 154, w - 88, {
      font: `400 21px ${FONT_MONO}`,
      lineHeight: 32,
      color: palette.graphiteMid,
      seed: 13,
    });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** A small tool tag hung on the workshop bench. */
export function toolTagTexture(key: string, name: string, level: string) {
  return cached(`tag:${key}`, () => {
    const w = 420;
    const h = 150;
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = palette.paperLit;
    // A tag shape: rectangle with a clipped corner and a punch hole.
    ctx.beginPath();
    ctx.moveTo(38, 8);
    ctx.lineTo(w - 8, 8);
    ctx.lineTo(w - 8, h - 8);
    ctx.lineTo(38, h - 8);
    ctx.lineTo(8, h / 2);
    ctx.closePath();
    ctx.fill();
    paperGrain(ctx, w, h, { seed: 51, density: 0.06, alpha: 0.06 });
    ctx.save();
    ctx.strokeStyle = palette.graphite;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.restore();
    ellipse(ctx, 44, h / 2, 8, 8, { color: palette.graphite, width: 1.4, alpha: 0.5, seed: 3 });

    driftText(ctx, name, 74, h / 2 - 4, {
      font: `600 30px ${FONT_MONO}`,
      color: palette.graphite,
      tracking: 1.5,
      drift: 0.5,
      seed: 5,
    });
    driftText(ctx, level, 74, h / 2 + 30, {
      font: `400 17px ${FONT_MONO}`,
      color: palette.accent,
      tracking: 2.5,
      drift: 0.4,
      seed: 7,
    });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** A hanging archive card for the experience timeline. */
export function archiveCardTexture(
  key: string,
  period: string,
  title: string,
  org: string,
  kind: string,
  tags: string[],
) {
  return cached(`archive:${key}`, () => {
    const w = 760;
    const h = 420;
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = palette.paperLit;
    ctx.fillRect(0, 0, w, h);
    paperGrain(ctx, w, h, { seed: 53, density: 0.07, alpha: 0.06 });
    rect(ctx, 14, 14, w - 28, h - 28, {
      color: palette.graphite,
      width: 1.5,
      alpha: 0.42,
      wobble: 1.1,
      overshoot: 5,
      seed: 3,
    });
    // Punch holes along the top, like a filed sheet.
    [w * 0.3, w * 0.7].forEach((cx, i) => ellipse(ctx, cx, 40, 9, 9, { color: palette.graphite, width: 1.3, alpha: 0.35, seed: i + 5 }));

    driftText(ctx, period, 44, 104, {
      font: `600 30px ${FONT_MONO}`,
      color: palette.accent,
      tracking: 3,
      drift: 0.5,
      seed: 7,
    });
    driftText(ctx, kind, w - 44, 104, {
      font: `400 17px ${FONT_MONO}`,
      color: palette.graphiteFaint,
      align: 'right',
      tracking: 3,
      drift: 0.4,
      seed: 11,
    });
    driftText(ctx, title, 44, 176, {
      font: `400 50px ${FONT_SERIF}`,
      color: palette.graphite,
      drift: 0.7,
      seed: 13,
    });
    driftText(ctx, org, 44, 214, {
      font: `400 19px ${FONT_MONO}`,
      color: palette.graphiteSoft,
      tracking: 2.5,
      drift: 0.4,
      seed: 17,
    });
    line(ctx, 44, 240, w - 44, 240, { color: palette.graphite, width: 1.1, alpha: 0.28, wobble: 0.9, seed: 19 });
    driftText(ctx, tags.join('  ·  '), 44, h - 52, {
      font: `400 18px ${FONT_MONO}`,
      color: palette.graphiteMid,
      tracking: 1.2,
      drift: 0.4,
      seed: 23,
    });
    driftText(ctx, 'READ →', w - 44, h - 52, {
      font: `500 18px ${FONT_MONO}`,
      color: palette.accent,
      align: 'right',
      tracking: 2,
      drift: 0.4,
      seed: 29,
    });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** A pinned lab card: status stamp, name, tag. */
export function labCardTexture(key: string, name: string, status: string, tag: string) {
  return cached(`lab:${key}`, () => {
    const w = 560;
    const h = 400;
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = palette.paperLit;
    ctx.fillRect(0, 0, w, h);
    paperGrain(ctx, w, h, { seed: 59, density: 0.09, alpha: 0.08 });
    rect(ctx, 12, 12, w - 24, h - 24, {
      color: palette.graphite,
      width: 1.5,
      alpha: 0.45,
      wobble: 1.4,
      overshoot: 6,
      seed: 3,
    });

    // Sketch plate standing in for a screenshot of the experiment.
    const px = 40;
    const py = 44;
    const pw = w - 80;
    const ph = h * 0.42;
    rect(ctx, px, py, pw, ph, { color: palette.graphite, width: 1.2, alpha: 0.3, wobble: 1, seed: 5 });
    const rng = makeRng(key.length * 613);
    for (let i = 0; i < 16; i++) {
      const bx = px + 10 + rng() * (pw - 60);
      const by = py + 10 + rng() * (ph - 40);
      rect(ctx, bx, by, 18 + rng() * 42, 8 + rng() * 22, {
        color: palette.graphite,
        width: 1,
        alpha: 0.16 + rng() * 0.2,
        wobble: 1.1,
        seed: i + 7,
      });
    }
    hatch(ctx, px, py, pw, ph, { spacing: 13, alpha: 0.05, angle: -0.9, seed: 11 });

    driftText(ctx, name, 40, ph + 108, {
      font: `600 32px ${FONT_MONO}`,
      color: palette.graphite,
      tracking: 1.5,
      drift: 0.6,
      seed: 13,
    });
    driftText(ctx, tag, 40, ph + 142, {
      font: `400 17px ${FONT_MONO}`,
      color: palette.graphiteSoft,
      tracking: 2.5,
      drift: 0.4,
      seed: 17,
    });

    // Status, stamped at an angle.
    ctx.save();
    ctx.translate(w - 132, h - 74);
    ctx.rotate(-0.13);
    const stampW = 176;
    const stampH = 52;
    rect(ctx, -stampW / 2, -stampH / 2, stampW, stampH, {
      color: palette.accent,
      width: 2.2,
      alpha: 0.75,
      wobble: 1.4,
      overshoot: 4,
      seed: 19,
    });
    driftText(ctx, status, 0, 9, {
      font: `600 22px ${FONT_MONO}`,
      color: palette.accent,
      align: 'center',
      tracking: 2,
      drift: 0.5,
      alpha: 0.9,
      seed: 23,
    });
    ctx.restore();
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** The contact room's headline, set large across three lines. */
export function contactHeadlineTexture(lines: string[], note: string) {
  return cached('contact-headline', () => {
    const w = 1600;
    const h = 1100;
    const { canvas, ctx } = makeCanvas(w, h);
    /* No ground: the lettering is painted straight onto the wall, so a plate
       behind it would read as a poster hung in front of the wall instead. */

    lines.forEach((l, i) => {
      driftText(ctx, l, w * 0.08, h * 0.28 + i * h * 0.19, {
        font: `400 ${Math.round(h * 0.17)}px ${FONT_SERIF}`,
        color: i === lines.length - 1 ? palette.accent : palette.graphite,
        drift: 0.8,
        seed: i + 3,
      });
    });

    line(ctx, w * 0.08, h * 0.82, w * 0.5, h * 0.82, {
      color: palette.graphite,
      width: 1.4,
      alpha: 0.35,
      wobble: 1,
      seed: 11,
    });
    driftParagraph(ctx, note, w * 0.08, h * 0.87, w * 0.55, {
      font: `400 ${Math.round(h * 0.026)}px ${FONT_MONO}`,
      lineHeight: h * 0.04,
      color: palette.graphiteMid,
      seed: 13,
    });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** A single contact line, engraved on its own plate. */
export function contactPlateTexture(label: string, value: string) {
  return cached(`contact:${label}`, () => {
    const w = 780;
    const h = 190;
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = palette.paperLit;
    ctx.fillRect(0, 0, w, h);
    paperGrain(ctx, w, h, { seed: 67, density: 0.05, alpha: 0.05 });
    rect(ctx, 12, 12, w - 24, h - 24, {
      color: palette.graphite,
      width: 1.5,
      alpha: 0.4,
      wobble: 1,
      overshoot: 4,
      seed: 3,
    });
    driftText(ctx, label, 40, 66, {
      font: `500 22px ${FONT_MONO}`,
      color: palette.graphiteFaint,
      tracking: 4,
      drift: 0.4,
      seed: 5,
    });
    driftText(ctx, value, 40, 132, {
      font: `400 50px ${FONT_SERIF}`,
      color: palette.graphite,
      drift: 0.6,
      seed: 7,
    });
    driftText(ctx, '↗', w - 46, 122, {
      font: `400 44px ${FONT_MONO}`,
      color: palette.accent,
      align: 'right',
      drift: 0.4,
      seed: 11,
    });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}

/** Exterior nameplate above the front door. */
export function facadePlateTexture() {
  return cached('facade-plate', () => {
    const w = 1024;
    const h = 320;
    const { canvas, ctx } = makeCanvas(w, h);
    ctx.fillStyle = palette.paperLit;
    ctx.fillRect(0, 0, w, h);
    paperGrain(ctx, w, h, { seed: 71, density: 0.07, alpha: 0.07 });
    rect(ctx, 18, 18, w - 36, h - 36, {
      color: palette.graphite,
      width: 3.4,
      alpha: 0.85,
      wobble: 1.5,
      overshoot: 8,
      passes: 2,
      seed: 3,
    });
    rect(ctx, 30, 30, w - 60, h - 60, {
      color: palette.graphite,
      width: 1.2,
      alpha: 0.3,
      wobble: 1.2,
      overshoot: 4,
      seed: 5,
    });
    driftText(ctx, IDENTITY.name, w / 2, h * 0.52, {
      font: `400 ${Math.round(h * 0.42)}px ${FONT_SERIF}`,
      color: palette.graphite,
      align: 'center',
      tracking: h * 0.05,
      drift: 1,
      seed: 7,
    });
    driftText(ctx, 'CREATIVE DEVELOPER · AI BUILDER · DIGITAL CREATOR', w / 2, h * 0.76, {
      font: `500 ${Math.round(h * 0.072)}px ${FONT_MONO}`,
      color: palette.graphiteMid,
      align: 'center',
      tracking: h * 0.014,
      drift: 0.5,
      seed: 11,
    });
    return toTexture(canvas, { wrap: THREE.ClampToEdgeWrapping });
  });
}
