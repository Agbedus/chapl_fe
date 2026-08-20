"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

/**
 * One service at a time, stepped through.
 *
 * The same control as the calendar's month switcher, for the same reason:
 * the unit a leader thinks in here is a service, not a page of rows. An
 * arrow either side, the date between them, disabled at both ends — a
 * cycle that wraps around gives no sense of where the record stops.
 *
 * **It navigates rather than holding state.** Stepping to a service means
 * fetching that service, and a URL that says which one is a URL that can
 * be sent to the person who needs to make the calls. Next prefetches both
 * neighbours on hover, so the step lands about as fast as client state
 * would have — without holding twenty-four services in memory to make it
 * so.
 */
export function ServiceStepper({
  dates,
  current,
  label,
}: {
  /** Every marked service, oldest first. */
  dates: string[];
  current: string;
  /**
   * Formatted on the server and passed down.
   *
   * Formatting it here instead cost a hydration error: Node and the
   * browser do not agree on what `toLocaleDateString` means — the server
   * rendered "Sunday, August 9" and the client "Sunday 9 August", and
   * React threw the whole subtree away and rebuilt it. Any date shown
   * inside a Client Component has to arrive as a string.
   */
  label: string;
}) {
  const index = dates.indexOf(current);
  const previous = index > 0 ? dates[index - 1] : null;
  const next = index >= 0 && index < dates.length - 1 ? dates[index + 1] : null;
  const latest = dates.at(-1);

  return (
    <div className="flex items-center gap-1.5">
      <Arrow href={previous && `/app/attendance?date=${previous}`} back />

      <span className="min-w-[12.5rem] text-center">
        <span className="block text-[13px] font-semibold tracking-tight">
          {label}
        </span>
        <span className="block text-[10.5px] text-ink-3">
          {index + 1} of {dates.length} services
          {current === latest && " · the latest"}
        </span>
      </span>

      <Arrow href={next && `/app/attendance?date=${next}`} />

      {current !== latest && latest && (
        <Link href="/app/attendance" className="btn btn-quiet btn-sm ml-1">
          Latest
        </Link>
      )}
    </div>
  );
}

/**
 * An arrow, or the shape of one that is not there.
 *
 * The disabled end renders as a span rather than a dimmed link: a link
 * that goes nowhere is still focusable and still announces itself, and
 * the point of greying it out is that there is nothing left that way.
 */
function Arrow({ href, back }: { href?: string | null; back?: boolean }) {
  const Icon = back ? ChevronLeft : ChevronRight;
  const shape = "grid h-7 w-7 place-items-center rounded-lg";

  if (!href) {
    return (
      <span className={`${shape} text-ink-3 opacity-30`} aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-label={back ? "Previous service" : "Next service"}
      /*
       * `active:scale-95` is the whole feedback loop. The href takes a
       * moment to resolve, and without it the press has no answer until
       * the page changes — which reads as a control that did not hear
       * you. Hover is gated behind a fine pointer, because on a touch
       * screen a tap triggers hover and leaves the state stuck on.
       */
      className={`${shape} text-ink-3 transition-[transform,background-color,color]
                  duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]
                  hover:bg-sunk hover:text-ink active:scale-95`}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </Link>
  );
}
