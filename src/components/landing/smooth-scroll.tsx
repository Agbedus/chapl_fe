"use client";

import { useEffect } from "react";
import Lenis from "lenis";

import { gsap, ScrollTrigger } from "@/components/landing/motion";

/**
 * Inertial scrolling for the landing page, on the same clock as GSAP.
 *
 * Lenis smooths the wheel and hands every frame to ScrollTrigger, so the
 * scrubbed scenes move with the page instead of a frame behind it. A
 * touch screen keeps its own native momentum, which is already right;
 * reduced motion keeps the browser's scrolling untouched.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({ lerp: 0.11, anchors: { offset: 0 }, autoRaf: false });
    lenis.on("scroll", ScrollTrigger.update);
    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);
    // The menu stops the page while it is open. Lenis owns the wheel, so
    // locking is a word to it, not an `overflow` on the body.
    const lock = (event: Event) => {
      if ((event as CustomEvent<boolean>).detail) lenis.stop();
      else lenis.start();
    };
    window.addEventListener("chapl:scroll-lock", lock);
    // The Sunday hold pins the page at an exact point; Lenis is asked, so
    // its own idea of where the page is stays in step.
    const to = (event: Event) => lenis.scrollTo((event as CustomEvent<number>).detail, { immediate: true, force: true });
    window.addEventListener("chapl:scroll-to", to);
    // Development only: a handle for driving the page from the console.
    if (process.env.NODE_ENV !== "production") (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    return () => {
      window.removeEventListener("chapl:scroll-lock", lock);
      window.removeEventListener("chapl:scroll-to", to);
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}
