"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { ArrowRight, MessageCircle, Phone } from "lucide-react";

import { DotNumeral, paintNumeral } from "@/components/landing/dot-numeral";
import { Magnetic } from "@/components/landing/magnetic";
import { gsap, ScrollTrigger, useGSAP } from "@/components/landing/motion";
import { stage } from "@/components/landing/stage-state";
import { Stop, Stopped } from "@/components/landing/stop";
import { branches, totals } from "@/lib/congregation";
import { HUES, POLL, peopleOf, youOf } from "@/lib/dot-scenes";

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
          { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.7, ease: "expo.out", stagger: 0.06 },
        );

        // Numbers count with the words that carry them, on the same
        // trigger, so they cannot be passed without being played.
        panel.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
          const to = Number(el.dataset.count);
          const suffix = el.dataset.suffix ?? "";
          const value = { n: reduce ? to : 0 };
          // A figure drawn in dots lights its cells; anything else is text.
          const numeral = el.querySelector<HTMLElement>(".dm");
          const paint = () => {
            const text = `${Math.round(value.n).toLocaleString()}${suffix}`;
            if (numeral) paintNumeral(numeral, text);
            else el.textContent = text;
          };
          paint();
          if (!reduce) reveal.to(value, { n: to, duration: 1.6, ease: "expo.out", onUpdate: paint }, 0.15);
        });
      });

      // Sunday. The count starts the moment the chapter comes up from the
      // bottom of the screen and runs with the scroll. On a wide screen, if
      // its words reach the middle (level with the room on the stage)
      // before everyone is in, the page holds there and the scroll keeps
      // counting instead of moving the page: every turn of the wheel seats
      // more people. When the room is full the page lets go and the story
      // moves on. Scrolling back up while held counts back down, then lets
      // the page go up. A phone, and reduced motion, keep the plain
      // scroll-driven fill: pinning a thumb is worse than a room that
      // fills as you go.
      const sunday = panels[4];
      const bar = root.current?.querySelector<HTMLElement>("[data-sunday-bar]") ?? null;
      const PRE = 0.55;
      const hold = { phase: "idle" as "idle" | "holding" | "done" | "released-up", fill: 0, y: 0, entry: 0 };
      const lock = (on: boolean) => window.dispatchEvent(new CustomEvent("chapl:scroll-lock", { detail: on }));
      const jump = (y: number) => window.dispatchEvent(new CustomEvent("chapl:scroll-to", { detail: y }));
      const setPhase = (next: typeof hold.phase) => {
        const was = hold.phase === "holding";
        hold.phase = next;
        if (was && next !== "holding") lock(false);
        if (!was && next === "holding") lock(true);
      };
      const feed = (dy: number) => {
        hold.fill = Math.min(1, hold.fill + (dy / (window.innerHeight * 0.9)) * (1 - hold.entry));
        if (hold.fill >= 1) {
          hold.fill = 1;
          setPhase("done");
        } else if (hold.fill <= hold.entry && dy < 0) {
          hold.fill = hold.entry;
          setPhase("released-up");
        }
      };
      const onWheel = (e: WheelEvent) => {
        if (hold.phase !== "holding") return;
        feed(e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1));
      };
      let touchY: number | null = null;
      const onTouchStart = (e: TouchEvent) => {
        touchY = e.touches[0]?.clientY ?? null;
      };
      const onTouchMove = (e: TouchEvent) => {
        if (hold.phase !== "holding" || touchY == null) return;
        const now = e.touches[0].clientY;
        feed((touchY - now) * 1.4);
        touchY = now;
      };
      const STEPS: Record<string, number> = { ArrowDown: 80, ArrowUp: -80, PageDown: 700, PageUp: -700, " ": 700, End: 4000, Home: -4000 };
      const onKey = (e: KeyboardEvent) => {
        if (hold.phase !== "holding" || !(e.key in STEPS)) return;
        e.preventDefault();
        feed(STEPS[e.key]);
      };
      // A link out (the nav, the rail) is somebody leaving on purpose.
      const onClick = (e: MouseEvent) => {
        if (hold.phase === "holding" && (e.target as Element | null)?.closest?.("a[href^='#']")) {
          hold.fill = 1;
          setPhase("done");
        }
      };
      window.addEventListener("wheel", onWheel, { passive: true });
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: true });
      window.addEventListener("keydown", onKey);
      document.addEventListener("click", onClick, true);

      const sundayTick = () => {
        if (!sunday) return;
        const vh = window.innerHeight;
        const top = sunday.getBoundingClientRect().top;
        let fill: number;
        if (reduce || window.innerWidth < 1024) {
          if (hold.phase === "holding") setPhase("idle");
          hold.phase = "idle";
          fill = Math.min(1, Math.max(0, (vh - top) / Math.max(1, sunday.offsetHeight)));
        } else {
          // Before the hold: from first appearing at the bottom to the words
          // arriving in the middle.
          const rising = Math.min(1, Math.max(0, (vh - top) / vh)) * PRE;
          if (hold.phase === "idle") {
            hold.fill = rising;
            if (top <= 0 && top > -vh * 0.5) {
              hold.entry = Math.max(rising, PRE);
              hold.fill = hold.entry;
              hold.y = window.scrollY + top;
              jump(hold.y);
              setPhase("holding");
            } else if (top <= -vh * 0.5) {
              hold.fill = 1;
              hold.phase = "done";
            }
          }
          if (hold.phase === "holding" && Math.abs(window.scrollY - hold.y) > 1) jump(hold.y);
          // Let go upward, then turned round and came back down before
          // leaving: hold again where it was, rather than letting the page
          // run on with the room half full.
          if (hold.phase === "released-up" && top < -2) {
            hold.y = window.scrollY + top;
            jump(hold.y);
            setPhase("holding");
          } else if (hold.phase === "released-up" && top > 2) hold.phase = "idle";
          // Well above it again, with the stage on another scene: reset, so
          // the room fills again on the next pass.
          if (hold.phase === "done" && top > vh) {
            hold.phase = "idle";
            hold.fill = 0;
          }
          fill = hold.fill;
        }
        stage.fill = fill;
        if (counter.current) paintNumeral(counter.current, String(Math.round(here * Math.min(1, fill / 0.93))));
        bar?.style.setProperty("--k", fill.toFixed(3));
      };
      gsap.ticker.add(sundayTick);

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

      return () => {
        gsap.ticker.remove(sundayTick);
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("keydown", onKey);
        document.removeEventListener("click", onClick, true);
        if (hold.phase === "holding") lock(false);
      };
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
        <div data-hero-copy className="story-gutter mx-auto w-full max-w-6xl px-6 pt-36 pb-16 sm:pt-40 lg:pt-0 lg:pb-0">
          <div className="max-w-[34rem]">
            <p className="hero-hint rise" style={{ animationDelay: "0ms" }}>
              <span className="hero-hint-dot" aria-hidden />
              Sunday check-in, live
            </p>
            <h1 className="display rise text-[clamp(2.8rem,6.4vw,5.2rem)]" style={{ animationDelay: "60ms" }}>
              One church.
              <br />
              Every branch,
              <br />
              <span className="text-cobalt">
                every name
                <Stop />
              </span>
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
            <p className="hero-meet rise" style={{ animationDelay: "300ms" }}>
              <span aria-hidden />
              Point at any dot to meet them. Every one is somebody.
            </p>
          </div>
        </div>
      </section>

      {/* --- the chapters -------------------------------------------- */}
      {chapters.map((chapter, index) => {
        const holds = chapter.id === "sunday";
        return (
          <section
            key={chapter.id}
            id={chapter.id}
            data-chapter
            className={`relative z-10 flex items-end pb-10 lg:pb-0 ${
              holds ? "min-h-[190dvh] items-start lg:min-h-[170dvh]" : "min-h-[100dvh] lg:items-center"
            }`}
          >
            <div className={`story-gutter mx-auto w-full max-w-6xl px-6 ${holds ? "self-stretch" : ""}`}>
              {/* Sunday holds the screen while the room fills: its words
                  stay put for the length of it. */}
              <div
                className={`story-copy max-w-[28rem] ${holds ? "story-copy-holds" : ""}`}
              >
                {/* The chapter's number, in the page's own dots: the story is
                    a real sequence, so the numbers say something. */}
                <p data-reveal className="mb-5 text-ink-3">
                  <DotNumeral value={`0${index + 1}`} cell="2.4px" label={`Chapter ${index + 1}`} />
                </p>
                <h2 data-reveal className="head text-[clamp(2.6rem,5.2vw,4.6rem)] text-ink">
                  <Stopped>{chapter.title}</Stopped>
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

                {chapter.id === "cell" && (
                  <div data-reveal className="story-card story-figs mt-8">
                    <Fig value={myCell.members} label="in the cell" />
                    <Fig value={myCell.present} label="here last Sunday" tone="var(--teal)" />
                    <Fig value={1} label="leader" />
                  </div>
                )}

                {chapter.id === "branch" && (
                  <div data-reveal className="story-card story-figs mt-8">
                    <Fig value={myBranch.cells.length} label="cells" />
                    <Fig value={myBranch.members} label="on the roll" tone="var(--violet)" />
                    <Fig value={Math.round((myBranch.present / myBranch.members) * 100)} suffix="%" label="turnout" />
                  </div>
                )}

                {chapter.id === "church" && (
                  <div data-reveal className="story-card mt-8 grid gap-2.5">
                    {branches.map((branch, i) => (
                      <div key={branch.id} className="grid grid-cols-[10px_1fr_auto] items-center gap-3 text-[14px]">
                        <span className="dot" style={{ color: `var(--${HUES[i % 6]})` }} aria-hidden />
                        <span className="text-ink">{branch.name}</span>
                        <DotNumeral value={String(branch.members)} slots={3} cell="2.4px" label={`${branch.members} people`} />
                      </div>
                    ))}
                  </div>
                )}

                {holds && (
                  <>
                  <p data-reveal className="mt-8 flex items-end gap-4">
                    <DotNumeral
                      ref={counter}
                      value="0"
                      slots={String(here).length}
                      label={`${here} of ${totals.members.toLocaleString()} in the room`}
                      cell="clamp(5px, 0.62vw, 7px)"
                    />
                    <span className="pb-px text-[14px] text-ink-3">
                      of <DotNumeral className="dm-inline" value={String(totals.members)} cell="2.2px" /> in the room
                    </span>
                  </p>
                  <div data-reveal className="sunday-bar" aria-hidden>
                    <i data-sunday-bar />
                  </div>
                  </>
                )}

                {chapter.id === "ask" && (
                  <div data-reveal className="mt-8">
                    <p className="text-[13px] font-medium text-ink-2">Which point spoke to you?</p>
                    <ul className="mt-3 space-y-2.5">
                      {POLL.map((option) => (
                        <li
                          key={option.label}
                          className="flex items-center justify-between gap-6 border-b border-line pb-2.5 text-[15px]"
                        >
                          <span className="text-ink">{option.label}</span>
                          <span data-count={Math.round(option.share * 100)} data-suffix="%" className="text-ink-2">
                            <DotNumeral
                              value={`${Math.round(option.share * 100)}%`}
                              template="00%"
                              label={`${Math.round(option.share * 100)} per cent`}
                              cell="2.8px"
                            />
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
                          <dd data-count={stat.value}>
                            <DotNumeral
                              value={String(stat.value)}
                              slots={String(stat.value).length}
                              label={stat.value.toLocaleString()}
                              cell="clamp(3.5px, 0.4vw, 5px)"
                            />
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

/** One figure in a chapter's card, counting up when the chapter arrives. */
function Fig({ value, label, suffix = "", tone }: { value: number; label: string; suffix?: string; tone?: string }) {
  const text = `${value}${suffix}`;
  return (
    <div className="flex flex-col gap-2">
      <span data-count={value} data-suffix={suffix || undefined} style={tone ? { color: tone } : undefined}>
        <DotNumeral value={text} template={suffix ? "00" + suffix : undefined} cell="4px" label={`${value}${suffix}`} />
      </span>
      <span className="text-[12.5px] text-ink-3">{label}</span>
    </div>
  );
}
