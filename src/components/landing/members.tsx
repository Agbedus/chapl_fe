"use client";

import { useRef, useState } from "react";
import {
  Bookmark,
  Check,
  ClipboardCheck,
  Hand,
  HandCoins,
  Heart,
  HeartHandshake,
  Globe,
  MapPin,
  Navigation,
  Smartphone,
  TabletSmartphone,
  Share2,
  type LucideIcon,
} from "lucide-react";

import { gsap, ScrollTrigger, useGSAP } from "@/components/landing/motion";

type Door = { icon: LucideIcon; hue: string; title: string; body: string };

const doors: Door[] = [
  { icon: ClipboardCheck, hue: "var(--gold)", title: "Check in with a code", body: "Six letters on the screen at the front, and they are counted." },
  { icon: Hand, hue: "var(--cobalt)", title: "Answer the room", body: "The question the pastor asks arrives on their phone. One tap." },
  { icon: Bookmark, hue: "var(--violet)", title: "Keep a sermon", body: "Save it, listen on the way home, send it to a friend." },
  { icon: HandCoins, hue: "var(--emerald)", title: "See what they gave", body: "Their own record, anonymous gifts included, whenever they ask." },
  { icon: HeartHandshake, hue: "var(--ruby)", title: "Ask for prayer or a call", body: "Privately, to the people whose job it is to answer." },
  { icon: MapPin, hue: "var(--teal)", title: "Find their church", body: "Every branch, when it meets, and directions from where they stand." },
];

const platforms: { icon: LucideIcon; label: string }[] = [
  { icon: Globe, label: "Web" },
  { icon: Smartphone, label: "iPhone" },
  { icon: TabletSmartphone, label: "Android" },
];

const MONTHS = [3, 4, 3, 5, 4, 6, 5, 5, 7, 6, 7, 9];
// Rounded: the server and the browser can disagree on the last digit of a
// sine, and that digit lands in an inline style React compares on hydration.
const WAVE = Array.from({ length: 34 }, (_, i) =>
  Math.round(22 + Math.abs(Math.sin(i * 1.3) * 0.6 + Math.sin(i * 0.37) * 0.4) * 78),
);
const PINS = [
  { x: 22, y: 30, hue: "var(--cobalt)" },
  { x: 64, y: 22, hue: "var(--violet)", mine: true },
  { x: 78, y: 58, hue: "var(--teal)" },
  { x: 40, y: 64, hue: "var(--emerald)" },
  { x: 16, y: 74, hue: "var(--gold)" },
  { x: 58, y: 84, hue: "var(--ruby)" },
];

/** What the member's phone shows for each door: the product's own words,
    drawn in the same dots as everything else on the page. */
function Screen({ index }: { index: number }) {
  switch (index) {
    case 0:
      return (
        <>
          <p className="screen-kicker">Sunday service, Central</p>
          <p className="screen-title">You are in the room.</p>
          <div className="mt-4 grid grid-cols-6 gap-1.5" aria-hidden>
            {"K7M2QX".split("").map((ch) => (
              <span key={ch} className="code-box">
                {ch}
              </span>
            ))}
          </div>
          <span className="screen-button mt-3" style={{ background: "var(--gold)" }}>
            <Check className="h-3.5 w-3.5" strokeWidth={2.4} /> Checked in
          </span>
          <div className="room-fill mt-5 grid grid-cols-10 gap-[5px]" aria-hidden>
            {Array.from({ length: 50 }, (_, i) => (
              <span key={i} className="dot" style={{ color: "var(--gold)", animationDelay: `${i * 22}ms` }} />
            ))}
          </div>
          <p className="screen-meta mt-3">412 of 560 here</p>
        </>
      );
    case 1:
      return (
        <>
          <p className="screen-kicker">Live question</p>
          <p className="screen-title">Which point spoke to you?</p>
          <div className="mt-4 space-y-3">
            {[
              { label: "We are one body", n: 17, mine: true },
              { label: "Every gift matters", n: 11 },
              { label: "Still thinking", n: 6 },
            ].map((o) => (
              <div key={o.label} className={`answer ${o.mine ? "answer-mine" : ""}`}>
                <div className="flex items-center justify-between text-[11.5px]">
                  <span className="font-medium text-ink">{o.label}</span>
                  {o.mine && <span className="text-[10.5px] font-semibold text-cobalt">Yours</span>}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-[3px]" style={{ color: "var(--cobalt)" }} aria-hidden>
                  {Array.from({ length: o.n }, (_, i) => (
                    <span key={i} className="dot" style={{ width: 4, height: 4 }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      );
    case 2:
      return (
        <>
          <div className="sermon-cover" aria-hidden />
          <p className="screen-title mt-3">What the Upper Room Was For</p>
          <p className="screen-meta">Ps. Kwabena Asante, Acts 1:13</p>
          <div className="mt-3 flex h-8 items-end gap-[2px]" aria-hidden>
            {WAVE.map((h, i) => (
              <span key={i} className={`w-full rounded-full ${i < 13 ? "bg-violet" : "bg-line-strong"}`} style={{ height: `${h}%` }} />
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <span className="screen-chip text-violet">
              <Heart className="h-3 w-3" fill="currentColor" strokeWidth={2} /> Saved
            </span>
            <span className="screen-chip">
              <Share2 className="h-3 w-3" strokeWidth={2} /> Share
            </span>
          </div>
        </>
      );
    case 3:
      return (
        <>
          <p className="screen-kicker">Your giving, 2026</p>
          <p className="figure tnum mt-1 text-[26px] leading-none text-ink">GHS 4,820</p>
          <div className="mt-5 flex items-end gap-[6px]" aria-hidden>
            {MONTHS.map((n, m) => (
              <div key={m} className="flex flex-col-reverse gap-[3px]" style={{ color: "var(--emerald)" }}>
                {Array.from({ length: n }, (_, d) => (
                  <span key={d} className="dot" style={{ width: 4, height: 4 }} />
                ))}
              </div>
            ))}
          </div>
          <p className="screen-meta mt-4">GHS 600 of it given anonymously. Only you see that here.</p>
        </>
      );
    case 4:
      return (
        <>
          <p className="screen-kicker">Prayer and care</p>
          <div className="mt-2 rounded-xl border border-line p-3">
            <p className="text-[12.5px] font-semibold text-ink">Pray for my exams</p>
            <p className="screen-meta mt-0.5">Prayer, sent Tuesday</p>
            <span className="mt-2 inline-flex rounded-full px-2 py-0.5 text-[10.5px] font-semibold text-ruby" style={{ background: "color-mix(in oklab, var(--ruby) 12%, transparent)" }}>
              Seen by Pastor Kofi
            </span>
          </div>
          <ol className="mt-4 space-y-2.5" aria-hidden>
            {["Sent", "Seen", "Closed"].map((step, i) => (
              <li key={step} className="flex items-center gap-2.5 text-[11.5px]">
                <span className={i < 2 ? "dot" : "dot-hollow"} style={{ color: "var(--ruby)" }} />
                <span className={i < 2 ? "text-ink" : "text-ink-3"}>{step}</span>
              </li>
            ))}
          </ol>
        </>
      );
    default:
      return (
        <>
          <p className="screen-kicker">Your church</p>
          <div className="map mt-2" aria-hidden>
            {PINS.map((pin, i) => (
              <span
                key={i}
                className={`map-pin ${pin.mine ? "map-pin-mine" : ""}`}
                style={{ left: `${pin.x}%`, top: `${pin.y}%`, color: pin.hue }}
              />
            ))}
          </div>
          <p className="screen-title mt-3">Adenta</p>
          <p className="screen-meta">Sundays at 7:30 and 10:00</p>
          <span className="screen-button mt-3" style={{ background: "var(--teal)" }}>
            <Navigation className="h-3.5 w-3.5" strokeWidth={2.2} /> Directions
          </span>
        </>
      );
  }
}

/**
 * The member's side: the record the office keeps is the app a member
 * signs into. A phone sits beside the six things it does and shows each
 * as it is reached, by scroll or by pointer: the page answers "what does
 * my congregation actually get?" by showing it, in the product's own
 * words and dots, rather than listing it.
 */
export function Members() {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const items = gsap.utils.toArray<HTMLElement>("[data-door]");
      items.forEach((door, i) => {
        gsap.fromTo(
          door,
          { autoAlpha: 0, x: reduce ? 0 : 36 },
          {
            autoAlpha: 1,
            x: 0,
            duration: 1,
            ease: "expo.out",
            scrollTrigger: { trigger: door, start: "top 88%", toggleActions: "play none none reverse" },
          },
        );
        // The phone follows the door passing the middle of the screen.
        ScrollTrigger.create({
          trigger: door,
          start: "top 55%",
          end: "bottom 55%",
          onToggle: (self) => {
            if (self.isActive) setActive(i);
          },
        });
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="members" className="quiet-dots border-b border-line">
      <div className="mx-auto max-w-6xl px-6 py-24 sm:py-32">
        {/* Header and body share one column template: the title above the
            doors at the left, the words about the app above the phone at
            the right. Two vertical edges, and everything sits on them. */}
        <header className="members-grid gap-y-6 border-b border-line pb-10 lg:items-end">
          <h2 className="head max-w-[13ch] text-[clamp(2.4rem,5vw,4rem)] text-ink">A door in for every member.</h2>
          <div>
            <p className="text-[16.5px] leading-[1.6] text-ink-2">
              The record your office keeps is the app your members sign into. One church, one truth, and nothing
              typed twice.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Where it runs">
              {platforms.map(({ icon: Icon, label }) => (
                <li key={label} className="platform">
                  <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </header>

        {/* The phone sets the height of the row and the six doors share
            it exactly, so the two columns start and end together. */}
        <div className="members-grid mt-12 gap-y-10">
          <ol className="door-list">
            {doors.map(({ icon: Icon, hue, title, body }, i) => (
              <li key={title} data-door>
                <button
                  type="button"
                  className="door group"
                  data-on={i === active ? "" : undefined}
                  style={{ "--hue": hue } as React.CSSProperties}
                  onPointerEnter={() => setActive(i)}
                  onFocus={() => setActive(i)}
                  onClick={() => setActive(i)}
                >
                  <span className="door-icon">
                    <Icon className="h-[20px] w-[20px]" strokeWidth={1.8} />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-[16px] font-semibold tracking-tight text-ink">{title}</span>
                    <span className="mt-1 block text-[14.5px] leading-[1.55] text-ink-2">{body}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>

          <div className="hidden sm:block">
            <div className="phone" aria-label={`The member app: ${doors[active].title}`} role="img">
              <span className="phone-island" aria-hidden />
              <div className="phone-screen">
                {doors.map((door, i) => (
                  <div key={door.title} className="phone-page" data-on={i === active ? "" : undefined} aria-hidden>
                    <Screen index={i} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
