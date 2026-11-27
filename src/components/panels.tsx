import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

import { DotFigure } from "@/components/dot-figure";
import { Info } from "@/components/info";

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
 * The top of every page: the title, one line of status under it, and
 * whatever action belongs to the whole screen.
 *
 * There used to be a kicker over the title as well ("Overview",
 * "People"), which only repeated the sidebar's highlighted row. The nav
 * already says where you are; the head says what this is and how it
 * stands. `eyebrow` is still accepted so no page has to change.
 */
export function PageHead({
  title,
  lede,
  action,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  action?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="min-w-0">
        <h1 className="head text-[22px] tracking-[-0.025em] sm:text-[24px]">{title}</h1>
        {lede && <p className="measure mt-1 text-[12.5px] leading-[1.5] text-ink-3">{lede}</p>}
      </div>
      {action && <div className="page-actions shrink-0">{action}</div>}
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

/**
 * A panel: a title, and the thing it is about.
 *
 * What used to sit under every title as a line of grey prose ("Share of
 * those marked · last 8 services") is an "i" beside it now. The sentence
 * is there for whoever wants it, and the eight panels that do not need
 * explaining stop explaining themselves. `href` puts the way into the
 * page that owns this data in the corner, as one small arrow, rather
 * than a "Manage →" written out in every panel.
 */
export function Panel({
  title,
  lede,
  aside,
  span,
  quiet,
  fill,
  accent,
  href,
  hrefLabel,
  className,
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
  /** The page this panel summarises. */
  href?: string;
  hrefLabel?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`sheet ${quiet ? "sheet-mist" : ""} ${
        fill ? "flex min-h-0 flex-1 flex-col" : ""
      } ${span ?? ""} ${className ?? ""}`}
    >
      {(title || aside || href) && (
        <div className="panel-head">
          {title ? (
            <h2 className="panel-title">
              {accent && <span className="dot" style={{ color: accent }} aria-hidden />}
              <span className="truncate">{title}</span>
              {lede && <Info text={lede} />}
            </h2>
          ) : (
            <span />
          )}
          {(aside || href) && (
            <div className="flex shrink-0 items-center gap-1.5">
              {aside}
              {href && (
                <Link href={href} className="panel-go" aria-label={hrefLabel ?? `Open ${title ?? "this"}`}>
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                </Link>
              )}
            </div>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Nothing here yet.
 *
 * A bare line of faded text tells somebody a thing is empty and leaves
 * them to work out what to do about it. Give it an `action` and the empty
 * state becomes the first step instead — the same button the page would
 * have shown once there was something in it, so a new church is led
 * through the product by its blank spaces.
 *
 * Only pass an `action` the reader is allowed to take; a button that
 * always 403s is worse than no button.
 */
export function Empty({
  children,
  title,
  action,
}: {
  children: ReactNode;
  /** A short heading above the explanation. */
  title?: string;
  /** The next step: a link, or any node (a form trigger). */
  action?: { href: string; label: string } | ReactNode;
}) {
  const link =
    action && typeof action === "object" && "href" in action && "label" in action
      ? (action as { href: string; label: string })
      : null;
  return (
    <div className="empty-state">
      {title && <p className="text-[13px] font-semibold text-ink">{title}</p>}
      <p className="measure mx-auto text-[12.5px] leading-relaxed text-ink-3">{children}</p>
      {link ? (
        <Link href={link.href} className="btn btn-quiet btn-sm mt-3">
          {link.label}
        </Link>
      ) : action ? (
        <div className="mt-3">{action as ReactNode}</div>
      ) : null}
    </div>
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
    <span className="block h-[5px] w-full overflow-hidden rounded-full bg-sunk">
      <span
        className="meter-fill block h-full rounded-full"
        style={{
          width: `${Math.min(100, Math.max(0, value))}%`,
          background: colour,
        }}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* navigation                                                          */
/* ------------------------------------------------------------------ */

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
  /** A caption under the figure. Leave it out and the hole holds the figure alone. */
  label?: string;
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
  /*
   * The dot size that fills the hole without touching the ring. The
   * figure is 8.8 dots tall; across, a digit is 6.2 dots, punctuation
   * 1.3, with 1.5 between each. The hole is about half the ring's height
   * once the band (a third of the radius) is taken out.
   */
  const figure = value.match(/\d[\d,]*(?:\.\d+)?[%KM]?/)?.[0] ?? value;
  const glyphs = Array.from(figure);
  const across =
    glyphs.reduce((sum, ch) => sum + (/[.,:]/.test(ch) ? 1.3 : 6.2), 0) + (glyphs.length - 1) * 1.5;
  const cell = Math.min(height * 0.22 / 8.8, (height * 0.46) / across);
  const size = Math.round(cell * 9);

  return (
    <div className="dial" style={{ height }}>
      {chart}
      <span className="dial-centre">
        {/* In dots, like every headline figure: a figure is 8.8 dots tall. */}
        <DotFigure value={value} cell={`${Math.round((size / 9) * 10) / 10}px`} />
        {label && <span className="dial-caption">{label}</span>}
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
        // The figure follows its label at a word's distance rather than
        // sitting at the far edge of the column: near is what says the two
        // belong together, and a gap across the column says they do not.
        <li key={item.label} className="flex min-w-0 items-baseline gap-1.5 text-[10.5px]">
          <span className="dot shrink-0" style={{ color: item.colour }} aria-hidden />
          <span className="min-w-0 truncate capitalize text-ink-3">{item.label}</span>
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
  label?: string;
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
  const body = (
    <>
      <p className="kpi-label">
        <span className="dot" style={{ color: colour }} aria-hidden />
        {label}
      </p>

      <p className="mt-2 flex items-baseline gap-1.5">
        <DotFigure value={value} cell="2.6px" label={`${label} ${value}${unit ?? ""}`} />
        {unit && <span className="text-[12px] text-ink-3">{unit}</span>}
        {delta != null && (
          <span className="ml-auto">
            <Delta value={delta} label={deltaLabel?.trim()} goodWhenDown={goodWhenDown} />
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


/* ------------------------------------------------------------------ */
/* the dashboard's instruments                                         */
/* ------------------------------------------------------------------ */
/*
 * Each answers one kind of question, and none of them is a chart
 * library's: they are server-rendered HTML, so they arrive with the page,
 * read without a script, and print. They animate in on CSS alone (a bar
 * grows from its start, a column from its floor), once, and not at all
 * under reduced motion.
 */

/**
 * A signed change, with an arrow as well as a colour, so it reads in
 * greyscale and to anyone who cannot tell emerald from ruby.
 */
export function Delta({
  value,
  label,
  goodWhenDown,
}: {
  value: number;
  label?: string;
  goodWhenDown?: boolean;
}) {
  if (value === 0) {
    return <span className="delta delta-flat">no change{label ? ` ${label}` : ""}</span>;
  }
  const good = goodWhenDown ? value < 0 : value > 0;
  const Arrow = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`delta ${good ? "delta-good" : "delta-bad"}`}>
      <Arrow className="h-3 w-3" strokeWidth={2.4} aria-hidden />
      {value > 0 ? "+" : "−"}
      {Math.abs(value).toLocaleString()}
      {label ? ` ${label}` : ""}
    </span>
  );
}

/**
 * The four numbers a leader checks first, in one ruled strip.
 *
 * Four cards side by side were four things competing for the eye. One
 * strip divided by hairlines is one thing, read left to right, and it
 * holds its shape as two by two on a phone instead of scrolling sideways
 * out of view. Each cell is the way into its page.
 */
export function Pulse({ children }: { children: ReactNode }) {
  return <section className="pulse">{children}</section>;
}

export function PulseItem({
  href,
  label,
  colour,
  value,
  unit,
  delta,
  note,
  spark,
}: {
  href: string;
  label: string;
  colour: string;
  value: string;
  unit?: string;
  delta?: ReactNode;
  note?: string;
  spark?: ReactNode;
}) {
  return (
    <Link href={href} className="pulse-item">
      <span className="pulse-label">
        <span className="dot" style={{ color: colour }} aria-hidden />
        {label}
      </span>
      <span className="pulse-value">
        <DotFigure value={value} cell="3.4px" label={`${label} ${value}${unit ?? ""}`} />
        {unit && <span className="pulse-unit">{unit}</span>}
      </span>
      {(delta || note) && (
        <span className="pulse-foot">
          {delta}
          {note && <span className="truncate">{note}</span>}
        </span>
      )}
      {spark && <span className="pulse-spark">{spark}</span>}
      <ArrowUpRight className="pulse-go h-3.5 w-3.5" strokeWidth={2} aria-hidden />
    </Link>
  );
}

/**
 * The figure a panel is about, said first and large.
 *
 * A panel that opens on its number answers the question before the chart
 * under it is read; the chart is then the "why", not a puzzle.
 */
export function Headline({
  value,
  unit,
  delta,
  note,
}: {
  value: string;
  unit?: string;
  delta?: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className="headline">
      <span className="headline-value">
        <DotFigure value={value} cell="3px" label={`${value}${unit ?? ""}`} />
        {unit && <span className="pulse-unit">{unit}</span>}
      </span>
      {delta}
      {note && <span className="headline-note">{note}</span>}
    </div>
  );
}

/**
 * Bars against a fixed scale, with one shared mark across all of them.
 *
 * A bullet chart: each branch's turnout is a bar out of 100, and the
 * tick through every row is the church's own figure. "Above or below
 * the rest of us" is the question a branch pastor is actually asked, and
 * it reads off the tick without anyone comparing two numbers.
 */
export function Bullets({
  items,
  mark,
  markLabel,
  unit = "%",
}: {
  items: { id: string; label: string; value: number; note?: string; href?: string; colour: string }[];
  /** Where the shared tick sits, on the same 0–100 scale. */
  mark?: number;
  markLabel?: string;
  unit?: string;
}) {
  return (
    <div>
      <ul className="bullets">
        {items.map((item, i) => {
          const row = (
            <>
              <span className="min-w-0">
                <span className="bullet-name">{item.label}</span>
                {item.note && <span className="bullet-note">{item.note}</span>}
              </span>
              <span className="bullet-track">
                <span
                  className="bullet-fill"
                  style={{ width: `${Math.max(0, Math.min(100, item.value))}%`, background: item.colour }}
                />
                {mark != null && <span className="bullet-mark" style={{ left: `${mark}%` }} aria-hidden />}
              </span>
              <span className="bullet-value tnum">
                {item.value}
                <span className="text-ink-3">{unit}</span>
              </span>
            </>
          );
          return (
            <li key={item.id} style={{ "--i": i } as CSSProperties}>
              {item.href ? (
                <Link href={item.href} className="bullet">
                  {row}
                </Link>
              ) : (
                <span className="bullet">{row}</span>
              )}
            </li>
          );
        })}
      </ul>
      {mark != null && markLabel && (
        <p className="bullet-legend">
          <span className="bullet-legend-mark" aria-hidden />
          {markLabel}
        </p>
      )}
    </div>
  );
}

/**
 * One whole as one bar, split into its parts, with the key underneath.
 *
 * Used where a donut would be a ring of three: a bar shows the same
 * shares in a third of the height, and lines up with the rows under it.
 * Pointing at a part, in the bar or in the key, lifts it and dims the
 * rest.
 */
export function SegmentBar({
  items,
  thin,
  showKey = true,
}: {
  items: { label: string; value: number; colour: string; note?: string }[];
  thin?: boolean;
  showKey?: boolean;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const shown = items.filter((item) => item.value > 0);
  return (
    <div className="seg-wrap">
      <div
        className={`seg ${thin ? "seg-thin" : ""}`}
        role="img"
        aria-label={shown.map((s) => `${s.label} ${s.value}`).join(", ")}
      >
        {items.map((item, i) =>
          item.value > 0 ? (
            <span
              key={item.label}
              data-k={i}
              style={{ flexGrow: item.value, background: item.colour, "--i": i } as CSSProperties}
              title={`${item.label}: ${item.value}`}
            />
          ) : null,
        )}
      </div>
      {showKey && (
        <ul className="seg-key">
          {items.map((item, i) => (
            <li key={item.label} data-k={i}>
              <span className="dot" style={{ color: item.colour }} aria-hidden />
              <span className="min-w-0 flex-1 truncate capitalize text-ink-2">{item.label}</span>
              <span className="tnum font-semibold text-ink">{item.value.toLocaleString()}</span>
              <span className="tnum w-9 text-right text-ink-3">{Math.round((item.value / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A sequence of stages, in the order work moves through them.
 *
 * Pastoral care is a pipeline, not a pie: somebody is not reached, then
 * needs a follow-up, then is reached, then it is resolved. Drawn on a
 * rail in that order, the eye reads where the work is piling up — which
 * a ring of the same four numbers never said.
 */
export function Stages({
  items,
}: {
  items: { label: string; value: number; colour: string }[];
}) {
  const top = Math.max(1, ...items.map((item) => item.value));
  return (
    <ol className="stages">
      {items.map((item, i) => (
        <li
          key={item.label}
          className="stage"
          data-on={item.value > 0 ? "" : undefined}
          style={{ color: item.colour, "--i": i } as CSSProperties}
        >
          <span className="stage-node" aria-hidden />
          <span className="stage-label">{item.label}</span>
          <span className="stage-value tnum">{item.value.toLocaleString()}</span>
          <span className="stage-bar" aria-hidden>
            <span style={{ width: `${(item.value / top) * 100}%` }} />
          </span>
        </li>
      ))}
    </ol>
  );
}

/**
 * Columns over ordered bands, each labelled with its own value.
 *
 * For a handful of bins (ages) where the order is the point and every
 * value is worth printing: direct labels save the trip to a tooltip, and
 * there are few enough of them not to crowd.
 */
export function Histogram({
  items,
  colour,
  height = 112,
}: {
  items: { label: string; value: number }[];
  colour: string;
  height?: number;
}) {
  const top = Math.max(1, ...items.map((item) => item.value));
  const most = items.reduce((best, item) => (item.value > best.value ? item : best), items[0]);
  return (
    <div
      className="histo"
      style={{ height }}
      role="img"
      aria-label={items.map((item) => `${item.label}: ${item.value}`).join(", ")}
    >
      {items.map((item, i) => (
        <div key={item.label} className="histo-col" style={{ "--i": i } as CSSProperties}>
          <span className="histo-value tnum">{item.value.toLocaleString()}</span>
          <span
            className="histo-bar"
            style={{
              height: `${Math.max(3, (item.value / top) * 100)}%`,
              background:
                item === most ? colour : `color-mix(in oklab, ${colour} 38%, var(--sunk))`,
            }}
          />
          <span className="histo-label">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
