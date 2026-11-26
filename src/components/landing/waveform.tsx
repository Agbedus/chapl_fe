"use client";

import { useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

import { DotNumeral, paintNumeral } from "@/components/landing/dot-numeral";
import { gsap, useGSAP } from "@/components/landing/motion";

const COLS = 56;
/** Deterministic, whole numbers: decoration that at least behaves like sound. */
const HEIGHTS = Array.from({ length: COLS }, (_, i) =>
  Math.round(2 + Math.abs(Math.sin(i * 1.17) * 0.55 + Math.sin(i * 0.41) * 0.45) * 7),
);

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/**
 * The featured sermon's player, its waveform drawn as columns of dots.
 *
 * Until somebody touches it the scroll plays it: the columns light from
 * the left as the section passes. Press play and it runs in real time;
 * click or drag along it to seek, or use the arrow keys. Once touched, the
 * scroll leaves it alone. Every lit column and every tick of the clock is
 * written to the nodes from the GSAP ticker, never through state: only
 * whether it is playing (the button's icon) is React's business.
 */
export function Waveform({ title, length }: { title: string; length: string }) {
  const root = useRef<HTMLDivElement>(null);
  const wave = useRef<HTMLDivElement>(null);
  const now = useRef<HTMLSpanElement>(null);
  const player = useRef({ at: 0, playing: false, touched: false, lit: -1, sec: -1, total: 1 });
  const [playing, setPlaying] = useState(false);
  const [lm, ls] = length.split(":").map(Number);
  const seconds = lm * 60 + ls;

  useGSAP(
    () => {
      const [m, s] = length.split(":").map(Number);
      const p = player.current;
      p.total = m * 60 + s;
      p.at = 0.08 * p.total;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const cols = Array.from(wave.current?.children ?? []) as HTMLElement[];

      const tick = (_time: number, delta: number) => {
        if (p.playing) {
          p.at = Math.min(p.total, p.at + delta / 1000);
          if (p.at >= p.total) {
            p.playing = false;
            setPlaying(false);
          }
        } else if (!p.touched && !reduce && root.current) {
          const box = root.current.getBoundingClientRect();
          const vh = window.innerHeight;
          const k = Math.min(1, Math.max(0, (vh * 0.85 - box.top) / (box.height + vh * 0.6)));
          p.at = (0.08 + 0.54 * k) * p.total;
        }
        const lit = Math.round((p.at / p.total) * COLS);
        if (lit !== p.lit) {
          cols.forEach((col, i) => col.toggleAttribute("data-on", i < lit));
          p.lit = lit;
        }
        const sec = Math.floor(p.at);
        if (sec !== p.sec) {
          if (now.current) paintNumeral(now.current, clock(sec));
          wave.current?.setAttribute("aria-valuenow", String(sec));
          wave.current?.setAttribute("aria-valuetext", clock(sec));
          p.sec = sec;
        }
      };
      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    },
    { scope: root, dependencies: [length] },
  );

  const seek = (clientX: number) => {
    const box = wave.current?.getBoundingClientRect();
    if (!box) return;
    const p = player.current;
    p.at = Math.min(1, Math.max(0, (clientX - box.left) / box.width)) * p.total;
    p.touched = true;
  };

  const toggle = () => {
    const p = player.current;
    if (p.at >= p.total) p.at = 0;
    p.playing = !p.playing;
    p.touched = true;
    setPlaying(p.playing);
  };

  return (
    // On a phone the waveform takes the full width under the button: beside
    // it, fifty-six columns came to two pixels each.
    <div ref={root} className="flex flex-wrap items-start gap-x-5 gap-y-4 sm:flex-nowrap">
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? `Pause ${title}` : `Play ${title}`}
        className="play-button grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent text-accent-ink"
      >
        {playing ? (
          <Pause className="h-5 w-5 fill-current" />
        ) : (
          <Play className="h-5 w-5 translate-x-px fill-current" />
        )}
      </button>

      <div className="min-w-0 basis-full sm:flex-1 sm:basis-auto">
        <div
          ref={wave}
          className="dot-wave"
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={seconds}
          aria-valuenow={0}
          onPointerDown={(e) => {
            seek(e.clientX);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (e.buttons) seek(e.clientX);
          }}
          onKeyDown={(e) => {
            const p = player.current;
            const step = e.key === "ArrowRight" ? 15 : e.key === "ArrowLeft" ? -15 : 0;
            if (!step) return;
            e.preventDefault();
            p.at = Math.min(p.total, Math.max(0, p.at + step));
            p.touched = true;
          }}
        >
          {HEIGHTS.map((h, i) => (
            <span key={i} className="dot-wave-col">
              {Array.from({ length: h }, (_, k) => (
                <i key={k} />
              ))}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-end justify-between text-ink-3">
          <DotNumeral ref={now} value="0:00" template="00:00" label="Time played" cell="2.4px" className="text-ink-2" />
          <DotNumeral value={length} template="00:00" label={`Length ${length}`} cell="2.4px" />
        </div>
      </div>
    </div>
  );
}
