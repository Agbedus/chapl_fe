"use client";

import { useRef } from "react";
import {
  Bookmark,
  ClipboardCheck,
  Hand,
  HandCoins,
  HeartHandshake,
  MapPin,
  type LucideIcon,
} from "lucide-react";

import { gsap, useGSAP } from "@/components/landing/motion";

const doors: { icon: LucideIcon; hue: string; title: string; body: string }[] = [
  {
    icon: ClipboardCheck,
    hue: "var(--gold)",
    title: "Check in with a code",
    body: "Six letters on the screen at the front, and they are counted.",
  },
  {
    icon: Hand,
    hue: "var(--cobalt)",
    title: "Answer the room",
    body: "The question the pastor asks arrives on their phone. One tap.",
  },
  {
    icon: Bookmark,
    hue: "var(--violet)",
    title: "Keep a sermon",
    body: "Save it, listen on the way home, send it to a friend.",
  },
  {
    icon: HandCoins,
    hue: "var(--emerald)",
    title: "See what they gave",
    body: "Their own record, anonymous gifts included, whenever they ask.",
  },
  {
    icon: HeartHandshake,
    hue: "var(--ruby)",
    title: "Ask for prayer or a call",
    body: "Privately, to the people whose job it is to answer.",
  },
  {
    icon: MapPin,
    hue: "var(--teal)",
    title: "Find their church",
    body: "Every branch, when it meets, and directions from where they stand.",
  },
];

/**
 * The member's side. The record the office keeps is the account a
 * member signs into, so the heading stays put while the six things they
 * can do pass beside it.
 */
export function Members() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.utils.toArray<HTMLElement>("[data-door]").forEach((door) => {
        gsap.fromTo(
          door,
          { autoAlpha: 0, x: reduce ? 0 : 40 },
          {
            autoAlpha: 1,
            x: 0,
            duration: 1,
            ease: "expo.out",
            scrollTrigger: { trigger: door, start: "top 86%", toggleActions: "play none none reverse" },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="members" className="border-b border-line">
      <div className="mx-auto grid max-w-6xl gap-14 px-6 py-24 sm:py-32 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div className="lg:sticky lg:top-32 lg:self-start">
          <h2 className="head max-w-[14ch] text-[clamp(2.2rem,4.6vw,3.5rem)] text-ink">
            A door in for every member.
          </h2>
          <p className="mt-5 max-w-md text-[17px] leading-[1.6] text-ink-2">
            The record the office keeps is the app a member signs into, on the web, iPhone and Android.
            One church, one truth.
          </p>
        </div>

        <ol className="grid gap-3">
          {doors.map(({ icon: Icon, hue, title, body }) => (
            <li key={title} data-door className="door group" style={{ "--hue": hue } as React.CSSProperties}>
              <span className="door-icon">
                <Icon className="h-[20px] w-[20px]" strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <h3 className="text-[16px] font-semibold tracking-tight text-ink">{title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-[1.55] text-ink-2">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
