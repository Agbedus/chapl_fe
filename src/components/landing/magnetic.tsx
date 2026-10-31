"use client";

import { useRef, type ReactNode } from "react";

import { gsap, useGSAP } from "@/components/landing/motion";

/**
 * Leans its child a few pixels toward the cursor, and lets go on a
 * spring. Only for a fine pointer and only without reduced motion: on
 * a phone there is no cursor to lean toward.
 */
export function Magnetic({ children, strength = 0.28 }: { children: ReactNode; strength?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(pointer: fine) and (prefers-reduced-motion: no-preference)", () => {
        const x = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
        const y = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
        const move = (event: PointerEvent) => {
          const box = el.getBoundingClientRect();
          x((event.clientX - (box.left + box.width / 2)) * strength);
          y((event.clientY - (box.top + box.height / 2)) * strength);
        };
        const leave = () => {
          gsap.to(el, { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.45)" });
        };
        el.addEventListener("pointermove", move);
        el.addEventListener("pointerleave", leave);
        return () => {
          el.removeEventListener("pointermove", move);
          el.removeEventListener("pointerleave", leave);
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <span ref={ref} className="inline-flex">
      {children}
    </span>
  );
}
