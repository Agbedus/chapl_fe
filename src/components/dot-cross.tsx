/**
 * A cross, drawn in the unit everything else here is drawn in.
 *
 * The temptation on a church product is to reach for a glyph from an
 * icon set, which arrives in someone else's drawing style and sits on
 * the page like a sticker. This is built from `.dot` — the same atom as
 * the congregation field, the structure diagram and the logo — so it
 * belongs to the page rather than being applied to it.
 *
 * It is decoration and carries no information, so it is `aria-hidden`
 * throughout: a screen reader announcing "cross" between two sections
 * would be reading the wallpaper aloud.
 */

/**
 * Rows of the cross, as a mask over a 5-wide grid.
 *
 * Two above the bar and four below. An even split reads as a plus sign —
 * the long lower stem is the whole difference between a cross and a
 * mathematical operator, and at this size it is the only cue there is.
 */
const CROSS = [
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [1, 1, 1, 1, 1],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
];

export function DotCross({
  tone = "var(--ink-3)",
  gap = 5,
  className = "",
}: {
  tone?: string;
  /** Distance between dot centres. The dots themselves stay 5px. */
  gap?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-grid ${className}`}
      style={{
        gridTemplateColumns: `repeat(5, 5px)`,
        gap: `${gap}px`,
        color: tone,
      }}
      aria-hidden
    >
      {CROSS.flatMap((row, y) =>
        row.map((on, x) =>
          on ? (
            <span key={`${y}-${x}`} className="dot" />
          ) : (
            // An empty cell rather than nothing: the grid has to keep its
            // shape, and a hollow dot here would draw a rectangle around
            // the cross instead of leaving it alone.
            <span key={`${y}-${x}`} />
          ),
        ),
      )}
    </span>
  );
}

/**
 * The cross with a rule either side — a section break that says something.
 *
 * Used between the argument and the ask, where the page would otherwise
 * just have more white space.
 */
export function CrossRule({ tone = "var(--ink-3)" }: { tone?: string }) {
  return (
    <div className="flex items-center justify-center gap-5" aria-hidden>
      <span className="h-px w-full max-w-[7rem] bg-line" />
      <DotCross tone={tone} gap={4} />
      <span className="h-px w-full max-w-[7rem] bg-line" />
    </div>
  );
}
