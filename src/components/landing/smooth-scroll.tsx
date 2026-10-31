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
    // Development only: a handle for driving the page from the console.
    if (process.env.NODE_ENV !== "production") (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}
