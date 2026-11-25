import type { CSSProperties } from "react";

/**
 * Small pictures drawn in the page's own dots, for the menu's preview.
 *
 * Each is a few lines of text: `#` a dot, `o` a hollow one (somebody who was
 * not there), `@` the one ringed person, `.` nothing. Kept as text so a new
 * picture is a drawing, not a component.
 */

function ring(cols: number, rows: number, radius: number): string[] {
  const cx = (cols - 1) / 2;
  const cy = (rows - 1) / 2;
  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      if (x === Math.round(cx) && y === Math.round(cy)) return "@";
      const d = Math.hypot((x - cx) * 0.9, y - cy);
      return Math.abs(d - radius) < 0.62 ? "#" : ".";
    }).join(""),
  );
}

function wave(heights: number[], rows: number): string[] {
  return Array.from({ length: rows }, (_, y) =>
    heights.map((h) => (y >= rows - h ? "#" : ".")).join(""),
  );
}

export const ART = {
  one: { hue: "var(--cobalt)", rows: ring(15, 9, 3.9) },
  week: {
    hue: "var(--gold)",
    rows: ["############", "######o#####", "####o#######", "#######o####", "###########o"],
  },
  media: { hue: "var(--violet)", rows: wave([2, 3, 5, 4, 6, 3, 5, 7, 4, 6, 3, 5, 2, 4], 8) },
  members: {
    hue: "var(--teal)",
    rows: ["#######", "#.....#", "#.###.#", "#.....#", "#.###.#", "#.....#", "#.###.#", "#.....#", "#######"],
  },
  questions: {
    hue: "var(--ink-2)",
    rows: [".#####.", "#.....#", "......#", "....##.", "...#...", "...#...", ".......", "...#..."],
  },
  // Try Sunday: a room, and you in it.
  try: { hue: "var(--emerald)", rows: ["#.#.#.#.#", ".........", "#.#.#.#.#", ".........", "#.#.@.#.#", ".........", "#.#.#.#.#"] },
  // The week's tiles and the members' doors. These take the colour of
  // whatever holds them (`currentColor`), so a door can tint its own.
  heart: { hue: "currentColor", rows: [".##.##.", "#######", "#######", ".#####.", "..###..", "...#..."] },
  calendar: { hue: "currentColor", rows: ["#######", "#.....#", "#.#.#.#", "#.....#", "#.#.@.#", "#.....#", "#######"] },
  broadcast: { hue: "currentColor", rows: ["..#.#..", ".#...#.", "#..@..#", ".#...#.", "..#.#.."] },
  checkin: { hue: "currentColor", rows: ["#.#.#", ".....", "#.@.#", ".....", "#.#.#"] },
  hand: { hue: "currentColor", rows: ["#####", ".....", "###..", ".....", "#...."] },
  play: { hue: "currentColor", rows: ["#....", "###..", "#####", "###..", "#...."] },
  coins: { hue: "currentColor", rows: ["....#", "..#.#", "..#.#", "#.#.#", "#.#.#"] },
  pray: { hue: "currentColor", rows: [".#.#.", "#####", "#####", ".###.", "..#.."] },
  pin: { hue: "currentColor", rows: [".###.", "##@##", ".###.", "..#..", "..#.."] },
} as const;

export type ArtName = keyof typeof ART;

export function DotArt({
  art,
  cell = "7px",
  gap,
  still,
}: {
  art: ArtName;
  cell?: string;
  /** Space between dots; defaults to the stylesheet's. */
  gap?: string;
  /** Draw it in place, without the diagonal arrival. */
  still?: boolean;
}) {
  const { rows, hue } = ART[art];
  const cols = rows[0].length;
  const style: Record<string, string> = { "--da": cell, gridTemplateColumns: `repeat(${cols}, var(--da))` };
  if (hue !== "currentColor") style.color = hue;
  if (gap) style.gap = gap;
  return (
    <div className={still ? "da da-still" : "da"} style={style as CSSProperties} aria-hidden>
      {rows.flatMap((row, y) =>
        Array.from(row).map((ch, x) => (
          <span
            key={`${y}-${x}`}
            className={ch === "#" ? "da-d" : ch === "o" ? "da-d da-o" : ch === "@" ? "da-d da-me" : "da-n"}
            style={still ? undefined : { animationDelay: `${(x + y) * 18}ms` }}
          />
        )),
      )}
    </div>
  );
}
