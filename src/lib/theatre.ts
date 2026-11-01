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

function fan(n: number, wholeRows: boolean, skipFront: number) {
  const span = Math.PI * 0.62;
  const half = span / 2;
  // Three aisles, straight lines out from the front: the middle and
  // halfway to each side.
  const aisles = [-span / 4, 0, span / 4];
  // Each block's edges at radius r, as angles. The outer edges are lines
  // out from the front; an aisle's sides are lines parallel to it, AISLE
  // either side, so every aisle is the same width all the way back. Seats
  // run edge to edge in every row, so the edges come out straight.
  const blocks = (r: number) => {
    const side = Math.asin(Math.min(1, AISLE / r));
    const edges = [-half, ...aisles.flatMap((b) => [b - side, b + side]), half];
    const out: [number, number][] = [];
    for (let i = 0; i < edges.length; i += 2)
      out.push([edges[i], edges[i + 1]]);
    return out;
  };
  const build = (r0: number) => {
    const placed: { x: number; y: number; a: number }[] = [];
    for (let row = skipFront; placed.length < n && row < 400; row++) {
      const r = r0 + row * ROW_GAP;
      let rowSeats: { x: number; y: number; a: number }[] = [];
      for (const [lo, hi] of blocks(r)) {
        if (hi <= lo) continue;
        const k = Math.floor(r * (hi - lo)) + 1;
        for (let j = 0; j < k; j++) {
          const a = k === 1 ? (lo + hi) / 2 : lo + ((hi - lo) * j) / (k - 1);
          rowSeats.push({ x: Math.sin(a) * r, y: Math.cos(a) * r, a });
        }
      }
      const left = n - placed.length;
      if (!wholeRows && rowSeats.length > left) {
        // The last row fills from the middle out.
        rowSeats = rowSeats
          .sort((p, q) => Math.abs(p.a) - Math.abs(q.a))
          .slice(0, left);
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
  const out = points.length
    ? Math.max(...points.map((p) => Math.hypot(p.x, p.y)))
    : r0;
  const width = 2 * out * Math.sin(half) + 1;
  // Rows left out at the front give the count that much more room.
  const inner = r0 + skipFront * ROW_GAP;
  const label = {
    left: -inner * 0.6,
    top: inner * 0.32 - inner * 0.375,
    width: inner * 1.2,
    height: inner * 0.75,
  };
  const top = Math.min(-0.5, label.top);
  return {
    points: points.map(({ x, y }) => ({ x, y })),
    bounds: { left: -width / 2, top, width, height: out + 0.6 - top },
    label,
  };
}

function rows(n: number, wholeRows: boolean) {
  const columns = Math.max(8, Math.round(Math.sqrt(n * 2.2) / 4) * 4);
  const perBlock = columns / 4;
  const head = 8.5;
  const points: { x: number; y: number }[] = [];
  const count = Math.ceil(n / columns);
  for (let row = 0; row < count; row++) {
    const inRow = wholeRows ? columns : Math.min(columns, n - points.length);
    // A short last row sits in the middle blocks.
    const skip = Math.floor((columns - inRow) / 2);
    for (let c = skip; c < skip + inRow; c++) {
      points.push({
        x: c + Math.floor(c / perBlock) * AISLE * 2 + 0.5,
        y: head + row * ROW_GAP,
      });
    }
  }
  const width = columns + 3 * AISLE * 2;
  return {
    points,
    bounds: { left: 0, top: 0, width, height: head + count * ROW_GAP },
    label: { left: width / 2 - 6, top: 0, width: 12, height: head - 2.5 },
  };
}

/**
 * Lays out `count` seats. With `wholeRows` the last row is filled out to
 * its end, so every row is complete and the hall has a few more seats
 * than asked for; `skipFront` leaves the fan's first rows empty, opening
 * its point up for a bigger count.
 */
export function seating(
  style: SeatingStyle,
  count: number,
  {
    wholeRows = false,
    skipFront = 0,
  }: { wholeRows?: boolean; skipFront?: number } = {},
): Seating {
  const n = Math.max(0, count);
  const { points, bounds, label } =
    style === "fan" ? fan(n, wholeRows, skipFront) : rows(n, wholeRows);
  const order = points.map((_, i) => i).sort((a, b) => jitter(a) - jitter(b));
  const rank = new Array<number>(points.length);
  order.forEach((seat, k) => (rank[seat] = k));
  const r = (b: Box): Box => ({
    left: round(b.left),
    top: round(b.top),
    width: round(b.width),
    height: round(b.height),
  });
  return {
    seats: points.map((p) => ({ x: round(p.x), y: round(p.y) })),
    rank,
    bounds: r(bounds),
    label: r(label),
  };
}

/** The halls drawn, smallest first: a room has the first that holds everyone, or the last. */
export const HALLS = [120, 300];
export const hallFor = (people: number) =>
  HALLS.find((h) => people <= h) ?? HALLS[HALLS.length - 1];

/** The cell grids' dot: a radius and the distance between two, in pixels. */
export const DOT_R = 3;
export const PITCH = 9.5;
