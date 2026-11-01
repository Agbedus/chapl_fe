"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Grid3x3, Rainbow } from "lucide-react";

import { hallFor, seating, type SeatingStyle } from "@/lib/theatre";

const KEY = "chaplSeating";
const CHANGED = "chapl:seating";

// The saved style, read as an external store: the server and the first
// paint say "fan", and the browser's choice follows without an effect.
function readStyle(): SeatingStyle {
  try {
    return window.localStorage.getItem(KEY) === "rows" ? "rows" : "fan";
  } catch {
    return "fan";
  }
}
function subscribe(changed: () => void) {
  window.addEventListener(CHANGED, changed);
  window.addEventListener("storage", changed);
  return () => {
    window.removeEventListener(CHANGED, changed);
    window.removeEventListener("storage", changed);
  };
}

/**
 * The room, one seat a person, lit for everyone here. A fan of rows round
 * the front with the count where the pulpit would be, or plain rows in
 * blocks; the reader picks, and the choice is kept in this browser. It
 * waits empty until it is scrolled into view, then lights seat by seat,
 * scattered, the way a congregation gathers; after that each arrival
 * lights one more. The lighting is CSS transitions on a delay per seat,
 * so it runs off the main thread while the page is busy.
 */
export function TheatreRoom({
  present,
  expected,
  where,
  children,
}: {
  present: number;
  expected: number;
  where: string;
  /** The heading row's own content; the style switch goes at its end. */
  children?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const style = useSyncExternalStore(
    subscribe,
    readStyle,
    () => "fan" as const,
  );
  // The hall always has a good few seats, so a church still signing its
  // people up does not look empty: about 120 up to a hundred and twenty
  // members, 300 beyond, every row whole. Up to that each person has a
  // seat; past it a seat stands for a few people. The fan's first two
  // rows are left out so the count sits in an open point.
  const people = Math.max(present, expected);
  const hall = seating(style, hallFor(people), {
    wholeRows: true,
    skipFront: 2,
  });
  const seats = hall.seats.length;
  const unit = people > seats ? people / seats : 1;
  const lit =
    present === 0
      ? 0
      : Math.min(seats, Math.max(1, Math.round(present / unit)));

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const watch = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSeen(true);
          watch.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    watch.observe(node);
    return () => watch.disconnect();
  }, []);

  const choose = (next: SeatingStyle) => {
    try {
      window.localStorage.setItem(KEY, next);
    } catch {
      // No storage: the drawing stays as it is.
    }
    window.dispatchEvent(new Event(CHANGED));
  };

  const b = hall.bounds;
  // The whole first lighting takes about a second and a half, however big.
  const step = Math.min(14, 1500 / Math.max(1, lit));
  // Never taller than about 300px, never wider than its seats want.
  const widest = Math.round(Math.min(b.width * 22, (300 * b.width) / b.height));
  const pct = (v: number, of: number) =>
    `${Math.round((v / of) * 10000) / 100}%`;
  return (
    <div ref={ref} className="theatre" data-seen={seen ? "" : undefined}>
      <div className="theatre-head">
        {children}
        <div
          className="theatre-switch"
          role="group"
          aria-label="How the room is drawn"
        >
          {(
            [
              ["fan", Rainbow, "Fan seating"],
              ["rows", Grid3x3, "Rows"],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={style === value}
              aria-label={label}
              title={label}
              onClick={() => choose(value)}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </button>
          ))}
        </div>
      </div>
      {hall.seats.length > 0 && (
        <div className="theatre-hall" style={{ maxWidth: `${widest}px` }}>
          <svg
            viewBox={`${b.left} ${b.top} ${b.width} ${b.height}`}
            width="100%"
            role="img"
            aria-label={`${present} of ${expected} in the room`}
          >
            {style === "rows" && (
              <line
                x1={b.left + b.width * 0.38}
                x2={b.left + b.width * 0.62}
                y1={hall.label.top + hall.label.height + 1}
                y2={hall.label.top + hall.label.height + 1}
                className="theatre-front"
              />
            )}
            {hall.seats.map((s, i) =>
              hall.rank[i] < lit ? (
                <circle
                  key={i}
                  cx={s.x}
                  cy={s.y}
                  r={0.26}
                  className="theatre-seat"
                  style={{
                    transitionDelay: seen
                      ? `${Math.round(hall.rank[i] * step)}ms`
                      : undefined,
                  }}
                />
              ) : (
                <circle
                  key={i}
                  cx={s.x}
                  cy={s.y}
                  r={0.22}
                  className="theatre-empty"
                />
              ),
            )}
          </svg>
          <div
            className="theatre-count"
            style={{
              left: pct(hall.label.left - b.left, b.width),
              top: pct(hall.label.top - b.top, b.height),
              width: pct(hall.label.width, b.width),
              height: pct(hall.label.height, b.height),
            }}
          >
            <span className="figure tnum">{present}</span>
            <span className="theatre-of">
              of {expected} {where}
            </span>
          </div>
        </div>
      )}
      {unit > 1 && (
        <p className="mt-2 text-center text-[11px] text-ink-3">
          One dot is about {Math.round(unit)} people.
        </p>
      )}
    </div>
  );
}
