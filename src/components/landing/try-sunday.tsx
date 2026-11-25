"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

import { DotNumeral } from "@/components/landing/dot-numeral";
import { Stopped } from "@/components/landing/stop";
import { POLL } from "@/lib/dot-scenes";

/**
 * Try Sunday: what a member does when they walk in, done for real.
 *
 * The screen at the front shows the code in the page's dots; the phone
 * beside it takes the six characters. Get it right and you arrive: your
 * seat is ringed in a room of 120, the count on the screen and the phone
 * move together, and the question goes up. Your hand joins your answer.
 * Nothing leaves the page.
 */

const CODE = "K7M2QX";
const SEATS = 120;
const ME = 57;
/** Already in when you get there, and how many are in by the time you sit. */
const START = 96;
const END = 104;
const HANDS = [41, 29, 18];
const HINT = "Six characters. Letters are not case sensitive.";

/** A scattered order, fixed: people do not arrive in rows. */
const RANK = (() => {
  let a = 42;
  const random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = Array.from({ length: SEATS }, (_, i) => i).filter((i) => i !== ME);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const rank = new Array<number>(SEATS).fill(-1);
  order.forEach((seat, r) => (rank[seat] = r));
  return rank;
})();

export function TrySunday() {
  const [chars, setChars] = useState<string[]>(() => Array(6).fill(""));
  const [verdict, setVerdict] = useState<"" | "good" | "bad">("");
  const [shake, setShake] = useState(0);
  const [inRoom, setInRoom] = useState(false);
  const [asking, setAsking] = useState(false);
  const [filled, setFilled] = useState(START);
  const [mine, setMine] = useState(-1);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const later = (fn: () => void, ms: number) => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timers.current.push(window.setTimeout(fn, reduce ? 0 : ms));
  };

  const arrive = () => {
    setInRoom(true);
    // The rest of the room keeps arriving after you, one at a time.
    for (let n = START + 1, k = 1; n <= END; n++, k++) later(() => setFilled(n), 140 * k);
    later(() => setAsking(true), 900);
  };

  const check = (next: string[]) => {
    const value = next.join("");
    if (value.length < 6) return;
    if (value === CODE) {
      setVerdict("good");
      later(arrive, 450);
    } else {
      setVerdict("bad");
      setShake((s) => s + 1);
    }
  };

  const put = (i: number, raw: string) => {
    const ch = raw.replace(/[^a-z0-9]/gi, "").slice(-1).toUpperCase();
    const next = chars.map((c, k) => (k === i ? ch : c));
    setChars(next);
    setVerdict("");
    if (ch && i < 5) boxes.current[i + 1]?.focus();
    check(next);
  };

  const paste = (text: string) => {
    const clean = text.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6).split("");
    const next = Array.from({ length: 6 }, (_, k) => clean[k] ?? "");
    setChars(next);
    setVerdict("");
    boxes.current[Math.min(5, clean.length)]?.focus();
    check(next);
  };

  const typeForMe = () => {
    setChars(Array(6).fill(""));
    setVerdict("");
    const typed: string[] = Array(6).fill("");
    CODE.split("").forEach((ch, k) =>
      later(() => {
        typed[k] = ch;
        const next = [...typed];
        setChars(next);
        boxes.current[k]?.focus();
        if (k === 5) check(next);
      }, 130 * (k + 1)),
    );
  };

  const reset = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setChars(Array(6).fill(""));
    setVerdict("");
    setInRoom(false);
    setAsking(false);
    setFilled(START);
    setMine(-1);
  };

  const here = filled + (inRoom ? 1 : 0);
  const total = HANDS.reduce((a, b) => a + b, 0) + (mine >= 0 ? 1 : 0);

  return (
    <section id="try" className="band quiet-dots">
      <div className="frame px-4 py-20 sm:px-10 sm:py-28">
        <h2 className="head max-w-[16ch] text-[clamp(2.2rem,4.6vw,3.5rem)] text-ink">
          <Stopped>Try Sunday.</Stopped>
        </h2>
        <p className="mt-5 max-w-[34rem] text-[17px] leading-[1.6] text-ink-2">
          This is what a member does when they walk in. Type the code from the screen at the front, and watch
          yourself arrive.
        </p>

        <div className="try-grid mt-14">
          {/* The screen at the front: dark in both themes. */}
          <div className="try-screen">
            <div className="try-glow" aria-hidden />
            <span className="eyebrow text-white/50">On the screen at the front</span>
            <h3 className="try-screen-title">Sunday service, Central</h3>
            <div className="try-code">
              <DotNumeral value={CODE} cell="clamp(6px, 1.05vw, 11px)" label={`Code ${CODE}`} />
            </div>
            <div className="try-screen-foot">
              <span>Check-in is open</span>
              <span>
                <DotNumeral className="dm-inline" value={String(here)} slots={3} cell="2.2px" label={`${here}`} /> of{" "}
                {SEATS} in
              </span>
            </div>
          </div>

          {/* The member's phone. */}
          <div className="try-member" data-in={inRoom ? "" : undefined} data-ask={asking ? "" : undefined}>
            {!inRoom ? (
              <>
                <span className="eyebrow text-ink-3">On your phone</span>
                <p className="try-ask">Enter the code on the screen</p>
                <div className={`try-boxes ${verdict}`} data-shake={shake % 2}>
                  {chars.map((ch, i) => (
                    <input
                      key={i}
                      ref={(node) => {
                        boxes.current[i] = node;
                      }}
                      value={ch}
                      maxLength={2}
                      inputMode="text"
                      autoComplete="off"
                      autoCapitalize="characters"
                      spellCheck={false}
                      aria-label={`Character ${i + 1} of 6`}
                      onChange={(e) => put(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !ch && i > 0) {
                          e.preventDefault();
                          boxes.current[i - 1]?.focus();
                          setChars(chars.map((c, k) => (k === i - 1 ? "" : c)));
                        }
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        paste(e.clipboardData.getData("text"));
                      }}
                    />
                  ))}
                </div>
                <p className={`try-msg ${verdict === "bad" ? "text-ruby" : "text-ink-3"}`} aria-live="polite">
                  {verdict === "bad" ? "That is not the code on the screen. Try again." : verdict === "good" ? "Checked in." : HINT}
                </p>
                <div className="try-foot">
                  <button type="button" className="btn btn-quiet btn-sm" onClick={typeForMe}>
                    Type it for me
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-4">
                  <span className="eyebrow text-ink-3">Central, this morning</span>
                  <span className="try-ok">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.4} aria-hidden />
                    You are in the room
                  </span>
                </div>
                <div className="try-room" role="img" aria-label={`The room: ${here} of ${SEATS} seats taken, one of them yours`}>
                  {RANK.map((rank, i) => (
                    <i
                      key={i}
                      data-on={rank >= 0 && rank < filled ? "" : undefined}
                      data-me={i === ME ? "" : undefined}
                    />
                  ))}
                </div>
                <p className="flex items-end gap-3">
                  <DotNumeral value={String(here)} slots={3} cell="3.4px" label={`${here}`} />
                  <span className="pb-px text-[13px] text-ink-3">of {SEATS} here, and one of them is you</span>
                </p>

                <div className="try-poll">
                  <p className="text-[15px] font-semibold text-ink">Which point spoke to you?</p>
                  <div className="grid gap-2">
                    {POLL.map((option, i) => {
                      const n = HANDS[i] + (mine === i ? 1 : 0);
                      const pct = Math.round((n / total) * 100);
                      return (
                        <button
                          key={option.label}
                          type="button"
                          className="try-opt"
                          data-mine={mine === i ? "" : undefined}
                          aria-pressed={mine === i}
                          onClick={() => setMine(i)}
                        >
                          <span className="flex items-center justify-between gap-4 text-[14px] text-ink">
                            <span>
                              {option.label}
                              {mine === i && <span className="ml-2 text-[12px] font-semibold text-cobalt">Yours</span>}
                            </span>
                            <DotNumeral value={`${pct}%`} template="00%" cell="2.4px" label={`${pct} per cent`} />
                          </span>
                          <span className="try-hands" aria-hidden>
                            {Array.from({ length: HANDS[i] }, (_, k) => (
                              <i key={k} />
                            ))}
                            {mine === i && <i className="me" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[12.5px] text-ink-3">Answers come back as a show of hands, never with names.</p>
                </div>

                <div className="try-foot">
                  <button type="button" className="btn btn-quiet btn-sm" onClick={reset}>
                    Start again
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
