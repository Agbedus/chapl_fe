/**
 * The mark, and the name beside it.
 *
 * The mark is a lancet window with a cross cut out of it — the same arch
 * the hero picture sits in, so the logo and the landing page are the
 * same building.
 *
 * The name is **real text**, not paths. It stays selectable, it is read
 * aloud correctly, it renders in whatever the display face actually is,
 * and it costs nothing. `public/logo.svg` is the flattened version for
 * places that cannot run a component — a README, an OG image.
 *
 * Colour comes from tokens, so it follows the theme toggle rather than
 * only the system setting: `--cobalt` inverts to a light blue in dark
 * mode without this file knowing anything about it.
 */
export function Logo({
  className = "",
  markOnly,
}: {
  className?: string;
  /** Just the window — for a collapsed rail or a tight header. */
  markOnly?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 24 24"
        className="h-[19px] w-[19px] shrink-0"
        role="img"
        aria-label={markOnly ? "Chapl" : undefined}
        aria-hidden={markOnly ? undefined : true}
      >
        <path
          d="M4.2 22.4V9.6a7.8 7.8 0 0 1 15.6 0v12.8a.6.6 0 0 1-.6.6H4.8a.6.6 0 0 1-.6-.6Z"
          fill="var(--cobalt)"
        />
        {/* The cross is the page showing through, so it works on paper
            and on mist without a second colour to keep in step. */}
        <path
          d="M10.7 4.9h2.6v3.3h3.1v2.6h-3.1v7.9h-2.6v-7.9H7.6V8.2h3.1Z"
          fill="var(--paper)"
        />
      </svg>

      {!markOnly && (
        <span className="font-display text-[17px] font-semibold tracking-[-0.02em] text-ink">
          Chapl
        </span>
      )}
    </span>
  );
}
