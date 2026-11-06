"use client";

import { useEffect, useState } from "react";

/**
 * The contents rail of a legal page, with a dot beside the section being
 * read: filled for the one in view, hollow for the rest, the same pair as
 * the congregation field ("here" and "not here"). The section is the
 * last heading to have crossed a line a third of the way down the
 * window, so it changes as a heading reaches the reader's eye rather than
 * the moment its first pixel appears. The first is active before any
 * scrolling, which is also what the server renders.
 */
export function LegalToc({ items }: { items: { id: string; title: string }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const headings = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null);
    if (!headings.length) return;

    const update = () => {
      const line = window.innerHeight / 3;
      let current = headings[0].id;
      for (const heading of headings) {
        if (heading.getBoundingClientRect().top <= line) current = heading.id;
      }
      // At the very bottom the last section may be too short to reach the line.
      const bottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setActive(bottom ? headings[headings.length - 1].id : current);
    };

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  return (
    <ol className="mt-4 space-y-2.5 text-[13.5px] leading-[1.45]">
      {items.map((item) => {
        const here = item.id === active;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={here ? "location" : undefined}
              className={`flex items-start gap-3 transition-colors ${here ? "font-medium text-ink" : "text-ink-3 hover:text-ink"}`}
            >
              <span
                aria-hidden
                className={`${here ? "dot text-cobalt" : "dot-hollow text-ink-3"} mt-[0.5em] shrink-0 transition-transform duration-200 ${here ? "scale-[1.6]" : ""}`}
              />
              <span>{item.title}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}
