/**
 * Where every dot sits in each scene of the landing page's story.
 *
 * One dot is one member of the sample congregation (`congregation.ts`),
 * and the same dot is the same person in every scene: the window they
 * are part of, the church as one body, their branch, their cell, their
 * seat on Sunday, their hand in the air. Scenes are pure functions of
 * the congregation and the stage rectangle, so the server and the
 * browser agree and a resize simply asks again.
 *
 * Positions are in CSS pixels with the origin at the top left of the
 * viewport; `dot-stage.tsx` moves them into the camera's space.
 */

import type { Branch } from "@/lib/congregation";

/** The hues, by name, so a scene can say "cobalt" and the stage can
    resolve it against whichever theme is showing. */
export const HUES = ["cobalt", "violet", "teal", "emerald", "gold", "ruby"] as const;
export type Hue = (typeof HUES)[number];

export type Person = {
  index: number;
  branch: number;
  cell: number;
  /** Their place inside the cell, 0-based. */
  seat: number;
  present: boolean;
  /** 0..1, fixed per person: when they arrive, how late they move. */
  seed: number;
};

export type Rect = { x: number; y: number; w: number; h: number };

/** One scene: a target for every person. */
export type Scene = {
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  hue: Uint8Array;
  /** 1 solid, 0 a hollow ring: here, or not here. */
  fill: Float32Array;
  alpha: Float32Array;
  size: Float32Array;
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function peopleOf(branches: Branch[]): Person[] {
  const random = mulberry32(0x646f7473);
  const people: Person[] = [];
  branches.forEach((branch, b) =>
    branch.cells.forEach((cell, c) => {
      for (let s = 0; s < cell.members; s++) {
        people.push({ index: people.length, branch: b, cell: c, seat: s, present: s < cell.present, seed: random() });
      }
    }),
  );
  return people;
}

function blank(n: number): Scene {
  return {
    x: new Float32Array(n),
    y: new Float32Array(n),
    z: new Float32Array(n),
    hue: new Uint8Array(n),
    fill: new Float32Array(n).fill(1),
    alpha: new Float32Array(n).fill(1),
    size: new Float32Array(n).fill(1),
  };
}

/** A seeded shuffle, so "mixed" is the same mix every time. */
function shuffled(n: number, seed: number): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  const random = mulberry32(seed);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/**
 * A sunflower of `n` points filling radius `r`: the densest even packing
 * of a disc there is, and it reads as grown rather than drawn.
 */
function sunflower(i: number, n: number, r: number): [number, number] {
  const golden = Math.PI * (3 - Math.sqrt(5));
  const rad = r * Math.sqrt((i + 0.5) / n);
  return [Math.cos(i * golden) * rad, Math.sin(i * golden) * rad];
}

/**
 * The door: the app's mark drawn at the size of a person's attention. A
 * round arch of dots with the cross cut out of it, and one ringed dot
 * where the arms meet: somebody. Traced from the phone app's
 * `CrossShape` (the film's last frame), on the same grid: 21 columns
 * either side of a centre column, 27 rows, a 3-wide stem, 4-row arms
 * reaching six columns out, and the keystone left open.
 *
 * Here it holds the whole congregation, so the grid is sampled finer
 * than the phone's until there is a place for everyone; the cross stays
 * the same proportion because the mask is in grid units, not dots.
 *
 * The lights the cross divides take the jewel hues as panes do, with a
 * few dots borrowing their neighbour's colour, the way old glass is
 * never quite one thing.
 */
const HALF = 10;
const ROWS = 27;
const ANCHOR_ROW = (8 + 11) / 2;
// The phone's arch is a table of half-widths ([3, 5, 6, 7, 8, 9, 9] for
// its top rows), which is this circle stepped to whole dots. Sampled finer,
// the steps showed as corners; the circle itself is round at any density.
const SPRING = 10;
const RADIUS = 10.3;

function doorHas(col: number, row: number): boolean {
  const c = Math.abs(col);
  if (row < -0.5 || row > ROWS - 0.5 || c > HALF + 0.3) return false;
  if (row < SPRING && c * c + (row - SPRING) ** 2 > RADIUS * RADIUS) return false;
  if (row < 0.6 && c < 0.6) return false; // the keystone
  if (c <= 1.5 && row >= 3.5 && row <= 21.5) return false; // the stem
  if (c <= 6.5 && row >= 7.5 && row <= 11.5) return false; // the arms
  return true;
}

export function doorScene(people: Person[], rect: Rect, you: number): Scene {
  const n = people.length;
  const scene = blank(n);
  // Grid units to pixels: the door is 20 units wide and 26 tall.
  const unit = Math.min((rect.w * 0.92) / 20, (rect.h * 0.94) / 26);
  const cx = rect.x + rect.w / 2;
  const top = rect.y + (rect.h - unit * 26) / 2;

  // Sample the mask finer until it has a place for everyone but one: the
  // one is the ringed dot at the crossing.
  let step = 1;
  let places: [number, number][] = [];
  for (let attempt = 0; attempt < 60; attempt++) {
    places = [];
    const columns = Math.floor((2 * HALF) / step) + 1;
    const rows = Math.floor((ROWS - 1) / step) + 1;
    const left = -((columns - 1) * step) / 2;
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < columns; i++) {
        const col = left + i * step;
        const row = j * step;
        if (doorHas(col, row)) places.push([col, row]);
      }
    }
    if (places.length >= n - 1) break;
    step *= 0.97;
  }
  const random = mulberry32(0x646f6f72);
  const others = people.filter((p) => p.index !== you);
  const stride = places.length / others.length;
  const order = shuffled(others.length, 0x77696e64);
  order.forEach((k, slot) => {
    const i = others[k].index;
    const [col, row] = places[Math.floor(slot * stride)];
    scene.x[i] = cx + col * unit;
    scene.y[i] = top + row * unit;
    scene.z[i] = 0;
    // The lights: the cross makes four, and the sill runs beneath.
    const pane = row > 21.5 ? 4 : row <= 11.5 ? (col < 0 ? 1 : 5) : col < 0 ? 0 : 2;
    scene.hue[i] = random() < 0.05 ? Math.floor(random() * 6) : pane;
  });
  scene.x[you] = cx;
  scene.y[you] = top + ANCHOR_ROW * unit;
  scene.z[you] = 20;
  scene.hue[you] = 0;
  scene.size[you] = 2.6;
  return scene;
}

/** Everyone else, waiting unseen inside a point: they arrive from there. */
function hideAt(scene: Scene, people: Person[], keep: (p: Person) => boolean, x: number, y: number) {
  for (const p of people) {
    if (keep(p)) continue;
    scene.x[p.index] = x;
    scene.y[p.index] = y;
    scene.z[p.index] = 0;
    scene.alpha[p.index] = 0;
    scene.size[p.index] = 0.4;
  }
}

/** It starts with one: a single person, large, ringed, alone. */
export function oneScene(people: Person[], rect: Rect, you: number): Scene {
  const scene = blank(people.length);
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  hideAt(scene, people, (p) => p.index === you, cx, cy);
  scene.x[you] = cx;
  scene.y[you] = cy;
  scene.hue[you] = 0;
  scene.size[you] = 5;
  return scene;
}

/** Then their cell: the dozen people they sit with, drawn large. */
export function cellScene(people: Person[], rect: Rect, you: number): Scene {
  const scene = blank(people.length);
  const me = people[you];
  const mine = people.filter((p) => p.branch === me.branch && p.cell === me.cell);
  const pitch = Math.min(46, rect.w / 7);
  const rows = Math.ceil(mine.length / 4);
  const left = rect.x + rect.w / 2 - 1.5 * pitch;
  const top = rect.y + rect.h / 2 - ((rows - 1) * pitch) / 2;
  hideAt(scene, people, (p) => mine.includes(p), rect.x + rect.w / 2, rect.y + rect.h / 2);
  for (const p of mine) {
    scene.x[p.index] = left + (p.seat % 4) * pitch;
    scene.y[p.index] = top + Math.floor(p.seat / 4) * pitch;
    scene.hue[p.index] = 2; // teal: cells
    scene.fill[p.index] = p.present ? 1 : 0;
    scene.size[p.index] = 3.2;
  }
  scene.hue[you] = 0;
  scene.fill[you] = 1;
  scene.size[you] = 3.6;
  return scene;
}

/** Then a branch: their cell among its neighbours, the branch's whole roll. */
export function branchScene(people: Person[], branches: Branch[], rect: Rect, you: number): Scene {
  const scene = blank(people.length);
  const b = people[you].branch;
  const branch = branches[b];
  // Five cells to a line on a wide stage, four on a phone, as large as
  // the stage allows: a branch should read as rooms of people, not specks.
  const perLine = rect.w > 600 ? 5 : 4;
  const fit = Math.min(
    (rect.w * 0.94) / (perLine * 5.4),
    (rect.h * 0.9) / (Math.ceil(branch.cells.length / perLine) * 5.6),
  );
  const pitch = Math.max(7, Math.min(22, fit));
  const gap = pitch * 1.4;
  const lines = Math.ceil(branch.cells.length / perLine);
  const tallest = Math.max(...branch.cells.map((c) => Math.ceil(c.members / 4)));
  const blockH = tallest * pitch + gap;
  const width = perLine * (4 * pitch + gap) - gap;
  const left = rect.x + (rect.w - width) / 2;
  const top = rect.y + (rect.h - lines * blockH) / 2;
  hideAt(scene, people, (p) => p.branch === b, rect.x + rect.w / 2, rect.y + rect.h / 2);
  for (const p of people) {
    if (p.branch !== b) continue;
    const x0 = left + (p.cell % perLine) * (4 * pitch + gap);
    const y0 = top + Math.floor(p.cell / perLine) * blockH;
    scene.x[p.index] = x0 + (p.seat % 4) * pitch;
    scene.y[p.index] = y0 + Math.floor(p.seat / 4) * pitch;
    scene.hue[p.index] = b % 6;
    scene.fill[p.index] = p.present ? 1 : 0;
    scene.size[p.index] = 1.4;
  }
  scene.hue[you] = 0;
  scene.fill[you] = 1;
  scene.size[you] = 2.2;
  return scene;
}

/** Someone who came on Sunday, in the second branch: the story's "you". */
export function youOf(people: Person[]): number {
  const candidates = people.filter((p) => p.present && p.branch === 1);
  return (candidates[Math.floor(candidates.length / 3)] ?? people[0]).index;
}

/** Six discs, one per branch, sized by their roll. */
export function branchesScene(people: Person[], branches: Branch[], rect: Rect): Scene {
  const scene = blank(people.length);
  const columns = rect.w > rect.h * 0.95 ? 3 : 2;
  const rows = Math.ceil(branches.length / columns);
  const cellW = rect.w / columns;
  const cellH = rect.h / rows;
  const biggest = Math.max(...branches.map((b) => b.members));
  const placed = branches.map(() => 0);
  people.forEach((person) => {
    const b = person.branch;
    const branch = branches[b];
    const r = Math.min(cellW, cellH) * 0.4 * Math.sqrt(branch.members / biggest);
    const cx = rect.x + cellW * ((b % columns) + 0.5);
    const cy = rect.y + cellH * (Math.floor(b / columns) + 0.5);
    const [dx, dy] = sunflower(placed[b]++, branch.members, r);
    scene.x[person.index] = cx + dx;
    scene.y[person.index] = cy + dy;
    scene.z[person.index] = (person.seed - 0.5) * 30;
    scene.hue[person.index] = b % 6;
  });
  return scene;
}

/**
 * Sunday: the hall, seen from above, rows arcing round the front. Every
 * seat is drawn empty here; `fillRoom` decides who has arrived.
 */
export function roomScene(people: Person[], rect: Rect): Scene {
  const n = people.length;
  const scene = blank(n);
  const cx = rect.x + rect.w / 2;
  const front = rect.y + rect.h * 0.16;
  const span = Math.PI * 0.62; // the fan of the seating
  const pitch = Math.max(6, Math.min(16, Math.sqrt((rect.w * rect.h * 0.3) / n)));
  const seats: [number, number][] = [];
  for (let row = 0; seats.length < n && row < 200; row++) {
    const radius = rect.h * 0.18 + row * pitch * 1.25;
    const count = Math.floor((radius * span) / pitch);
    for (let s = 0; s < count && seats.length < n; s++) {
      // A centre aisle: skip the seat nearest the middle.
      if (Math.abs(s - (count - 1) / 2) < 0.75) continue;
      const angle = -span / 2 + (span * (s + 0.5)) / count;
      seats.push([cx + Math.sin(angle) * radius, front + Math.cos(angle) * radius - rect.h * 0.18]);
    }
  }
  // Centre the hall in its space, whatever shape the fan came out.
  const ys = seats.map((s) => s[1]);
  const shift = rect.y + rect.h / 2 - (Math.min(...ys) + Math.max(...ys)) / 2;
  const order = shuffled(n, 0x726f6f6d);
  order.forEach((i, k) => {
    scene.x[i] = seats[k][0];
    scene.y[i] = seats[k][1] + shift;
    scene.z[i] = 0;
    scene.hue[i] = 4; // gold: attendance
    scene.fill[i] = 0;
  });
  return scene;
}

/** How full the room is at `t` (0..1) of the chapter: who is in a seat. */
export function roomFill(person: Person, t: number): number {
  if (!person.present) return 0;
  // Arrivals spread across the first 85% of the chapter; each one takes
  // a moment to sit, rather than blinking on.
  const arrive = person.seed * 0.85;
  return Math.min(1, Math.max(0, (t - arrive) / 0.08));
}

export const POLL = [
  { label: "We are one body", share: 0.47 },
  { label: "Every gift matters", share: 0.33 },
  { label: "Still thinking about it", share: 0.2 },
] as const;

/**
 * Ask the room: everyone who came raises a hand, and the hands gather
 * into one row per answer. Nobody's name comes with their hand; the
 * people who stayed home stay faint at the back.
 */
export function pollScene(people: Person[], rect: Rect): Scene {
  const scene = blank(people.length);
  const here = people.filter((p) => p.present);
  const counts = POLL.map((o) => Math.round(o.share * here.length));
  counts[0] += here.length - counts.reduce((a, b) => a + b, 0);
  // A bar per answer, a fixed number of hands deep, so its length is its
  // share: the longest fills the width and the others are measured by it.
  const depth = 7;
  const longest = Math.ceil(Math.max(...counts) / depth);
  const pitch = Math.max(5, Math.min(14, (rect.w * 0.9) / longest));
  const left = rect.x + rect.w * 0.05;
  const bandH = rect.h / POLL.length;
  let next = 0;
  POLL.forEach((_, answer) => {
    const top = rect.y + bandH * answer + (bandH - depth * pitch) / 2;
    for (let k = 0; k < counts[answer]; k++, next++) {
      const person = here[next];
      // Filled column by column, left to right, as the hands go up.
      scene.x[person.index] = left + Math.floor(k / depth) * pitch;
      scene.y[person.index] = top + (k % depth) * pitch;
      scene.z[person.index] = 0;
      scene.hue[person.index] = 0; // cobalt: people
    }
  });
  const away = people.filter((p) => !p.present);
  away.forEach((person, k) => {
    const [dx, dy] = sunflower(k, away.length, Math.min(rect.w, rect.h) * 0.5);
    scene.x[person.index] = rect.x + rect.w / 2 + dx;
    scene.y[person.index] = rect.y + rect.h / 2 + dy;
    scene.z[person.index] = -160;
    scene.hue[person.index] = person.branch % 6;
    scene.fill[person.index] = 0;
    // Faint, not gone: on white a ring at a tenth vanishes entirely.
    scene.alpha[person.index] = 0.34;
  });
  return scene;
}
