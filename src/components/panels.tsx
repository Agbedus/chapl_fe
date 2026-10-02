import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/**
 * The furniture every signed-in page is built from.
 *
 * The rule running through all of it: **space carries the structure, not
 * borders.** The earlier version boxed everything, which made a page of
 * six panels read as six competing things. Here a section is a generous
 * inset with one hairline, headings do the separating, and colour is kept
 * for the six domains and for status.
 *
 * Type is the marketing page's, not a second smaller scale: `head` for
 * section titles, 14–15px for anything meant to be read, and 12–13px only
 * for labels and metadata.
 */

/* ------------------------------------------------------------------ */
/* page                                                                */
/* ------------------------------------------------------------------ */

/**
 * The band at the top of every page: kicker, title, one line of prose,
 * and whatever action belongs to the whole screen.
 *
 * Every page opens the same way for the same reason a book's chapters
 * do — you should never have to work out where you are.
 */
export function PageHead({
  eyebrow,
  title,
  lede,
  action,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <h1 className="head text-[19px] tracking-[-0.02em]">
          {title}
          <span className="ml-2.5 align-middle text-[11px] font-medium uppercase tracking-[0.14em] text-ink-3">
            {eyebrow}
          </span>
        </h1>
        {lede && (
          <p className="measure mt-1 text-[12.5px] leading-[1.5] text-ink-3">{lede}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}

/**
 * The page body.
 *
 * `fill` makes the page exactly one screen tall so a table inside it can
 * take whatever height is left and scroll its own rows. Without it the
 * page grows and the window scrolls, which is right for the dashboard
 * and wrong for a list of eighty cells.
 */
export function Page({
  fill,
  quiet,
  children,
}: {
  fill?: boolean;
  /**
   * Arrive without the cascade.
   *
   * For a page you step through rather than land on — the entrance is
   * worth watching once and is in the way every time after that.
   */
  quiet?: boolean;
  children: ReactNode;
}) {
  const base = fill ? "page-in page-fill" : "page-in space-y-3 pb-8";
  return <div className={quiet ? `${base} page-in-quiet` : base}>{children}</div>;
}

/* ------------------------------------------------------------------ */
/* sections                                                            */
/* ------------------------------------------------------------------ */

export function Panel({
  title,
  lede,
  aside,
  span,
  quiet,
  fill,
  accent,
  children,
}: {
  title?: string;
  lede?: string;
  aside?: ReactNode;
  span?: string;
  quiet?: boolean;
  /** Takes the rest of the page's height, for a table that scrolls. */
  fill?: boolean;
  /** A domain hue. Draws the leading dot so a panel joins its data. */
  accent?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`sheet ${quiet ? "sheet-mist" : ""} ${
        fill ? "flex min-h-0 flex-1 flex-col" : ""
      } ${span ?? ""}`}
    >
      {(title || aside) && (
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <div className="min-w-0">
            {title && (
              <h2 className="flex items-center gap-2 text-[13px] font-semibold tracking-[-0.01em]">
                {accent && (
                  <span
                    className="dot h-[7px] w-[7px] shrink-0 rounded-full"
                    style={{ color: accent }}
                    aria-hidden
                  />
                )}
                {title}
              </h2>
            )}
            {lede && <p className="mt-0.5 text-[11.5px] text-ink-3">{lede}</p>}
          </div>
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line bg-mist/70 px-4 py-8 text-center text-[12.5px] leading-relaxed text-ink-3">
      {children}
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* figures                                                             */
/* ------------------------------------------------------------------ */

/**
 * A headline number in a card of its own.
 *
 * The dot carries the domain colour and the number does not — a wall of
 * coloured figures is a wall where none of them means anything. The hue
 * instead leaks in as a faint glow in the corner of the card, so a row
 * of stats still reads as colour-coded at a glance. `delta` is always
 * signed, because an unsigned change is a number you have to look at
 * twice.
 */
export function Stat({
  label,
  value,
  unit,
  colour,
  delta,
  deltaLabel,
  footnote,
  goodWhenDown,
}: {
  label: string;
  value: string;
  unit?: string;
  colour: string;
  delta?: number | null;
  deltaLabel?: string;
  footnote?: string;
  goodWhenDown?: boolean;
}) {
  const good = delta == null ? true : goodWhenDown ? delta <= 0 : delta >= 0;
  const cardStyle = { "--stat-tone": colour } as CSSProperties;

  return (
    <div className="sheet stat-card" style={cardStyle}>
      <p className="kpi-label">
        <span className="dot" style={{ color: colour }} aria-hidden />
        {label}
      </p>

      <p className="mt-2 flex items-baseline gap-1">
        <span className="figure text-[24px]">{value}</span>
        {unit && <span className="text-[12px] text-ink-3">{unit}</span>}
      </p>

      {(delta != null || footnote) && (
        <p className="mt-1.5 flex min-h-[20px] flex-wrap items-center gap-x-2 text-[11px] text-ink-3">
          {delta != null && (
            <span
              className="delta-pill"
              style={{
                background: `color-mix(in oklab, ${good ? "var(--emerald)" : "var(--ruby)"} 11%, transparent)`,
                color: good ? "var(--emerald)" : "var(--ruby)",
              }}
            >
              {delta > 0 ? "+" : ""}
              {delta}
              {deltaLabel && ` ${deltaLabel}`}
            </span>
          )}
          {footnote && <span>{footnote}</span>}
        </p>
      )}
    </div>
  );
}

/** A share, drawn as a rule. Used where a chart would be more than is needed. */
export function Meter({ value, colour }: { value: number; colour: string }) {
  return (
    <span className="block h-[5px] w-full overflow-hidden rounded-full bg-sunk shadow-[inset_0_1px_2px_rgb(0_0_0/0.04)]">
      <span
        className="block h-full rounded-full"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: `linear-gradient(90deg, color-mix(in oklab, ${colour} 60%, transparent), ${colour})`,
        }}
      />
    </span>
  );
}

/** A named colour swatch — every categorical chart on the page needs one. */
export function Legend({
  items,
}: {
  items: { label: string; colour: string; note?: string }[];
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-[12px]">
          <span className="dot" style={{ color: item.colour }} aria-hidden />
          <span className="text-ink-2">{item.label}</span>
          {item.note && <span className="tnum text-ink-3">{item.note}</span>}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* navigation                                                          */
/* ------------------------------------------------------------------ */

export function PanelLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[13px] font-medium text-ink-3 transition-colors hover:text-ink"
    >
      {children} →
    </Link>
  );
}

/** The page-level primary action, in the marketing page's pill. */
export function Action({
  href,
  children,
  icon,
}: {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Link href={href} className="btn btn-primary">
      {icon}
      {children}
    </Link>
  );
}

/**
 * Label and value, on one line.
 *
 * A definition list rather than a two-column grid: the label is not a
 * heading for a column, it is the name of the thing beside it.
 */
export function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-5 py-2">
      <dt className="shrink-0 text-[12px] text-ink-3">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] text-ink">
        {value || <span className="text-ink-3">—</span>}
      </dd>
    </div>
  );
}


/**
 * A ring with its figure in the hole.
 *
 * Composed here rather than inside the chart because the middle is HTML:
 * a number set in the display face, with a word under it. Drawing that
 * as SVG text would mean re-implementing type styling that already
 * exists, and it would not wrap.
 */
export function Ring({
  chart,
  value,
  label,
  height = 132,
}: {
  chart: ReactNode;
  value: string;
  label: string;
  height?: number;
}) {
  /*
   * The figure is the thing; the word under it is the caption.
   *
   * They used to be 20px and 10.5px, which is not enough of a gap — a
   * ring read as a number and a subtitle of roughly equal weight, and
   * the eye had to pick. The figure now takes as much of the hole as
   * the ring's own size allows, and the caption drops back to the size
   * of metadata.
   *
   * Scaled off `height` because the hole is a fraction of it: a fixed
   * size that fits a 132px ring is lost inside a 186px one. Long values
   * step down — "GHS 12.4k" cannot be set at the size "47" can, and a
   * figure that overflows its own ring is worse than a smaller one.
   */
  const room = Math.min(30, Math.round(height * 0.2));
  const size =
    value.length > 7 ? Math.round(room * 0.74)
    : value.length > 5 ? Math.round(room * 0.86)
    : room;

  return (
    <div className="dial" style={{ height }}>
      {chart}
      <span className="dial-centre">
        <span
          className="figure leading-none"
          style={{ fontSize: size, letterSpacing: "-0.03em" }}
        >
          {value}
        </span>
        <span className="dial-caption">{label}</span>
      </span>
    </div>
  );
}

/**
 * The key under a ring: swatch, name, figure.
 *
 * Under rather than beside, so the ring gets the full width of its panel
 * — a donut squeezed into half a column is a donut nobody can read the
 * thin slices of. Two columns when there are more than three entries,
 * which keeps a five-way split to three lines instead of five.
 *
 * Everything here is set small on purpose. A key is a reference, and a
 * reference that competes with the thing it refers to has stopped being
 * one.
 */
export function Key({
  items,
  columns,
}: {
  items: { label: string; colour: string; value: string; note?: string }[];
  /** Forced single column where the labels are long. */
  columns?: 1 | 2;
}) {
  const wide = (columns ?? (items.length > 3 ? 2 : 1)) === 2;

  return (
    <ul
      className={`mt-2.5 gap-x-3 gap-y-1 ${wide ? "grid grid-cols-2" : "flex flex-col"}`}
    >
      {items.map((item) => (
        <li key={item.label} className="flex items-baseline gap-1.5 text-[10.5px]">
          <span className="dot shrink-0" style={{ color: item.colour }} aria-hidden />
          <span className="min-w-0 flex-1 truncate capitalize text-ink-3">
            {item.label}
          </span>
          <span className="tnum shrink-0 font-semibold text-ink-2">{item.value}</span>
        </li>
      ))}
    </ul>
  );
}

/**
 * A ring and its key, stacked. The shape every composition panel uses,
 * so none of them has to lay itself out.
 */
export function RingPanel({
  chart,
  value,
  label,
  items,
  height = 158,
  columns,
  fill,
}: {
  chart: ReactNode;
  value: string;
  label: string;
  items: { label: string; colour: string; value: string; note?: string }[];
  height?: number;
  columns?: 1 | 2;
  /**
   * For a panel stretched taller than its ring — a row that has to end
   * level with a taller column beside it. The ring centres in whatever
   * height it is given and the key falls to the bottom edge, so the slack
   * reads as air around the chart rather than as a hole under it.
   */
  fill?: boolean;
}) {
  if (fill) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="grid flex-1 place-items-center">
          <div className="w-full">
            <Ring chart={chart} value={value} label={label} height={height} />
          </div>
        </div>
        <div className="mt-auto">
          <Key items={items} columns={columns} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Ring chart={chart} value={value} label={label} height={height} />
      <Key items={items} columns={columns} />
    </div>
  );
}


/**
 * A number with its shape underneath.
 *
 * The figure answers "how many"; the line answers "and which way is it
 * going", which is the question a bare number always provokes and never
 * settles. The line carries no axes at all — anyone who wants a value
 * reads the figure or opens the page.
 */
export function StatCard({
  label,
  value,
  unit,
  colour,
  delta,
  deltaLabel,
  footnote,
  goodWhenDown,
  spark,
  href,
}: {
  label: string;
  value: string;
  unit?: string;
  colour: string;
  delta?: number | null;
  deltaLabel?: string;
  footnote?: string;
  goodWhenDown?: boolean;
  /** The trailing series, already shaped. Omitted where none exists. */
  spark?: ReactNode;
  href?: string;
}) {
  const good = delta == null ? true : goodWhenDown ? delta <= 0 : delta >= 0;

  const body = (
    <>
      <p className="kpi-label">
        <span className="dot" style={{ color: colour }} aria-hidden />
        {label}
      </p>

      <p className="mt-2 flex items-baseline gap-1.5">
        <span className="figure text-[24px]">{value}</span>
        {unit && <span className="text-[12px] text-ink-3">{unit}</span>}
        {delta != null && (
          <span
            className="tnum ml-auto text-[11px] font-semibold"
            style={{ color: good ? "var(--emerald)" : "var(--ruby)" }}
          >
            {delta > 0 ? "+" : ""}
            {delta}
            {deltaLabel && ` ${deltaLabel}`}
          </span>
        )}
      </p>

      {spark && <div className="mt-2 -mx-1">{spark}</div>}

      {footnote && (
        <p className="mt-1.5 text-[11px] text-ink-3">{footnote}</p>
      )}
    </>
  );

  if (href) {
    return (
      /* The same affordance as every other pressable card, rather than a
         one-off: a stat you can open should feel like the branch row that
         opens, because they do the same thing. */
      <Link href={href} className="sheet sheet-hover block">
        {body}
      </Link>
    );
  }
  return <div className="sheet">{body}</div>;
}


/**
 * A head count drawn as people rather than written as a number.
 *
 * Filled is present, hollow is not — the same grammar as the
 * congregation field, so a table cell and the signature agree. Past
 * `cap` it stops drawing and says how many more, because forty dots in
 * a table row is a smudge, not a count.
 */
export function DotRow({
  total,
  present,
  colour,
  cap = 20,
}: {
  total: number;
  present?: number;
  colour: string;
  cap?: number;
}) {
  const shown = Math.min(total, cap);
  const filled = present == null ? shown : Math.round((present / total) * shown);

  return (
    <span className="flex items-center gap-1.5">
      <span className="dotrow" style={{ color: colour }} aria-hidden>
        {Array.from({ length: shown }, (_, i) => (
          <span key={i} className={i < filled ? "dot" : "dot-hollow"} />
        ))}
      </span>
      {total > cap && (
        <span className="tnum text-[10px] text-ink-3">+{total - cap}</span>
      )}
    </span>
  );
}

/**
 * A ranked board.
 *
 * Rank is a number rather than a medal, and only the top three carry the
 * accent — a board where every row is decorated has no top three. The bar
 * is the value against the leader, not against 100, because the question
 * a leaderboard answers is "how far behind is second".
 */
export function Leaderboard({
  items,
  unit = "",
  colour = "var(--cobalt)",
  emptyLabel = "Nothing to rank yet.",
}: {
  items: { id: string; name: string; note?: string; value: number; href?: string }[];
  unit?: string;
  colour?: string;
  emptyLabel?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-lg bg-mist px-4 py-8 text-center text-[12px] text-ink-3">
        {emptyLabel}
      </p>
    );
  }

  const top = Math.max(...items.map((i) => i.value), 1);

  return (
    <ol className="space-y-2">
      {items.map((item, index) => {
        const leader = index < 3;
        const row = (
          <>
            <span
              className={`rank ${leader ? "rank-top" : ""}`}
              style={leader ? { color: colour } : undefined}
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-[12px] font-medium text-ink">
                  {item.name}
                </span>
                <span className="tnum shrink-0 text-[12px] font-semibold" style={{ color: colour }}>
                  {item.value.toLocaleString()}
                  {unit}
                </span>
              </span>
              <span className="mt-1 flex items-center gap-2">
                <span className="block h-[3px] flex-1 overflow-hidden rounded-full bg-sunk">
                  <span
                    className="block h-full rounded-full"
                    style={{
                      width: `${Math.round((item.value / top) * 100)}%`,
                      background: colour,
                      opacity: leader ? 1 : 0.45,
                    }}
                  />
                </span>
                {item.note && (
                  <span className="shrink-0 text-[10px] text-ink-3">{item.note}</span>
                )}
              </span>
            </span>
          </>
        );

        return (
          <li key={item.id}>
            {item.href ? (
              <Link
                href={item.href}
                className="-mx-1 flex items-start gap-2.5 rounded-lg px-1 py-1
                           transition-colors hover:bg-mist"
              >
                {row}
              </Link>
            ) : (
              <span className="flex items-start gap-2.5 px-1 py-1">{row}</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
