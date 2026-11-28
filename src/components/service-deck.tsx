"use client";

import {
  ArrowDown, ArrowUp, BookOpen, Cake, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Copy, DoorOpen, Hand, HandHeart,
  Maximize2, Megaphone, Minimize2, MonitorPlay, Music, Palette, Play, RotateCcw, Undo2, QrCode, Settings2, Smartphone,
  Sparkles, Sunset, Trash2, Users, X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULT_STYLE, presentationStyle, type PresentationStyle } from "@/lib/presentation";
import { PresentationSettings, PresentationBackdrop } from "@/components/presentation-settings";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";

import { sendDeck, type DeckSignal, type DeckMessage } from "@/lib/deck";
import { lookUpScripture, type Passage } from "@/app/actions/scripture";
import { TheatreRoom } from "@/components/theatre-room";
import { DotNumeral, paintNumeral } from "@/components/landing/dot-numeral";
import { Listbox } from "@/components/ui/pickers";
import type { Schemas } from "@/lib/generated/api";

type Live = Schemas["LiveService"];
type Prompt = Schemas["LivePrompt"];

export type DeckNotice = { id: string; title: string; content: string; pinned: boolean };
export type DeckEvent = { id: string; title: string; startsAt: string; allDay: boolean; location: string | null };
/** How to give, from the church's own contact details. */
export type DeckGiving = { phone: string | null; email: string | null; website: string | null };
/** The next service that has not started, for the Closing slide. */
export type DeckNextService = { title: string; startsAt: string };
type Song = { id: string; title: string; lyrics: string };

type Kind =
  | "welcome" | "countdown" | "code" | "room" | "newhere" | "message" | "scripture" | "song" | "question"
  | "notice" | "events" | "birthdays" | "giving" | "closing";

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
  /** A notice slide's notice. */
  notice?: DeckNotice;
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
  newhere: DoorOpen,
  notice: Megaphone,
  events: CalendarDays,
  birthdays: Cake,
  giving: HandHeart,
  closing: Sunset,
};

/* ------------------------------------------------------------------ */
/* the deck's settings: on this device, read as an external store      */
/* ------------------------------------------------------------------ */

/*
 * A coarse clock, read as an external store so render stays pure: the run
 * of service asks it whether the countdown has reached zero, and the
 * answer only needs to be right within a few seconds.
 */
const CLOCK_STEP = 5000;
const clockTick = () => Math.floor(Date.now() / CLOCK_STEP);
const clockTickServer = () => 0;
function subscribeClock(changed: () => void) {
  const timer = window.setInterval(changed, CLOCK_STEP);
  return () => window.clearInterval(timer);
}

/** Whether today's `start` ("HH:MM") has come, at clock tick `tick`. */
function startPassed(start: string, tick: number): boolean {
  if (!tick) return false;
  const [h, m] = start.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
  const now = new Date(tick * CLOCK_STEP);
  return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds() >= h * 3600 + m * 60;
}

const subscribeMounted = () => () => {};
const clientMounted = () => true;
const serverMounted = () => false;

/** Mobile devices are controllers, never presentation receivers. */
function desktopOutputAvailable() {
  return !/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) &&
    !window.matchMedia("(pointer: coarse)").matches;
}
function subscribeOutputDevice(changed: () => void) {
  const pointer = window.matchMedia("(pointer: coarse)");
  pointer.addEventListener("change", changed);
  return () => pointer.removeEventListener("change", changed);
}


const KEY = "chaplDeck";
const CHANGED = "chapl:deck";
type Settings = { scope: string; lastSlide: string | null; order: string[]; off: string[]; start: string; passages: Passage[]; songs: Song[]; appearance: PresentationStyle; edits: Record<string, { title: string; subtitle: string }> };
// `start` is empty until somebody chooses one: until then the countdown
// follows the day's next event (`defaultStart`), else 10 am.
const DEFAULTS: Settings = { scope: "default", lastSlide: null, order: [], off: [], start: "", passages: [], songs: [], appearance: DEFAULT_STYLE, edits: {} };

// The raw string is the snapshot (a stable value), parsed once per change.
function readRaw(scope = "default"): string {
  try {
    return window.localStorage.getItem(`${KEY}:${scope}`) ?? window.localStorage.getItem(KEY) ?? "";
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
function parse(raw: string, scope = "default"): Settings {
  try {
    const v = JSON.parse(raw) as Partial<Settings>;
    return {
      scope,
      lastSlide: typeof v.lastSlide === "string" ? v.lastSlide : null,
      order: Array.isArray(v.order) ? v.order.filter((id): id is string => typeof id === "string") : [],
      off: Array.isArray(v.off) ? v.off : [],
      start: typeof v.start === "string" ? v.start : DEFAULTS.start,
      passages: Array.isArray(v.passages) ? v.passages : [],
      songs: Array.isArray(v.songs) ? v.songs : [],
      appearance: presentationStyle(v.appearance),
      edits: v.edits && typeof v.edits === "object" ? v.edits : {},
    };
  } catch {
    return { ...DEFAULTS, scope };
  }
}
function save(next: Settings) {
  try {
    window.localStorage.setItem(`${KEY}:${next.scope}`, JSON.stringify(next));
  } catch {
    /* private mode: the deck still runs, it just does not remember */
  }
  window.dispatchEvent(new Event(CHANGED));
}
const useSettings = (scope = "default") => {
  const read = useCallback(() => readRaw(scope), [scope]);
  const raw = useSyncExternalStore(subscribe, read, () => "");
  return useMemo(() => parse(raw, scope), [raw, scope]);
};

/* ------------------------------------------------------------------ */
/* the header's presentation controls                                 */
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
      className="btn btn-quiet btn-sm live-room-tool"
      aria-label="Run of service"
      title="Run of service"
      onClick={() => window.dispatchEvent(new Event("chapl:deck-settings"))}
    >
      <Settings2 className="h-3.5 w-3.5" aria-hidden />
    </button>
  );
}

/** Open the studio without displacing the service's live visualizations. */
export function DeckStudioButton() {
  return <button type="button" className="btn btn-quiet btn-sm live-room-tool" aria-label="Slide studio" title="Slide studio" onClick={() => window.dispatchEvent(new Event("chapl:slide-studio"))}>
    <Palette className="h-3.5 w-3.5" aria-hidden />
  </button>;
}

function StudioOverlay({ onClose, scopeKey, sessionId }: { onClose: () => void; scopeKey: string; sessionId?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.showModal();
    return () => { document.body.style.overflow = previous; };
  }, []);
  return createPortal(<dialog ref={dialog} className="slide-studio-dialog" aria-labelledby="slide-studio-title" onClose={onClose} onClick={event => {
    if (event.target !== event.currentTarget) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
  }}>
    <header className="slide-studio-head"><h2 id="slide-studio-title">Slide studio</h2><button type="button" className="btn btn-quiet btn-sm" onClick={onClose} aria-label="Close slide studio"><X className="h-4 w-4" aria-hidden /></button></header>
    <div className="slide-studio-body"><DeckRemote scopeKey={scopeKey} sessions={sessionId ? [sessionId] : []} /></div>
  </dialog>, document.body);
}

function RemoteControlIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="7" y="2" width="10" height="20" rx="3" />
    <circle cx="12" cy="6" r="1" /><circle cx="12" cy="13" r="3" />
    <path d="M12 10v6m-3-3h6m-5 6h.01M14 19h.01" />
  </svg>;
}

/** Keep the presenting page open when the remote is opened on this device. */
export function DeckRemoteButton() {
  return (
    <Link
      href="/app/live/remote"
      target="_blank"
      rel="noopener noreferrer"
      className="btn btn-quiet btn-sm live-room-tool"
      aria-label="Open presentation remote"
      title="Open presentation remote"
    >
      <RemoteControlIcon className="h-3.5 w-3.5" />
    </Link>
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
 * code, the room filling, New here? (the code again, and a word about
 * cells), today's message, the readings (KJV, looked up by reference),
 * the songs (lyrics as typed, a verse a screen), each question asked;
 * then each notice on a slide of its own, what is coming up, this week's
 * birthdays (first names only), how to give, and a closing send-off with
 * the next service. The run lives in a drawer opened from the control room,
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
  audience = false, initialSlide = 0, scopeKey, receiverId,
  church,
  live,
  notices,
  events,
  birthdays = [],
  giving = null,
  nextService = null,
  defaultStart,
}: {
  church: string;
  live: Live | null;
  notices: DeckNotice[];
  events: DeckEvent[];
  /** First names with a birthday this week. */
  birthdays?: string[];
  giving?: DeckGiving | null;
  nextService?: DeckNextService | null;
  audience?: boolean; initialSlide?: number; scopeKey: string; receiverId?: string;
  /** "HH:MM" of today's next event, for a countdown nobody has set. */
  defaultStart?: string;
}) {
  const stored = useSettings(scopeKey);
  // The service behind the deck: its screens and remotes share its channel.
  const sessionId = live?.session_id;
  const settings = useMemo(
    () => (stored.start ? stored : { ...stored, start: defaultStart ?? "10:00" }),
    [stored, defaultStart],
  );
  const desktopOutput = useSyncExternalStore(subscribeOutputDevice, desktopOutputAvailable, serverMounted);

  useEffect(() => {
    if (!desktopOutput) return;
    window.dispatchEvent(new CustomEvent("chapl:receiver", { detail: true }));
    return () => { window.dispatchEvent(new CustomEvent("chapl:receiver", { detail: false })); };
  }, [desktopOutput]);

  const prompts = useMemo(() => {
    const all = live?.prompts ?? (live?.prompt ? [live.prompt] : []);
    return [...all].sort((a, b) => Number(b.is_open) - Number(a.is_open) || b.created_at.localeCompare(a.created_at));
  }, [live]);

  // The snapshot is the answer itself, so the deck re-renders once, when
  // the countdown runs out, not on every tick of the clock.
  const countdownOver = useSyncExternalStore(
    subscribeClock,
    () => startPassed(settings.start, clockTick()),
    () => startPassed(settings.start, clockTickServer()),
  );

  const slides: Slide[] = useMemo(
    () => [
      { id: "welcome", kind: "welcome", title: "Welcome", summary: church },
      // At zero the countdown has said what it had to: it leaves the run,
      // and a screen showing it moves on to what came after it.
      ...(countdownOver
        ? []
        : [{ id: "countdown", kind: "countdown" as const, title: "Countdown", summary: `To ${STARTS.find((s) => s.value === settings.start)?.label ?? settings.start}` }]),
      ...(live
        ? [
            { id: "code", kind: "code" as const, title: "Check-in code", summary: live.is_open && live.code ? live.code.toUpperCase() : "Check-in closed" },
            { id: "room", kind: "room" as const, title: "The room", summary: `${live.present ?? 0}${live.expected ? ` of ${live.expected}` : ""} here` },
          ]
        : []),
      { id: "newhere", kind: "newhere" as const, title: "New here?", summary: live?.is_open && live.code ? `Code ${live.code.toUpperCase()} · join a cell` : "Welcome · join a cell" },
      ...(live?.sermon ? [{ id: "message", kind: "message" as const, title: "Today’s message", summary: live.sermon.title }] : []),
      ...settings.passages.flatMap(passageSlides),
      ...settings.songs.flatMap(songSlides),
      ...prompts.map((p) => ({ id: `q:${p.id}`, kind: "question" as const, title: p.question, summary: p.is_open ? "Question · open" : "Question · results", prompt: p })),
      // Each notice is a slide of its own, pinned first, so none is cut to
      // fit beside another.
      ...notices.map((n) => ({ id: `notice:${n.id}`, kind: "notice" as const, title: n.title, summary: n.pinned ? "Notice · pinned" : "Notice", notice: n })),
      ...(events.length ? [{ id: "events", kind: "events" as const, title: "Coming up", summary: `${events.length} in the next two weeks` }] : []),
      ...(birthdays.length ? [{ id: "birthdays", kind: "birthdays" as const, title: "Birthdays this week", summary: birthdays.slice(0, 3).join(", ") + (birthdays.length > 3 ? ` and ${birthdays.length - 3} more` : "") }] : []),
      ...(giving ? [{ id: "giving", kind: "giving" as const, title: "Giving", summary: [giving.phone, giving.website, giving.email].filter(Boolean)[0] ?? "" }] : []),
      { id: "closing", kind: "closing" as const, title: "Go in peace", summary: nextService ? `Next: ${nextService.title}, ${eventWhen(nextService.startsAt, false)}` : "Send-off" },
    ],
    [church, live, prompts, settings.start, countdownOver, settings.passages, settings.songs, notices, events.length, birthdays, giving, nextService],
  );
  const orderedSlides = useMemo(() => {
    const position = new Map(settings.order.map((id, i) => [id, i]));
    return [...slides].sort((a, b) => (position.get(a.id) ?? settings.order.length) - (position.get(b.id) ?? settings.order.length));
  }, [slides, settings.order]);
  const shown = useMemo(() => orderedSlides.filter(s => !settings.off.includes(s.id)), [orderedSlides, settings.off]);

  const [presenting, setPresenting] = useState(audience);
  const [drawer, setDrawer] = useState(false);
  const [studio, setStudio] = useState(false);
  const [localOutput, setLocalOutput] = useState(false);
  const outputWindow = useRef<Window | null>(null);
  const screenId = useRef(receiverId ?? "");
  const transportReady = useRef(false);
  const lastReport = useRef("");
  const lastReportAt = useRef(-Infinity);
  const undoHistory = useRef<Settings[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const [screenName, setScreenName] = useState("Presentation screen");
  const [index, setIndex] = useState(initialSlide);
  const [blank, setBlank] = useState(false);
  const [step, setStep] = useState<1 | -1>(1);

  const go = useCallback(
    (n: number) => {
      const next = Math.max(0, Math.min(shown.length - 1, n));
      setStep(next >= index ? 1 : -1);
      setIndex(next);
      setBlank(false);
    },
    [shown.length, index],
  );

  const present = useCallback(
    (from: string | number | null, full = true) => {
      const at = typeof from === "number" ? from : shown.findIndex((s) => s.id === (from ?? settings.lastSlide ?? "welcome"));
      if (!desktopOutputAvailable()) {
        setDrawer(false);
        setStudio(true);
        return;
      }
      if (!audience && !localOutput) {
        const outputParams = new URLSearchParams(window.location.search);
        outputParams.set("screen", "audience");
        outputParams.set("slide", String(Math.max(0, at)));
        if (screenId.current) outputParams.set("receiver", screenId.current);
        const output = window.open(`/app/live?${outputParams}`, "chapl-audience", "popup,width=1280,height=800");
        outputWindow.current = output;
        if (!output) window.dispatchEvent(new CustomEvent("chapl:output-blocked"));
        setDrawer(false);
        setStudio(true);
        return;
      }
      setIndex(Math.max(0, Math.min(shown.length - 1, at)));
      setStep(1);
      setBlank(false);
      setDrawer(false);
      setPresenting(true);
      if (full) document.documentElement.requestFullscreen?.().catch(() => {});
    },
    [shown, audience, localOutput, settings.lastSlide],
  );

  const end = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    setPresenting(false);
  }, []);

  useEffect(() => {
    const onPresent = (event: Event) => present((event as CustomEvent<{ from: string | null }>).detail?.from ?? null);
    const onSettings = () => setDrawer(true);
    const onStudio = () => setStudio(true);
    const closeStudio = () => setStudio(false);
    window.addEventListener("chapl:present", onPresent);
    window.addEventListener("chapl:deck-settings", onSettings);
    window.addEventListener("chapl:slide-studio", onStudio);
    window.addEventListener("chapl:close-studio", closeStudio);
    return () => {
      window.removeEventListener("chapl:present", onPresent);
      window.removeEventListener("chapl:deck-settings", onSettings);
      window.removeEventListener("chapl:slide-studio", onStudio);
      window.removeEventListener("chapl:close-studio", closeStudio);
    };
  }, [present]);

  const at = Math.min(index, Math.max(0, shown.length - 1));
  const titlesKey = JSON.stringify(shown.map(s => s.title));
  const styleKey = JSON.stringify({ ...settings.appearance, ...settings.edits[shown[at]?.id] });
  const resumeSlide = Math.max(0, shown.findIndex(s => s.id === settings.lastSlide));
  const canResume = settings.lastSlide != null && shown.some(s => s.id === settings.lastSlide);

  // Keep the checkpoint by slide ID, so changing readings does not shift it.
  useEffect(() => {
    const id = shown[at]?.id;
    if (!presenting || !desktopOutput || !id) return;
    const current = parse(readRaw(scopeKey), scopeKey);
    if (current.lastSlide !== id) save({ ...current, lastSlide: id });
  }, [presenting, desktopOutput, shown, at, scopeKey]);

  useEffect(() => {
    if (!desktopOutput) return;
    if (!screenId.current) screenId.current = crypto.randomUUID();
    let savedName: string | null = null;
    try { savedName = window.localStorage.getItem("chaplScreenName"); } catch { /* The screen works without storage. */ }
    // Naming is read after mount; announcements still have an ID suffix.
    if (savedName && savedName !== screenName) {
      queueMicrotask(() => setScreenName(savedName));
    }
    const eligible = () => audience || localOutput || !outputWindow.current || outputWindow.current.closed;
    // A screen speaks when asked (a remote's hello) or when what it shows
    // changes. It keeps no heartbeat of its own: the remote's hello is the
    // heartbeat, so a screen with no remote watching sends nothing.
    const report = (action: "screen" | "state" = "screen", force = false) => {
      if (!transportReady.current || !eligible()) return;
      let name = screenName;
      try { name = window.localStorage.getItem("chaplScreenName") || name; } catch { /* Use the session name. */ }
      const signal: DeckSignal = { action, sessionId, screenId: screenId.current, serviceKey: scopeKey,
        name, presenting, slide: at, blank: blank || !presenting,
        resumeSlide: canResume ? resumeSlide : undefined,
        titles: JSON.parse(titlesKey), style: JSON.parse(styleKey), canUndo: undoCount > 0 };
      // This effect re-runs whenever the page re-renders (a live refresh
      // hands in new slides); only a real change goes on the wire.
      const key = JSON.stringify({ ...signal, action: undefined });
      // A remote says hello on two channels (its own and the service's),
      // and every remote does; one answer a second covers them all.
      const now = performance.now();
      if (key === lastReport.current && (!force || now - lastReportAt.current < 1000)) return;
      lastReport.current = key;
      lastReportAt.current = now;
      void sendDeck(signal);
    };
    const onLive = (event: Event) => {
      const m = (event as CustomEvent<DeckMessage>).detail;
      if (!m) return;
      // A dropped line forgets what it last said, so the first report
      // after it goes out even if nothing on the screen changed.
      if (m.type === "disconnected") { transportReady.current = false; lastReport.current = ""; return; }
      if (["connected", "ready", "resync"].includes(m.type ?? "")) {
        transportReady.current = true;
        report();
        return;
      }
      if (m.type === "deck.hello") { report("screen", true); return; }
      if (!eligible() || m.screenId !== screenId.current || m.serviceKey !== scopeKey) return;
      if (m.type === "deck.state" || m.type === "deck.screen") return;
      if (m.type === "deck.rename" && m.name?.trim()) {
        const name = m.name.trim().slice(0, 80);
        try { window.localStorage.setItem("chaplScreenName", name); } catch { /* Keep the name for this session. */ }
        setScreenName(name);
        return;
      }
      const current = parse(readRaw(scopeKey), scopeKey);
      if (m.type === "deck.undo") {
        const previous = undoHistory.current.pop();
        if (previous) save({ ...previous, lastSlide: current.lastSlide });
        setUndoCount(undoHistory.current.length);
        return;
      }
      if (m.type === "deck.style" && m.style) {
        const id = shown[at]?.id;
        const { title, subtitle, ...visual } = m.style;
        const previous = current.edits[id] ?? { title: "", subtitle: "" };
        const next = { ...current, appearance: presentationStyle({ ...current.appearance, ...visual }),
          edits: id ? { ...current.edits, [id]: { title: title ?? previous.title, subtitle: subtitle ?? previous.subtitle } } : current.edits };
        if (JSON.stringify(current) !== JSON.stringify(next)) {
          undoHistory.current = [...undoHistory.current.slice(-9), current];
          setUndoCount(undoHistory.current.length);
          save(next);
        }
        return;
      }
      if (!m.type?.startsWith("deck.")) return;
      const action = m.type.slice(5);
      if (!presenting) {
        if (!["first", "resume", "goto"].includes(action)) return;
        setIndex(action === "resume" ? resumeSlide : action === "goto" ? Math.max(0, Math.min(shown.length - 1, m.slide ?? 0)) : 0);
        setBlank(false); setDrawer(false); setStudio(false);
        setLocalOutput(true); setPresenting(true);
        return;
      }
      if (action === "next") go(at + 1);
      else if (action === "prev") go(at - 1);
      else if (action === "first") go(0);
      else if (action === "resume") go(resumeSlide);
      else if (action === "last") go(shown.length - 1);
      else if (action === "goto") go(m.slide ?? 0);
      else if (action === "blank") setBlank(b => !b);
      else if (action === "end") {
        end();
      }
    };
    window.addEventListener("chapl:live", onLive);
    window.dispatchEvent(new Event("chapl:live-probe"));
    report(presenting ? "state" : "screen");
    return () => window.removeEventListener("chapl:live", onLive);
  }, [desktopOutput, audience, localOutput, scopeKey, sessionId, screenName, presenting, at, blank, resumeSlide, canResume, titlesKey, styleKey, undoCount, shown, go, end]);

  return (
    <>
      {!audience && studio && <StudioOverlay scopeKey={scopeKey} sessionId={sessionId} onClose={() => setStudio(false)} />}
      {drawer && (
        <Drawer
          slides={orderedSlides}
          shown={shown}
          settings={settings}
          onClose={() => setDrawer(false)}
          onPresent={(id) => present(id)}
        />
      )}
      {desktopOutput && (presenting || audience || localOutput) && shown.length > 0 && (
        <Stage
          slides={shown}
          index={at}
          step={step}
          blank={blank || !presenting}
          setBlank={setBlank}
          go={go}
          onEnd={end}
          live={live}
          events={events}
          birthdays={birthdays}
          giving={giving}
          nextService={nextService}
          church={church}
          start={settings.start}
          appearance={JSON.parse(styleKey)}
          audience
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

  const move = (id: string, direction: -1 | 1) => {
    const order = slides.map(slide => slide.id);
    const at = order.indexOf(id), next = at + direction;
    if (at < 0 || next < 0 || next >= order.length) return;
    [order[at], order[next]] = [order[next], order[at]];
    save({ ...settings, order });
  };

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
            {slides.map((s, position) => {
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
                  <div className="deck-reorder">
                    <button type="button" className="deck-play" disabled={position === 0} onClick={() => move(s.id, -1)} aria-label={`Move ${s.title} up`}><ArrowUp className="h-3 w-3" aria-hidden /></button>
                    <button type="button" className="deck-play" disabled={position === slides.length - 1} onClick={() => move(s.id, 1)} aria-label={`Move ${s.title} down`}><ArrowDown className="h-3 w-3" aria-hidden /></button>
                  </div>
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
  appearance, audience,
  slides,
  index,
  step,
  blank,
  setBlank,
  go,
  onEnd,
  live,
  events,
  birthdays,
  giving,
  nextService,
  church,
  start,
}: {
  appearance: PresentationStyle; audience: boolean;
  slides: Slide[];
  index: number;
  step: 1 | -1;
  blank: boolean;
  setBlank: (fn: (b: boolean) => boolean) => void;
  go: (n: number) => void;
  onEnd: () => void;
  live: Live | null;
  events: DeckEvent[];
  birthdays: string[];
  giving: DeckGiving | null;
  nextService: DeckNextService | null;
  church: string;
  start: string;
}) {
  const mounted = useSyncExternalStore(subscribeMounted, clientMounted, serverMounted);
  const [full, setFull] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const idle = useRef(0);
  const slide = slides[index];

  useEffect(() => {
    if (!mounted) return;
    const overflow = document.body.style.overflow;
    const shell = document.querySelector<HTMLElement>(".app-ambient");
    const inert = shell?.inert ?? false;
    if (shell) shell.inert = true;
    document.body.style.overflow = "hidden";
    stage.current?.focus({ preventScroll: true });
    // A screen being controlled from another tab must keep hearing commands.
    window.dispatchEvent(new CustomEvent("chapl:presentation", { detail: true }));
    return () => {
      document.body.style.overflow = overflow;
      if (shell) shell.inert = inert;
      window.dispatchEvent(new CustomEvent("chapl:presentation", { detail: false }));
    };
  }, [mounted]);

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
      if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
        idle.current = window.setTimeout(() => node?.setAttribute("data-idle", ""), 2500);
      }
    };
    wake();
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);
    window.addEventListener("keydown", wake);
    return () => {
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
      window.removeEventListener("keydown", wake);
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

  if (!mounted) return null;

  return createPortal(
    <div ref={stage} onDoubleClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} tabIndex={-1} className="presenter" data-mode={appearance.mode} data-motion={appearance.motion ? "on" : "off"} role="dialog" aria-modal="true" aria-label="Presenting the service" data-blank={blank ? "" : undefined}>
      <PresentationBackdrop appearance={appearance} />
      {/* Keyed on the slide, so each arrives fresh; the direction it came
          from decides which way it slides in. */}
      <div className="presenter-slide" style={{ transform: `scale(${appearance.textSize / 100})`, width: `${10000 / appearance.textSize}%`, maxHeight: `${8500 / appearance.textSize}dvh` }} key={slide.id} data-dir={step === 1 ? "next" : "prev"}>
        {slide.kind === "welcome" ? <WelcomeSlide /> : slide.kind === "countdown" ? <CountdownSlide start={start} /> : (appearance.title || appearance.subtitle) ? (
          <div className="ps ps-editorial"><h1>{appearance.title || slide.title}</h1>{appearance.subtitle && <p>{appearance.subtitle}</p>}</div>
        ) : <>
        {slide.kind === "code" && live && <CodeSlide live={live} />}
        {slide.kind === "room" && live && <RoomSlide live={live} />}
        {slide.kind === "message" && live?.sermon && <MessageSlide sermon={live.sermon} />}
        {(slide.kind === "scripture" || slide.kind === "song") && <WordsSlide slide={slide} />}
        {slide.kind === "question" && slide.prompt && <QuestionSlide prompt={slide.prompt} />}
        {slide.kind === "newhere" && <NewHereSlide live={live} />}
        {slide.kind === "notice" && slide.notice && <NoticeSlide notice={slide.notice} />}
        {slide.kind === "events" && <EventsSlide events={events} />}
        {slide.kind === "birthdays" && <BirthdaysSlide names={birthdays} />}
        {slide.kind === "giving" && giving && <GivingSlide giving={giving} church={church} />}
        {slide.kind === "closing" && <ClosingSlide next={nextService} />}
        </>}
      </div>

      {!audience && <nav className="presenter-controls" aria-label="Presentation">
        <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" disabled={index === 0}>
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <div className="presenter-dots" aria-label="Slides">
          {slides.map((item, i) => (
            <button
              key={item.id}
              type="button"
              aria-label={`Slide ${i + 1}: ${item.title}`}
              aria-current={i === index ? "step" : undefined}
              onClick={() => go(i)}
            />
          ))}
        </div>
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
      </nav>}
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/* slides                                                              */
/* ------------------------------------------------------------------ */

/** One word, as large as the wall allows. */
function WelcomeSlide() {
  return (
    <div className="ps ps-center">
      <p className="ps-welcome">Welcome back</p>
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

/** One notice, the whole of it, large enough to read from the back. */
function NoticeSlide({ notice }: { notice: DeckNotice }) {
  return (
    <div className="ps">
      <p className="ps-kicker">{notice.pinned ? "Notice · pinned" : "Notice"}</p>
      <p className="ps-title">{notice.title}</p>
      {notice.content && <p className="ps-notice-full">{notice.content}</p>}
    </div>
  );
}

/** The next two weeks, in order: when, what, where. */
function EventsSlide({ events }: { events: DeckEvent[] }) {
  return (
    <div className="ps">
      <p className="ps-kicker">Coming up</p>
      <ul className="ps-events">
        {events.slice(0, 5).map((e) => (
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

/** First names only: a wall is no place for an age or a surname. */
function BirthdaysSlide({ names }: { names: string[] }) {
  return (
    <div className="ps ps-center">
      <p className="ps-kicker">Happy birthday</p>
      <p className="ps-title">This week we celebrate</p>
      <ul className="ps-names">
        {names.map((name, i) => (
          <li key={`${name}-${i}`}>{name}</li>
        ))}
      </ul>
    </div>
  );
}

/** How to give, from the church's own phone, website and email. */
function GivingSlide({ giving, church }: { giving: DeckGiving; church: string }) {
  const ways = [
    giving.phone && { label: "Call or send", value: giving.phone },
    giving.website && { label: "Online", value: giving.website.replace(/^https?:\/\//, "").replace(/\/$/, "") },
    giving.email && { label: "Email", value: giving.email },
  ].filter((w): w is { label: string; value: string } => Boolean(w));
  return (
    <div className="ps">
      <p className="ps-kicker">Giving</p>
      <p className="ps-title">Thank you for giving to {church}</p>
      <ul className="ps-ways">
        {ways.map((w) => (
          <li key={w.label}>
            <span className="ps-way-label">{w.label}</span>
            <span className="ps-way-value">{w.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** For anyone here the first time: check in, and find a cell. */
function NewHereSlide({ live }: { live: Live | null }) {
  const code = live?.is_open && live.code ? live.code.toUpperCase() : "";
  return (
    <div className="ps ps-center">
      <p className="ps-kicker">New here?</p>
      <p className="ps-title">You are welcome.</p>
      {code ? (
        <>
          <p className="ps-lede">Check in with this code in Chapl</p>
          <div className="ps-code ps-code-small">
            <DotNumeral value={code} label={`Check-in code ${code}`} />
          </div>
        </>
      ) : (
        <p className="ps-lede">Say hello at the welcome desk after the service.</p>
      )}
      <p className="ps-foot">Ask about a cell group near you: a small circle that meets in the week.</p>
    </div>
  );
}

/** The send-off, and when to come back. */
function ClosingSlide({ next }: { next: DeckNextService | null }) {
  return (
    <div className="ps ps-center">
      <p className="ps-welcome">Go in peace</p>
      {next && (
        <p className="ps-lede">
          See you at {next.title}, {eventWhen(next.startsAt, false)}
        </p>
      )}
    </div>
  );
}

function CountdownSlide({ start }: { start: string }) {
  const numeral = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const [h, m] = start.split(":").map(Number);
    const tick = () => {
      const now = new Date();
      const target = new Date(now);
      target.setHours(h, m, 0, 0);
      const left = Math.max(0, Math.round((target.getTime() - now.getTime()) / 1000));
      // Under an hour the clock is minutes and seconds; past it, hours and
      // minutes. The accessible label names the units without a visible caption.
      const hours = left >= 3600;
      const a = hours ? Math.floor(left / 3600) : Math.floor(left / 60);
      const b = hours ? Math.floor((left % 3600) / 60) : left % 60;
      const text = `${String(Math.min(a, 99)).padStart(2, "0")}:${String(b).padStart(2, "0")}`;
      if (numeral.current) paintNumeral(numeral.current, text);
      numeral.current?.setAttribute("aria-label", left === 0 ? "Service starting" : `${a} ${hours ? "hours" : "minutes"}, ${b} ${hours ? "minutes" : "seconds"} until the service begins`);
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [start]);

  return (
    <div className="ps ps-center">
      <div className="ps-countdown">
        <DotNumeral ref={numeral} value="00:00" template="00:00" label="Time until the service begins" />
      </div>
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
  const turnout = expected > 0 ? Math.round((present / expected) * 100) : null;
  return (
    <div className="ps ps-room-scene">
      <TheatreRoom present={present} expected={expected} where="" presentation />
      {turnout != null && <div className="ps-room-turnout">
        <div className="ps-room-track" role="img" aria-label={`${turnout}% attendance`}>
          <span style={{ width: `${Math.min(100, turnout)}%` }} />
        </div>
        <span className="tnum">{turnout}%</span>
      </div>}
    </div>
  );
}

function MessageSlide({ sermon }: { sermon: NonNullable<Live["sermon"]> }) {
  return (
    <div className="ps ps-center">
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
type RemoteScreen = DeckMessage & { screenId: string; serviceKey: string; lastSeen: number };

/**
 * A remote for a service's screens. It says hello on its own channel (its
 * own screens) and on each service in [sessions] — the open services the
 * holder could run — so a pastor's phone finds the screen the media desk
 * is presenting from, and the API refuses a service they could not run.
 */
export function DeckRemote({ scopeKey, returnOnEnd = false, sessions = [] }: { scopeKey?: string; returnOnEnd?: boolean; sessions?: string[] }) {
  const router = useRouter();
  const [screens, setScreens] = useState<Record<string, RemoteScreen>>({});
  const [chosen, setChosen] = useState("");
  const pairingKey = `chaplPairedScreen:${scopeKey ?? "remote"}`;
  const sessionsKey = sessions.join(",");
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [starting, setStarting] = useState(false);
  const [localUndoCount, setLocalUndoCount] = useState(0);
  const localHistory = useRef<Settings[]>([]);
  const startTimer = useRef<number | null>(null);
  const selectedId = useRef("");
  const online = Object.values(screens).filter(screen => now - screen.lastSeen < 12000);
  const activeScreens = online.filter(peer => peer.presenting);
  const screen = chosen ? screens[chosen] : activeScreens.length === 1 ? activeScreens[0] : online.length === 1 ? online[0] : undefined;
  const connected = Boolean(screen && now - screen.lastSeen < 12000);
  const live = connected && Boolean(screen?.presenting);
  const local = useSettings(screen?.serviceKey ?? scopeKey ?? "default");
  const titles = screen?.titles ?? [];
  const at = Math.max(0, Math.min(titles.length - 1, screen?.slide ?? 0));
  const style = presentationStyle(screen?.style ?? local.appearance);

  useEffect(() => {
    // Connecting announces itself twice (connected, then ready); every
    // screen answers each hello, so one within a second of the last is
    // dropped.
    const ids = sessionsKey ? sessionsKey.split(",") : [];
    const sayHello = () => {
      void sendDeck({ action: "hello" });
      for (const sessionId of ids) void sendDeck({ action: "hello", sessionId });
    };
    let lastHello = -Infinity;
    const hello = () => {
      const now = performance.now();
      if (now - lastHello < 1000) return;
      lastHello = now;
      sayHello();
    };
    try {
      const saved = window.sessionStorage.getItem(pairingKey);
      if (saved) queueMicrotask(() => { setChosen(saved); selectedId.current = saved; });
    } catch { /* Pairing still works for this open controller. */ }
    const onLive = (event: Event) => {
      const message = (event as CustomEvent<DeckMessage>).detail;
      if (!message) return;
      if (["connected", "ready", "resync"].includes(message.type ?? "")) {
        hello();
        return;
      }
      if (message.type === "deck.screen" || message.type === "deck.state") {
        if (!message.screenId || !message.serviceKey || (scopeKey && message.serviceKey !== scopeKey)) return;
        // A report heard on a service's channel says which; one on our own
        // channel keeps the service it was last heard on.
        const peer: RemoteScreen = { ...message, screenId: message.screenId, serviceKey: message.serviceKey, lastSeen: Date.now() };
        if (!peer.session_id) delete peer.session_id;
        setScreens(previous => ({ ...previous, [peer.screenId]: { ...previous[peer.screenId], ...peer } }));
        if (message.screenId === selectedId.current && message.presenting) {
          if (startTimer.current != null) window.clearTimeout(startTimer.current);
          setStarting(false);
          setError("");
        }
      }
    };
    const onBlocked = () => setError("Allow pop-ups on the presentation computer, then press Present again.");
    window.addEventListener("chapl:live", onLive);
    window.addEventListener("chapl:output-blocked", onBlocked);
    // Sent before the socket may be open, so it does not count against the
    // throttle: the connect that follows must still be able to ask.
    sayHello();
    window.dispatchEvent(new Event("chapl:live-probe"));
    const clock = window.setInterval(() => setNow(Date.now()), 1000);
    // The hello is the screens' heartbeat: each answers it, so a screen
    // that stops answering for 12s reads as gone. Asked only while this
    // remote is on screen; a pocketed phone keeps every screen quiet.
    const discover = window.setInterval(() => {
      if (document.visibilityState === "visible") hello();
    }, 4000);
    const onVisible = () => { if (document.visibilityState === "visible") hello(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("chapl:live", onLive);
      window.removeEventListener("chapl:output-blocked", onBlocked);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(clock); window.clearInterval(discover);
      if (startTimer.current != null) window.clearTimeout(startTimer.current);
    };
  }, [scopeKey, pairingKey, sessionsKey]);

  const pair = (id: string) => {
    selectedId.current = id;
    setChosen(id);
    try { window.sessionStorage.setItem(pairingKey, id); } catch { /* Keep pairing in memory. */ }
  };
  const send = async (signal: DeckSignal) => {
    if (!screen || !connected) {
      setError("Choose a connected presentation screen first.");
      return;
    }
    pair(screen.screenId);
    setSending(true);
    const startingDeck = signal.action === "first" || signal.action === "resume";
    if (startingDeck) {
      setStarting(true);
      if (startTimer.current != null) window.clearTimeout(startTimer.current);
      startTimer.current = window.setTimeout(() => {
        setStarting(false);
        setError("The desktop has not acknowledged Start. Check its connection and try again.");
      }, 6000);
    }
    const ok = await sendDeck({ ...signal, sessionId: screen.session_id, screenId: screen.screenId, serviceKey: screen.serviceKey });
    setSending(false);
    if (!ok) {
      setError("Could not reach the screen. Try again.");
      setStarting(false);
      if (startTimer.current != null) window.clearTimeout(startTimer.current);
      return;
    }
    setError("");
    navigator.vibrate?.(10);
    if (signal.action === "end") {
      window.dispatchEvent(new Event("chapl:close-studio"));
      if (returnOnEnd || !desktopOutputAvailable()) router.replace("/app/live");
    }
  };
  const changeStyle = (patch: Partial<PresentationStyle>) => {
    if (screen) { void send({ action: "style", style: patch }); return; }
    if (!desktopOutputAvailable()) { setError("Pair a connected desktop before editing its slides."); return; }
    localHistory.current = [...localHistory.current.slice(-9), local];
    setLocalUndoCount(localHistory.current.length);
    save({ ...local, appearance: presentationStyle({ ...local.appearance, ...patch }) });
  };
  const undo = () => {
    if (screen) { void send({ action: "undo" }); return; }
    const previous = localHistory.current.pop();
    if (previous) save(previous);
    setLocalUndoCount(localHistory.current.length);
  };

  return <div className="remote">
    {error && <p role="alert" className="remote-error">{error}</p>}
    <div className="remote-now">
      <p className="remote-kicker"><span className={connected ? "presenter-live" : "remote-dot"} aria-hidden />
        {screen ? connected ? live ? `On the screen · ${at + 1} of ${titles.length}` : "Screen ready" : "Screen disconnected" : online.length > 0 ? "Choose a screen" : "Finding the desktop…"}
      </p>
      <p className="remote-title">{live ? screen?.blank ? "Blank screen" : titles[at] : screen?.name ?? "Open Live service on the presentation computer, signed in with this account."}</p>
      {live && titles[at + 1] && <p className="remote-next">Next: {titles[at + 1]}</p>}
      <details className="remote-screen-picker">
        <summary>{screen ? live ? screen.name : "Screen options" : "Pair a screen"}{screen && <span> · {screen.screenId.slice(0,4)}</span>}</summary>
        <div className="remote-screen-options">
          {online.map(peer => <button key={peer.screenId} type="button" className="btn btn-sm btn-quiet" aria-pressed={peer.screenId === screen?.screenId} onClick={() => { pair(peer.screenId); setError(""); }}>
            {peer.name ?? "Presentation screen"} · {peer.screenId.slice(0,4)}
          </button>)}
          {online.length === 0 && <p>No screen connected. Keep Live service open on the desktop.</p>}
          {connected && <form key={`${screen?.screenId}:${screen?.name}`} onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void send({ action:"rename", name:String(data.get("name") ?? "").trim() }); }}>
            <label>Screen name<input className="deck-input" name="name" defaultValue={screen?.name} maxLength={80} required /></label>
            <button className="btn btn-sm btn-quiet" type="submit">Save name</button>
          </form>}
        </div>
      </details>
    </div>
    {live ? <>
      <div className="remote-pad">
        <button type="button" className="remote-btn remote-prev" disabled={sending || at === 0} onClick={() => void send({action:"prev"})} aria-label="Previous slide"><ChevronLeft className="h-7 w-7" aria-hidden /></button>
        <button type="button" className="remote-btn remote-go" disabled={sending || at >= titles.length - 1} onClick={() => void send({action:"next"})} aria-label="Next slide">Next<ChevronRight className="h-7 w-7" aria-hidden /></button>
      </div>
      <div className="remote-row">
        <button type="button" className="btn btn-quiet flex-1" disabled={sending} aria-pressed={screen?.blank} onClick={() => void send({action:"blank"})}>{screen?.blank ? "Show slide" : "Blank screen"}</button>
        <button type="button" className="btn btn-quiet flex-1" disabled={sending} onClick={() => void send({action:"end"})}>End</button>
      </div>
      <details className="remote-slide-index"><summary>All slides · {titles.length}</summary><ol className="remote-list" aria-label="Every slide">
        {titles.map((title,i) => <li key={`${i}:${title}`}><button type="button" disabled={sending || !connected} aria-current={i === at ? "step" : undefined} onClick={() => void send({action:"goto",slide:i})}><span className="tnum">{i+1}</span>{title}</button></li>)}
      </ol></details>
    </> : <div className="remote-row remote-start">
      <button type="button" className="btn btn-primary flex-1" disabled={!connected || sending || starting} onClick={() => void send({action:screen?.resumeSlide != null ? "resume" : "first"})}>
        {screen?.resumeSlide != null ? <RotateCcw className="h-4 w-4" aria-hidden /> : <MonitorPlay className="h-4 w-4" aria-hidden />}
        {starting ? "Starting on desktop…" : screen?.resumeSlide != null ? "Resume on desktop" : "Start on desktop"}
      </button>
      {screen?.resumeSlide != null && <button type="button" className="btn btn-quiet" disabled={!connected || sending || starting} onClick={() => void send({action:"first"})}>Start over</button>}
    </div>}
    <PresentationSettings key={`${screen?.screenId ?? "local"}:${at}`} textEditable={!["Welcome","Countdown"].includes(titles[at])} appearance={style} live={live} onChange={changeStyle} />
    {(screen?.canUndo || (!screen && localUndoCount > 0)) && <button type="button" className="btn btn-quiet btn-sm remote-undo" disabled={sending || Boolean(screen && !connected)} onClick={undo}><Undo2 className="h-3.5 w-3.5" aria-hidden /> Undo last edit</button>}
  </div>;
}
