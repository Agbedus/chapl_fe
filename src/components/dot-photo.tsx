"use client";

import { useEffect, useRef } from "react";

/**
 * A picture held in the dot field.
 *
 * The dot is this product's atomic unit — one dot is one person — so the
 * hero image does not sit in a frame beside the dots, it is *made of*
 * them at its edges. The photograph is solid where the light is and
 * breaks apart into the field as it reaches the border, so the image and
 * the interface are the same material.
 *
 * ## How the dissolve works
 *
 * Two masks composited as a union:
 *
 *   1. a soft radial "core" — opaque in the middle, gone by the edges;
 *   2. a tiled dot pattern covering the whole frame.
 *
 * `mask-composite: add` unions them, so the middle is continuous and
 * everything outside the core survives only where a dot is. Nothing is
 * drawn twice and there is no second copy of the image to keep in step.
 *
 * ## How the reveal works
 *
 * A cursor-tracked spotlight opens a clear window through the dots. The
 * naive way to move it is to animate `mask-position`, which repaints the
 * image every frame. Instead the spotlight is a second layer carrying a
 * *fixed* mask which is moved with `translate3d`, and the image inside it
 * is translated by exactly the opposite amount — so the layer travels,
 * the picture does not, and both transforms run on the compositor.
 *
 * The position is spring-damped rather than pinned to the pointer. A
 * value tied straight to the mouse has no motion of its own and reads as
 * mechanical; a spring gives it weight. It is decoration, so it is also
 * the first thing to go: `prefers-reduced-motion` leaves the spotlight
 * resting in the centre, and a coarse pointer never starts it at all.
 */

export function DotPhoto({
  src,
  alt,
  className = "",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const spot = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const frameEl = frame.current;
    const spotEl = spot.current;
    const innerEl = inner.current;
    if (!frameEl || !spotEl || !innerEl) return;

    // Decoration is the first thing to drop. Neither of these can change
    // without a reload in practice, so they are read once.
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (still || !fine) return;

    // target = where the pointer is, current = where the light actually
    // is. The gap between them, released a little each frame, *is* the
    // spring.
    let targetX = 0;
    let targetY = 0;
    let x = 0;
    let y = 0;
    let vx = 0;
    let vy = 0;
    let frameId = 0;
    let running = false;

    /* Apple's phrasing — a duration and a bounce — rather than mass and
       stiffness. Bounce stays at zero: light does not overshoot. */
    const STIFFNESS = 0.055;
    const DAMPING = 0.78;

    const step = () => {
      vx = (vx + (targetX - x) * STIFFNESS) * DAMPING;
      vy = (vy + (targetY - y) * STIFFNESS) * DAMPING;
      x += vx;
      y += vy;

      spotEl.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      // The counter-move. Without it the picture would slide with the
      // light and the whole illusion collapses.
      innerEl.style.transform = `translate3d(${(-x).toFixed(2)}px, ${(-y).toFixed(2)}px, 0)`;

      // Settled: stop asking for frames. A rAF loop that never ends keeps
      // a laptop awake for an effect nobody is looking at.
      if (Math.abs(vx) < 0.01 && Math.abs(vy) < 0.01 &&
          Math.abs(targetX - x) < 0.5 && Math.abs(targetY - y) < 0.5) {
        running = false;
        return;
      }
      frameId = requestAnimationFrame(step);
    };

    const wake = () => {
      if (running) return;
      running = true;
      frameId = requestAnimationFrame(step);
    };

    const onMove = (event: PointerEvent) => {
      const box = frameEl.getBoundingClientRect();
      targetX = event.clientX - box.left - box.width / 2;
      targetY = event.clientY - box.top - box.height / 2;
      wake();
    };

    const onLeave = () => {
      // Home, rather than stopping where it was left. A light abandoned
      // mid-frame reads as a bug the next time you look at the page.
      targetX = 0;
      targetY = 0;
      wake();
    };

    frameEl.addEventListener("pointermove", onMove);
    frameEl.addEventListener("pointerleave", onLeave);
    return () => {
      frameEl.removeEventListener("pointermove", onMove);
      frameEl.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(frameId);
    };
  }, []);

  return (
    <div ref={frame} className={`dot-photo ${className}`}>
      {/* The dissolved layer: always there, dots at the edges. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="dot-photo-base" draggable={false} />

      {/* The clear window, opened where the light falls. */}
      <div ref={spot} className="dot-photo-spot" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={inner} src={src} alt="" className="dot-photo-sharp" draggable={false} />
      </div>
    </div>
  );
}
