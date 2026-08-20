/**
 * The shape of a page that has not arrived yet.
 *
 * Every screen under `/app` fetches on the server, so a click on the
 * sidenav used to leave the previous page sitting there — no spinner, no
 * change, nothing — until the whole next page was ready. The interface
 * looked broken and the app felt slow, and only one of those was true.
 *
 * A skeleton does not make the request faster. It makes the wait legible,
 * which is most of what "fast" means to somebody looking at a screen: the
 * click was heard, the thing coming is a page, and it is roughly this
 * shape. Because it mirrors the real layout, the arrival is a swap rather
 * than a jump.
 */

export function Skeleton({
  className = "",
  /** Rounded like a figure rather than a block of text. */
  round,
  style,
}: {
  className?: string;
  round?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`skeleton block ${round ? "rounded-full" : ""} ${className}`}
      style={style}
      aria-hidden
    />
  );
}

/** A stat card, before it has a number in it. */
export function SkeletonStat() {
  return (
    <div className="sheet">
      <div className="flex items-center gap-2">
        <Skeleton round className="h-[7px] w-[7px]" />
        <Skeleton className="h-[9px] w-16" />
      </div>
      <Skeleton className="mt-3 h-7 w-20" />
      <Skeleton className="mt-2.5 h-[9px] w-28" />
    </div>
  );
}

/** A panel with a chart-shaped hole in it. */
export function SkeletonPanel({ height = 180 }: { height?: number }) {
  return (
    <div className="sheet">
      <Skeleton className="h-[11px] w-32" />
      <Skeleton className="mt-2 h-[9px] w-44" />
      <Skeleton className="mt-4 w-full" style={{ height }} />
    </div>
  );
}

/** Rows, for a page that is mostly a table. */
export function SkeletonRows({ rows = 8 }: { rows?: number }) {
  return (
    <div className="sheet">
      <Skeleton className="h-[11px] w-28" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-[10px] flex-1" />
            <Skeleton className="h-[10px] w-24" />
            <Skeleton className="h-[10px] w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
