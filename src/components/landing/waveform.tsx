"use client";

import { useRef } from "react";

import { DotNumeral, paintNumeral } from "@/components/landing/dot-numeral";
import { gsap, useGSAP } from "@/components/landing/motion";

/**
 * The featured sermon's waveform, played by the scroll: the bars light
 * from the left as the section passes, and the time under it keeps up.
 */
export function Waveform({ bars, length }: { bars: number[]; length: string }) {
  const root = useRef<HTMLDivElement>(null);
  const clock = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const [m, s] = length.split(":").map(Number);
      const total = m * 60 + s;
      const lit = gsap.utils.toArray<HTMLElement>("[data-bar]");
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const played = { t: reduce ? 0.35 : 0.08 };
      const paint = () => {
        const upto = Math.round(played.t * lit.length);
        lit.forEach((bar, i) => bar.toggleAttribute("data-on", i < upto));
        const at = Math.round(played.t * total);
        if (clock.current) paintNumeral(clock.current, `${Math.floor(at / 60)}:${String(at % 60).padStart(2, "0")}`);
      };
      paint();
      if (reduce) return;
      gsap.to(played, {
        t: 0.62,
        ease: "none",
        onUpdate: paint,
        scrollTrigger: { trigger: root.current, start: "top 85%", end: "bottom 25%", scrub: 0.6 },
      });
    },
    { scope: root, dependencies: [length] },
  );

  return (
    <div ref={root}>
      <div className="flex h-14 min-w-0 flex-1 items-end gap-[3px]" aria-hidden>
        {bars.map((h, i) => (
          <span key={i} data-bar className="wave-bar w-full rounded-full" style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="mt-3 flex items-end justify-between text-ink-3">
        <DotNumeral ref={clock} value="0:00" template="00:00" label="Time played" cell="2.4px" className="text-ink-2" />
        <DotNumeral value={length} template="00:00" label={`Length ${length}`} cell="2.4px" />
      </div>
    </div>
  );
}
