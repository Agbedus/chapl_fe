import { askRoom, checkIn, openCheckIn } from "@/app/actions/manage";
import { AskQuestionEditor, CheckInBox, CheckInOpenEditor } from "@/components/editors";
import { MonitorPlay } from "lucide-react";

import { LiveBoard } from "@/components/live-board";
import { SundayPanel } from "@/components/live-service";
import { Presenter } from "@/components/presenter";
import { LiveRefresh } from "@/components/live-refresh";
import { Empty, Page, Panel } from "@/components/panels";
import { canRead, canWrite } from "@/lib/access";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";
import { canAdminChurch, currentChurchId, requireMe } from "@/lib/session";
import type { Branch, Paged } from "@/lib/types";

export const metadata = { title: "Live service — Chapl" };

type Live = Schemas["LiveService"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function weekdayOf(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
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
export default async function LiveServicePage() {
  const me = await requireMe("/app/live");
  const churchId = await currentChurchId();
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
  const first = boards[0]?.data;

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
                {first.code && first.is_open && <span className="tnum">Code {first.code.toUpperCase()}</span>}
                {boards.length > 1 && <span>{boards.length} services open</span>}
              </>
            ) : opener ? (
              <span>Open a service to take check-ins, ask the room and present.</span>
            ) : (
              <span>At church? Type the code on the screen to mark yourself present.</span>
            )}
          </p>
        </div>

        {opener && (
          <div className="live-room-actions">
            {boards.length === 0 && (
              <button type="button" className="btn btn-sm live-present" disabled title="Open a service to present it">
                <MonitorPlay className="h-3.5 w-3.5" aria-hidden />
                Present
              </button>
            )}
            {boards.map((b) => (
              <Presenter
                key={b.id}
                live={b.data}
                label={boards.length > 1 ? `Present ${b.data.branch_name ?? "whole church"}` : "Present"}
              />
            ))}
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

      {/* The member's half. Leaders can check in too — they were there. */}
      {/* A leader with a service on air has the board below; telling them
          "nothing open" above it contradicted the header. */}
      {leader && live.length > 0 ? null : open.length > 0 ? (
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
          {live.length === 0 ? (
            <Panel title="Open now" accent="var(--gold)">
              <Empty>No service is open.{opener ? " Use “Open check-in” to start one." : ""}</Empty>
            </Panel>
          ) : (
            boards.map((b) => <LiveBoard key={b.id} live={b.data} leader canRun={opener} sessionId={b.id} />)
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
