import Link from "next/link";
import { CalendarCheck, History, ShieldCheck, UserPlus } from "lucide-react";

import {
  DonutChart, GaugeChart, MultiRingChart, Sparkline, TrendChart,
} from "@/components/charts";
import { CongregationField } from "@/components/congregation";
import { Empty, Key, Page, Panel, Ring, RingPanel, StatCard } from "@/components/panels";
import { StaffQueue } from "@/components/staff-queue";
import { SetupChecklist } from "@/components/setup-checklist";
import { api } from "@/lib/api";
import { turnoutColour } from "@/lib/palette";
import { currentChurchId, requireMe } from "@/lib/session";
import { settleCheckup } from "@/app/actions/manage";
import { WorkQueue, type QueueItem } from "@/components/work-queue";
import { isPlainMember } from "@/lib/access";
import { MemberDashboard } from "@/app/app/member";
import { CHURCH_STATUS_LABEL, CHURCH_STATUS_TONE, ROLE_LABEL } from "@/lib/types";
import type { ChurchStatus } from "@/lib/types";
import type { Dashboard, Invitation, Paged } from "@/lib/types";

export const metadata = { title: "Dashboard — Chapl" };

/** One line of the platform's recent activity — see the audit page for the whole trail. */
type Activity = {
  id: string;
  user_name: string | null;
  action: string;
  table_name: string | null;
  created_at: string;
};

const TONE = { ok: "var(--emerald)", warn: "var(--gold)", down: "var(--ruby)" } as const;

const BAND_TONE = {
  thriving: "var(--emerald)",
  steady: "var(--gold)",
  "at risk": "var(--ruby)",
} as const;

const CARE_TONE: Record<string, string> = {
  "not reached": "var(--ruby)",
  "follow up needed": "var(--gold)",
  reached: "var(--cobalt)",
  resolved: "var(--emerald)",
};

const GIVING_TONES = [
  "var(--emerald)", "var(--teal)", "var(--cobalt)",
  "var(--violet)", "var(--gold)", "var(--ruby)",
];

/* One hue per branch. Colouring these by turnout would give three of them
   the same colour, which is the one thing a key must never do. */
const BRANCH_TONES = [
  "var(--cobalt)", "var(--violet)", "var(--teal)",
  "var(--emerald)", "var(--gold)", "var(--ruby)",
];

const AGE_TONES = [
  "var(--teal)", "var(--cobalt)", "var(--violet)", "var(--gold)", "var(--ruby)",
];

function shortDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function longDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric", month: "long", year: "numeric",
  });
}

/**
 * A birthday, said the way it would be said out loud.
 *
 * Only the day and month matter — the year in the record is the year they
 * were born, which is the one thing a birthday is not about.
 */
function birthdayWhen(dob: string): string {
  const born = new Date(dob);
  const now = new Date();
  const next = new Date(now.getFullYear(), born.getMonth(), born.getDate());
  const days = Math.round(
    (next.getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) /
      86_400_000,
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  const on = next.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  return days > 0 ? `${on} \u00b7 in ${days} days` : on;
}

function isToday(dob: string): boolean {
  const born = new Date(dob);
  const now = new Date();
  return born.getMonth() === now.getMonth() && born.getDate() === now.getDate();
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10_000 ? 1 : 0,
  }).format(value);
}


export default async function DashboardPage() {
  const me = await requireMe("/app");
  const churchId = await currentChurchId();

  /*
   * Two audiences, one route.
   *
   * Somebody holding no grant is not an administrator with empty data —
   * they are a different reader with different questions. Sending them
   * to the console below meant a checklist telling them to add a branch,
   * panels headed "Cells at risk", and zeroes everywhere because the API
   * refuses them the figures. Their own page answers what they came for.
   *
   * The fork is on grants, not on membership: a department head holds one
   * narrow grant and still belongs on the leader's side.
   */
  if (isPlainMember(me)) {
    return <MemberDashboard me={me} />;
  }

  const unscoped = me.is_platform_staff && !churchId;
  const [result, invites, grants, trail] = await Promise.all([
    api<Dashboard>(unscoped ? "/dashboard?church_id=all" : "/dashboard"),
    unscoped
      ? Promise.resolve(null)
      : api<Paged<Invitation>>("/invitations/?limit=25&status=pending&sort=created_at&order=asc"),
    unscoped ? Promise.resolve(null) : api<{ total: number }>("/assignments/?limit=1"),
    // The platform's recent activity. A platform admin without audit
    // authority gets a refusal here and simply sees no panel.
    unscoped ? api<Paged<Activity>>("/audit_logs/?limit=8", { churchId: "all" }) : Promise.resolve(null),
  ]);

  if (!result.ok) {
    return (
      <Page>
        <h1 className="head text-[20px]">Nothing to show yet</h1>
        <p className="text-[13px] text-ink-2">{result.error.detail}</p>
        <Link href="/app/church/new" className="btn btn-primary btn-sm w-fit">
          Create a church
        </Link>
      </Page>
    );
  }

  return (
    <View
      data={result.data}
      firstName={me.full_name.split(" ")[0]}
      invitations={invites?.ok ? invites.data.total : 0}
      pending={invites?.ok ? invites.data.items : []}
      hasTeam={grants?.ok ? grants.data.total > 1 : false}
      activity={trail?.ok ? trail.data.items : null}
    />
  );
}

function View({
  data,
  firstName,
  invitations,
  pending,
  hasTeam,
  activity,
}: {
  data: Dashboard;
  firstName: string;
  invitations: number;
  pending: Invitation[];
  hasTeam: boolean;
  activity: Activity[] | null;
}) {
  const platform = Boolean(data.platform);
  const currency = data.church.currency || "GHS";

  const latest = data.trend.at(-1);
  const previous = data.trend.at(-2);
  const turnoutDelta = latest && previous ? latest.pct - previous.pct : null;

  const joined = data.growth.at(-1)?.joined ?? null;
  const people = data.growth.at(-1)?.total ?? null;

  /*
   * Giving is withheld by the API, not hidden by the browser: a caller
   * who cannot read donations gets empty arrays and a null total, so
   * these figures never reach a page that would only be trusted not to
   * draw them. `showGiving` is therefore a permission check as much as a
   * presence check.
   */
  const showGiving = data.giving_total != null && data.giving_types.length > 0;
  const givingWindow = data.giving_months.reduce((sum, m) => sum + m.total, 0);
  const givingThisMonth = data.giving_months.at(-1)?.total ?? null;

  const ranked = data.branches
    .filter((b) => b.members > 0)
    .sort((a, b) => b.turnout - a.turnout);

  const bands = (["thriving", "steady", "at risk"] as const).map((band) => ({
    label: band,
    value: data.cells.filter((c) => c.band === band).length,
  }));
  const atRisk = bands.find((b) => b.label === "at risk")?.value ?? 0;

  const growthLine = data.growth.map((g) => ({ label: g.label, value: g.total }));
  const givingLine = data.giving_months.map((g) => ({ label: g.label, value: g.total }));
  const turnoutLine = data.trend.map((p) => ({ label: shortDate(p.date), value: p.pct }));

  const ages = data.demographics.ages.filter((a) => a.value > 0);
  const genders = data.demographics.genders.filter((g) => g.value > 0);
  const women = genders.find((g) => g.label === "female")?.value ?? 0;
  const genderTotal = genders.reduce((sum, g) => sum + g.value, 0) || 1;

  const care = data.care.filter((c) => c.value > 0);
  const careTotal = care.reduce((sum, c) => sum + c.value, 0);
  // The list is capped by the API; the total is measured there.
  const followUps = data.followup_total ?? data.needs_followup?.length ?? 0;
  const birthdays = data.birthdays?.length ?? 0;


  /*
   * The queue, worst first — and every row carries the people behind it.
   *
   * Each of these was a link to a list page, which is where the work
   * *lives* but not where it gets done: a count of thirteen birthdays
   * followed by a directory of eight hundred names leaves the reader to
   * do the filtering the number already did. The rows travel with the
   * item so the queue can open instead of navigate, and each one arrives
   * with the action it exists to prompt.
   */
  const firstNameOf = (full: string) => full.split(" ")[0];

  const tasks: QueueItem[] = [
    followUps > 0 && {
      kind: "care" as const,
      tone: "var(--ruby)",
      count: followUps,
      total: followUps,
      label: followUps === 1 ? "person needs a call" : "people need a call",
      detail:
        (data.needs_followup ?? []).slice(0, 3).map((c) => c.full_name).join(", ") ||
        "Marked not reached or awaiting follow-up",
      context:
        "Marked not reached, or awaiting a follow-up. Ring them, then update the check-up so they leave this list.",
      rows: (data.needs_followup ?? []).map((c) => ({
        id: c.id,
        name: c.full_name,
        note: `Logged ${longDate(c.checkup_date)}`,
        badge: c.status.replace(/_/g, " "),
        badgeTone:
          c.status === "not_reached" ? "var(--ruby)" : "var(--gold)",
        phone: c.phone_number,
        actionLabel: "Check in",
        message: `Hello ${firstNameOf(c.full_name)}, it\u2019s ${firstName} from ${data.church.name ?? "church"}. Just checking in \u2014 how are you doing?`,
        settle: { id: c.id, label: "Reached" },
        href: `/app/people/${c.member_id}`,
        hrefLabel: "Record",
      })),
      href: "/app/people",
      cta: "Open the directory",
    },
    atRisk > 0 && {
      kind: "cells" as const,
      tone: "var(--gold)",
      count: atRisk,
      label: atRisk === 1 ? "cell at risk" : "cells at risk",
      detail:
        data.cells
          .filter((c) => c.band === "at risk")
          .slice(0, 3)
          .map((c) => `${c.name} (${c.turnout}%)`)
          .join(", ") || "Under half the roll turned up",
      context:
        "Under half the roll turned up at the last service these were marked in. Start with the leader, not the members.",
      rows: data.cells
        .filter((c) => c.band === "at risk")
        .map((c) => ({
          id: c.id,
          name: c.name,
          note: `${c.branch} \u00b7 ${c.members} on the roll${
            c.last_seen ? ` \u00b7 last marked ${longDate(c.last_seen)}` : ""
          }`,
          badge: `${c.turnout}%`,
          badgeTone: "var(--ruby)",
          href: `/app/cells?branch=${c.branch_id}`,
          hrefLabel: "Open",
        })),
      href: "/app/cells",
      cta: "Open every cell",
    },
    invitations > 0 && {
      kind: "invitations" as const,
      tone: "var(--cobalt)",
      count: invitations,
      label: invitations === 1 ? "invitation waiting" : "invitations waiting",
      detail: "Sent but not yet accepted",
      context:
        "Sent and not yet accepted. Nothing sends mail yet, so these are links somebody still has to pass on by hand.",
      rows: pending.map((i) => ({
        id: i.id,
        name: i.full_name || i.email,
        note: i.full_name
          ? `${i.email} \u00b7 sent ${longDate(i.created_at)}`
          : `Sent ${longDate(i.created_at)} \u00b7 expires ${longDate(i.expires_at)}`,
        badge: i.role ? ROLE_LABEL[i.role] : undefined,
        badgeTone: "var(--cobalt)",
        href: "/app/invitations",
        hrefLabel: "Resend",
      })),
      href: "/app/invitations",
      cta: "Open invitations",
    },
    birthdays > 0 && {
      kind: "birthdays" as const,
      tone: "var(--gold)",
      count: birthdays,
      label: birthdays === 1 ? "birthday this week" : "birthdays this week",
      detail: (data.birthdays ?? []).slice(0, 3).map((b) => b.full_name).join(", "),
      context:
        "Turning a year older in the next seven days. The greeting is written \u2014 WhatsApp opens with it ready to send.",
      rows: (data.birthdays ?? []).map((b) => ({
        id: b.id,
        name: b.full_name,
        note: `${birthdayWhen(b.date_of_birth)} \u00b7 turning ${b.turns}`,
        badge: isToday(b.date_of_birth) ? "today" : undefined,
        badgeTone: "var(--gold)",
        phone: b.phone_number,
        actionLabel: "Wish them",
        message: `Happy birthday, ${firstNameOf(b.full_name)}! \ud83c\udf89 Wishing you a wonderful year ahead. With love from all of us at ${data.church.name ?? "church"}.`,
        href: `/app/people/${b.id}`,
        hrefLabel: "Record",
      })),
      href: "/app/people",
      cta: "Open the directory",
    },
  ].filter(Boolean) as QueueItem[];

  return (
    <Page>
      {/* ---------------- header + the actions of the week ---------------- */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="eyebrow text-ink-3">Overview</p>
          <h1 className="head mt-2 text-[26px] tracking-[-0.025em] sm:text-[30px]">
            <span className="grad-text">{platform ? "Every church" : data.church.name}</span>
          </h1>
          <p className="mt-1.5 text-[12.5px] text-ink-3">
            {latest
              ? `Last service ${shortDate(latest.date)} · ${latest.present.toLocaleString()} of ${latest.marked.toLocaleString()} marked`
              : `Good to see you, ${firstName}.`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {platform && data.health && (
            <span
              className="chip"
              style={{
                background: `color-mix(in oklab, ${TONE[data.health]} 12%, transparent)`,
                color: TONE[data.health],
              }}
            >
              <span className="dot" style={{ color: TONE[data.health] }} aria-hidden />
              {data.health === "ok" ? "All systems operational" : "Needs attention"}
            </span>
          )}
          {platform && (
            <>
              <Link href="/app/audit" className="btn btn-quiet btn-sm">
                <History className="h-3.5 w-3.5" aria-hidden /> Activity
              </Link>
              <Link href="/app/platform" className="btn btn-primary btn-sm">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                {(data.staff?.church_status.pending ?? 0) > 0
                  ? `Review ${data.staff?.church_status.pending} church${data.staff?.church_status.pending === 1 ? "" : "es"}`
                  : "Verification"}
              </Link>
            </>
          )}
          {!platform && (
            <>
              <Link href="/app/attendance" className="btn btn-quiet btn-sm">
                <CalendarCheck className="h-3.5 w-3.5" aria-hidden /> Attendance
              </Link>
              <Link href="/app/invitations" className="btn btn-primary btn-sm">
                <UserPlus className="h-3.5 w-3.5" aria-hidden /> Invite
              </Link>
            </>
          )}
        </div>
      </header>

      {!platform && (
        <SetupChecklist data={data} invitations={invitations} hasTeam={hasTeam} />
      )}

      {/* ---------------- what needs doing ----------------
          First, and widest. This is the only actionable thing on the page
          and it was sitting under ten charts. It names the people and the
          cells rather than counting them: a signpost to a list you then
          have to search is not the work, it is a second search. */}
      <section className="grid gap-2 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <Panel
          title="Needs you"
          lede={
            platform
              ? "Waiting on the platform, worst first"
              : tasks.length > 0 ? "In the order it will hurt" : undefined
          }
          accent="var(--ruby)"
        >
          {platform ? (
            <StaffQueue items={data.staff?.attention ?? []} />
          ) : (
            <WorkQueue items={tasks} settleAction={settleCheckup} />
          )}
        </Panel>

        {/*
          Turnout, not head count.

          Stacked columns of present-against-absent were four near-identical
          blocks: the head count barely moves week to week, so the volume
          encoding spent a whole panel proving nothing. The share does move,
          and a line over a tight domain is the only way three points of
          movement are visible at all.
        */}
        <Panel
          title="Turnout"
          lede={`Share of those marked · last ${data.trend.length} services`}
          accent="var(--gold)"
          aside={
            latest && (
              <span className="flex items-baseline gap-1.5">
                <span className="figure text-[19px]" style={{ color: turnoutColour(latest.pct) }}>
                  {latest.pct}%
                </span>
                {turnoutDelta != null && (
                  <span
                    className="tnum text-[11px] font-semibold"
                    style={{ color: turnoutDelta >= 0 ? "var(--emerald)" : "var(--ruby)" }}
                  >
                    {turnoutDelta > 0 ? "+" : ""}
                    {turnoutDelta}
                  </span>
                )}
              </span>
            )
          }
        >
          {data.trend.length > 0 ? (
            <>
              <TrendChart
                data={data.trend.map((p) => ({ label: shortDate(p.date), value: p.pct }))}
                color="var(--gold)"
                height={118}
                ariaLabel="Turnout percentage at each of the last services"
              />
              <ul className="mt-2 flex justify-between border-t border-line pt-2">
                {data.trend.map((p) => (
                  <li key={p.date} className="text-center">
                    <span className="tnum block text-[12.5px] font-semibold">
                      {p.present.toLocaleString()}
                    </span>
                    <span className="tnum block text-[10.5px] text-ink-3">
                      {shortDate(p.date)}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <Empty>No attendance recorded yet.</Empty>
          )}
        </Panel>
      </section>

      {/* ---------------- platform only: the platform itself ----------------
          The leader's page spends this slot on the congregation, which is a
          single church drawn at one to one. Staff have no single church, so
          the slot answers their question instead: how many churches are in
          which state, how fast they are arriving, and what just happened. */}
      {platform && data.staff && (
        <PlatformSection staff={data.staff} activity={activity} />
      )}

      {/* ---------------- the church, at one to one ----------------
          Its own ground: full-bleed on mist, no card. It is the page's
          subject rather than the first of eleven panels, and the change
          of surface is what says so. */}
      {!platform && (
        <section className="field-band">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
            <div>
              <h2 className="head text-[19px] tracking-[-0.025em]">The congregation</h2>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
                <span className="flex items-center gap-1.5">
                  <span className="dot" style={{ color: "var(--ink-2)" }} aria-hidden />
                  in a seat
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="dot-hollow" style={{ color: "var(--ink-2)" }} aria-hidden />
                  not there
                </span>
                <span>· one dot is one person · hover a cell, click to open it</span>
              </p>
            </div>

            <dl className="flex flex-wrap items-end gap-x-7 gap-y-2">
              {[
                { k: "people", v: people?.toLocaleString() ?? "—", tone: "var(--ink)" },
                {
                  k: "present",
                  v: latest?.present.toLocaleString() ?? "—",
                  tone: latest ? turnoutColour(latest.pct) : "var(--ink)",
                },
                { k: "branches", v: String(ranked.length), tone: "var(--ink)" },
                { k: "cells", v: String(data.cells.length), tone: "var(--ink)" },
              ].map((f) => (
                <div key={f.k}>
                  <dd className="figure text-[26px]" style={{ color: f.tone }}>
                    {f.v}
                  </dd>
                  <dt className="mt-0.5 text-[10.5px] uppercase tracking-[0.12em] text-ink-3">
                    {f.k}
                  </dt>
                </div>
              ))}
            </dl>
          </div>

          <CongregationField branches={data.branches} cells={data.cells} />
        </section>
      )}

      {/* ---------------- the numbers, with their shape ----------------
          A figure answers "how many"; the line under it answers "and
          which way", which is the question a bare number always provokes
          and never settles. Each card is a link, so the number and the
          way into it are the same target. */}
      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          href="/app/people"
          label="People"
          value={people?.toLocaleString() ?? "—"}
          colour="var(--cobalt)"
          delta={joined}
          deltaLabel=" joined"
          footnote="cumulative, 12 months"
          spark={
            growthLine.length > 1 ? (
              <Sparkline
                data={growthLine}
                color="var(--cobalt)"
                ariaLabel="Membership over twelve months"
              />
            ) : undefined
          }
        />
        <StatCard
          href="/app/attendance"
          label="Turnout"
          value={latest ? String(latest.pct) : "—"}
          unit="%"
          colour="var(--gold)"
          delta={turnoutDelta}
          deltaLabel=" pts"
          footnote={
            latest
              ? `${latest.present.toLocaleString()} of ${latest.marked.toLocaleString()} marked`
              : undefined
          }
          spark={
            turnoutLine.length > 1 ? (
              <Sparkline
                data={turnoutLine}
                color="var(--gold)"
                ariaLabel="Turnout at each of the last services"
              />
            ) : undefined
          }
        />
        <StatCard
          href="/app/cells"
          label="Cells at risk"
          value={String(atRisk)}
          colour="var(--teal)"
          goodWhenDown
          footnote={`${bands[0].value} thriving · ${bands[1].value} steady · ${data.cells.length} cells`}
        />
        {showGiving ? (
          <StatCard
            href="/app/giving"
            label="Giving"
            value={money(givingWindow, currency)}
            colour="var(--emerald)"
            footnote={
              givingThisMonth != null
                ? `${money(givingThisMonth, currency)} so far this month`
                : `over ${data.giving_months.length} months`
            }
            spark={
              givingLine.length > 1 ? (
                <Sparkline
                  data={givingLine}
                  color="var(--emerald)"
                  ariaLabel="Giving by month"
                />
              ) : undefined
            }
          />
        ) : (
          <StatCard
            href="/app/people"
            label="Care queue"
            value={String(followUps)}
            colour="var(--ruby)"
            goodWhenDown
            footnote={`${careTotal} check-ups recorded`}
          />
        )}
      </section>

      {/* ---------------- composition, in rings ----------------
          Each is one whole split into a handful of parts, which is the
          only question a ring answers well. More slices than this and it
          is a bar chart wearing a circle. */}
      <section className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {showGiving && (
          <Panel
            title="Giving"
            lede={`By type · ${data.giving_months.length} months`}
            accent="var(--emerald)"
          >
            <RingPanel
              value={money(givingWindow, currency)}
              label="in window"
              chart={
                <DonutChart
                  data={data.giving_types.map((g) => ({ label: g.label, value: g.total }))}
                  colors={GIVING_TONES}
                  height={158}
                  thickness={0.28}
                  ariaLabel="Giving split by type"
                />
              }
              items={data.giving_types.slice(0, 6).map((g, i) => ({
                label: g.label,
                colour: GIVING_TONES[i % GIVING_TONES.length],
                value: money(g.total, currency),
              }))}
            />
          </Panel>
        )}

        <Panel
          title="Cell health"
          lede={`${data.cells.length} cells by turnout`}
          accent="var(--teal)"
        >
          {data.cells.length > 0 ? (
            <RingPanel
              value={String(atRisk)}
              label="at risk"
              chart={
                <DonutChart
                  data={bands}
                  colors={[BAND_TONE.thriving, BAND_TONE.steady, BAND_TONE["at risk"]]}
                  height={158}
                  thickness={0.28}
                  ariaLabel="Cells by health band"
                />
              }
              items={bands.map((b) => ({
                label: b.label,
                colour: BAND_TONE[b.label],
                value: String(b.value),
              }))}
            />
          ) : (
            <Empty>No cells yet.</Empty>
          )}
        </Panel>

        <Panel title="Pastoral care" lede="Check-ups by state" accent="var(--ruby)">
          {careTotal > 0 ? (
            <RingPanel
              value={String(followUps)}
              label="need a call"
              chart={
                <DonutChart
                  data={care}
                  colors={care.map((c) => CARE_TONE[c.label] ?? "var(--sunk)")}
                  height={158}
                  thickness={0.28}
                  ariaLabel="Check-ups by status"
                />
              }
              items={care.map((c) => ({
                label: c.label,
                colour: CARE_TONE[c.label] ?? "var(--sunk)",
                value: String(c.value),
              }))}
            />
          ) : (
            <Empty>No check-ups recorded.</Empty>
          )}
        </Panel>

        <Panel
          title="Age"
          lede="Active members"
          accent="var(--violet)"
          aside={
            genders.length > 0 && (
              <span className="tnum text-[11px] text-ink-3">
                {Math.round((women / genderTotal) * 100)}% women
              </span>
            )
          }
        >
          {ages.length > 0 ? (
            <RingPanel
              value={ages.reduce((sum, a) => sum + a.value, 0).toLocaleString()}
              label="on the roll"
              chart={
                <DonutChart
                  data={ages}
                  colors={AGE_TONES}
                  height={158}
                  thickness={0.28}
                  ariaLabel="Congregation by age band"
                />
              }
              items={ages.map((a, i) => ({
                label: a.label,
                colour: AGE_TONES[i % AGE_TONES.length],
                value: String(a.value),
              }))}
            />
          ) : (
            <Empty>No dates of birth recorded.</Empty>
          )}
        </Panel>
      </section>

      {/* ---------------- branch by branch, and the long lines ---------------- */}
      <section className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        {/* Concentric rings, not slices: branches do not add up to a
            whole, they are independent fractions of the same 100. Nested,
            they share a start angle and a scale, so the ranking reads off
            the arc lengths without anyone reading a number. */}
        <Panel
          title="Turnout by branch"
          lede="Each ring is one site, against the same 100%"
          accent="var(--violet)"
          aside={
            <Link
              href="/app/branches"
              className="text-[11px] font-medium text-ink-3 transition-colors hover:text-ink"
            >
              Manage →
            </Link>
          }
        >
          {ranked.length > 0 ? (
            <RingPanel
              height={186}
              value={latest ? `${latest.pct}%` : "—"}
              label="church wide"
              chart={
                <MultiRingChart
                  data={ranked.slice(0, 6).map((b) => ({ label: b.name, value: b.turnout }))}
                  colors={BRANCH_TONES}
                  height={186}
                  ariaLabel="Turnout percentage for each branch"
                />
              }
              items={ranked.slice(0, 6).map((b, i) => ({
                label: b.name,
                colour: BRANCH_TONES[i % BRANCH_TONES.length],
                value: `${b.turnout}%`,
              }))}
            />
          ) : (
            <Empty>No branches with anyone on the roll.</Empty>
          )}
        </Panel>

        <Panel
          title="Membership"
          lede="Cumulative, 12 months"
          accent="var(--cobalt)"
          aside={
            joined != null && (
              <span
                className="tnum text-[11px] font-semibold"
                style={{ color: "var(--cobalt)" }}
              >
                +{joined}
              </span>
            )
          }
        >
          {growthLine.length > 0 ? (
            <TrendChart
              data={growthLine}
              color="var(--cobalt)"
              height={214}
              ariaLabel="Total membership at the end of each month"
            />
          ) : (
            <Empty>No join dates recorded.</Empty>
          )}
        </Panel>

        {showGiving ? (
          <Panel
            title="Giving over time"
            lede="Completed gifts, by month"
            accent="var(--emerald)"
            aside={
              <Link
                href="/app/giving"
                className="text-[11px] font-medium text-ink-3 transition-colors hover:text-ink"
              >
                Every gift →
              </Link>
            }
          >
            <TrendChart
              data={givingLine}
              color="var(--emerald)"
              height={214}
              ariaLabel="Total giving per month"
            />
          </Panel>
        ) : (
          <Panel title="Last service" lede="Share of those marked" accent="var(--gold)">
            {latest ? (
              <Ring
                height={186}
                value={`${latest.pct}%`}
                label="turnout"
                chart={
                  <GaugeChart
                    value={latest.pct}
                    colour={turnoutColour(latest.pct)}
                    height={186}
                    ariaLabel={`${latest.pct} per cent turnout at the last service`}
                  />
                }
              />
            ) : (
              <Empty>Nothing marked yet.</Empty>
            )}
          </Panel>
        )}
      </section>

      {/* ---------------- platform only: the tenants ---------------- */}
      {platform && (data.churches ?? []).length > 0 && (
        <Panel title="Churches" lede="Largest first" accent="var(--violet)">
          <ul className="rows">
            {(data.churches ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-1.5 first:pt-0">
                <Link
                  href={`/app/church?id=${c.id}`}
                  className="min-w-0 truncate text-[12px] font-medium hover:underline"
                >
                  {c.name}
                </Link>
                <span className="tnum shrink-0 text-[11px] text-ink-3">
                  {c.members.toLocaleString()} · {c.branches} branches
                  <span
                    className="ml-2 font-semibold"
                    style={{ color: turnoutColour(c.turnout) }}
                  >
                    {c.turnout}%
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

    </Page>
  );
}


/**
 * The platform's half of the dashboard: church status as a composition,
 * registrations as a line, accounts as a short key, and the last few
 * things anybody did. Counts only — nothing here is a church's own data.
 */
function PlatformSection({
  staff,
  activity,
}: {
  staff: NonNullable<Dashboard["staff"]>;
  activity: Activity[] | null;
}) {
  const order: ChurchStatus[] = ["active", "pending", "rejected", "suspended"];
  const slices = order.map((status) => ({
    label: CHURCH_STATUS_LABEL[status].toLowerCase(),
    value: staff.church_status[status] ?? 0,
    colour: CHURCH_STATUS_TONE[status],
  }));
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const shown = slices.filter((s) => s.value > 0);
  const weeks = staff.registrations;
  const newInWindow = weeks.reduce((sum, w) => sum + w.value, 0);

  return (
    <section className="grid gap-2 lg:grid-cols-3">
      <Panel title="Churches" lede="By where they stand" accent="var(--violet)">
        {total > 0 ? (
          <RingPanel
            value={String(total)}
            label={total === 1 ? "church" : "churches"}
            chart={
              <DonutChart
                data={shown.map((s) => ({ label: s.label, value: s.value }))}
                colors={shown.map((s) => s.colour)}
                height={158}
                thickness={0.28}
                ariaLabel="Churches by verification status"
              />
            }
            items={slices.map((s) => ({ label: s.label, colour: s.colour, value: String(s.value) }))}
          />
        ) : (
          <Empty>No churches yet.</Empty>
        )}
      </Panel>

      <Panel
        title="Registrations"
        lede={`New churches per week · last ${weeks.length} weeks`}
        accent="var(--cobalt)"
        aside={
          <span className="figure text-[19px]">
            {newInWindow}
          </span>
        }
      >
        {newInWindow > 0 ? (
          <TrendChart
            data={weeks}
            color="var(--cobalt)"
            height={118}
            ariaLabel="New church registrations in each of the last weeks"
          />
        ) : (
          <Empty>No registrations in the last {weeks.length} weeks.</Empty>
        )}
        <Key
          columns={1}
          items={[
            { label: "accounts", colour: "var(--cobalt)", value: staff.accounts.total.toLocaleString() },
            { label: "new this week", colour: "var(--emerald)", value: String(staff.accounts.new_week) },
            {
              label: "unconfirmed",
              colour: staff.accounts.stale > 0 ? "var(--gold)" : "var(--ink-3)",
              value: `${staff.accounts.unverified}${staff.accounts.stale ? ` (${staff.accounts.stale} over a week)` : ""}`,
            },
          ]}
        />
      </Panel>

      <Panel title="Recent activity" lede="Across every church" accent="var(--ink-3)">
        {activity && activity.length > 0 ? (
          <>
            <ul className="rows">
              {activity.map((entry) => (
                <li key={entry.id} className="flex items-baseline justify-between gap-3 py-1.5 first:pt-0">
                  <span className="min-w-0 truncate text-[12px]">
                    <span className="font-medium">{entry.user_name ?? "System"}</span>{" "}
                    <span className="text-ink-3">
                      {describe(entry.action)}
                      {entry.table_name ? ` · ${entry.table_name.replace(/_/g, " ")}` : ""}
                    </span>
                  </span>
                  <span className="tnum shrink-0 text-[11px] text-ink-3">{ago(entry.created_at)}</span>
                </li>
              ))}
            </ul>
            <Link href="/app/audit" className="mt-2 inline-block text-[11.5px] text-ink-3 hover:text-ink">
              Open the whole trail
            </Link>
          </>
        ) : (
          <Empty>{activity ? "Nothing recorded yet." : "Reading the trail takes audit authority."}</Empty>
        )}
      </Panel>
    </section>
  );
}

/** "VERIFY:active" → "verified"; anything unrecognised keeps its own words. */
function describe(action: string): string {
  const map: Record<string, string> = {
    "VERIFY:active": "verified",
    "VERIFY:rejected": "turned down",
    "VERIFY:suspended": "suspended",
    RESUBMIT: "resubmitted",
    OWNER: "handed over",
    GRANT: "granted a role",
    REVOKE: "revoked a role",
    CREATE: "created",
    UPDATE: "edited",
    DELETE: "deleted",
  };
  return map[action] ?? action.toLowerCase().replace(/[:_]/g, " ");
}

/** Server-rendered, so safe to read the clock; "just now" beats a bare timestamp. */
function ago(value: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(/(Z|[+-]\d\d:?\d\d)$/.test(value) ? value : `${value}Z`).getTime()) / 1000));
  if (seconds < 90) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
