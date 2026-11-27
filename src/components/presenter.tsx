"use client";

import { ChevronLeft, ChevronRight, Maximize2, Minimize2, MonitorPlay, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { DotNumeral } from "@/components/landing/dot-numeral";
import type { Schemas } from "@/lib/generated/api";

type Live = Schemas["LiveService"];
type Prompt = Schemas["LivePrompt"];

type Slide =
  | { kind: "code" }
  | { kind: "room" }
  | { kind: "message" }
  | { kind: "question"; prompt: Prompt };

const weekday = (day: string) => day.charAt(0).toUpperCase() + day.slice(1);

/**
 * The live service, presented: the screen at the front of the room.
 *
 * "Present" turns the page into slides the way a slide deck does, in
 * the same browser, full screen: the check-in code in the product's dot
 * matrix, the room filling as people arrive, today's message, and every
 * question asked with its answers coming in as bars. It is the same data
 * as the board under it, and the page's live refresh keeps re-reading
 * it, so the count and the answers move on the screen while the deck
 * stays where it is (the slide index is state the refresh leaves alone).
 *
 * Arrows, Space and Page Up/Down move; Home and End jump; a number goes
 * to that slide; B blanks the screen and brings it back; F leaves or
 * re-enters full screen; Escape ends. The controls fade when the mouse
 * is still, and the screen is asked to stay awake while it presents.
 *
 * It is the first piece of the room's control surface; whatever the
 * service needs on the screen next (notices, a scripture, a countdown)
 * is another kind of slide here.
 */
export function Presenter({ live, label = "Present" }: { live: Live; label?: string }) {
  const [presenting, setPresenting] = useState(false);
  const [index, setIndex] = useState(0);
  const [blank, setBlank] = useState(false);
  const [full, setFull] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const idle = useRef<number>(0);

  const prompts = live.prompts ?? (live.prompt ? [live.prompt] : []);
  const ordered = [...prompts].sort(
    (a, b) => Number(b.is_open) - Number(a.is_open) || b.created_at.localeCompare(a.created_at),
  );
  const slides: Slide[] = [
    { kind: "code" },
    { kind: "room" },
    ...(live.sermon ? [{ kind: "message" } as const] : []),
    ...ordered.map((prompt) => ({ kind: "question", prompt }) as const),
  ];
  const at = Math.min(index, slides.length - 1);
  const slide = slides[at];

  const start = () => {
    setIndex(0);
    setBlank(false);
    setPresenting(true);
    // Full screen has to be asked for inside the press itself.
    document.documentElement.requestFullscreen?.().then(() => setFull(true)).catch(() => setFull(false));
  };
  const stop = useCallback(() => {
    setPresenting(false);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
  }, []);

  // Leaving full screen with the browser's own Escape ends the deck too.
  useEffect(() => {
    const onChange = () => {
      const on = Boolean(document.fullscreenElement);
      setFull(on);
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Keys, while presenting.
  useEffect(() => {
    if (!presenting) return;
    const count = slides.length;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const k = event.key;
      const go = (n: number) => {
        event.preventDefault();
        setBlank(false);
        setIndex(Math.max(0, Math.min(count - 1, n)));
      };
      if (k === "ArrowRight" || k === "ArrowDown" || k === "PageDown" || k === " " || k === "Enter") go(at + 1);
      else if (k === "ArrowLeft" || k === "ArrowUp" || k === "PageUp" || k === "Backspace") go(at - 1);
      else if (k === "Home") go(0);
      else if (k === "End") go(count - 1);
      else if (/^[1-9]$/.test(k)) go(Number(k) - 1);
      else if (k === "b" || k === "B" || k === ".") {
        event.preventDefault();
        setBlank((b) => !b);
      } else if (k === "f" || k === "F") {
        event.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
        else document.documentElement.requestFullscreen?.().catch(() => {});
      } else if (k === "Escape") {
        event.preventDefault();
        stop();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [presenting, at, slides.length, stop]);

  // The controls fade when the mouse is still; written to the node, not state.
  useEffect(() => {
    if (!presenting) return;
    const node = stage.current;
    const wake = () => {
      node?.removeAttribute("data-idle");
      window.clearTimeout(idle.current);
      idle.current = window.setTimeout(() => node?.setAttribute("data-idle", ""), 2500);
    };
    wake();
    window.addEventListener("pointermove", wake);
    return () => {
      window.removeEventListener("pointermove", wake);
      window.clearTimeout(idle.current);
    };
  }, [presenting]);

  // Keep the screen awake while it is on the wall.
  useEffect(() => {
    if (!presenting || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } })
      .wakeLock.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, [presenting]);

  return (
    <>
      <button type="button" onClick={start} className="btn btn-sm live-present">
        <MonitorPlay className="h-3.5 w-3.5" aria-hidden />
        {label}
      </button>

      {presenting && (
        <div
          ref={stage}
          className="on-dark presenter"
          role="dialog"
          aria-modal="true"
          aria-label={`Presenting the ${weekday(live.service_day)} service`}
          data-blank={blank ? "" : undefined}
        >
          <div className="presenter-slide" key={`${slide.kind}-${slide.kind === "question" ? slide.prompt.id : ""}`}>
            {slide.kind === "code" && <CodeSlide live={live} />}
            {slide.kind === "room" && <RoomSlide live={live} />}
            {slide.kind === "message" && live.sermon && <MessageSlide sermon={live.sermon} />}
            {slide.kind === "question" && <QuestionSlide prompt={slide.prompt} />}
          </div>

          <div className="presenter-brand" aria-hidden>
            <span className="presenter-live" /> {live.branch_name ?? "Whole church"} · {weekday(live.service_day)} service
          </div>

          <nav className="presenter-controls" aria-label="Presentation">
            <button type="button" onClick={() => setIndex(Math.max(0, at - 1))} aria-label="Previous slide" disabled={at === 0}>
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <span className="presenter-dots">
              {slides.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Slide ${i + 1}`}
                  aria-current={i === at ? "step" : undefined}
                  onClick={() => setIndex(i)}
                />
              ))}
            </span>
            <button
              type="button"
              onClick={() => setIndex(Math.min(slides.length - 1, at + 1))}
              aria-label="Next slide"
              disabled={at === slides.length - 1}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
            <span className="presenter-sep" aria-hidden />
            <button
              type="button"
              onClick={() =>
                document.fullscreenElement
                  ? document.exitFullscreen?.().catch(() => {})
                  : document.documentElement.requestFullscreen?.().catch(() => {})
              }
              aria-label={full ? "Leave full screen" : "Full screen"}
            >
              {full ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
            </button>
            <button type="button" onClick={stop} aria-label="Stop presenting">
              <X className="h-4 w-4" aria-hidden />
            </button>
          </nav>
          <p className="presenter-hint" aria-hidden>
            ← → to move · B to blank · Esc to end
          </p>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* slides                                                              */
/* ------------------------------------------------------------------ */

function CodeSlide({ live }: { live: Live }) {
  const code = (live.code ?? "").toUpperCase();
  return (
    <div className="ps ps-center">
      <p className="ps-kicker">{live.is_open ? "Check in" : "Check-in has closed"}</p>
      {code && live.is_open ? (
        <>
          <div className="ps-code">
            <DotNumeral value={code} label={`Check-in code ${code}`} />
          </div>
          <p className="ps-lede">Open Chapl, tap Check in, and type the code.</p>
        </>
      ) : (
        <p className="ps-title">Welcome.</p>
      )}
      <p className="ps-foot">
        <DotNumeral className="dm-inline" value={String(live.present ?? 0)} label={`${live.present ?? 0}`} />{" "}
        here so far
      </p>
    </div>
  );
}

function RoomSlide({ live }: { live: Live }) {
  const present = live.present ?? 0;
  const expected = live.expected ?? 0;
  const seats = Math.max(expected, present);
  // Past four hundred a dot stands for a few people, so it stays a room.
  const unit = Math.max(1, Math.ceil(seats / 400));
  const lit = Math.round(present / unit);
  const all = Math.round(seats / unit);
  const pct = expected > 0 ? Math.round((present / expected) * 100) : null;
  return (
    <div className="ps">
      <p className="ps-kicker">The room</p>
      <div className="ps-room-head">
        <DotNumeral value={String(present)} label={`${present} here`} className="ps-big" />
        <p className="ps-lede">
          here{expected ? ` of ${expected}` : ""}
          {pct != null ? ` · ${pct}%` : ""}
          {unit > 1 ? ` · one dot is ${unit}` : ""}
        </p>
      </div>
      <div
        className="ps-room"
        role="img"
        aria-label={`${present} of ${expected} in the room`}
        // A small room gets big seats: it should fill the wall, not a corner of it.
        style={{ "--seat": all <= 160 ? "1.9vw" : all <= 300 ? "1.35vw" : "0.95vw" } as React.CSSProperties}
      >
        {Array.from({ length: all }, (_, i) => (
          <span key={i} data-on={i < lit ? "" : undefined} />
        ))}
      </div>
    </div>
  );
}

function MessageSlide({ sermon }: { sermon: NonNullable<Live["sermon"]> }) {
  return (
    <div className="ps ps-center">
      <p className="ps-kicker">Today&rsquo;s message</p>
      <p className="ps-title">{sermon.title}</p>
      {(sermon.scripture_reference || sermon.preacher_name || sermon.series) && (
        <p className="ps-lede">
          {[sermon.scripture_reference, sermon.preacher_name, sermon.series].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

function QuestionSlide({ prompt }: { prompt: Prompt }) {
  const total = prompt.options.reduce((sum, o) => sum + (o.count ?? 0), 0);
  const top = Math.max(0, ...prompt.options.map((o) => o.count ?? 0));
  return (
    <div className="ps">
      <p className="ps-kicker">
        {prompt.is_open ? (
          <>
            <span className="presenter-live" /> Answer on your phone
          </>
        ) : (
          "The room said"
        )}
      </p>
      <p className="ps-question">{prompt.question}</p>
      <ul className="ps-options">
        {prompt.options.map((o, i) => {
          const n = o.count ?? 0;
          const share = total ? Math.round((n / total) * 100) : 0;
          return (
            <li key={i} data-lead={n > 0 && n === top ? "" : undefined}>
              <span className="ps-option-bar" style={{ width: `${share}%` }} />
              <span className="ps-option-label">{o.label}</span>
              <span className="ps-option-figure tnum">
                {share}% <span>{n}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="ps-foot">
        {total} {total === 1 ? "answer" : "answers"}
      </p>
    </div>
  );
}
