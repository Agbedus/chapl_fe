"use client";

import { useEffect, useRef } from "react";

/**
 * A figure that counts up to itself once, when it first arrives.
 *
 * The server renders the finished value, so the markup is right before
 * any script runs and hydration has nothing to disagree about. After
 * mount the number in the string — "798", "64", "GHS 42.1k" — runs from
 * zero to its value in about two thirds of a second, written straight to
 * the node: a count is not state the tree needs. Whatever surrounds the
 * number (a currency, a unit) stays put, and tabular figures keep the
 * width from twitching. Reduced motion shows the value and nothing else.
 */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const match = value.match(/\d[\d,]*(\.\d+)?/);
    if (!match || match.index == null) return;

    const raw = match[0];
    const target = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(target) || target === 0) return;
    const decimals = match[1] ? match[1].length - 1 : 0;
    const grouped = raw.includes(",");
    const before = value.slice(0, match.index);
    const after = value.slice(match.index + raw.length);

    const write = (n: number) => {
      const fixed = n.toFixed(decimals);
      const [whole, part] = fixed.split(".");
      const body = grouped ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : whole;
      node.textContent = before + body + (part ? `.${part}` : "") + after;
    };

    const start = performance.now();
    const duration = 700;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      write(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
      else node.textContent = value;
    };
    write(0);
    frame = requestAnimationFrame(tick);
    // A tab in the background throttles animation frames, and a count
    // frozen halfway is a wrong number on screen. The timer lands it.
    const land = window.setTimeout(() => {
      cancelAnimationFrame(frame);
      node.textContent = value;
    }, duration + 150);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(land);
      node.textContent = value;
    };
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}
