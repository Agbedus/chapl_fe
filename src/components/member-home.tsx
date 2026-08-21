import Link from "next/link";
import { CalendarDays, Megaphone, Users as UsersIcon } from "lucide-react";

import { raiseCareRequest } from "@/app/actions/manage";
import { CareRequestEditor } from "@/components/editors";
import { Empty, Page, Panel, StatCard } from "@/components/panels";
import type { ChurchEvent, Me, Notice, PersonProfile } from "@/lib/types";

/**
 * Home, for somebody who belongs to the church and administers none of it.
 *
 * They used to land on the administrator's dashboard: a checklist telling
 * them to "add your first branch", a sidenav of pages the API refuses,
 * and panels headed *Care queue* and *Cells at risk* — all of it empty,
 * because the API was right to refuse them, so the app read as broken.
 *
 * This answers the four questions a member actually arrives with: when
 * are we meeting, what did I miss, where do I belong, and who do I call.
 * Every figure here is their own — the church-wide numbers are not
 * withheld out of secrecy, they are simply not what this page is about.
 */

function longDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long",
  });
}

/** Deterministic, like everywhere else — `toLocaleTimeString` disagrees
 *  between Node and the browser and throws away the hydrated tree. */
function clock(value: string): string {
  const d = new Date(value);
  const h = d.getHours();
  const period = h < 12 ? "am" : "pm";
  return `${h % 12 === 0 ? 12 : h % 12}:${String(d.getMinutes()).padStart(2, "0")} ${period}`;
}

export function MemberHome({
  me,
  profile,
  events,
  notices,
  cellName,
  branchName,
}: {
  me: Me;
  profile: PersonProfile | null;
  events: ChurchEvent[];
  notices: Notice[];
  cellName: string | null;
  branchName: string | null;
}) {
  const first = me.full_name.split(" ")[0];
  const next = events[0] ?? null;
  const services = profile?.attendance ?? [];
  const serving = profile?.departments ?? [];

  return (
    <Page>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="eyebrow text-ink-3">Welcome</p>
          <h1 className="head mt-2 text-[26px] tracking-[-0.025em] sm:text-[30px]">
            Hello, {first}
          </h1>
          <p className="mt-1.5 text-[12.5px] text-ink-3">
            {[branchName, cellName].filter(Boolean).join(" · ") ||
              "You are not placed in a branch yet"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* The one action a member has. It sits in the header rather
              than at the bottom of the page because somebody who needs it
              should not have to scroll past their attendance to find it. */}
          <CareRequestEditor action={raiseCareRequest} />
          {next && (
            <Link href="/app/events" className="btn btn-quiet btn-sm">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden />
              What&apos;s on
            </Link>
          )}
        </div>
      </header>

      {/* --- the next thing that happens ---------------------------- */}
      <Panel
        title="Next up"
        lede="The next thing on the church calendar"
        accent="var(--violet)"
      >
        {next ? (
          <Link
            href="/app/events"
            className="-mx-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-xl px-2 py-1.5
                       transition-colors duration-150 hover:bg-mist"
          >
            <span className="figure text-[19px]" style={{ color: "var(--violet)" }}>
              {longDate(next.start_date)}
            </span>
            <span className="text-[13px] font-medium">{next.title}</span>
            <span className="text-[12px] text-ink-3">
              {next.is_all_day ? "all day" : clock(next.start_date)}
              {next.location && ` · ${next.location}`}
            </span>
          </Link>
        ) : (
          <Empty>Nothing on the calendar yet.</Empty>
        )}
      </Panel>

      {/* --- their own figures -------------------------------------- */}
      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard
          label="Your turnout"
          value={profile?.pct != null ? String(profile.pct) : "—"}
          unit="%"
          colour="var(--gold)"
          footnote={
            profile && profile.marked > 0
              ? `${profile.present} of ${profile.marked} services`
              : "nothing marked yet"
          }
        />
        <StatCard
          label={profile && profile.missed > 0 ? "Missed in a row" : "Here in a row"}
          value={String(profile ? (profile.missed > 0 ? profile.missed : profile.streak) : 0)}
          colour={
            profile && profile.missed > 1
              ? "var(--ruby)"
              : profile && profile.missed > 0
                ? "var(--gold)"
                : "var(--emerald)"
          }
          footnote={
            profile && profile.missed > 0
              ? "services since you were last here"
              : "consecutive services"
          }
        />
        <StatCard
          label="Your cell"
          value={profile?.cell_pct != null ? String(profile.cell_pct) : "—"}
          unit="%"
          colour="var(--teal)"
          footnote={cellName ? `${cellName} turnout` : "not in a cell yet"}
        />
        <StatCard
          label="You serve on"
          value={String(serving.length)}
          colour="var(--emerald)"
          footnote={
            serving.length > 0 ? serving.map((d) => d.name).join(", ") : "no department"
          }
        />
      </section>

      {/* `items-start` so each panel is the height of its own content —
          the dot strip is two lines tall and was being stretched to match
          the placement card beside it. */}
      <section className="grid items-start gap-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* --- what they have missed ------------------------------- */}
        <Panel
          title="Your attendance"
          lede="Filled is a service you were at"
          accent="var(--gold)"
        >
          {services.length > 0 ? (
            <ul className="flex flex-wrap gap-x-2 gap-y-3">
              {services.map((s) => (
                <li key={s.date} className="min-w-[46px] flex-1 text-center">
                  <span
                    className={`${s.present ? "dot" : "dot-hollow"} mx-auto block h-[18px] w-[18px]`}
                    style={{ color: "var(--gold)" }}
                    aria-hidden
                  />
                  <span className="mt-1.5 block text-[10px] leading-tight text-ink-3">
                    {new Date(s.date).toLocaleDateString(undefined, {
                      day: "2-digit", month: "short",
                    })}
                  </span>
                  <span className="sr-only">{s.present ? "present" : "absent"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>
              Nobody has marked a register you were on yet. This fills in as
              soon as they do.
            </Empty>
          )}
        </Panel>

        {/* --- where they belong ----------------------------------- */}
        <Panel title="Where you belong" lede="Your place in the church" accent="var(--cobalt)">
          <dl className="rows">
            <div className="flex items-baseline justify-between gap-3 py-2 first:pt-0">
              <dt className="text-[12px] text-ink-3">Branch</dt>
              <dd className="text-[12.5px] font-medium">{branchName ?? "—"}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-3 py-2">
              <dt className="text-[12px] text-ink-3">Cell</dt>
              <dd className="text-[12.5px] font-medium">{cellName ?? "—"}</dd>
            </div>
            {serving.map((dept) => (
              <div key={dept.id} className="flex items-baseline justify-between gap-3 py-2">
                <dt className="flex items-baseline gap-1.5 text-[12px] text-ink-3">
                  <span className="dot" style={{ color: "var(--emerald)" }} aria-hidden />
                  Serving
                </dt>
                <dd className="text-[12.5px] font-medium">{dept.name}</dd>
              </div>
            ))}
          </dl>

          <Link
            href="/app/account"
            className="btn btn-quiet btn-sm mt-3 w-full justify-center"
          >
            <UsersIcon className="h-3.5 w-3.5" aria-hidden />
            Your details
          </Link>
        </Panel>
      </section>

      {/* --- what the church is saying ------------------------------ */}
      <Panel
        title="Notices"
        lede="From your church, your branch and your cell"
        accent="var(--cobalt)"
      >
        {notices.length > 0 ? (
          <ul className="rows">
            {notices.slice(0, 6).map((notice) => (
              <li key={notice.id} className="py-2.5 first:pt-0">
                <p className="flex items-baseline gap-2">
                  <Megaphone
                    className="h-3.5 w-3.5 shrink-0 translate-y-[2px]"
                    style={{ color: "var(--cobalt)" }}
                    aria-hidden
                  />
                  <span className="text-[13px] font-medium">{notice.title}</span>
                  {notice.priority !== "normal" && (
                    <span
                      className="chip shrink-0"
                      style={{
                        background: `color-mix(in oklab, ${
                          notice.priority === "urgent" ? "var(--ruby)" : "var(--gold)"
                        } 12%, transparent)`,
                        color:
                          notice.priority === "urgent" ? "var(--ruby)" : "var(--gold)",
                      }}
                    >
                      {notice.priority}
                    </span>
                  )}
                </p>
                {notice.content && (
                  <p className="mt-1 pl-[22px] text-[12px] leading-[1.6] text-ink-2">
                    {notice.content}
                  </p>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Nothing has been posted yet.</Empty>
        )}
      </Panel>
    </Page>
  );
}
