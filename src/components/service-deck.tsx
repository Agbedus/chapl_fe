"use client";

import {
  BookOpen, Check, ChevronLeft, ChevronRight, Clock3, Copy, Hand, Maximize2, Megaphone,
  Minimize2, MonitorPlay, Music, Play, QrCode, Settings2, Smartphone, Sparkles, Trash2, Users, X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";

import { sendDeck, type DeckSignal } from "@/lib/deck";
import { lookUpScripture, type Passage } from "@/app/actions/scripture";
import { DotNumeral, paintNumeral } from "@/components/landing/dot-numeral";
import { Listbox } from "@/components/ui/pickers";
import type { Schemas } from "@/lib/generated/api";

type Live = Schemas["LiveService"];
type Prompt = Schemas["LivePrompt"];

export type DeckNotice = { id: string; title: string; content: string; pinned: boolean };
export type DeckEvent = { id: string; title: string; startsAt: string; allDay: boolean; location: string | null };
type Song = { id: string; title: string; lyrics: string };

type Kind = "welcome" | "countdown" | "code" | "room" | "message" | "scripture" | "song" | "question" | "announcements";

type Slide = {
  /** Stable across refreshes, so switching one off sticks. */
  id: string;
  kind: Kind;
  title: string;
  summary: string;
  /** What a scripture or song slide shows. */
  lines?: { n?: number; text: string }[];
  heading?: string;
  prompt?: Prompt;
  /** For a scripture passage or a song: what the remove button takes out. */
  removes?: { type: "passage" | "song"; key: string };
};

const ICON: Record<Kind, typeof Play> = {
  welcome: Sparkles,
  countdown: Clock3,
  code: QrCode,
  room: Users,
  message: BookOpen,
  scripture: BookOpen,
  song: Music,
  question: Hand,
  announcements: Megaphone,
};

/* ------------------------------------------------------------------ */
/* the deck's settings: on this device, read as an external store      */
/* ------------------------------------------------------------------ */

const KEY = "chaplDeck";
const CHANGED = "chapl:deck";
type Settings = { off: string[]; start: string; passages: Passage[]; songs: Song[] };
const DEFAULTS: Settings = { off: [], start: "10:00", passages: [], songs: [] };

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
    return {
      off: Array.isArray(v.off) ? v.off : [],
      start: typeof v.start === "string" ? v.start : DEFAULTS.start,
      passages: Array.isArray(v.passages) ? v.passages : [],
      songs: Array.isArray(v.songs) ? v.songs : [],
    };
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
const useSettings = () => {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  return useMemo(() => parse(raw), [raw]);
};

/* ------------------------------------------------------------------ */
/* the header's two buttons                                            */
/* ------------------------------------------------------------------ */

/** Present: the deck answers it. */
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

/** The run of service, in a drawer rather than across the top of the page. */
export function DeckSettingsButton() {
  return (
    <button
      type="button"
      className="btn btn-quiet btn-sm"
      onClick={() => window.dispatchEvent(new Event("chapl:deck-settings"))}
    >
      <Settings2 className="h-3.5 w-3.5" aria-hidden />
      Run of service
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* time, written out (never by locale in a client component)           */
/* ------------------------------------------------------------------ */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const twelve = (h: number, m: number) => `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;

/** "2026-11-29T10:30:00" → "Sun 29 Nov · 10:30 am". */
function eventWhen(iso: string, allDay: boolean): string {
  const d = new Date(iso);
  const day = `${DAYS[d.getDay()].slice(0, 3)} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
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
/* building the slides                                                 */
/* ------------------------------------------------------------------ */

/** A passage, a few verses a screen: no more than three, or about forty words. */
function passageSlides(p: Passage): Slide[] {
  const pages: Passage["verses"][] = [];
  let page: Passage["verses"] = [];
  let words = 0;
  for (const v of p.verses) {
    const w = v.text.split(" ").length;
    if (page.length && (page.length >= 3 || words + w > 42)) {
      pages.push(page);
      page = [];
      words = 0;
    }
    page.push(v);
    words += w;
  }
  if (page.length) pages.push(page);
  return pages.map((verses, i) => ({
    id: `scr:${p.reference}:${i}`,
    kind: "scripture",
    title: p.reference,
    summary: pages.length > 1 ? `Scripture · ${i + 1} of ${pages.length}` : "Scripture",
    heading: p.reference,
    lines: verses.map((v) => ({ n: v.verse, text: v.text })),
    removes: { type: "passage", key: p.reference },
  }));
}

/** A song, a verse a screen: verses are separated by a blank line. */
function songSlides(song: Song): Slide[] {
  const stanzas = song.lyrics
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  return stanzas.map((stanza, i) => ({
    id: `song:${song.id}:${i}`,
    kind: "song",
    title: song.title,
    summary: `Song · ${i + 1} of ${stanzas.length}`,
    heading: i === 0 ? song.title : undefined,
    lines: stanza.split("\n").map((text) => ({ text: text.trim() })),
    removes: { type: "song", key: song.id },
  }));
}

/* ------------------------------------------------------------------ */
/* the deck                                                            */
/* ------------------------------------------------------------------ */

/**
 * The run of service, and the screen it drives.
 *
 * Every slide the service can put on the screen at the front, in the
 * order they are shown: Welcome, a countdown to the start, the check-in
 * code, the room filling, today's message, the readings (KJV, looked up
 * by reference), the songs (lyrics as typed, a verse a screen), each
 * question asked, and the announcements last (notices and what is coming
 * up, together). The run lives in a drawer opened from the control room,
 * so it is not across the top of the page while the service runs; its
 * settings are kept on this device.
 *
 * Presenting is full screen in the same browser, and the page's live
 * refresh keeps the figures moving under a slide that stays put. A phone
 * signed in as the same leader drives it from `/app/live/remote`: its
 * commands come in as `deck.*` live messages on the leader's own channel,
 * and the screen answers with where it is.
 *
 * Something new for the screen is a new kind of slide: an entry in
 * `slides` and a component at the bottom of this file.
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
  const settings = useSettings();

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
      ...settings.passages.flatMap(passageSlides),
      ...settings.songs.flatMap(songSlides),
      ...prompts.map((p) => ({ id: `q:${p.id}`, kind: "question" as const, title: p.question, summary: p.is_open ? "Question · open" : "Question · results", prompt: p })),
      ...(notices.length || events.length
        ? [{
            id: "announcements",
            kind: "announcements" as const,
            title: "Announcements",
            summary: [notices.length && `${notices.length} ${notices.length === 1 ? "notice" : "notices"}`, events.length && `${events.length} coming up`].filter(Boolean).join(" · "),
          }]
        : []),
    ],
    [church, live, prompts, settings.start, settings.passages, settings.songs, notices.length, events.length],
  );
  const shown = useMemo(() => slides.filter((s) => !settings.off.includes(s.id)), [slides, settings.off]);

  const [presenting, setPresenting] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [index, setIndex] = useState(0);
  const [blank, setBlank] = useState(false);
  const [step, setStep] = useState<1 | -1>(1);

  const go = useCallback(
    (n: number) => {
      setIndex((current) => {
        const next = Math.max(0, Math.min(shown.length - 1, n));
        setStep(next >= current ? 1 : -1);
        return next;
      });
      setBlank(false);
    },
    [shown.length],
  );

  const present = useCallback(
    (from: string | number | null, full = true) => {
      const at = typeof from === "number" ? from : from ? shown.findIndex((s) => s.id === from) : 0;
      setIndex(Math.max(0, Math.min(shown.length - 1, at)));
      setStep(1);
      setBlank(false);
      setDrawer(false);
      setPresenting(true);
      if (full) document.documentElement.requestFullscreen?.().catch(() => {});
    },
    [shown],
  );

  useEffect(() => {
    const onPresent = (event: Event) => present((event as CustomEvent<{ from: string | null }>).detail?.from ?? null);
    const onSettings = () => setDrawer(true);
    window.addEventListener("chapl:present", onPresent);
    window.addEventListener("chapl:deck-settings", onSettings);
    return () => {
      window.removeEventListener("chapl:present", onPresent);
      window.removeEventListener("chapl:deck-settings", onSettings);
    };
  }, [present]);

  // The phone remote. A command while nothing is presented starts the
  // deck (without full screen: only a press on this screen can ask for it).
  useEffect(() => {
    const onLive = (event: Event) => {
      const m = (event as CustomEvent<{ type?: string; slide?: number }>).detail;
      if (!m?.type?.startsWith("deck.")) return;
      const action = m.type.slice(5);
      if (action === "state" || action === "hello") return;
      if (!presenting) {
        if (action === "end" || action === "blank") return;
        present(action === "goto" ? (m.slide ?? 0) : action === "last" ? shown.length - 1 : 0, false);
        return;
      }
      if (action === "next") go(index + 1);
      else if (action === "prev") go(index - 1);
      else if (action === "first") go(0);
      else if (action === "last") go(shown.length - 1);
      else if (action === "goto") go(m.slide ?? 0);
      else if (action === "blank") setBlank((b) => !b);
      else if (action === "end") setPresenting(false);
    };
    window.addEventListener("chapl:live", onLive);
    return () => window.removeEventListener("chapl:live", onLive);
  }, [presenting, index, shown.length, go, present]);

  // Tell the remote where the deck is, whenever that changes or it asks.
  const titles = useMemo(() => shown.map((s) => (s.kind === "song" || s.kind === "scripture" ? `${s.title} · ${s.summary.split(" · ")[1] ?? ""}`.replace(/ · $/, "") : s.title)), [shown]);
  const at = Math.min(index, Math.max(0, shown.length - 1));
  // Keyed on the titles' content: every live refresh hands in new objects,
  // and an effect on the array would report the same position again.
  const titlesKey = JSON.stringify(titles);
  useEffect(() => {
    if (!presenting) return;
    const list = JSON.parse(titlesKey) as string[];
    const tell = () => void sendDeck({ action: "state", slide: at, blank, titles: list });
    tell();
    const onLive = (event: Event) => {
      if ((event as CustomEvent<{ type?: string }>).detail?.type === "deck.hello") tell();
    };
    window.addEventListener("chapl:live", onLive);
    return () => window.removeEventListener("chapl:live", onLive);
  }, [presenting, at, blank, titlesKey]);
  const wasPresenting = useRef(false);
  useEffect(() => {
    if (wasPresenting.current && !presenting) void sendDeck({ action: "end" });
    wasPresenting.current = presenting;
  }, [presenting]);

  return (
    <>
      {drawer && (
        <Drawer
          slides={slides}
          shown={shown}
          settings={settings}
          onClose={() => setDrawer(false)}
          onPresent={(id) => present(id)}
        />
      )}
      {presenting && shown.length > 0 && (
        <Stage
          slides={shown}
          index={at}
          step={step}
          blank={blank}
          setBlank={setBlank}
          go={go}
          onEnd={() => {
            if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
            setPresenting(false);
          }}
          live={live}
          church={church}
          notices={notices}
          events={events}
          start={settings.start}
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* the drawer: the run of service                                      */
/* ------------------------------------------------------------------ */

function Drawer({
  slides,
  shown,
  settings,
  onClose,
  onPresent,
}: {
  slides: Slide[];
  shown: Slide[];
  settings: Settings;
  onClose: () => void;
  onPresent: (id: string) => void;
}) {
  const [reference, setReference] = useState("");
  const [scriptureError, setScriptureError] = useState("");
  const [looking, startLooking] = useTransition();
  const [songTitle, setSongTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [copied, setCopied] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const toggle = (id: string) =>
    save({ ...settings, off: settings.off.includes(id) ? settings.off.filter((x) => x !== id) : [...settings.off, id] });

  const remove = (what: NonNullable<Slide["removes"]>) =>
    save(
      what.type === "passage"
        ? { ...settings, passages: settings.passages.filter((p) => p.reference !== what.key) }
        : { ...settings, songs: settings.songs.filter((s) => s.id !== what.key) },
    );

  const addScripture = () => {
    setScriptureError("");
    startLooking(async () => {
      const passage = await lookUpScripture(reference);
      if (!passage) {
        setScriptureError("That reference was not found. Try “Romans 12:5” or “Psalm 23”.");
        return;
      }
      const passages = [...settings.passages.filter((p) => p.reference !== passage.reference), passage];
      save({ ...settings, passages });
      setReference("");
    });
  };

  const addSong = () => {
    if (!songTitle.trim() || !lyrics.trim()) return;
    const id = `${Date.now().toString(36)}`;
    save({ ...settings, songs: [...settings.songs, { id, title: songTitle.trim(), lyrics: lyrics.trim() }] });
    setSongTitle("");
    setLyrics("");
  };

  const remoteUrl = typeof window === "undefined" ? "/app/live/remote" : `${window.location.origin}/app/live/remote`;

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="drawer-scrim" onClick={onClose}>
      <div
        ref={panel}
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Run of service"
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="drawer-head">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight text-ink">Run of service</h2>
            <p className="mt-0.5 text-[12px] text-ink-3">{shown.length} slides, in the order they are shown</p>
          </div>
          <button type="button" onClick={onClose} className="drawer-close" aria-label="Close">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="drawer-body">
          <div className="drawer-row">
            <span className="text-[12.5px] text-ink-2">The service starts at</span>
            <Listbox variant="sm" label="Service starts at" value={settings.start} onChange={(start) => save({ ...settings, start })} options={STARTS} />
          </div>

          <ol className="deck-list">
            {slides.map((s) => {
              const Icon = ICON[s.kind];
              const on = !settings.off.includes(s.id);
              const n = shown.findIndex((x) => x.id === s.id);
              const firstOfGroup = !s.removes || s.id.endsWith(":0");
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
                  {s.removes && firstOfGroup && (
                    <button type="button" className="deck-play" onClick={() => remove(s.removes!)} aria-label={`Remove ${s.title}`} title="Remove">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                  <button type="button" className="deck-play" onClick={() => onPresent(s.id)} disabled={!on} aria-label={`Present from ${s.title}`} title="Present from here">
                    <Play className="h-3.5 w-3.5" aria-hidden />
                  </button>
                  <button type="button" role="switch" aria-checked={on} aria-label={`${on ? "Leave out" : "Include"} ${s.title}`} className="deck-switch" onClick={() => toggle(s.id)}>
                    <span />
                  </button>
                </li>
              );
            })}
          </ol>

          <section className="drawer-section">
            <h3 className="drawer-label">
              <BookOpen className="h-3.5 w-3.5" aria-hidden /> Add a reading
            </h3>
            <form
              className="flex gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                addScripture();
              }}
            >
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Romans 12:4-8"
                aria-label="Scripture reference"
                className="deck-input flex-1"
              />
              <button type="submit" className="btn btn-sm btn-quiet" disabled={looking || !reference.trim()}>
                {looking ? "Finding…" : "Add"}
              </button>
            </form>
            <p className="drawer-note">{scriptureError || "King James Version, a few verses a screen."}</p>
          </section>

          <section className="drawer-section">
            <h3 className="drawer-label">
              <Music className="h-3.5 w-3.5" aria-hidden /> Add a song
            </h3>
            <input value={songTitle} onChange={(e) => setSongTitle(e.target.value)} placeholder="Title" aria-label="Song title" className="deck-input w-full" />
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder={"Lyrics. Leave a blank line between verses;\neach verse is a screen."}
              aria-label="Song lyrics"
              rows={6}
              className="deck-input mt-2 w-full resize-y"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="drawer-note">Only lyrics your church is licensed to show.</p>
              <button type="button" className="btn btn-sm btn-quiet" onClick={addSong} disabled={!songTitle.trim() || !lyrics.trim()}>
                Add
              </button>
            </div>
          </section>

          <section className="drawer-section">
            <h3 className="drawer-label">
              <Smartphone className="h-3.5 w-3.5" aria-hidden /> Phone remote
            </h3>
            <p className="drawer-note">Open this on your phone, signed in as you, to move the slides from anywhere in the room.</p>
            <div className="mt-2 flex items-center gap-2">
              <Link href="/app/live/remote" className="deck-input flex-1 truncate text-ink-2">
                {remoteUrl.replace(/^https?:\/\//, "")}
              </Link>
              <button
                type="button"
                className="btn btn-sm btn-quiet"
                onClick={() => {
                  navigator.clipboard?.writeText(remoteUrl).then(() => {
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 1600);
                  });
                }}
              >
                {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </section>
        </div>

        <div className="drawer-foot">
          <button type="button" className="btn btn-primary w-full" onClick={() => onPresent(shown[0]?.id ?? "welcome")} disabled={!shown.length}>
            <MonitorPlay className="h-4 w-4" aria-hidden /> Present from the top
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* the stage                                                           */
/* ------------------------------------------------------------------ */

function Stage({
  slides,
  index,
  step,
  blank,
  setBlank,
  go,
  onEnd,
  live,
  church,
  notices,
  events,
  start,
}: {
  slides: Slide[];
  index: number;
  step: 1 | -1;
  blank: boolean;
  setBlank: (fn: (b: boolean) => boolean) => void;
  go: (n: number) => void;
  onEnd: () => void;
  live: Live | null;
  church: string;
  notices: DeckNotice[];
  events: DeckEvent[];
  start: string;
}) {
  const [full, setFull] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const idle = useRef(0);
  const slide = slides[index];

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
      const move = (n: number) => {
        event.preventDefault();
        go(n);
      };
      if (k === "ArrowRight" || k === "ArrowDown" || k === "PageDown" || k === " " || k === "Enter") move(index + 1);
      else if (k === "ArrowLeft" || k === "ArrowUp" || k === "PageUp" || k === "Backspace") move(index - 1);
      else if (k === "Home") move(0);
      else if (k === "End") move(count - 1);
      else if (/^[1-9]$/.test(k)) move(Number(k) - 1);
      else if (k === "b" || k === "B" || k === ".") {
        event.preventDefault();
        setBlank((b) => !b);
      } else if (k === "f" || k === "F") {
        event.preventDefault();
        if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
        else document.documentElement.requestFullscreen?.().catch(() => {});
      } else if (k === "Escape") {
        event.preventDefault();
        onEnd();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, slides.length, go, setBlank, onEnd]);

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
      {/* Keyed on the slide, so each arrives fresh; the direction it came
          from decides which way it slides in. */}
      <div className="presenter-slide" key={slide.id} data-dir={step === 1 ? "next" : "prev"}>
        {slide.kind === "welcome" && <WelcomeSlide />}
        {slide.kind === "countdown" && <CountdownSlide start={start} church={church} />}
        {slide.kind === "code" && live && <CodeSlide live={live} />}
        {slide.kind === "room" && live && <RoomSlide live={live} />}
        {slide.kind === "message" && live?.sermon && <MessageSlide sermon={live.sermon} />}
        {(slide.kind === "scripture" || slide.kind === "song") && <WordsSlide slide={slide} />}
        {slide.kind === "question" && slide.prompt && <QuestionSlide prompt={slide.prompt} />}
        {slide.kind === "announcements" && <AnnouncementsSlide notices={notices} events={events} />}
      </div>

      <div className="presenter-brand" aria-hidden>
        {live ? (
          <>
            <span className="presenter-live" /> {live.branch_name ?? church}
          </>
        ) : (
          church
        )}
      </div>

      <div className="presenter-progress" aria-hidden>
        <span style={{ width: `${((index + 1) / slides.length) * 100}%` }} />
      </div>

      <nav className="presenter-controls" aria-label="Presentation">
        <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <span className="presenter-count tnum">
          {index + 1} / {slides.length}
        </span>
        <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" disabled={index === slides.length - 1}>
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
        <button type="button" onClick={onEnd} aria-label="Stop presenting">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </nav>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* slides                                                              */
/* ------------------------------------------------------------------ */

/** One word, as large as the wall allows. */
function WelcomeSlide() {
  return (
    <div className="ps ps-center">
      <p className="ps-welcome">Welcome</p>
    </div>
  );
}

/** A reading or a song: a few lines, large, the reference or title above. */
function WordsSlide({ slide }: { slide: Slide }) {
  return (
    <div className={`ps ${slide.kind === "song" ? "ps-center" : ""}`}>
      {slide.heading ? <p className="ps-kicker">{slide.heading}</p> : <p className="ps-kicker ps-kicker-quiet">{slide.title}</p>}
      <div className={slide.kind === "song" ? "ps-lyrics" : "ps-scripture"}>
        {(slide.lines ?? []).map((line, i) => (
          <p key={i}>
            {line.n != null && <sup>{line.n}</sup>}
            {line.text}
          </p>
        ))}
      </div>
    </div>
  );
}

/** Notices and what is coming up, together, at the end of the service. */
function AnnouncementsSlide({ notices, events }: { notices: DeckNotice[]; events: DeckEvent[] }) {
  return (
    <div className="ps">
      <p className="ps-kicker">Announcements</p>
      <div className={notices.length && events.length ? "ps-announce" : ""}>
        {notices.length > 0 && (
          <ul className="ps-notices">
            {notices.slice(0, 3).map((n) => (
              <li key={n.id}>
                <span className="ps-notice-title">{n.title}</span>
                <span className="ps-notice-body">{n.content}</span>
              </li>
            ))}
          </ul>
        )}
        {events.length > 0 && (
          <ul className="ps-events">
            {events.slice(0, 4).map((e) => (
              <li key={e.id}>
                <span className="ps-event-when">{eventWhen(e.startsAt, e.allDay)}</span>
                <span className="ps-event-title">{e.title}</span>
                {e.location && <span className="ps-event-where">{e.location}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

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

/* ------------------------------------------------------------------ */
/* the phone remote                                                    */
/* ------------------------------------------------------------------ */

/**
 * The deck, from a phone in the room.
 *
 * It sends commands as `deck.*` signals on the leader's own channel, and
 * the presenting screen (signed in as the same leader) acts on them and
 * answers with where it is: which slide, how many, whether it is blank,
 * and every title, so the remote can show what is on the wall and what
 * comes next without a second copy of the deck. On opening it says
 * `hello` and the screen replies. A tap answers at once on the phone
 * (the button presses) and the wall follows a moment later.
 */
export function DeckRemote() {
  const [state, setState] = useState<{ slide: number; blank: boolean; titles: string[] } | null>(null);
  const [heard, setHeard] = useState<"waiting" | "live" | "none">("waiting");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const onLive = (event: Event) => {
      const m = (event as CustomEvent<{ type?: string; slide?: number; blank?: boolean; titles?: string[] }>).detail;
      if (m?.type === "deck.state") {
        setState({ slide: m.slide ?? 0, blank: Boolean(m.blank), titles: m.titles ?? [] });
        setHeard("live");
      } else if (m?.type === "deck.end") {
        setState(null);
        setHeard("none");
      } else if (m?.type === "resync") {
        void sendDeck({ action: "hello" });
      }
    };
    window.addEventListener("chapl:live", onLive);
    void sendDeck({ action: "hello" });
    const timer = window.setTimeout(() => setHeard((h) => (h === "waiting" ? "none" : h)), 3500);
    return () => {
      window.removeEventListener("chapl:live", onLive);
      window.clearTimeout(timer);
    };
  }, []);

  const send = (signal: DeckSignal) => {
    setSending(true);
    void sendDeck(signal).finally(() => setSending(false));
    navigator.vibrate?.(10);
  };

  const titles = state?.titles ?? [];
  const at = state?.slide ?? 0;

  return (
    <div className="remote">
      <div className="remote-now">
        <p className="remote-kicker">
          <span className={heard === "live" ? "presenter-live" : "remote-dot"} aria-hidden />
          {heard === "live" ? `On the screen · ${at + 1} of ${titles.length}` : heard === "waiting" ? "Finding the screen…" : "Nothing is being presented"}
        </p>
        <p className="remote-title">{heard === "live" ? (state?.blank ? "Blank screen" : titles[at]) : "Press Present on the computer at the front, or start it from here."}</p>
        {heard === "live" && titles[at + 1] && <p className="remote-next">Next: {titles[at + 1]}</p>}
      </div>

      {heard === "live" ? (
        <>
          <div className="remote-pad">
            <button type="button" className="remote-btn remote-prev" onClick={() => send({ action: "prev" })} disabled={at === 0} aria-label="Previous slide">
              <ChevronLeft className="h-7 w-7" aria-hidden />
            </button>
            <button type="button" className="remote-btn remote-go" onClick={() => send({ action: "next" })} disabled={at >= titles.length - 1} aria-label="Next slide">
              Next
              <ChevronRight className="h-7 w-7" aria-hidden />
            </button>
          </div>
          <div className="remote-row">
            <button type="button" className="btn btn-quiet flex-1" onClick={() => send({ action: "blank" })} aria-pressed={state?.blank}>
              {state?.blank ? "Show slide" : "Blank screen"}
            </button>
            <button type="button" className="btn btn-quiet flex-1" onClick={() => send({ action: "end" })}>
              End
            </button>
          </div>
          <ol className="remote-list" aria-label="Every slide">
            {titles.map((t, i) => (
              <li key={i}>
                <button type="button" aria-current={i === at ? "step" : undefined} onClick={() => send({ action: "goto", slide: i })}>
                  <span className="tnum">{i + 1}</span>
                  {t}
                </button>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <button type="button" className="btn btn-primary w-full" onClick={() => send({ action: "first" })} disabled={sending}>
          <MonitorPlay className="h-4 w-4" aria-hidden /> Start presenting
        </button>
      )}
    </div>
  );
}
