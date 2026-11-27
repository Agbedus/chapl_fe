"use client";

import {
  CalendarDays, Clock3, Hand, Maximize2, Megaphone, Minimize2, MonitorPlay, Play, QrCode, Sparkles,
  Users, BookOpen, ChevronLeft, ChevronRight, X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import { DotNumeral, paintNumeral } from "@/components/landing/dot-numeral";
import { Listbox } from "@/components/ui/pickers";
import type { Schemas } from "@/lib/generated/api";

type Live = Schemas["LiveService"];
type Prompt = Schemas["LivePrompt"];

export type DeckNotice = { id: string; title: string; content: string; pinned: boolean };
export type DeckEvent = { id: string; title: string; startsAt: string; allDay: boolean; location: string | null };

type Kind = "welcome" | "countdown" | "code" | "room" | "message" | "notice" | "events" | "question";

type Slide = {
  /** Stable across refreshes, so switching one off sticks. */
  id: string;
  kind: Kind;
  title: string;
  summary: string;
  notice?: DeckNotice;
  prompt?: Prompt;
};

const ICON: Record<Kind, typeof Play> = {
  welcome: Sparkles,
  countdown: Clock3,
  code: QrCode,
  room: Users,
  message: BookOpen,
  notice: Megaphone,
  events: CalendarDays,
  question: Hand,
};

/* ------------------------------------------------------------------ */
/* the deck's settings: on this device, read as an external store      */
/* ------------------------------------------------------------------ */

const KEY = "chaplDeck";
const CHANGED = "chapl:deck";
type Settings = { off: string[]; start: string };
const DEFAULTS: Settings = { off: [], start: "10:00" };

// The raw string is the snapshot (a stable value), parsed once per change.
function readRaw(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}
function subscribe(changed: () => void) {
  window.addEventListener(CHANGED, changed);
  window.addEventListener("storage", changed);
  return () => {
    window.removeEventListener(CHANGED, changed);
    window.removeEventListener("storage", changed);
  };
}
function parse(raw: string): Settings {
  try {
    const v = JSON.parse(raw) as Partial<Settings>;
    return { off: Array.isArray(v.off) ? v.off : [], start: typeof v.start === "string" ? v.start : DEFAULTS.start };
  } catch {
    return DEFAULTS;
  }
}
function save(next: Settings) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* private mode: the deck still runs, it just does not remember */
  }
  window.dispatchEvent(new Event(CHANGED));
}

/** The header's Present: the deck below answers it. */
export function PresentButton() {
  return (
    <button
      type="button"
      className="btn btn-sm live-present"
      onClick={() => window.dispatchEvent(new CustomEvent("chapl:present", { detail: { from: null } }))}
    >
      <MonitorPlay className="h-3.5 w-3.5" aria-hidden />
      Present
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* time, written out (never by locale in a client component)           */
/* ------------------------------------------------------------------ */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const twelve = (h: number, m: number) => `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
const weekday = (day: string) => day.charAt(0).toUpperCase() + day.slice(1);

/** "2026-11-29T10:30:00" → "Sunday 29 Nov · 10:30 am". */
function eventWhen(iso: string, allDay: boolean): string {
  const d = new Date(iso);
  const day = `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return allDay ? day : `${day} · ${twelve(d.getHours(), d.getMinutes())}`;
}

/** Quarter hours from 6 am to 9:45 pm, for the countdown's start. */
const STARTS = Array.from({ length: 64 }, (_, i) => {
  const minutes = 6 * 60 + i * 15;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return { value: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`, label: twelve(h, m) };
});

/* ------------------------------------------------------------------ */
/* the deck                                                            */
/* ------------------------------------------------------------------ */

/**
 * The run of service, and the screen it drives.
 *
 * Every slide the service can put on the screen at the front, in the
 * order they are shown: a welcome, a countdown to the start, the check-in
 * code, the room filling, today's message, the notices, what is coming
 * up, and each question asked. The leader switches slides on or off and
 * sets when the service starts (kept on this device), and presents the
 * deck from the top, from the header's Present, or from any row.
 *
 * The slides are the page's data, and the page's live refresh re-reads
 * it, so the count and the answers move on the screen while the deck
 * stays on its slide. With nothing on air the deck still has its
 * welcome, countdown, notices and events: the screen before a service
 * starts is the screen it is most often needed for.
 *
 * Presenting is full screen in the same browser. Arrows, Space and Page
 * keys move; Home and End jump; a number goes to that slide; B blanks the
 * screen; F toggles full screen; Escape ends. The controls fade when the
 * mouse is still, and the screen is asked to stay awake.
 *
 * Whatever the room needs next on its screen is another kind of slide:
 * it goes in `slides` below and gets a component at the bottom.
 */
export function ServiceDeck({
  church,
  live,
  notices,
  events,
}: {
  church: string;
  live: Live | null;
  notices: DeckNotice[];
  events: DeckEvent[];
}) {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  const settings = useMemo(() => parse(raw), [raw]);

  const prompts = useMemo(() => {
    const all = live?.prompts ?? (live?.prompt ? [live.prompt] : []);
    return [...all].sort((a, b) => Number(b.is_open) - Number(a.is_open) || b.created_at.localeCompare(a.created_at));
  }, [live]);

  const slides: Slide[] = useMemo(
    () => [
      { id: "welcome", kind: "welcome", title: "Welcome", summary: church },
      { id: "countdown", kind: "countdown", title: "Countdown", summary: `To ${STARTS.find((s) => s.value === settings.start)?.label ?? settings.start}` },
      ...(live
        ? [
            { id: "code", kind: "code" as const, title: "Check-in code", summary: live.is_open && live.code ? live.code.toUpperCase() : "Check-in closed" },
            { id: "room", kind: "room" as const, title: "The room", summary: `${live.present ?? 0}${live.expected ? ` of ${live.expected}` : ""} here` },
          ]
        : []),
      ...(live?.sermon ? [{ id: "message", kind: "message" as const, title: "Today’s message", summary: live.sermon.title }] : []),
      ...notices.map((n) => ({ id: `notice:${n.id}`, kind: "notice" as const, title: n.title, summary: "Notice", notice: n })),
      ...(events.length ? [{ id: "events", kind: "events" as const, title: "Coming up", summary: `${events.length} ${events.length === 1 ? "event" : "events"}` }] : []),
      ...prompts.map((p) => ({ id: `q:${p.id}`, kind: "question" as const, title: p.question, summary: p.is_open ? "Question · open" : "Question · results", prompt: p })),
    ],
    [church, live, notices, events, prompts, settings.start],
  );
  const shown = slides.filter((s) => !settings.off.includes(s.id));

  const [presenting, setPresenting] = useState(false);
  const [index, setIndex] = useState(0);

  const present = useCallback(
    (from: string | null) => {
      const at = from ? shown.findIndex((s) => s.id === from) : 0;
      setIndex(Math.max(0, at));
      setPresenting(true);
      document.documentElement.requestFullscreen?.().catch(() => {});
    },
    [shown],
  );

  useEffect(() => {
    const onPresent = (event: Event) => present((event as CustomEvent<{ from: string | null }>).detail?.from ?? null);
    window.addEventListener("chapl:present", onPresent);
    return () => window.removeEventListener("chapl:present", onPresent);
  }, [present]);

  const toggle = (id: string) =>
    save({ ...settings, off: settings.off.includes(id) ? settings.off.filter((x) => x !== id) : [...settings.off, id] });

  return (
    <section className="sheet deck">
      <div className="panel-head">
        <h2 className="panel-title">
          <span className="dot" style={{ color: "var(--ruby)" }} aria-hidden />
          Run of service
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-ink-3">Starts</span>
          <Listbox
            variant="sm"
            label="Service starts at"
            value={settings.start}
            onChange={(start) => save({ ...settings, start })}
            options={STARTS}
          />
        </div>
      </div>

      <ol className="deck-list">
        {slides.map((s) => {
          const Icon = ICON[s.kind];
          const on = !settings.off.includes(s.id);
          const n = shown.findIndex((x) => x.id === s.id);
          return (
            <li key={s.id} className="deck-row" data-off={on ? undefined : ""}>
              <span className="deck-n tnum" aria-hidden>{on ? n + 1 : "–"}</span>
              <span className="deck-icon" data-kind={s.kind} aria-hidden>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="deck-title">{s.title}</span>
                <span className="deck-summary">{s.summary}</span>
              </span>
              <button
                type="button"
                className="deck-play"
                onClick={() => present(s.id)}
                disabled={!on}
                aria-label={`Present from ${s.title}`}
                title="Present from here"
              >
                <Play className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={on}
                aria-label={`${on ? "Leave out" : "Include"} ${s.title}`}
                className="deck-switch"
                onClick={() => toggle(s.id)}
              >
                <span />
              </button>
            </li>
          );
        })}
      </ol>

      {presenting && shown.length > 0 && (
        <Stage
          slides={shown}
          index={Math.min(index, shown.length - 1)}
          setIndex={setIndex}
          onEnd={() => setPresenting(false)}
          live={live}
          church={church}
          events={events}
          start={settings.start}
        />
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* the stage                                                           */
/* ------------------------------------------------------------------ */

function Stage({
  slides,
  index,
  setIndex,
  onEnd,
  live,
  church,
  events,
  start,
}: {
  slides: Slide[];
  index: number;
  setIndex: (n: number) => void;
  onEnd: () => void;
  live: Live | null;
  church: string;
  events: DeckEvent[];
  start: string;
}) {
  const [blank, setBlank] = useState(false);
  const [full, setFull] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const idle = useRef(0);
  const slide = slides[index];

  const end = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    onEnd();
  }, [onEnd]);

  useEffect(() => {
    const onChange = () => setFull(Boolean(document.fullscreenElement));
    onChange();
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    const count = slides.length;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const k = event.key;
      const go = (n: number) => {
        event.preventDefault();
        setBlank(false);
        setIndex(Math.max(0, Math.min(count - 1, n)));
      };
      if (k === "ArrowRight" || k === "ArrowDown" || k === "PageDown" || k === " " || k === "Enter") go(index + 1);
      else if (k === "ArrowLeft" || k === "ArrowUp" || k === "PageUp" || k === "Backspace") go(index - 1);
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
        end();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, slides.length, setIndex, end]);

  // Controls fade when the mouse is still; written to the node.
  useEffect(() => {
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
  }, []);

  // The screen on the wall stays awake.
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as Navigator & { wakeLock: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } })
      .wakeLock.request("screen")
      .then((l) => (lock = l))
      .catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, []);

  return (
    <div ref={stage} className="on-dark presenter" role="dialog" aria-modal="true" aria-label="Presenting the service" data-blank={blank ? "" : undefined}>
      <div className="presenter-slide" key={slide.id}>
        {slide.kind === "welcome" && <WelcomeSlide church={church} live={live} />}
        {slide.kind === "countdown" && <CountdownSlide start={start} church={church} />}
        {slide.kind === "code" && live && <CodeSlide live={live} />}
        {slide.kind === "room" && live && <RoomSlide live={live} />}
        {slide.kind === "message" && live?.sermon && <MessageSlide sermon={live.sermon} />}
        {slide.kind === "notice" && slide.notice && <NoticeSlide notice={slide.notice} />}
        {slide.kind === "events" && <EventsSlide events={events} />}
        {slide.kind === "question" && slide.prompt && <QuestionSlide prompt={slide.prompt} />}
      </div>

      <div className="presenter-brand" aria-hidden>
        {live ? (
          <>
            <span className="presenter-live" /> {live.branch_name ?? church} · {weekday(live.service_day)} service
          </>
        ) : (
          church
        )}
      </div>

      <nav className="presenter-controls" aria-label="Presentation">
        <button type="button" onClick={() => setIndex(Math.max(0, index - 1))} aria-label="Previous slide" disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="presenter-dots">
          {slides.map((s, i) => (
            <button key={s.id} type="button" aria-label={`Slide ${i + 1}: ${s.title}`} aria-current={i === index ? "step" : undefined} onClick={() => setIndex(i)} />
          ))}
        </span>
        <button type="button" onClick={() => setIndex(Math.min(slides.length - 1, index + 1))} aria-label="Next slide" disabled={index === slides.length - 1}>
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
        <button type="button" onClick={end} aria-label="Stop presenting">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </nav>
      <p className="presenter-hint" aria-hidden>
        {index + 1} of {slides.length} · ← → to move · B to blank · Esc to end
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* slides                                                              */
/* ------------------------------------------------------------------ */

function WelcomeSlide({ church, live }: { church: string; live: Live | null }) {
  return (
    <div className="ps ps-center">
      <p className="ps-kicker">{live ? `${weekday(live.service_day)} service` : "Welcome"}</p>
      <p className="ps-title">Welcome to {church}.</p>
      {live?.branch_name && <p className="ps-lede">{live.branch_name}</p>}
    </div>
  );
}

/**
 * A clock counting down to the start, in the dot matrix. The seconds are
 * painted onto the numeral from a timer, never rendered: the clock is not
 * React's business, and reading it during render would disagree with the
 * server.
 */
function CountdownSlide({ start, church }: { start: string; church: string }) {
  const numeral = useRef<HTMLSpanElement>(null);
  const caption = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const [h, m] = start.split(":").map(Number);
    const tick = () => {
      const now = new Date();
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      const left = Math.max(0, Math.round((target.getTime() - now.getTime()) / 1000));
      // Under an hour the clock is minutes and seconds; past it, hours and
      // minutes, and the caption says which, so 02:15 is never misread.
      const hours = left >= 3600;
      const a = hours ? Math.floor(left / 3600) : Math.floor(left / 60);
      const b = hours ? Math.floor((left % 3600) / 60) : left % 60;
      const text = `${String(Math.min(a, 99)).padStart(2, "0")}:${String(b).padStart(2, "0")}`;
      if (numeral.current) paintNumeral(numeral.current, text);
      if (caption.current) {
        caption.current.textContent =
          left === 0
            ? "We are about to begin."
            : `${hours ? "hours and minutes" : "minutes"} until we begin at ${twelve(h, m)}`;
      }
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [start]);

  return (
    <div className="ps ps-center">
      <p className="ps-kicker">{church}</p>
      <div className="ps-countdown">
        <DotNumeral ref={numeral} value="00:00" template="00:00" label="Time until the service begins" />
      </div>
      <p ref={caption} className="ps-lede" aria-live="off" />
    </div>
  );
}

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
        <DotNumeral className="dm-inline" value={String(live.present ?? 0)} label={`${live.present ?? 0}`} /> here so far
      </p>
    </div>
  );
}

function RoomSlide({ live }: { live: Live }) {
  const present = live.present ?? 0;
  const expected = live.expected ?? 0;
  const seats = Math.max(expected, present);
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
        <p className="ps-lede">{[sermon.scripture_reference, sermon.preacher_name, sermon.series].filter(Boolean).join(" · ")}</p>
      )}
    </div>
  );
}

function NoticeSlide({ notice }: { notice: DeckNotice }) {
  return (
    <div className="ps">
      <p className="ps-kicker">{notice.pinned ? "Notice · pinned" : "Notice"}</p>
      <p className="ps-question">{notice.title}</p>
      <p className="ps-body">{notice.content}</p>
    </div>
  );
}

function EventsSlide({ events }: { events: DeckEvent[] }) {
  return (
    <div className="ps">
      <p className="ps-kicker">Coming up</p>
      <ul className="ps-events">
        {events.map((e) => (
          <li key={e.id}>
            <span className="ps-event-when">{eventWhen(e.startsAt, e.allDay)}</span>
            <span className="ps-event-title">{e.title}</span>
            {e.location && <span className="ps-event-where">{e.location}</span>}
          </li>
        ))}
      </ul>
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
