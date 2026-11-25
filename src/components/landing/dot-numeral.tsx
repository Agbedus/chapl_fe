import type { CSSProperties, Ref } from "react";

/**
 * A number, made of people.
 *
 * The page counts in dots, so its figures are drawn in the same atom: a
 * five-by-seven matrix where each cell is a dot, lit if it belongs to the
 * digit and a faint hollow ring if it does not. The unlit cells are the
 * point. A hollow dot already means somebody who was not there, so a
 * numeral is a small congregation with some of it present.
 *
 * Two halves, so a count can run without React:
 *
 * - `DotNumeral` renders every digit slot the number will ever need, so
 *   the figure never changes width while it counts and the page never
 *   reflows.
 * - `paintNumeral` rewrites which cells are lit, straight on the nodes.
 *   The story's scroll triggers call it dozens of times a second, and
 *   routing that through state would render the tree for numbers React
 *   never displays.
 *
 * This module is deliberately not a client module: the two exports are
 * meant to be called from both sides, and every export of a `"use client"`
 * file becomes a client reference.
 */

const FONT: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  // The letters of the check-in code on the screen at the front.
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  // Punctuation is narrower than a digit, as it is in type: a colon and a
  // full stop are a column, a comma two.
  ":": ["0", "0", "1", "0", "1", "0", "0"],
  ".": ["0", "0", "0", "0", "0", "0", "1"],
  ",": ["00", "00", "00", "00", "00", "01", "10"],
};

/** How many columns a character takes: its own, or a digit's five. */
const widthOf = (ch: string) => (ch === ":" || ch === "." || ch === "," ? FONT[ch][0].length : 5);

/** The rows of `ch` in a slot `width` columns wide; blank if it does not fit. */
function rowsFor(ch: string, width: number): string[] {
  const glyph = FONT[ch];
  return glyph && glyph[0].length === width ? glyph : Array.from({ length: 7 }, () => "0".repeat(width));
}

export function DotNumeral({
  value,
  slots,
  template,
  label,
  cell,
  ref,
  className = "",
}: {
  /** What to show now; shorter than the shape and it is right-aligned. */
  value: string;
  /** How many digits wide to be, always. Defaults to the value's own. */
  slots?: number;
  /** The shape of the figure when it has punctuation: "00:00", "0,000".
      Each `0` is a digit's width and each of `: . ,` its own. */
  template?: string;
  /** What a screen reader hears: the finished figure, not each frame of the count. */
  label?: string;
  /** One cell's diameter, as any CSS length. */
  cell?: string;
  ref?: Ref<HTMLSpanElement>;
  className?: string;
}) {
  const shape = template ?? "0".repeat(slots ?? value.length);
  const text = value.length > shape.length ? value : value.padStart(shape.length, " ");
  const widths = Array.from(value.length > shape.length ? text : shape, widthOf);
  return (
    <span
      ref={ref}
      className={`dm ${className}`}
      role="img"
      aria-label={label ?? value}
      style={cell ? ({ "--dm": cell } as CSSProperties) : undefined}
    >
      {Array.from(text).map((ch, g) => (
        <span key={g} className="dm-g" data-w={widths[g]} style={{ "--w": widths[g] } as CSSProperties} aria-hidden>
          {rowsFor(ch, widths[g]).flatMap((row, r) =>
            Array.from(row).map((bit, c) => (
              <span key={`${r}-${c}`} className="dm-c" data-on={bit === "1" ? "" : undefined} />
            )),
          )}
        </span>
      ))}
    </span>
  );
}

/** Light the cells of `value` in an existing numeral, leaving its shape alone. */
export function paintNumeral(el: HTMLElement, value: string) {
  const slots = el.children.length;
  const text = value.padStart(slots, " ").slice(-slots);
  for (let g = 0; g < slots; g++) {
    const slot = el.children[g] as HTMLElement | undefined;
    if (!slot) continue;
    const w = Number(slot.dataset.w ?? 5);
    const rows = rowsFor(text[g], w);
    const cells = slot.children;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < w; c++) {
        const node = cells[r * w + c];
        const on = rows[r][c] === "1";
        if (on !== node.hasAttribute("data-on")) node.toggleAttribute("data-on", on);
      }
    }
  }
}
