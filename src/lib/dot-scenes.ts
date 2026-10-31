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
 * The stained-glass window the hero used to be a picture of, drawn in
 * the people themselves: a lancet arch with a rose in its head, leaded
 * into panes. The rose's petals take the six hues in turn; the panes
 * below run in coloured columns, the way light falls through glass.
 */
export function windowScene(people: Person[], rect: Rect): Scene {
  const n = people.length;
  const scene = blank(n);
  const width = Math.min(rect.w * 0.8, rect.h * 0.58);
  const height = width * 1.68;
  const left = rect.x + (rect.w - width) / 2;
  const top = rect.y + (rect.h - height) / 2;
  const half = width / 2;
  const cx = left + half;
  // An equilateral pointed arch: its apex stands 0.866 of the span above
  // the springing line, where the arch meets the walls.
  const springY = top + width * 0.866;
  const roseY = springY - width * 0.16;
  const roseR = width * 0.3;

  // Two-centred (pointed) arch: each side is a circle of radius `width`
  // centred on the opposite wall.
  const inside = (x: number, y: number) => {
    if (y > top + height || x < left || x > left + width) return false;
    if (y >= springY) return true;
    const fromLeft = Math.hypot(x - left, y - springY) <= width;
    const fromRight = Math.hypot(x - (left + width), y - springY) <= width;
    return fromLeft && fromRight && y >= top;
  };
  // The lead between panes: mullions down the lights and a transom under the rose.
  const lead = (x: number, y: number, pitch: number) => {
    if (Math.abs(Math.hypot(x - cx, y - roseY) - roseR) < pitch * 0.5) return true;
    if (y > roseY + roseR + pitch && Math.abs(x - cx) < pitch * 0.5) return true;
    if (y > roseY + roseR + pitch && Math.abs(Math.abs(x - cx) - half * 0.5) < pitch * 0.45) return true;
    return Math.abs(y - (springY + width * 0.48)) < pitch * 0.45;
  };

  // Shrink the pitch until the window holds everyone, then keep an even
  // spread of exactly `n` of the places.
  let pitch = Math.sqrt((width * height) / n);
  let places: [number, number][] = [];
  for (let attempt = 0; attempt < 40; attempt++) {
    places = [];
    for (let y = top + pitch / 2; y < top + height; y += pitch) {
      // Every other row nudged half a pitch: glass, not graph paper.
      const offset = Math.round((y - top) / pitch) % 2 ? pitch / 2 : 0;
      for (let x = left + pitch / 2 + offset; x < left + width; x += pitch) {
        if (inside(x, y) && !lead(x, y, pitch)) places.push([x, y]);
      }
    }
    if (places.length >= n) break;
    pitch *= 0.97;
  }
  const stride = places.length / n;
  const order = shuffled(n, 0x77696e64);
  for (let k = 0; k < n; k++) {
    const i = order[k];
    const [x, y] = places[Math.floor(k * stride)];
    scene.x[i] = x;
    scene.y[i] = y;
    scene.z[i] = 0;
    const dx = x - cx;
    const dy = y - roseY;
    if (Math.hypot(dx, dy) < roseR) {
      // Twelve petals, two of each hue, turning about the centre.
      const petal = Math.floor(((Math.atan2(dy, dx) + Math.PI) / (Math.PI * 2)) * 12);
      scene.hue[i] = Math.hypot(dx, dy) < roseR * 0.28 ? 4 : petal % 6;
    } else {
      // Columns of colour in the lights, deepening toward the sill.
      const column = Math.floor(((x - left) / width) * 4);
      const band = Math.floor(((y - top) / height) * 3);
      scene.hue[i] = [0, 2, 1, 5, 3, 0, 4, 2, 5, 1, 0, 3][(column * 3 + band) % 12];
    }
  }
  return scene;
}

/** One body: everyone in one disc, mixed, the way a congregation sits. */
export function churchScene(people: Person[], rect: Rect): Scene {
  const n = people.length;
  const scene = blank(n);
  const r = Math.min(rect.w, rect.h) * 0.42;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const order = shuffled(n, 0x63687572);
  order.forEach((i, k) => {
    const [dx, dy] = sunflower(k, n, r);
    scene.x[i] = cx + dx;
    scene.y[i] = cy + dy;
    scene.z[i] = (people[i].seed - 0.5) * 60;
    scene.hue[i] = people[i].branch % 6;
  });
  return scene;
}

/** Six discs, one per branch, sized by their roll. */
export function branchesScene(people: Person[], branches: Branch[], rect: Rect): Scene {
  const scene = blank(people.length);
  const columns = rect.w > rect.h * 1.1 ? 3 : 2;
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
 * Every cell as its own small block inside its branch, the same drawing
 * the product's congregation field makes: hollow if they missed Sunday.
 */
export function cellsScene(people: Person[], branches: Branch[], rect: Rect): Scene {
  const scene = blank(people.length);
  const columns = rect.w > rect.h * 1.1 ? 3 : 2;
  const rows = Math.ceil(branches.length / columns);
  const colW = rect.w / columns;
  const rowH = rect.h / rows;
  const pitch = Math.max(5, Math.min(9, colW / 26));
  const gap = pitch * 1.6;
  // Where each cell's block starts, flowed into its branch's tile.
  const origins = branches.map((branch, b) => {
    const tileX = rect.x + colW * (b % columns) + colW * 0.08;
    const tileY = rect.y + rowH * Math.floor(b / columns) + rowH * 0.1;
    const maxW = colW * 0.84;
    let x = 0;
    let y = 0;
    let lineH = 0;
    return branch.cells.map((cell) => {
      const w = 4 * pitch;
      const h = Math.ceil(cell.members / 4) * pitch;
      if (x + w > maxW) {
        x = 0;
        y += lineH + gap;
        lineH = 0;
      }
      const at = { x: tileX + x, y: tileY + y };
      x += w + gap;
      lineH = Math.max(lineH, h);
      return at;
    });
  });
  people.forEach((person) => {
    const at = origins[person.branch][person.cell];
    scene.x[person.index] = at.x + (person.seat % 4) * pitch;
    scene.y[person.index] = at.y + Math.floor(person.seat / 4) * pitch;
    scene.z[person.index] = 0;
    scene.hue[person.index] = person.branch % 6;
    scene.fill[person.index] = person.present ? 1 : 0;
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
  const pitch = Math.max(5, Math.min(11, (rect.w * 0.9) / longest));
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
    scene.alpha[person.index] = 0.12;
  });
  return scene;
}

/**
 * And every name: the church dims back into its cells, and one person
 * who has not been seen in three weeks is lit, large, in the care hue.
 */
export function nameScene(people: Person[], branches: Branch[], rect: Rect, focus: number): Scene {
  const scene = cellsScene(people, branches, rect);
  for (let i = 0; i < people.length; i++) {
    scene.alpha[i] = 0.16;
    scene.z[i] = -40;
  }
  scene.alpha[focus] = 1;
  scene.size[focus] = 3.4;
  scene.fill[focus] = 1;
  scene.hue[focus] = 5; // ruby: care
  scene.z[focus] = 60;
  return scene;
}

/** Someone absent, in a branch near the middle of the drawing. */
export function focusPerson(people: Person[]): number {
  const missing = people.filter((p) => !p.present && p.branch === 1);
  return (missing[Math.floor(missing.length / 2)] ?? people[0]).index;
}
