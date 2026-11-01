"use client";

import { useEffect, useRef, useState } from "react";

import { DOT_R, theatre } from "@/lib/theatre";

/**
 * The room as theatre seating, filled for everyone here. It waits empty
 * until it is scrolled into view, then fills seat by seat from the front,
 * the way the landing page's church gathers on scroll; after that a new
 * arrival simply takes a seat. The filling is CSS transitions on a delay
 * per seat, so it runs off the main thread while the page is busy.
 */
export function TheatreRoom({ present, expected }: { present: number; expected: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const count = Math.max(present, expected);
  const hall = theatre(count, 640);

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

  if (hall.seats.length === 0) return null;
  // The whole first fill takes about a second and a half, however big.
  const step = Math.min(14, 1400 / Math.max(1, present));
  const w = hall.width;
  return (
    <div ref={ref} className="theatre" data-seen={seen ? "" : undefined}>
      <svg
        viewBox={`0 0 ${w} ${hall.height}`}
        width="100%"
        role="img"
        aria-label={`${present} of ${expected} in the room`}
      >
        {/* The front: a short soft arc where the room faces. */}
        <path
          d={`M ${w * 0.4} ${Math.round(hall.stage * 0.5)} Q ${w / 2} ${Math.round(hall.stage * 0.5) + 4} ${w * 0.6} ${Math.round(hall.stage * 0.5)}`}
          fill="none"
          stroke="var(--line-strong)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {hall.seats.map((s, i) =>
          hall.rank[i] < present ? (
            <circle
              key={i}
              cx={s.x}
              cy={s.y}
              r={DOT_R}
              className="theatre-seat"
              style={{ transitionDelay: seen ? `${Math.round(hall.rank[i] * step)}ms` : undefined }}
            />
          ) : (
            <circle key={i} cx={s.x} cy={s.y} r={DOT_R - 0.5} className="theatre-empty" />
          ),
        )}
      </svg>
    </div>
  );
}
