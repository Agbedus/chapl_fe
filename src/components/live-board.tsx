import Link from "next/link";
import { Check, X } from "lucide-react";

import { answerPrompt, checkIn, closeCheckIn, closePrompt } from "@/app/actions/manage";
import { ActionButton, CheckInBox, PromptAnswers } from "@/components/editors";
import { LiveRefresh } from "@/components/live-refresh";
import { Info } from "@/components/info";
import { TheatreRoom } from "@/components/theatre-room";
import { DOT_R, PITCH } from "@/lib/theatre";
import type { Schemas } from "@/lib/generated/api";

type Live = Schemas["LiveService"];
type Prompt = Schemas["LivePrompt"];
type Cell = Schemas["LiveCell"];

function weekday(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/** A UTC time from the API as `12:30 pm`, written out rather than left to a locale. */
function clock(iso: string): string {
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "am" : "pm"}`;
}

/**
 * One cell as a small grid of the same dots as the room: filled for
 * everyone marked present, a ring for everyone who belongs and is not
 * here yet. Square-ish, never wider than ten, so a big cell grows down.
 */
function CellGrid({ cell }: { cell: Cell }) {
  const expected = cell.expected ?? 0;
  const present = cell.present ?? 0;
  const n = Math.max(expected, present, 1);
  const columns = Math.min(10, Math.max(3, Math.ceil(Math.sqrt(n))));
  const rows = Math.ceil(n / columns);
  return (
    <li className="live-cell" title={`${cell.name}: ${present} of ${expected}`}>
      <svg
        viewBox={`0 0 ${columns * PITCH} ${rows * PITCH}`}
        width={columns * PITCH}
        height={rows * PITCH}
        role="img"
        aria-label={`${cell.name}, ${present} of ${expected} here`}
      >
        {Array.from({ length: n }, (_, i) => {
          const cx = (i % columns) * PITCH + PITCH / 2;
          const cy = Math.floor(i / columns) * PITCH + PITCH / 2;
          return i < present ? (
            <circle key={i} cx={cx} cy={cy} r={DOT_R} className="live-grid-on" />
          ) : (
            <circle key={i} cx={cx} cy={cy} r={DOT_R - 0.5} className="live-grid-empty" />
          );
        })}
      </svg>
      <p className="live-cell-name">{cell.name}</p>
      <p className="tnum live-cell-count">
        <span className="text-ink">{present}</span>
        <span className="text-ink-3">/{expected}</span>
      </p>
    </li>
  );
}

/**
 * The room: the headline figure, the hall as theatre seating filling as
 * people check in, and beneath it the congregation by cell, each cell a
 * small grid of the same dots.
 */
function Room({ live, compact }: { live: Live; compact: boolean }) {
  const present = live.present ?? 0;
  const expected = live.expected ?? 0;
  const turnout = expected > 0 ? Math.round((present / expected) * 100) : 0;
  const cells = (live.cells ?? []).filter((c) => (c.expected ?? 0) > 0 || (c.present ?? 0) > 0);
  // The dashboard shows the biggest dozen; the check-in page shows more.
  const shown = cells.slice(0, compact ? 12 : 36);
  return (
    <section className="live-card">
      <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <div>
          <p className="live-kicker flex items-center gap-1.5">
            In the room
            <Info text="One dot is one person in a seat, the front of the room at the top. Filled means they are here." />
          </p>
          <p className="mt-1 flex items-baseline gap-3">
            <span className="figure tnum text-[clamp(2.6rem,5vw,3.8rem)] leading-none text-ink">{present}</span>
            <span className="text-[14px] text-ink-2">
              of {expected} {live.branch_name ? `in ${live.branch_name}` : "in the church"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="live-meter" role="img" aria-label={`${turnout} percent here`}>
            <span style={{ width: `${Math.min(100, turnout)}%` }} />
          </div>
          <span className="tnum text-[13px] font-semibold text-ink">{turnout}%</span>
        </div>
      </header>

      <TheatreRoom present={present} expected={expected} />

      {shown.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <p className="live-kicker flex items-center gap-1.5">
            By cell
            <Info text="Each grid is a cell, one dot a person. Filled means they are here." />
          </p>
          <ul className="live-cells">{shown.map((c) => <CellGrid key={c.id ?? "none"} cell={c} />)}</ul>
          {cells.length > shown.length && (
            <p className="mt-3 text-[11.5px] text-ink-3">{cells.length - shown.length} more cells</p>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * One question as a poll: each answer a bar, as long as its share, with
 * the count and the percentage. The one on the screen is marked Live; the
 * ones asked before it keep their results, so the whole service can be
 * read at once.
 */
function Poll({ prompt, canRun, mine }: { prompt: Prompt; canRun: boolean; mine: boolean }) {
  const total = prompt.total ?? 0;
  const most = Math.max(0, ...prompt.options.map((o) => o.count ?? 0));
  return (
    <article className="live-card live-poll" data-open={prompt.is_open ? "" : undefined}>
      <header className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-ink">{prompt.question}</h3>
        {prompt.is_open ? (
          <span className="live-pill">Live</span>
        ) : (
          <span className="text-[11px] text-ink-3">Closed</span>
        )}
      </header>
      <ul className="mt-4 grid gap-3">
        {prompt.options.map((option, i) => {
          const count = option.count ?? 0;
          const share = total > 0 ? Math.round((count / total) * 100) : 0;
          const leading = count > 0 && count === most;
          return (
            <li key={option.label}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className={leading ? "font-semibold text-ink" : "text-ink-2"}>
                  {option.label}
                  {mine && prompt.my_choice === i && <span className="ml-1.5 text-[11px] text-cobalt">yours</span>}
                </span>
                <span className="tnum shrink-0 text-ink">
                  {count}
                  <span className="ml-1.5 text-[11.5px] text-ink-3">{share}%</span>
                </span>
              </div>
              <div className="live-bar" data-leading={leading ? "" : undefined}>
                <span style={{ width: `${total > 0 ? Math.max(share, count > 0 ? 3 : 0) : 0}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <footer className="mt-4 flex items-center justify-between gap-3 text-[11.5px] text-ink-3">
        <span className="tnum">{total} {total === 1 ? "answer" : "answers"}</span>
        {canRun && prompt.is_open && (
          <ActionButton action={closePrompt} fields={{ id: prompt.id }} label="Close answers" icon={<X className="h-3 w-3" aria-hidden />} />
        )}
      </footer>
    </article>
  );
}

/**
 * The Sunday board. The same design for the one running the service and
 * for a member in the room, and deliberately unlike the rest of the app:
 * a live thing is watched, not worked through, so it is laid out as a
 * dashboard of its own. The code and the clock come first, then the room
 * as circles of dots, then every question as a poll.
 *
 * `leader` shows the code and the controls; a member sees where to type
 * the code, and taps their answer on the question that is open.
 */
export function LiveBoard({
  live,
  leader,
  canRun = false,
  sessionId,
  compact = false,
}: {
  live: Live;
  leader: boolean;
  canRun?: boolean;
  /** The dashboard's version: a dozen cells, the open question only, and a way to the whole board. */
  compact?: boolean;
  /** The session id, for closing check-in from the leader's board. */
  sessionId?: string;
}) {
  const where = live.branch_name ?? "The whole church";
  const prompts = live.prompts ?? (live.prompt ? [live.prompt] : []);
  const open = prompts.find((p) => p.is_open);
  const code = (live.code ?? "").padEnd(6, " ").slice(0, 6).split("");

  return (
    <div className="live-board">
      <LiveRefresh prefix="service." fallback={leader ? 20 : 30} />

      {/* --- the first line: the service and its code ---------------- */}
      <section className="live-card live-head">
        <div className="min-w-0">
          <p className="live-kicker">
            <span className="live-beat" aria-hidden /> Live · {where}
          </p>
          <h2 className="head mt-2 text-[clamp(1.5rem,3vw,2.1rem)] text-ink">{weekday(live.service_day)} service</h2>
          <p className="mt-1 text-[13px] text-ink-2">
            {live.is_open ? `Check-in open until ${clock(live.closes_at)}` : `Closed at ${clock(live.closes_at)}`}
          </p>
          {live.sermon && (
            <Link href={`/app/sermons/${live.sermon.id}`} className="live-sermon">
              <span className="text-ruby">Today&rsquo;s message</span>
              <span className="font-semibold text-ink">{live.sermon.title}</span>
              {live.sermon.scripture_reference && <span className="text-ink-3">{live.sermon.scripture_reference}</span>}
            </Link>
          )}
        </div>

        {leader ? (
          <div className="live-code-wrap">
            <p className="live-kicker">Check-in code</p>
            <div className="live-code" role="img" aria-label={`Check-in code ${live.code ?? ""}`}>
              {code.map((ch, i) => (
                <span key={i}>{ch.trim()}</span>
              ))}
            </div>
            {canRun && sessionId && live.is_open && (
              <div className="mt-2 flex justify-end">
                <ActionButton
                  action={closeCheckIn}
                  fields={{ id: sessionId }}
                  label="Close check-in"
                  icon={<X className="h-3 w-3" aria-hidden />}
                  confirm="Stop taking check-ins for this service?"
                />
              </div>
            )}
          </div>
        ) : (
          <div className="live-code-wrap">
            {live.checked_in ? (
              <p className="live-here">
                <Check className="h-5 w-5" aria-hidden /> You are checked in. Welcome!
              </p>
            ) : (
              <>
                <p className="live-kicker">Check in</p>
                <p className="mb-2 mt-1 text-[12.5px] text-ink-2">Type the code shown at church.</p>
                <CheckInBox action={checkIn} />
              </>
            )}
          </div>
        )}
      </section>

      {/* --- the room: the congregation by cell ---------------------- */}
      <Room live={live} compact={compact} />

      {/* --- the questions: every one asked, as polls ---------------- */}
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="live-kicker">Questions</p>
            <p className="mt-1 text-[13px] text-ink-2">
              {prompts.length === 0
                ? leader
                  ? "Nothing asked yet. Use Ask question at the top of the page."
                  : "Nothing has been asked yet."
                : `${prompts.length} asked this service`}
            </p>
          </div>
        </div>

        {!leader && open && (
          <div className="live-card mb-4">
            <PromptAnswers action={answerPrompt} prompt={open} answering />
          </div>
        )}

        {prompts.length > 0 && (
          <div className="live-polls">
            {prompts
              .filter((p) => leader || p.id !== open?.id)
              .slice(0, compact ? (leader ? 1 : 0) : undefined)
              .map((p) => (
                <Poll key={p.id} prompt={p} canRun={canRun} mine={!leader} />
              ))}
          </div>
        )}

        {compact && (
          <div className="mt-4 text-right">
            <Link href="/app/check-in" className="text-[12.5px] font-medium text-ink-2 hover:text-ink hover:underline">
              {prompts.length > 1 || (live.cells?.length ?? 0) > 12 ? "All questions and cells" : "Open the full board"} →
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
