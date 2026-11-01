"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";

import { gsap, useGSAP } from "@/components/landing/motion";

const QUESTIONS = [
  {
    q: "Who is Chapl for?",
    a: "Churches that meet in more than one place, or have more people than one office can keep in its head. It works for a single branch too, and grows when you open the next one.",
  },
  {
    q: "How do we set it up?",
    a: "Create the church, add your branches and their cells, and invite your leaders. Your existing roll comes in from a spreadsheet, so nobody retypes four hundred names.",
  },
  {
    q: "Can we start with one branch?",
    a: "Yes, and we would suggest it. Bring one branch in, run a few Sundays on it, and add the rest when it is working the way you want.",
  },
  {
    q: "Do our members have to download an app?",
    a: "No. Everything a member can do works on the web. The phone app for iPhone and Android is there for the people who would rather have it in their pocket.",
  },
  {
    q: "Who can see what?",
    a: "Authority rolls down the church. A cell leader sees their cell, a branch pastor their branch, and giving is visible only to the people you give that role. Anonymous gifts stay anonymous to everyone but the giver.",
  },
  {
    q: "How does Sunday check-in work?",
    a: "A leader opens check-in and a six-letter code goes up on the screen. Members enter it on their phones, they are counted, and you can watch the room fill as it happens.",
  },
  {
    q: "Is our church's information kept private?",
    a: "Each church sees only its own people. Signing in is handled on our servers rather than in the browser, and every change anyone makes is kept on an audit trail you can read.",
  },
] as const;

/**
 * The questions a church leader asks before they sign up, answered
 * plainly. Each answer opens by height on a CSS grid row (0fr to 1fr),
 * which animates on the compositor-friendly path rather than measuring.
 */
export function FAQ() {
  const root = useRef<HTMLElement>(null);
  const [open, setOpen] = useState<number | null>(0);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      gsap.fromTo(
        "[data-question]",
        { autoAlpha: 0, y: reduce ? 0 : 18 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          ease: "expo.out",
          stagger: 0.06,
          scrollTrigger: { trigger: "[data-questions]", start: "top 82%" },
        },
      );
    },
    { scope: root },
  );

  return (
    <section ref={root} id="questions" className="quiet-dots border-b border-line bg-mist">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 sm:py-32 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="head max-w-[12ch] text-[clamp(2.2rem,4.6vw,3.6rem)] text-ink">Questions leaders ask.</h2>
          <p className="mt-5 max-w-sm text-[17px] leading-[1.6] text-ink-2">
            The ones that come up before a church signs up. Ask us anything else when you get started.
          </p>
        </div>

        <ul data-questions className="faq">
          {QUESTIONS.map((item, i) => {
            const isOpen = open === i;
            return (
              <li key={item.q} data-question className="faq-item" data-open={isOpen ? "" : undefined}>
                <h3>
                  <button
                    type="button"
                    className="faq-question"
                    aria-expanded={isOpen}
                    aria-controls={`faq-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                  >
                    <span>{item.q}</span>
                    <Plus className="faq-mark h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                  </button>
                </h3>
                <div id={`faq-${i}`} className="faq-answer" role="region">
                  <div className="overflow-hidden">
                    <p className="pb-6 pr-10 text-[15.5px] leading-[1.65] text-ink-2">{item.a}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
