/**
 * The room, one seat a person, in one of two drawings: a fan of rows
 * round the front split into four by three aisles, with the count where
 * the pulpit would be; or straight rows in four blocks, the count above
 * the front. The same layout as the phone's `SeatingLayout`, so the room
 * looks the same on both.
 *
 * Units are one seat's width. Everything that reaches the page is rounded
 * to a hundredth: this runs on the server and in the browser, the two can
 * disagree on a sine's last digit, and React fails hydration on it.
 */

export type SeatingStyle = "fan" | "rows";

export type Box = { left: number; top: number; width: number; height: number };

export type Seating = {
  seats: { x: number; y: number }[];
  /** For each seat, its place in the order the room lights up (0 first). */
  rank: number[];
  bounds: Box;
  /** Where the count is written. */
  label: Box;
};

const ROW_GAP = 1.25;
const AISLE = 0.8;
const round = (n: number) => Math.round(n * 100) / 100;

function jitter(i: number): number {
  const h = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return h - Math.floor(h);
}

function fan(n: number) {
  const span = Math.PI * 0.62;
  const half = span / 2;
  const aisles = [-span / 4, 0, span / 4];
  const build = (r0: number) => {
    const placed: { x: number; y: number; a: number }[] = [];
    for (let row = 0; placed.length < n && row < 400; row++) {
      const r = r0 + row * ROW_GAP;
      const m = Math.floor(r * span);
      let rowSeats: { x: number; y: number; a: number }[] = [];
      for (let j = 0; j < m; j++) {
        const a = -half + (span * (j + 0.5)) / m;
        if (aisles.some((b) => Math.abs(r * Math.sin(a - b)) < AISLE)) continue;
        rowSeats.push({ x: Math.sin(a) * r, y: Math.cos(a) * r, a });
      }
      const left = n - placed.length;
      if (rowSeats.length > left) {
        // The last row fills from the middle out.
        rowSeats = rowSeats.sort((p, q) => Math.abs(p.a) - Math.abs(q.a)).slice(0, left);
      }
      placed.push(...rowSeats);
    }
    return placed;
  };
  // The front is a quarter of the way back, so the count has room to sit
  // in the curve however big the room.
  let r0 = 5;
  let points = build(r0);
  for (let i = 0; i < 4 && points.length > 0; i++) {
    const out = Math.max(...points.map((p) => Math.hypot(p.x, p.y)));
    if (r0 >= out * 0.25) break;
    r0 = out * 0.25;
    points = build(r0);
  }
  const out = points.length ? Math.max(...points.map((p) => Math.hypot(p.x, p.y))) : r0;
  const width = 2 * out * Math.sin(half) + 1;
  const label = { left: -r0 * 0.6, top: r0 * 0.32 - r0 * 0.375, width: r0 * 1.2, height: r0 * 0.75 };
  const top = Math.min(-0.5, label.top);
  return {
    points: points.map(({ x, y }) => ({ x, y })),
    bounds: { left: -width / 2, top, width, height: out + 0.6 - top },
    label,
  };
}

function rows(n: number) {
  const columns = Math.max(8, Math.round(Math.sqrt(n * 2.2) / 4) * 4);
  const perBlock = columns / 4;
  const head = 8.5;
  const points: { x: number; y: number }[] = [];
  const count = Math.ceil(n / columns);
  for (let row = 0; row < count; row++) {
    const inRow = Math.min(columns, n - points.length);
    // A short last row sits in the middle blocks.
    const skip = Math.floor((columns - inRow) / 2);
    for (let c = skip; c < skip + inRow; c++) {
      points.push({ x: c + Math.floor(c / perBlock) * AISLE * 2 + 0.5, y: head + row * ROW_GAP });
    }
  }
  const width = columns + 3 * AISLE * 2;
  return {
    points,
    bounds: { left: 0, top: 0, width, height: head + count * ROW_GAP },
    label: { left: width / 2 - 6, top: 0, width: 12, height: head - 2.5 },
  };
}

export function seating(style: SeatingStyle, count: number): Seating {
  const { points, bounds, label } = style === "fan" ? fan(Math.max(0, count)) : rows(Math.max(0, count));
  const order = points.map((_, i) => i).sort((a, b) => jitter(a) - jitter(b));
  const rank = new Array<number>(points.length);
  order.forEach((seat, k) => (rank[seat] = k));
  const r = (b: Box): Box => ({ left: round(b.left), top: round(b.top), width: round(b.width), height: round(b.height) });
  return {
    seats: points.map((p) => ({ x: round(p.x), y: round(p.y) })),
    rank,
    bounds: r(bounds),
    label: r(label),
  };
}

/** The cell grids' dot: a radius and the distance between two, in pixels. */
export const DOT_R = 3;
export const PITCH = 9.5;
