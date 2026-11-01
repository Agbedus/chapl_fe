"use client";

import { useEffect } from "react";

/**
 * The quiet field behind the page's sections: a grid of faint dots, and
 * a brighter patch of it that follows the pointer across whichever
 * section it is over. One listener for the page, written to a CSS
 * variable on the section at most once a frame; touch screens and
 * reduced motion keep the still grid.
 */
export function QuietDots() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine) and (prefers-reduced-motion: no-preference)").matches) return;
    let frame = 0;
    let last: PointerEvent | null = null;
    const paint = () => {
      frame = 0;
      const event = last;
      if (!event) return;
      const section = (event.target as Element | null)?.closest?.(".quiet-dots") as HTMLElement | null;
      if (!section) return;
      const box = section.getBoundingClientRect();
      section.style.setProperty("--qx", `${event.clientX - box.left}px`);
      section.style.setProperty("--qy", `${event.clientY - box.top}px`);
    };
    const move = (event: PointerEvent) => {
      last = event;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
