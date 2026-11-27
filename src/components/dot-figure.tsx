"use client";

import { useEffect, useRef } from "react";

import { DotNumeral, paintNumeral } from "@/components/landing/dot-numeral";

/**
 * A headline figure in the landing page's dot matrix.
 *
 * The figure is the part of the value the dot font can draw: digits,
 * `, . : %`, and a trailing K or M from compact money. Anything before it
 * (a currency, "—") stays text, set small beside the dots. The server
 * draws the finished figure, so the markup is right before any script
 * runs; after mount it counts up once from zero, lighting cells on the
 * nodes through `paintNumeral` rather than through state, with a timer
 * that lands it if a background tab throttles the frames. Every slot the
 * figure needs is drawn from the start, so it never changes width while
 * it counts. Reduced motion shows the value and nothing else.
 */
export function DotFigure({
  value,
  cell = "3px",
  label,
  className = "",
}: {
  value: string;
  /** One dot's diameter. A figure is about 8.8 dots tall. */
  cell?: string;
  label?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const match = value.match(/\d[\d,]*(?:\.\d+)?[%KM]?/);
  const figure = match?.[0] ?? "";
  const before = match ? value.slice(0, match.index).trim() : value;
  const after = match ? value.slice((match.index ?? 0) + figure.length).trim() : "";

  useEffect(() => {
    const node = ref.current;
    if (!node || !figure || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const number = figure.match(/^[\d,]+(?:\.(\d+))?/);
    if (!number) return;
    const target = Number(number[0].replace(/,/g, ""));
    if (!Number.isFinite(target) || target === 0) return;
    const decimals = number[1]?.length ?? 0;
    const grouped = number[0].includes(",");
    const tail = figure.slice(number[0].length);

    const frame = (n: number) => {
      const [whole, part] = n.toFixed(decimals).split(".");
      const body = grouped ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : whole;
      paintNumeral(node, body + (part ? `.${part}` : "") + tail);
    };

    const start = performance.now();
    const duration = 800;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      frame(target * (1 - Math.pow(1 - t, 3)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else paintNumeral(node, figure);
    };
    frame(0);
    raf = requestAnimationFrame(tick);
    const land = window.setTimeout(() => {
      cancelAnimationFrame(raf);
      paintNumeral(node, figure);
    }, duration + 150);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(land);
      paintNumeral(node, figure);
    };
  }, [figure]);

  if (!figure) {
    return <span className={`dot-figure-text ${className}`}>{value}</span>;
  }

  return (
    <span className={`dot-figure ${className}`} role="img" aria-label={label ?? value}>
      {before && <span className="dot-figure-unit" aria-hidden>{before}</span>}
      <span aria-hidden className="contents">
        <DotNumeral ref={ref} value={figure} template={figure.replace(/\d/g, "0")} cell={cell} />
      </span>
      {after && <span className="dot-figure-unit" aria-hidden>{after}</span>}
    </span>
  );
}
