"use client";

import { useRef } from "react";

import { gsap, useGSAP } from "@/components/landing/motion";
import { branches } from "@/lib/congregation";

const CROSS = [
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [1, 1, 1, 1, 1],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0],
];

/** A small seeded spread, so the scatter is the same on every visit. */
function spread(i: number, reach: number) {
  const a = Math.sin(i * 12.9898) * 43758.5453;
  const b = Math.sin(i * 78.233) * 12543.1234;
  return { x: (a - Math.floor(a) - 0.5) * reach * 2, y: (b - Math.floor(b) - 0.5) * reach };
}

/**
 * The cross, gathered: its dots come in from wherever they were as the
 * verse scrolls up, and are in place by the time it is read.
 */
export function GatheringCross() {
  const root = useRef<HTMLSpanElement>(null);
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const dots = gsap.utils.toArray<HTMLElement>(".dot");
      dots.forEach((dot, i) => {
        const from = spread(i + 3, 140);
        gsap.fromTo(
          dot,
          { x: from.x, y: from.y, autoAlpha: 0, scale: 0.6 },
          {
            x: 0,
            y: 0,
            autoAlpha: 1,
            scale: 1,
            ease: "power3.out",
            scrollTrigger: { trigger: root.current, start: "top 95%", end: "top 50%", scrub: 0.8 },
          },
        );
      });
    },
    { scope: root },
  );
  return (
    <span
      ref={root}
      className="inline-grid"
      style={{ gridTemplateColumns: "repeat(5, 7px)", gap: "6px", color: "var(--gold)" }}
      aria-hidden
    >
      {CROSS.flatMap((row, y) =>
        row.map((on, x) =>
          on ? (
            <span key={`${y}-${x}`} className="dot" style={{ width: 7, height: 7 }} />
          ) : (
            <span key={`${y}-${x}`} />
          ),
        ),
      )}
    </span>
  );
}

/**
 * The whole congregation, gathered into one block for the last ask: the
 * people come together from across the screen as it is reached.
 */
export function GatheringChurch() {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const dots = gsap.utils.toArray<HTMLElement>(".dot");
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root.current, start: "top 95%", end: "center 55%", scrub: 0.9 },
      });
      dots.forEach((dot, i) => {
        const from = spread(i, 360);
        tl.fromTo(
          dot,
          { x: from.x, y: from.y - 120, autoAlpha: 0 },
          { x: 0, y: 0, autoAlpha: 1, ease: "power2.out", duration: 1 },
          (i / dots.length) * 0.6,
        );
      });
    },
    { scope: root },
  );
  return (
    <div ref={root} className="mx-auto flex max-w-lg flex-wrap justify-center gap-[5px]" aria-hidden>
      {branches.map((branch) =>
        Array.from({ length: branch.members }, (_, i) => (
          <span key={`${branch.id}-${i}`} className="dot" style={{ color: branch.color }} />
        )),
      )}
    </div>
  );
}
