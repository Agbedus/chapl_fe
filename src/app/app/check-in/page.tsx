import { X } from "lucide-react";

import { checkIn, closeCheckIn, openCheckIn } from "@/app/actions/manage";
import { ActionButton, CheckInBox, CheckInOpenEditor } from "@/components/editors";
import { Empty, Page, PageHead, Panel } from "@/components/panels";
import { canRead, canWrite } from "@/lib/access";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";
import { canAdminChurch, currentChurchId, requireMe } from "@/lib/session";
import type { Branch, Paged } from "@/lib/types";

export const metadata = { title: "Check in — Chapl" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function day(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** A UTC time from the API, as `6:30 pm` in the church's day. */
function clock(iso: string): string {
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  const h = d.getHours() % 12 || 12;
  return `${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "am" : "pm"}`;
}

/**
 * Checking in to a service.
 *
 * Two halves of one act. A leader opens the service and puts the code on
 * the screen; a member in the room types it. Either way the result is
 * the same attendance row the register writes, so the figures on the
 * attendance page include it without being told.
 */
export default async function CheckInPage() {
  const me = await requireMe("/app/check-in");
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

  return (
    <Page>
      <PageHead
        eyebrow="Attendance"
        title="Check in"
        lede={
          opener
            ? "Open a service, put the code on the screen, and the congregation marks itself."
            : "At church? Type the code on the screen to mark yourself present."
        }
        action={
          opener && branches.length > 0 ? (
            <CheckInOpenEditor
              action={openCheckIn}
              branches={branches}
              wholeChurch={canAdminChurch(me, churchId)}
            />
          ) : undefined
        }
      />

      {/* The member's half. Leaders can check in too — they were there. */}
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

      {leader && (
        <>
          <Panel title="Open now" accent="var(--gold)">
            {live.length === 0 ? (
              <Empty>No service is open for check-in.{opener ? " Use “Open check-in” to start one." : ""}</Empty>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {live.map((s) => (
                  <li key={s.id} className="sheet sheet-mist">
                    <p className="text-[12px] text-ink-3">
                      {s.branch_name ?? "Whole church"} · <span className="capitalize">{s.service_day}</span> {day(s.attendance_date)}
                    </p>
                    <p className="figure mt-1 text-[40px] tracking-[0.2em] text-ink">{s.code}</p>
                    <div className="mt-1 flex items-center justify-between gap-2 text-[12px] text-ink-2">
                      <span>
                        <span className="tnum font-semibold text-ink">{s.checked_in}</span> checked in · closes {clock(s.closes_at)}
                      </span>
                      {opener && (
                        <ActionButton
                          action={closeCheckIn}
                          fields={{ id: s.id }}
                          label="Close"
                          icon={<X className="h-3 w-3" aria-hidden />}
                          confirm="Stop taking check-ins for this service?"
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

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
