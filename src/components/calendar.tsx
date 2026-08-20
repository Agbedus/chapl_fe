"use client";

import { ChevronLeft, ChevronRight, CalendarDays, List, GanttChart } from "lucide-react";
import { useState } from "react";

/**
 * The church calendar, three ways.
 *
 * A month grid answers "what is on, and when is it quiet" — the shape of
 * a month is information an administrator plans against. A timeline
 * answers "what is next", which is the question on a Monday morning. A
 * table answers "find me the one I am thinking of".
 *
 * They are the same events, so the switch is a view and not a page: it
 * changes nothing about what is loaded and it does not navigate, which
 * is why it lives in client state rather than the URL.
 */

export type CalendarEvent = {
  id: string;
  title: string;
  type: string;
  tone: string;
  start: string;
  end: string | null;
  allDay: boolean;
  location: string | null;
  scope: string;
  published: boolean;
  needsSignup: boolean;
};

type View = "calendar" | "timeline" | "table";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday-first index, because a church week runs to Sunday. */
function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/*
 * Dates and times, written the same way on both sides of the wire.
 *
 * `toLocaleTimeString` was the bug: this is a Client Component, so it
 * runs once in Node and again in the browser, and the two disagree. Node
 * had no locale and produced "18:30"; the browser had one and produced
 * "06:30 PM". React saw two different trees and threw the whole subtree
 * away to re-render it — a hydration error on the busiest page in the
 * app, caused by nothing but a formatter.
 *
 * These are deliberately locale-*independent*. The product has already
 * chosen how it writes a time — "6:30 pm", the same as the time picker —
 * and that choice should not change because of what a server happens to
 * have in `LANG`.
 */
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS_LONG = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

function time(value: string): string {
  const d = new Date(value);
  const h = d.getHours();
  const period = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(d.getMinutes()).padStart(2, "0")} ${period}`;
}

export function Calendar({
  events,
  today,
}: {
  events: CalendarEvent[];
  /** Passed in rather than read here: the clock belongs to the request. */
  today: string;
}) {
  const now = new Date(today);
  const [view, setView] = useState<View>("calendar");
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });

  const first = new Date(cursor.year, cursor.month, 1);
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const lead = weekdayIndex(first);
  const weeks = Math.ceil((lead + daysInMonth) / 7);
  // Cells after the last day of the month. Without them the final week
  // stops halfway and the grid's own background shows as a notch.
  const trail = weeks * 7 - (lead + daysInMonth);

  const monthLabel = `${MONTHS[cursor.month]} ${cursor.year}`;

  // One bucket per day of the visible month, filled once rather than
  // filtering the whole list inside every cell.
  const byDay = new Map<number, CalendarEvent[]>();
  for (const event of events) {
    const date = new Date(event.start);
    if (date.getFullYear() !== cursor.year || date.getMonth() !== cursor.month) continue;
    const day = date.getDate();
    byDay.set(day, [...(byDay.get(day) ?? []), event]);
  }

  const monthCount = [...byDay.values()].reduce((sum, list) => sum + list.length, 0);

  const upcoming = events
    .filter((e) => new Date(e.start).getTime() >= now.getTime())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* ---------------- switcher ---------------- */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          {view === "calendar" ? (
            <>
              <button
                type="button"
                onClick={() =>
                  setCursor((c) =>
                    c.month === 0
                      ? { year: c.year - 1, month: 11 }
                      : { ...c, month: c.month - 1 },
                  )
                }
                aria-label="Previous month"
                className="grid h-7 w-7 place-items-center rounded-lg text-ink-3
                           transition-colors hover:bg-sunk hover:text-ink"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </button>
              <p className="min-w-[9.5rem] text-center text-[13px] font-semibold tracking-tight">
                {monthLabel}
              </p>
              <button
                type="button"
                onClick={() =>
                  setCursor((c) =>
                    c.month === 11
                      ? { year: c.year + 1, month: 0 }
                      : { ...c, month: c.month + 1 },
                  )
                }
                aria-label="Next month"
                className="grid h-7 w-7 place-items-center rounded-lg text-ink-3
                           transition-colors hover:bg-sunk hover:text-ink"
              >
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => setCursor({ year: now.getFullYear(), month: now.getMonth() })}
                className="btn btn-quiet btn-sm ml-1"
              >
                Today
              </button>
              <span className="tnum ml-2 text-[11.5px] text-ink-3">
                {monthCount} this month
              </span>
            </>
          ) : (
            <span className="tnum text-[11.5px] text-ink-3">
              {view === "timeline"
                ? `${upcoming.length} still to come`
                : `${events.length} in total`}
            </span>
          )}
        </div>

        <div
          className="flex items-center gap-0.5 rounded-full p-0.5"
          style={{ background: "var(--sunk)" }}
          role="tablist"
          aria-label="How to view the calendar"
        >
          {(
            [
              ["calendar", "Month", CalendarDays],
              ["timeline", "Timeline", GanttChart],
              ["table", "List", List],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px]
                         font-medium transition-colors"
              style={
                view === id
                  ? { background: "var(--paper)", color: "var(--ink)" }
                  : { color: "var(--ink-3)" }
              }
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- month ---------------- */}
      {view === "calendar" && (
        <div className="table-fill">
          {/*
            The weeks share whatever height the panel has.

            Every cell was `min-h-[92px]` and the rows were implicit, so a
            five-week month drew 460px inside a 700px panel and left the
            rest as a grey slab under the calendar. The rows are explicit
            now — `minmax(92px, 1fr)` keeps the floor for a dense month on
            a laptop and lets them stretch to fill on a tall screen.
          */}
          <div
            className="grid h-full grid-cols-7 gap-px"
            style={{
              background: "var(--line-soft)",
              gridTemplateRows: `auto repeat(${weeks}, minmax(92px, 1fr))`,
            }}
          >
            {WEEKDAYS.map((day) => (
              <div
                key={day}
                className="px-2 py-1.5 text-center text-[10px] font-semibold uppercase
                           tracking-[0.12em] text-ink-3"
                style={{ background: "var(--paper)" }}
              >
                {day}
              </div>
            ))}

            {Array.from({ length: lead }, (_, i) => (
              <div key={`lead-${i}`} style={{ background: "var(--mist)" }} />
            ))}

            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const date = new Date(cursor.year, cursor.month, day);
              const list = byDay.get(day) ?? [];
              const isToday = sameDay(date, now);

              return (
                <div
                  key={day}
                  className="min-w-0 overflow-hidden px-1.5 py-1.5"
                  style={{ background: "var(--paper)" }}
                >
                  <p className="mb-1 flex items-center justify-between">
                    <span
                      className={`tnum grid h-5 min-w-5 place-items-center rounded-full px-1
                                  text-[10.5px] ${isToday ? "font-bold" : "font-medium"}`}
                      style={
                        isToday
                          ? { background: "var(--accent)", color: "var(--accent-ink)" }
                          : { color: "var(--ink-3)" }
                      }
                    >
                      {day}
                    </span>
                    {list.length > 2 && (
                      <span className="tnum text-[9.5px] text-ink-3">{list.length}</span>
                    )}
                  </p>

                  <ul className="space-y-1">
                    {list.slice(0, 3).map((event) => (
                      <li key={event.id}>
                        <span
                          className="flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10.5px]"
                          style={{
                            background: `color-mix(in oklab, ${event.tone} 12%, transparent)`,
                            color: event.tone,
                            opacity: event.published ? 1 : 0.55,
                          }}
                          title={`${event.title}${event.allDay ? "" : ` · ${time(event.start)}`}`}
                        >
                          {!event.allDay && (
                            <span className="tnum shrink-0 opacity-70">
                              {time(event.start).replace(/\s?[ap]m/i, "")}
                            </span>
                          )}
                          <span className="truncate">{event.title}</span>
                        </span>
                      </li>
                    ))}
                    {list.length > 3 && (
                      <li className="px-1 text-[9.5px] text-ink-3">
                        +{list.length - 3} more
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}

            {Array.from({ length: trail }, (_, i) => (
              <div key={`trail-${i}`} style={{ background: "var(--mist)" }} />
            ))}
          </div>
        </div>
      )}

      {/* ---------------- timeline ----------------
          What is next, in order, grouped by the day it falls on. The
          answer to a Monday morning rather than to a planning meeting. */}
      {view === "timeline" && (
        <div className="table-fill">
          {upcoming.length === 0 ? (
            <p className="rounded-lg bg-mist px-4 py-10 text-center text-[12.5px] text-ink-3">
              Nothing coming up. Everything on the calendar has already happened.
            </p>
          ) : (
            <ol className="relative space-y-4 pl-5">
              {/* The spine. One line down the page, so a gap in the
                  schedule is visible as a gap rather than inferred. */}
              <span
                className="absolute bottom-2 left-[5px] top-2 w-px"
                style={{ background: "var(--line)" }}
                aria-hidden
              />
              {upcoming.map((event, i) => {
                const date = new Date(event.start);
                const prev = i > 0 ? new Date(upcoming[i - 1].start) : null;
                const newDay = !prev || !sameDay(prev, date);

                return (
                  <li key={event.id} className="relative">
                    <span
                      className="absolute -left-5 top-1.5 h-[11px] w-[11px] rounded-full border-2"
                      style={{
                        background: event.published ? event.tone : "var(--paper)",
                        borderColor: event.tone,
                      }}
                      aria-hidden
                    />
                    {newDay && (
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
                        {`${DAYS_LONG[date.getDay()]} ${date.getDate()} ${
                          MONTHS[date.getMonth()]
                        }`}
                      </p>
                    )}
                    <div className="sheet sheet-mist flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-[13px] font-medium text-ink">{event.title}</span>
                      <span className="text-[11.5px] capitalize" style={{ color: event.tone }}>
                        {event.type}
                      </span>
                      {!event.allDay && (
                        <span className="tnum text-[11.5px] text-ink-3">{time(event.start)}</span>
                      )}
                      {event.location && (
                        <span className="text-[11.5px] text-ink-3">{event.location}</span>
                      )}
                      <span className="ml-auto flex items-center gap-1.5">
                        {event.needsSignup && (
                          <span
                            className="chip"
                            style={{
                              background: "color-mix(in oklab, var(--gold) 14%, transparent)",
                              color: "var(--gold)",
                            }}
                          >
                            sign-up
                          </span>
                        )}
                        <span className="chip bg-sunk text-ink-3">{event.scope}</span>
                        {!event.published && (
                          <span className="chip bg-sunk text-ink-3">draft</span>
                        )}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}

      {/* ---------------- table ---------------- */}
      {view === "table" && (
        <div className="table-fill">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-line">
                {["Event", "Kind", "When", "Where", "Who for", "Sign-up", "State"].map(
                  (label) => (
                    <th
                      key={label}
                      className="whitespace-nowrap px-2.5 pb-2 text-left text-[10px]
                                 font-semibold uppercase tracking-[0.12em] text-ink-3"
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {events.map((event) => {
                const date = new Date(event.start);
                const future = date.getTime() >= now.getTime();
                return (
                  <tr
                    key={event.id}
                    className="border-b border-line transition-colors last:border-0 hover:bg-mist"
                  >
                    <td className="px-2.5 py-2.5 text-[12.5px]">
                      <span className="flex items-center gap-2">
                        <span
                          className="dot shrink-0"
                          style={{ color: event.tone }}
                          aria-hidden
                        />
                        <span className="font-medium text-ink">{event.title}</span>
                      </span>
                    </td>
                    <td
                      className="px-2.5 py-2.5 text-[12.5px] capitalize"
                      style={{ color: event.tone }}
                    >
                      {event.type}
                    </td>
                    <td
                      className={`whitespace-nowrap px-2.5 py-2.5 text-[12.5px] ${
                        future ? "font-medium text-ink" : "text-ink-3"
                      }`}
                    >
                      {`${DAYS_LONG[date.getDay()].slice(0, 3)} ${String(
                        date.getDate(),
                      ).padStart(2, "0")} ${MONTHS[date.getMonth()].slice(0, 3)}`}
                      {!event.allDay && (
                        <span className="tnum text-ink-3"> · {time(event.start)}</span>
                      )}
                    </td>
                    <td className="px-2.5 py-2.5 text-[12.5px] text-ink-2">
                      {event.location ?? <span className="text-ink-3">—</span>}
                    </td>
                    <td className="px-2.5 py-2.5 text-[12.5px] text-ink-2">{event.scope}</td>
                    <td className="px-2.5 py-2.5 text-[12.5px]">
                      {event.needsSignup ? (
                        <span
                          className="chip"
                          style={{
                            background: "color-mix(in oklab, var(--gold) 14%, transparent)",
                            color: "var(--gold)",
                          }}
                        >
                          required
                        </span>
                      ) : (
                        <span className="text-ink-3">open</span>
                      )}
                    </td>
                    <td className="px-2.5 py-2.5 text-[12.5px]">
                      {event.published ? (
                        <span
                          className="chip"
                          style={{
                            background: "color-mix(in oklab, var(--emerald) 12%, transparent)",
                            color: "var(--emerald)",
                          }}
                        >
                          live
                        </span>
                      ) : (
                        <span className="chip bg-sunk text-ink-3">draft</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
