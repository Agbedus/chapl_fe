/**
 * The room seen from the back of the hall: rows of seats arcing round the
 * front, split by two aisles, one seat a person. The same layout as the
 * phone's `TheatreLayout`, so the room looks the same on both.
 *
 * Every coordinate is rounded to a tenth: this runs on the server and in
 * the browser, the two can disagree on a sine's last digit, and React
 * fails hydration on it.
 */

/** A dot's radius and the distance between two, shared with the cell grids. */
export const DOT_R = 3;
export const PITCH = 9.5;

export type Hall = {
  /** Each seat's centre. */
  seats: { x: number; y: number }[];
  /** For each seat, its place in the order the room fills (0 first). */
  rank: number[];
  width: number;
  height: number;
  /** Room above the front row, where the front is drawn. */
  stage: number;
};

const round = (n: number) => Math.round(n * 10) / 10;

function jitter(i: number): number {
  const h = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return h - Math.floor(h);
}

export function theatre(count: number, width: number): Hall {
  const rowGap = PITCH * 1.12;
  const cx = width / 2;
  const radius0 = width * 0.62;
  const half = width / 2 - PITCH / 2;
  const aisles = [cx - width / 6, cx + width / 6];
  const places: { x: number; y: number; row: number }[] = [];
  for (let row = 0; places.length < count && row < 400; row++) {
    const r = radius0 + row * rowGap;
    const perSide = Math.floor((r * 1.2) / PITCH);
    for (let k = -perSide; k <= perSide && places.length < count; k++) {
      const angle = (k * PITCH) / r;
      const x = cx + Math.sin(angle) * r;
      if (Math.abs(x - cx) > half) continue;
      if (aisles.some((a) => Math.abs(x - a) < PITCH * 0.7)) continue;
      places.push({ x, y: Math.cos(angle) * r - radius0, row });
    }
  }
  if (places.length === 0) return { seats: [], rank: [], width, height: 0, stage: 0 };
  const top = Math.min(...places.map((p) => p.y));
  const bottom = Math.max(...places.map((p) => p.y));
  const stage = PITCH * 1.4;
  const seats = places.map((p) => ({ x: round(p.x), y: round(p.y - top + stage + PITCH / 2) }));
  // The front first, a few rows' worth of shuffle, so it fills unevenly.
  const weight = places.map((p, i) => p.row + jitter(i) * 3.2 + (Math.abs(p.x - cx) / width) * 2);
  const order = seats.map((_, i) => i).sort((a, b) => weight[a] - weight[b]);
  const rank = new Array<number>(seats.length);
  order.forEach((seat, k) => (rank[seat] = k));
  return { seats, rank, width, height: round(bottom - top + stage + PITCH), stage };
}
