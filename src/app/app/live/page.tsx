import Link from "next/link";
import { askRoom, checkIn, openCheckIn } from "@/app/actions/manage";
import { Radio } from "lucide-react";

import { ActionButton, AskQuestionEditor, CheckInBox, CheckInOpenEditor } from "@/components/editors";
import { LiveBoard, LiveSessionCode } from "@/components/live-board";
import { SundayPanel } from "@/components/live-service";
import { DeckRemoteButton, DeckSettingsButton, DeckStudioButton, PresentButton, ServiceDeck, type DeckEvent, type DeckNotice } from "@/components/service-deck";
import { LiveRefresh } from "@/components/live-refresh";
import { Empty, Page, Panel } from "@/components/panels";
import { canRead, canWrite } from "@/lib/access";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";
import { canAdminChurch, currentChurchId, requireMe } from "@/lib/session";
import type { Branch, Church, Notice, Paged } from "@/lib/types";

export const metadata = { title: "Live service — Chapl" };

type Live = Schemas["LiveService"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function weekdayOf(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/** Today in the church's own time zone, as YYYY-MM-DD. Server-only, so formatting by zone is safe. */
function dayKey(at: Date, zone?: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

/** The time now in the church's zone, as HH:MM. */
function clockKey(at: Date, zone?: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(at);
  } catch {
    return at.toISOString().slice(11, 16);
  }
}

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** "18:30" → "6:30 pm", written out. */
function twelve(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

function day(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/**
 * The live service: the room's control surface.
 *
 * It was "Check in", which named one thing it did. A leader opens a
 * service here, puts the code on the screen, asks the room a question,
 * watches it fill and answer, and now presents all of it full screen. A
 * member types the code here. Either way check-in writes the same
 * attendance row the register does.
 *
 * It looks unlike the rest of the app on purpose: a dark control-room
 * head with what is on air and the controls for it, then the board for
 * each open service.
 */
export default async function LiveServicePage({ searchParams }: { searchParams: Promise<{ screen?: string; slide?: string; session?: string; receiver?: string }> }) {
  const params = await searchParams;
  const me = await requireMe("/app/live");
  const churchId = await currentChurchId();

  // A service belongs to a church. Across all of them there is nothing to
  // run, and the controls would open check-in for nobody in particular.
  if (me.is_platform_staff && !churchId) {
    return (
      <Page>
        <header className="on-dark live-room">
          <div className="min-w-0">
            <p className="live-room-kicker">
              <span className="live-room-dot" aria-hidden />
              Live service
            </p>
            <h1 className="live-room-title">Choose a church</h1>
            <p className="live-room-meta">
              <span>A service is run for one church. Pick it from the switcher at the top.</span>
            </p>
          </div>
        </header>
      </Page>
    );
  }
  const leader = canRead(me, "attendance");
  const opener = canWrite(me, "attendance");

  const [available, sessions, branchList] = await Promise.all([
    api<Schemas["CheckInAvailable"][]>("/attendance/check-in/open"),
    leader ? api<Schemas["CheckInSessionList"]>("/attendance/check-in/sessions") : Promise.resolve(null),
    opener ? api<Paged<Branch>>("/branches/?limit=200&sort=name&order=asc") : Promise.resolve(null),
  ]);

  const open = available.ok ? available.data : [];
  const rows = sessions?.ok ? sessions.data.items : [];
  const live = rows.filter((s) => s.is_open);
  const past = rows.filter((s) => !s.is_open);
  const branches = (branchList?.ok ? branchList.data.items : []).map((b) => ({ value: b.id, label: b.name }));

  // Each open service, read once: the board and the presenter share it.
  const boards = (
    await Promise.all(
      live.map(async (s) => {
        const r = await api<Live>(`/attendance/check-in/sessions/${s.id}/live`);
        return r.ok ? { id: s.id, data: r.data } : null;
      }),
    )
  ).filter((b): b is { id: string; data: Live } => b !== null);
  const selectedBoard = boards.find(b => b.id === params.session) ?? boards[0];
  const first = selectedBoard?.data;

  // What the deck can put on the screen besides the service itself: the
  // church's name, its notices (pinned first, at most four), and the next
  // two weeks of published events.
  // From the start of today, not from now: a service that began at nine
  // is still today's service at ten.
  const now = new Date();
  const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortnight = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const [churchInfo, noticeList, coming] = leader
    ? await Promise.all([
        churchId ? api<Church>(`/churches/${churchId}`) : Promise.resolve(null),
        opener ? api<Paged<Notice>>("/communication/notices/?limit=20&sort=created_at&order=desc") : Promise.resolve(null),
        api<Schemas["EventOccurrenceList"]>(
          `/events/occurrences?start=${dayStart.toISOString().slice(0, 19)}&end=${fortnight.toISOString().slice(0, 19)}`,
        ),
      ])
    : [null, null, null];
  const zone = churchInfo?.ok ? churchInfo.data.timezone : undefined;
  const today = dayKey(now, zone);
  const clockNow = clockKey(now, zone);
  const occurrences = (coming?.ok ? coming.data.items : [])
    .filter((e) => e.is_published !== false && e.starts_at.slice(0, 10) >= today)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  // The countdown follows the next thing starting today.
  const nextToday = occurrences.find(
    (e) => e.starts_at.slice(0, 10) === today && !e.is_all_day && e.starts_at.slice(11, 16) >= clockNow,
  );
  const deckNotices: DeckNotice[] = (noticeList?.ok ? noticeList.data.items : [])
    .filter((n) => n.is_active !== false && (!n.expires_at || new Date(n.expires_at) > now))
    .sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))
    .slice(0, 4)
    .map((n) => ({ id: n.id, title: n.title, content: n.content, pinned: Boolean(n.is_pinned) }));
  const deckEvents: DeckEvent[] = occurrences
    .filter((e) => e.starts_at.slice(0, 16) >= `${today}T${clockNow}` || e.is_all_day)
    .slice(0, 5)
    .map((e, i) => ({
      id: `${e.event_id}-${i}`,
      title: e.title,
      startsAt: e.starts_at,
      allDay: Boolean(e.is_all_day),
      location: e.location ?? null,
    }));
  const churchName = churchInfo?.ok ? churchInfo.data.name : (first?.branch_name ?? "Our church");

  return (
    <Page>
      {/* ---------------- the control room ---------------- */}
      <header className="on-dark live-room" data-on-air={first ? "" : undefined}>
        <div className="min-w-0">
          <p className="live-room-kicker">
            <span className="live-room-dot" aria-hidden />
            {first ? "On air" : "Live service"}
          </p>
          <h1 className="live-room-title">
            {first
              ? `${weekdayOf(first.service_day)} service`
              : leader
                ? "Nothing on air"
                : "Live service"}
          </h1>
          <p className="live-room-meta">
            {first ? (
              <>
                <span>{first.branch_name ?? "The whole church"}</span>
                <span className="tnum">
                  {first.present ?? 0}
                  {first.expected ? ` of ${first.expected}` : ""} here
                </span>
                {boards.length > 1 && <span>{boards.length} services open</span>}
              </>
            ) : opener ? (
              <span>Open a service to take check-ins, ask the room and present.</span>
            ) : (
              <span>At church? Type the code on the screen to mark yourself present.</span>
            )}
          </p>
          {boards.length > 1 && <nav className="live-session-switcher" aria-label="Open check-ins">
            {boards.map(board => <Link key={board.id} href={`/app/live?session=${encodeURIComponent(board.id)}`} aria-current={board.id === selectedBoard.id ? "page" : undefined}>
              {board.data.branch_name ?? "Whole church"} · {weekdayOf(board.data.service_day)}
            </Link>)}
          </nav>}
          {first?.sermon && <Link href={`/app/sermons/${first.sermon.id}`} className="live-sermon">
            <span className="text-ruby">Today’s message</span>
            <span className="font-semibold text-ink">{first.sermon.title}</span>
            {first.sermon.scripture_reference && <span className="text-ink-3">{first.sermon.scripture_reference}</span>}
          </Link>}
        </div>

        {opener && (
          <div className="live-room-tools">
            <DeckSettingsButton />
            <DeckStudioButton />
            <DeckRemoteButton />
          </div>
        )}

        {first && <div className="live-room-session">
          <LiveSessionCode live={first} canRun={opener} sessionId={selectedBoard.id} showTime />
        </div>}

        {opener && (
          <div className="live-room-actions">
            <PresentButton />
            {live.length > 0 && (
              <AskQuestionEditor
                action={askRoom}
                sessions={live.map((s) => ({
                  value: s.id,
                  label: `${s.branch_name ?? "Whole church"} · ${s.service_day}`,
                }))}
              />
            )}
            {branches.length > 0 && (
              <CheckInOpenEditor
                action={openCheckIn}
                branches={branches}
                wholeChurch={canAdminChurch(me, churchId)}
              />
            )}
          </div>
        )}
      </header>

      {/* What goes on the screen at the front: a drawer from the control
          room's Run of service, and the presenter. Nothing on the page itself. */}
      {opener && (
        <ServiceDeck receiverId={params.screen === "audience" && /^[a-zA-Z0-9-]{1,64}$/.test(params.receiver ?? "") ? params.receiver : undefined} scopeKey={`${churchId ?? churchName}:${selectedBoard?.id ?? "draft"}`} key={selectedBoard?.id ?? "no-service"} audience={params.screen === "audience"} initialSlide={Math.max(0, Math.min(500, Number(params.slide) || 0))} church={churchName} live={first ?? null} notices={deckNotices} events={deckEvents} defaultStart={nextToday?.starts_at.slice(11, 16)} />
      )}

      {/* The member's half. Leaders can check in too — they were there. */}
      {/* A leader with a service on air has the board below; telling them
          "nothing open" above it contradicted the header. */}
      {leader && (live.length > 0 || open.length === 0) ? null : open.length > 0 ? (
        <SundayPanel />
      ) : (
      <Panel
        title={open.length > 0 ? "Check in now" : "Nothing open right now"}
        lede={
          open.length > 0
            ? open.map((s) => `${s.branch_name ?? "Whole church"} · ${s.service_day} ${day(s.attendance_date)}${s.checked_in ? " · you are checked in" : ""}`).join("  ·  ")
            : "When a service opens for check-in you will be told, and the code will be on the screen."
        }
        accent="var(--gold)"
      >
        {open.length > 0 && open.every((s) => s.checked_in) ? (
          <p className="text-[13px] text-ink-2">You are checked in. Welcome!</p>
        ) : (
          <CheckInBox action={checkIn} />
        )}
      </Panel>
      )}

      {leader && (
        <>
          {live.length > 0 && <LiveRefresh prefix="service." fallback={20} />}
          {/* Nothing on air is said once, in the control room. */}
          {live.length === 0 ? null : (
            boards.filter(b => b.id === selectedBoard.id).map((b) => <LiveBoard hideHeader key={b.id} live={b.data} leader canRun={opener} sessionId={b.id} />)
          )}

          {params.screen !== "audience" && (
            <ComingUp
              events={occurrences.slice(0, 10)}
              today={today}
              clockNow={clockNow}
              sessions={live}
              branchNames={Object.fromEntries((branchList?.ok ? branchList.data.items : []).map((b) => [b.id, b.name]))}
              canOpen={opener}
              wholeChurch={canAdminChurch(me, churchId)}
            />
          )}

          {past.length > 0 && (
            <Panel title="Last two weeks" accent="var(--ink-3)" quiet>
              <ul className="divide-y divide-[var(--line)]">
                {past.map((s) => (
                  <li key={s.id} className="flex items-baseline justify-between gap-3 py-2 text-[12.5px]">
                    <span>
                      {s.branch_name ?? "Whole church"} · <span className="capitalize">{s.service_day}</span> {day(s.attendance_date)}
                    </span>
                    <span className="tnum text-ink-2">{s.checked_in} checked in</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* today and coming up                                                 */
/* ------------------------------------------------------------------ */

type Occurrence = Schemas["EventOccurrence"];

/**
 * What the church has on: today first, then the next fortnight.
 *
 * A service is a check-in session, and an event is something on the
 * calendar; this is where the two meet. Today's events stand out, and
 * one that a check-in can stand for (a whole-church event, or a
 * branch's) carries **Go live**: it opens check-in for that branch, or
 * the whole church, dated today, and tells its members, after asking.
 * One already open shows **On air** instead and goes to its board.
 *
 * Cell and department events are listed and not startable: check-in is
 * taken for a branch or the church, and a cell's meeting is marked on the
 * register. Starting the whole church needs church authority; the API
 * decides a branch, so the button is offered and its refusal comes back
 * as a message rather than the button being guessed away.
 */
function ComingUp({
  events,
  today,
  clockNow,
  sessions,
  branchNames,
  canOpen,
  wholeChurch,
}: {
  events: Occurrence[];
  today: string;
  clockNow: string;
  sessions: Schemas["CheckInSessionRead"][];
  branchNames: Record<string, string>;
  canOpen: boolean;
  wholeChurch: boolean;
}) {
  if (events.length === 0) {
    return (
      <Panel title="Today and coming up" accent="var(--violet)" href="/app/events" hrefLabel="Open the calendar">
        <Empty>Nothing on the calendar for the next two weeks.</Empty>
      </Panel>
    );
  }

  return (
    <Panel
      title="Today and coming up"
      accent="var(--violet)"
      lede="Today's events can go live from here: Go live opens check-in for that branch, or the whole church, dated today."
      href="/app/events"
      hrefLabel="Open the calendar"
    >
      <ul className="coming-list">
        {events.map((e, i) => {
          const date = e.starts_at.slice(0, 10);
          const isToday = date === today;
          const time = e.is_all_day ? "All day" : twelve(e.starts_at.slice(11, 16));
          const over = isToday && !e.is_all_day && (e.ends_at ? e.ends_at.slice(11, 16) : "23:59") < clockNow;
          const d = new Date(`${date}T12:00:00`);
          const scope = e.cell_id || e.department_id ? "cell" : e.branch_id ? "branch" : "church";
          const where =
            scope === "branch" ? (branchNames[e.branch_id!] ?? "A branch") : scope === "church" ? "Whole church" : e.cell_id ? "A cell" : "A department";
          const session = sessions.find((s) =>
            scope === "church" ? !s.branch_id : scope === "branch" ? s.branch_id === e.branch_id : false,
          );
          const startable = canOpen && isToday && !over && scope !== "cell" && (scope === "branch" || wholeChurch);
          return (
            <li key={`${e.event_id}-${i}`} className="coming-row" data-today={isToday ? "" : undefined} data-over={over ? "" : undefined}>
              <span className="coming-date" aria-hidden>
                <span>{isToday ? "Today" : WEEKDAYS[d.getDay()].slice(0, 3)}</span>
                <span className="tnum">{d.getDate()}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="coming-title">{e.title}</span>
                <span className="coming-meta">
                  <span className="tnum">{time}</span>
                  <span>{where}</span>
                  {e.location && e.location !== where && <span>{e.location}</span>}
                  {e.repeats && <span>Repeats</span>}
                </span>
              </span>
              {isToday && session ? (
                <Link href={`/app/live?session=${encodeURIComponent(session.id)}`} className="coming-air">
                  <span className="live-room-dot" aria-hidden /> On air
                </Link>
              ) : startable ? (
                <span className="coming-go">
                  <ActionButton
                    action={openCheckIn}
                    fields={{
                      ...(scope === "branch" ? { branch_id: e.branch_id! } : {}),
                      attendance_date: today,
                      service_day: WEEKDAYS[d.getDay()],
                      minutes_open: "180",
                      announce: "true",
                    }}
                    label="Go live"
                    icon={<Radio className="h-3.5 w-3.5" aria-hidden />}
                    confirm={`Open check-in for ${e.title} (${where}, today) and tell its members?`}
                  />
                </span>
              ) : isToday && scope === "cell" ? (
                <span className="coming-note">Marked on the register</span>
              ) : over ? (
                <span className="coming-note">Finished</span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
