"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Arrives once, when it is first looked at.
 *
 * The rule below the fold used to be "everything is static", which was
 * the right call against the alternative at the time — a page where each
 * section slid in on every scroll past is a page you fight. This keeps
 * that spirit and softens the entrance exactly once: `once: true`, so
 * scrolling back up finds the section where you left it rather than
 * replaying an animation you have already seen.
 *
 * The whole effect is opacity and an eight-pixel lift. Anything larger
 * reads as a page that has not finished loading.
 */
export function Reveal({
  children,
  /** Nudges this element's start, for a short stagger inside a row. */
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Reduced motion gets the content, immediately and without movement.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.dataset.shown = "true";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.shown = "true";
        // Once seen, stop watching. An observer left running on a long
        // marketing page is a scroll listener nobody remembers writing.
        observer.disconnect();
      },
      // Fires a little before the edge, so the section is already settled
      // by the time it is properly in view rather than animating under
      // the reader's eye.
      { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Always a div. An earlier version took the tag as a prop, which cost
  // a `@ts-expect-error` on the ref to save a wrapper nobody can see —
  // sections keep their own semantics inside this.
  return (
    <div
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
