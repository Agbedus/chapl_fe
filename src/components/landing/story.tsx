"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";

import { Magnetic } from "@/components/landing/magnetic";
import { gsap, ScrollTrigger, useGSAP } from "@/components/landing/motion";
import { stage } from "@/components/landing/stage-state";
import { branches, totals } from "@/lib/congregation";
import { POLL } from "@/lib/dot-scenes";

// WebGL is the browser's alone, and three.js is the heaviest thing on the
// page: it loads after the words have painted, never in front of them.
const DotStage = dynamic(() => import("@/components/landing/dot-stage"), { ssr: false });

const here = totals.present;

const chapters = [
  {
    id: "one-body",
    rail: "One body",
    title: "One body.",
    body: `Every dot is a person on the roll. ${totals.members.toLocaleString()} of them, one church, on one screen.`,
  },
  {
    id: "branches",
    rail: "Branches",
    title: `${branches.length} branches, one account.`,
    body: "Each site keeps its own services, leaders and numbers, and every count rolls up to the church the same Sunday.",
  },
  {
    id: "cells",
    rail: "Cells",
    title: "Cells, where people are known.",
    body: "A leader sees their own group. A hollow dot missed last Sunday, and their cell is the first to know.",
  },
  {
    id: "sunday",
    rail: "Sunday",
    title: "Sunday, live.",
    body: "Members check in with the code on the screen. Leaders watch the room fill from their phones.",
  },
  {
    id: "ask",
    rail: "Ask the room",
    title: "Ask the room.",
    body: "Put one question on every phone in the building. Answers come back as a show of hands, never with names.",
  },
  {
    id: "every-name",
    rail: "Every name",
    title: "And every name.",
    body: "Someone has missed three Sundays. Chapl puts them at the top of the week, one tap from a call or a WhatsApp.",
  },
] as const;

/**
 * The top of the page: the hero and the story told beneath it, in one
 * drawing that never leaves the screen.
 *
 * The congregation's dots sit in a sticky layer behind the copy and the
 * scroll moves them through the church: the window, one body, its
 * branches, its cells, Sunday's room filling, a show of hands, one name.
 * Each chapter is a full screen of scroll; its words arrive as the dots
 * finish arriving, so the eye has one thing to follow at a time.
 */
export function Story() {
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const rail = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const panels = gsap.utils.toArray<HTMLElement>("[data-chapter]");

      // Each chapter morphs the stage from the scene before it to its own,
      // across the stretch of scroll where it rises into place.
      panels.forEach((panel, i) => {
        ScrollTrigger.create({
          trigger: panel,
          start: "top 92%",
          end: "top 32%",
          onUpdate: (self) => {
            stage.target = i + self.progress;
          },
        });

        const copy = panel.querySelectorAll("[data-reveal]");
        gsap.fromTo(
          copy,
          reduce ? { autoAlpha: 0 } : { autoAlpha: 0, y: 28, filter: "blur(6px)" },
          {
            autoAlpha: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.9,
            ease: "expo.out",
            stagger: 0.07,
            scrollTrigger: { trigger: panel, start: "top 58%", toggleActions: "play none none reverse" },
          },
        );
      });

      // Sunday: the room fills while its chapter holds the screen, and the
      // count beside it is the same arrivals the dots are drawing.
      const sunday = panels[3];
      if (sunday) {
        ScrollTrigger.create({
          trigger: sunday,
          start: "top 30%",
          end: "bottom 100%",
          onUpdate: (self) => {
            stage.fill = self.progress;
            if (counter.current) {
              counter.current.textContent = Math.round(here * Math.min(1, self.progress / 0.93)).toLocaleString();
            }
          },
        });
      }

      // The answers count up as the hands gather.
      gsap.utils.toArray<HTMLElement>("[data-share]").forEach((el) => {
        const value = { n: 0 };
        gsap.to(value, {
          n: Number(el.dataset.share),
          duration: 1.4,
          ease: "expo.out",
          scrollTrigger: { trigger: el, start: "top 75%", toggleActions: "play none none reverse" },
          onUpdate: () => {
            el.textContent = `${Math.round(value.n)}%`;
          },
        });
      });

      // The hero's words lift away as the story takes the screen.
      if (!reduce) {
        gsap.to("[data-hero-copy]", {
          y: -80,
          autoAlpha: 0,
          ease: "none",
          scrollTrigger: { trigger: "[data-hero]", start: "top top", end: "bottom 35%", scrub: true },
        });
      }

      // Where you are in the story, on the rail.
      ScrollTrigger.create({
        trigger: root.current,
        start: "top top",
        end: "bottom bottom",
        onUpdate: () => {
          const at = Math.round(stage.target);
          rail.current?.querySelectorAll("li").forEach((li, i) => li.toggleAttribute("data-on", i === at));
        },
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} id="story" className="relative -mt-16">
      {/* Pulled up under the header (h-16), which is translucent: the
          stage is the full screen from the first frame, not a screen
          pushed down by the header's height. */}
      {/* The stage: sticky behind everything in this block and released
          exactly at its end. It sticks inside a layer the height of the
          story; a negative margin instead let it hang a screen past it. */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="sticky top-0 h-[100dvh] overflow-hidden">
          <DotStage />
          <ol
            ref={rail}
            className="story-rail pointer-events-auto absolute left-6 top-1/2 hidden -translate-y-1/2 flex-col gap-3.5 xl:flex"
            aria-label="The story"
          >
            {[{ id: "top", rail: "The window" }, ...chapters].map((c, i) => (
              <li key={c.id} data-on={i === 0 ? "" : undefined}>
                <a href={i === 0 ? "#top" : `#${c.id}`} className="story-rail-link">
                  <span className="story-rail-dot" aria-hidden />
                  <span className="story-rail-label">{c.rail}</span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* --- the hero ------------------------------------------------ */}
      <section id="top" data-hero className="relative z-10 flex min-h-[100dvh] items-start lg:items-center">
        <div data-hero-copy className="mx-auto w-full max-w-6xl px-6 pt-36 pb-16 sm:pt-40 lg:pt-0 lg:pb-0">
          <div className="max-w-[34rem]">
            <h1 className="display rise text-[clamp(2.8rem,6.4vw,5rem)]" style={{ animationDelay: "60ms" }}>
              One church.
              <br />
              Every branch,
              <br />
              <span className="text-cobalt">every name.</span>
            </h1>
            <p
              className="rise mt-7 max-w-[26rem] text-[17px] leading-[1.6] text-ink-2"
              style={{ animationDelay: "140ms" }}
            >
              Branches, cells, Sundays, giving and care in one place, and an app for every member.
            </p>
            <div className="rise mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "210ms" }}>
              <Magnetic>
                <a href="/register" className="btn btn-primary btn-lg group">
                  Get started
                  <ArrowRight className="nudge h-4 w-4" strokeWidth={2.1} aria-hidden />
                </a>
              </Magnetic>
              <a href="#one-body" className="btn btn-quiet btn-lg">
                See how it works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* --- the chapters -------------------------------------------- */}
      {chapters.map((chapter) => (
        <section
          key={chapter.id}
          id={chapter.id}
          data-chapter
          className={`relative z-10 flex items-end pb-10 lg:pb-0 ${
            chapter.id === "sunday" ? "min-h-[190dvh] items-start" : "min-h-[100dvh] lg:items-center"
          }`}
        >
          <div className={`mx-auto w-full max-w-6xl px-6 ${chapter.id === "sunday" ? "self-stretch" : ""}`}>
            {/* Sunday holds the screen while the room fills: its words
                stay put for the length of it. */}
            <div
              className={`story-copy max-w-[25rem] ${
                chapter.id === "sunday"
                  ? "sticky top-[54dvh] mt-[54dvh] lg:top-[calc(50dvh-8rem)] lg:mt-[calc(50dvh-8rem)]"
                  : ""
              }`}
            >
              <h2 data-reveal className="head text-[clamp(2.1rem,4.4vw,3.4rem)] text-ink">
                {chapter.title}
              </h2>
              <p data-reveal className="mt-5 text-[16.5px] leading-[1.62] text-ink-2">
                {chapter.body}
              </p>

              {chapter.id === "sunday" && (
                <p data-reveal className="mt-7 flex items-baseline gap-3">
                  <span ref={counter} className="figure tnum text-[clamp(2.4rem,4vw,3.2rem)] text-ink">
                    0
                  </span>
                  <span className="text-[14px] text-ink-3">of {totals.members.toLocaleString()} in the room</span>
                </p>
              )}

              {chapter.id === "ask" && (
                <div data-reveal className="mt-7">
                  <p className="text-[13px] font-medium text-ink-2">Which point spoke to you?</p>
                  <ul className="mt-3 space-y-2">
                    {POLL.map((option) => (
                      <li key={option.label} className="flex items-baseline justify-between gap-6 border-b border-line pb-2 text-[14px]">
                        <span className="text-ink">{option.label}</span>
                        <span data-share={Math.round(option.share * 100)} className="tnum text-ink-3">
                          0%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {chapter.id === "every-name" && (
                <div data-reveal className="person-card mt-7">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-full bg-[color-mix(in_oklab,var(--ruby)_14%,transparent)] text-[13px] font-semibold text-ruby">
                      YD
                    </span>
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-semibold tracking-tight text-ink">Yaw Darko</p>
                      <p className="text-[12.5px] text-ink-3">Wellspring 3, Adenta. Last seen 12 July</p>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2" aria-hidden>
                    <span className="chip">
                      <Phone className="h-3.5 w-3.5" strokeWidth={2} /> Call
                    </span>
                    <span className="chip chip-whatsapp">
                      <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} /> WhatsApp
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
