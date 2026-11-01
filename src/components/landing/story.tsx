"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";

import { Magnetic } from "@/components/landing/magnetic";
import { gsap, ScrollTrigger, useGSAP } from "@/components/landing/motion";
import { stage } from "@/components/landing/stage-state";
import { branches, totals } from "@/lib/congregation";
import { POLL, peopleOf, youOf } from "@/lib/dot-scenes";

// WebGL is the browser's alone, and three.js is the heaviest thing on the
// page: it loads after the words have painted, never in front of them.
const DotStage = dynamic(() => import("@/components/landing/dot-stage"), { ssr: false });

const here = totals.present;

// The story's one person, the same dot the stage rings.
const people = peopleOf(branches);
const me = people[youOf(people)];
const myBranch = branches[me.branch];
const myCell = myBranch.cells[me.cell];
// Their last eight Sundays: one missed, in early spring.
const SUNDAYS = [1, 1, 1, 0, 1, 1, 1, 1];

const chapters = [
  {
    id: "one",
    rail: "One person",
    title: "It starts with one.",
    body: "Every church is somebody's name first. Chapl keeps their record, their Sundays and their cell, and notices when they go quiet.",
  },
  {
    id: "cell",
    rail: "Their cell",
    title: "Then their cell.",
    body: `${myCell.members} people and a leader who knows them. The leader sees this group and nobody else's. A hollow dot is a Sunday missed.`,
  },
  {
    id: "branch",
    rail: "Their branch",
    title: "Then a branch.",
    body: `${myBranch.cells.length} cells make ${myBranch.name}: its own services, its own pastor, its own numbers, kept without a spreadsheet.`,
  },
  {
    id: "church",
    rail: "The church",
    title: "Then the whole church.",
    body: `${branches.length} branches on one account. Every count rolls up the same Sunday, and nobody types it twice.`,
  },
  {
    id: "sunday",
    rail: "Sunday",
    title: "Sunday, live.",
    body: "Members check in with the code on the screen. You watch the room fill from your phone, branch by branch.",
  },
  {
    id: "ask",
    rail: "Ask the room",
    title: "Ask the room.",
    body: "Put one question on every phone in the building. Answers come back as a show of hands, never with names.",
  },
  {
    id: "everyone",
    rail: "Everyone",
    title: "Everyone, by name.",
    body: "From one person to the whole church, on one screen. Set yours up one branch at a time, starting this week.",
  },
] as const;

const PAYOFF = [
  { value: totals.members, label: "people" },
  { value: branches.length, label: "branches" },
  { value: totals.cells, label: "cells" },
];

/**
 * The top of the page: the hero and the story told beneath it, in one
 * drawing that never leaves the screen.
 *
 * It is told to the person setting a church up, and it starts where a
 * church does: with one person. The door (the app's mark: an arch with
 * the cross cut out, and a ringed dot where the arms meet) gives up
 * everyone but that one; then their cell gathers round them, then their
 * branch, then the church; Sunday fills the room; the room answers a
 * question; and the whole church closes back into the door, everyone
 * lit, the one still ringed. Each chapter's words arrive as its dots
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

        const reveal = gsap.timeline({
          scrollTrigger: { trigger: panel, start: "top 58%", toggleActions: "play none none reverse" },
        });
        reveal.fromTo(
          panel.querySelectorAll("[data-reveal]"),
          reduce ? { autoAlpha: 0 } : { autoAlpha: 0, y: 28, filter: "blur(6px)" },
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.9, ease: "expo.out", stagger: 0.07 },
        );

        // Numbers count with the words that carry them, on the same
        // trigger, so they cannot be passed without being played.
        panel.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
          const to = Number(el.dataset.count);
          const suffix = el.dataset.suffix ?? "";
          const value = { n: reduce ? to : 0 };
          const paint = () => {
            el.textContent = `${Math.round(value.n).toLocaleString()}${suffix}`;
          };
          paint();
          if (!reduce) reveal.to(value, { n: to, duration: 1.6, ease: "expo.out", onUpdate: paint }, 0.15);
        });
      });

      // Sunday: the room fills while its chapter holds the screen, and the
      // count beside it is the same arrivals the dots are drawing.
      const sunday = panels[4];
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
            {[{ id: "top", rail: "The door" }, ...chapters].map((c, i) => (
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
            <h1 className="display rise text-[clamp(2.8rem,6.4vw,5.2rem)]" style={{ animationDelay: "60ms" }}>
              One church.
              <br />
              Every branch,
              <br />
              <span className="text-cobalt">every name.</span>
            </h1>
            <p
              className="rise mt-7 max-w-[27rem] text-[17px] leading-[1.6] text-ink-2"
              style={{ animationDelay: "140ms" }}
            >
              Set up your church once: branches, cells, Sundays, giving and care. Every member gets an app of their
              own.
            </p>
            <div className="rise mt-9 flex flex-wrap items-center gap-3" style={{ animationDelay: "210ms" }}>
              <Magnetic>
                <a href="/register" className="btn btn-primary btn-lg group">
                  Get started
                  <ArrowRight className="nudge h-4 w-4" strokeWidth={2.1} aria-hidden />
                </a>
              </Magnetic>
              <a href="#one" className="btn btn-quiet btn-lg">
                See how it works
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* --- the chapters -------------------------------------------- */}
      {chapters.map((chapter) => {
        const holds = chapter.id === "sunday";
        return (
          <section
            key={chapter.id}
            id={chapter.id}
            data-chapter
            className={`relative z-10 flex items-end pb-10 lg:pb-0 ${
              holds ? "min-h-[190dvh] items-start" : "min-h-[100dvh] lg:items-center"
            }`}
          >
            <div className={`mx-auto w-full max-w-6xl px-6 ${holds ? "self-stretch" : ""}`}>
              {/* Sunday holds the screen while the room fills: its words
                  stay put for the length of it. */}
              <div
                className={`story-copy max-w-[27rem] ${
                  holds ? "sticky top-[54dvh] mt-[54dvh] lg:top-[calc(50dvh-9rem)] lg:mt-[calc(50dvh-9rem)]" : ""
                }`}
              >
                <h2 data-reveal className="head text-[clamp(2.3rem,4.8vw,4rem)] text-ink">
                  {chapter.title}
                </h2>
                <p data-reveal className="mt-5 text-[17px] leading-[1.62] text-ink-2">
                  {chapter.body}
                </p>

                {chapter.id === "one" && (
                  <div data-reveal className="person-card mt-8">
                    <div className="flex items-center gap-3">
                      <span className="person-avatar">AO</span>
                      <div className="min-w-0">
                        <p className="text-[14.5px] font-semibold tracking-tight text-ink">Ama Owusu</p>
                        <p className="text-[12.5px] text-ink-3">
                          {myCell.name}, {myBranch.name}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-[5px]" aria-label="Seven of her last eight Sundays">
                        {SUNDAYS.map((was, i) => (
                          <span key={i} className={was ? "dot" : "dot-hollow"} style={{ color: "var(--gold)" }} />
                        ))}
                      </div>
                      <div className="flex gap-2" aria-hidden>
                        <span className="chip">
                          <Phone className="h-3.5 w-3.5" strokeWidth={2} /> Call
                        </span>
                        <span className="chip chip-whatsapp">
                          <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} /> WhatsApp
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {holds && (
                  <p data-reveal className="mt-8 flex items-baseline gap-3">
                    <span ref={counter} className="figure tnum text-[clamp(2.6rem,4.4vw,3.6rem)] text-ink">
                      0
                    </span>
                    <span className="text-[14px] text-ink-3">of {totals.members.toLocaleString()} in the room</span>
                  </p>
                )}

                {chapter.id === "ask" && (
                  <div data-reveal className="mt-8">
                    <p className="text-[13px] font-medium text-ink-2">Which point spoke to you?</p>
                    <ul className="mt-3 space-y-2.5">
                      {POLL.map((option) => (
                        <li
                          key={option.label}
                          className="flex items-baseline justify-between gap-6 border-b border-line pb-2.5 text-[15px]"
                        >
                          <span className="text-ink">{option.label}</span>
                          <span data-count={Math.round(option.share * 100)} data-suffix="%" className="tnum text-ink-2">
                            {Math.round(option.share * 100)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {chapter.id === "everyone" && (
                  <div data-reveal className="mt-8">
                    <dl className="grid grid-cols-3 gap-4 border-t border-line pt-5">
                      {PAYOFF.map((stat) => (
                        <div key={stat.label} className="flex flex-col-reverse">
                          <dt className="mt-1 text-[13px] text-ink-3">{stat.label}</dt>
                          <dd data-count={stat.value} className="figure tnum text-[clamp(1.8rem,3vw,2.4rem)] text-ink">
                            {stat.value.toLocaleString()}
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <div className="mt-8">
                      <Magnetic>
                        <a href="/register" className="btn btn-primary btn-lg group">
                          Get started
                          <ArrowRight className="nudge h-4 w-4" strokeWidth={2.1} aria-hidden />
                        </a>
                      </Magnetic>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
