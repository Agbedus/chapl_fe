import { MembershipHistory } from "@/components/membership-history";
import type { Schemas } from "@/lib/generated/api";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, Briefcase, Cake, Droplets, Heart, Mail, MapPin, Phone,
  Shield, Sparkles, Users,
} from "lucide-react";

import { savePerson, savePlacement } from "@/app/actions/manage";
import { DonutChart } from "@/components/charts";
import { PersonEditor, PlacementEditor } from "@/components/editors";
import {
  Detail, Empty, Meter, Page, Panel, RingPanel, StatCard,
} from "@/components/panels";
import { api } from "@/lib/api";
import { canAdminChurch, currentChurchId, requireMe } from "@/lib/session";
import type {
  Assignment, Branch, Cell, Church, Membership, Paged, Person, PersonProfile,
} from "@/lib/types";
import { ROLE_BLURB, ROLE_LABEL } from "@/lib/types";

const GIVING_TONES = [
  "var(--emerald)", "var(--teal)", "var(--cobalt)",
  "var(--violet)", "var(--gold)", "var(--ruby)",
];

/**
 * The four states a check-up can be in, from `CheckupStatus` on the API.
 * Written from the enum rather than from memory — the first version of
 * this map invented four names that never appear in a response, so every
 * dot fell through to the default grey.
 */
const CARE_TONE: Record<string, string> = {
  not_reached: "var(--ruby)",
  reached: "var(--cobalt)",
  follow_up_needed: "var(--gold)",
  resolved: "var(--emerald)",
};

function longDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric", month: "long", year: "numeric",
  });
}

function shortDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit", month: "short",
  });
}

function years(from: string | null): string {
  if (!from) return "";
  const whole = Math.floor((Date.now() - new Date(from).getTime()) / 31_557_600_000);
  if (whole < 1) return "joined this year";
  return `${whole} year${whole === 1 ? "" : "s"} here`;
}

function age(dob: string | null): number | null {
  if (!dob) return null;
  const born = new Date(dob);
  const now = new Date();
  const value = now.getFullYear() - born.getFullYear();
  const before =
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate());
  return before ? value - 1 : value;
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10_000 ? 1 : 0,
  }).format(value);
}

/** One fact with its icon. The row a person's details actually read as. */
function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <li className="flex items-start gap-2.5 py-2">
      <span className="mt-[3px] shrink-0 text-ink-3" aria-hidden>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10.5px] uppercase tracking-[0.11em] text-ink-3">
          {label}
        </span>
        <span className="block text-[12.5px] leading-[1.4] text-ink">{value}</span>
      </span>
    </li>
  );
}

/** A rate against its label, drawn as a rule. Two of these compare. */
function Rate({
  label,
  value,
  colour,
  note,
}: {
  label: string;
  value: number | null;
  colour: string;
  note?: string;
}) {
  return (
    <div>
      <p className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[11.5px] text-ink-2">{label}</span>
        <span className="tnum text-[12.5px] font-semibold" style={{ color: colour }}>
          {value == null ? "—" : `${value}%`}
        </span>
      </p>
      <Meter value={value ?? 0} colour={colour} />
      {note && <p className="mt-1 text-[10.5px] text-ink-3">{note}</p>}
    </div>
  );
}

export default async function PersonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireMe("/app/people");
  const churchId = await currentChurchId();
  const { id } = await params;

  const [personResult, placement, branchList, cellList, grants, profileResult, churchResult, movement] =
    await Promise.all([
      api<Person>(`/users/${id}`),
      api<Membership>(`/users/${id}/membership`),
      api<Paged<Branch>>("/branches/?limit=200&sort=name&order=asc"),
      api<Paged<Cell>>("/cells/?limit=300&sort=code&order=asc"),
      api<Paged<Assignment>>("/assignments/?limit=200"),
      api<PersonProfile>(`/users/${id}/profile`),
      churchId ? api<Church>(`/churches/${churchId}`) : Promise.resolve(null),
      api<Schemas["MembershipHistoryRead"][]>(`/users/${id}/membership-history`),
    ]);

  if (!personResult.ok) {
    if (personResult.error.status === 404) notFound();
    return (
      <Page>
        <h1 className="head text-[20px]">Not available</h1>
        <p className="text-[13px] text-ink-2">{personResult.error.detail}</p>
      </Page>
    );
  }

  const person = personResult.data;
  const member = placement.ok ? placement.data : null;
  const branches = branchList.ok ? branchList.data.items : [];
  const cells = cellList.ok ? cellList.data.items : [];
  const roles = grants.ok
    ? grants.data.items.filter((a) => a.user_id === id && a.is_active)
    : [];

  const branch = branches.find((b) => b.id === member?.branch_id);
  const cell = cells.find((c) => c.id === member?.cell_id);
  const cellsHere = cells.filter((c) => c.branch_id === member?.branch_id);
  const theirAge = age(person.date_of_birth);

  /*
   * What this viewer may see of this person.
   *
   * The API decides what it will hand over; this decides what is worth
   * drawing. Pastoral notes and an emergency contact are the two things
   * on this page a cell member has no business reading about someone
   * else, so they are gated on church-level authority — and on it being
   * someone else's record, because your own notes are yours.
   */
  const isSelf = me.id === person.id;
  const privileged = canAdminChurch(me, churchId) || isSelf;
  const showNotes = privileged && Boolean(person.notes);
  const showEmergency = privileged && Boolean(person.emergency_contact_name);

  /*
   * The figures.
   *
   * `giving` comes back null when the caller may read the record but not
   * the offering, so the panel is absent rather than empty — an empty
   * giving panel on someone else's page reads as "gave nothing", which
   * is a different claim from "you may not see this".
   */
  const stats = profileResult.ok ? profileResult.data : null;
  const currency = churchResult?.ok ? churchResult.data.currency : "GHS";
  const giving = stats?.giving ?? null;
  const services = stats?.attendance ?? [];
  const serving = stats?.departments ?? [];
  const checkups = privileged ? (stats?.checkups ?? []) : [];


  /*
   * Whether level bottoms are worth having.
   *
   * The two columns are made to end level by giving the last panel in
   * each `fill`, which is right when both sides have something to say.
   * It is wrong for someone with no attendance, no department and no
   * giving: their left column is three empty states, and stretching
   * those to meet a tall record turns a short page into a tall void.
   * So the stretch is switched off and the columns keep their natural
   * heights — an uneven bottom edge beats a panel of nothing.
   */
  const balanced =
    services.length > 0 || serving.length > 0 || (giving?.gifts ?? 0) > 0;

  const facts = [
    person.date_of_birth && {
      icon: <Cake className="h-3.5 w-3.5" />,
      label: "Born",
      value: `${longDate(person.date_of_birth)}${theirAge != null ? ` · ${theirAge}` : ""}`,
    },
    person.gender && {
      icon: <Users className="h-3.5 w-3.5" />,
      label: "Gender",
      value: person.gender,
    },
    person.marital_status && {
      icon: <Heart className="h-3.5 w-3.5" />,
      label: "Marital status",
      value: person.marital_status,
    },
    person.occupation && {
      icon: <Briefcase className="h-3.5 w-3.5" />,
      label: "Occupation",
      value: person.occupation,
    },
    person.baptism_date && {
      icon: <Droplets className="h-3.5 w-3.5" />,
      label: "Baptised",
      value: longDate(person.baptism_date),
    },
    person.confirmation_date && {
      icon: <Sparkles className="h-3.5 w-3.5" />,
      label: "Confirmed",
      value: longDate(person.confirmation_date),
    },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[];

  return (
    <Page>
      {movement.ok && <MembershipHistory changes={movement.data} branches={branches} cells={cells} />}

      <div className="flex items-center justify-between gap-4">
        <Link
          href="/app/people"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Everyone
        </Link>
        {privileged && <PersonEditor action={savePerson} person={person} />}
      </div>

      {/*
        The record on the right, the person's life in the church on the
        left — the mirror of the church page, and deliberately so. There
        the identity is the subject; here it is the reference you glance
        at while reading the figures, so it sits out of the way on the
        side and the working half gets the width.

        Both columns end level: each is a flex column whose last panel
        takes `fill` and absorbs the other's slack.
      */}
      <div
        className={`grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] ${
          balanced ? "" : "lg:items-start"
        }`}
      >
        {/* ================= their life in the church ================= */}
        <div className="flex flex-col gap-3">
          <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatCard
              label="Turnout"
              value={stats?.pct != null ? String(stats.pct) : "—"}
              unit="%"
              colour="var(--gold)"
              footnote={
                stats && stats.marked > 0
                  ? `${stats.present} of ${stats.marked} services`
                  : "never marked"
              }
            />
            <StatCard
              label={stats && stats.missed > 0 ? "Missed in a row" : "Here in a row"}
              value={String(
                stats ? (stats.missed > 0 ? stats.missed : stats.streak) : 0,
              )}
              colour={
                stats && stats.missed > 0
                  ? stats.missed > 1
                    ? "var(--ruby)"
                    : "var(--gold)"
                  : "var(--emerald)"
              }
              footnote={
                stats && stats.missed > 0
                  ? stats.missed > 1
                    ? "services since they were last here — worth a call"
                    : "service since they were last here"
                  : "consecutive services"
              }
            />
            <StatCard
              label="Serving on"
              value={String(serving.length)}
              colour="var(--teal)"
              footnote={
                serving.length > 0
                  ? serving.map((d) => d.name).join(", ")
                  : "no department"
              }
              href="/app/departments"
            />
            {giving && giving.gifts > 0 ? (
              <StatCard
                label="Given"
                value={money(giving.total, currency)}
                colour="var(--emerald)"
                footnote={`${giving.gifts} gift${giving.gifts === 1 ? "" : "s"} recorded`}
              />
            ) : (
              <StatCard
                label="Care"
                value={String(checkups.length)}
                colour="var(--ruby)"
                footnote={
                  checkups.length > 0
                    ? `last on ${shortDate(checkups[0].date)}`
                    : "no check-up recorded"
                }
              />
            )}
          </section>

          {/* Their own record, service by service, against the room they
              sit in. A rate on its own says nothing: 58% is poor in a
              cell averaging 90 and good in one averaging 40. */}
          <Panel
            title="Every service"
            lede="Filled is a seat taken, hollow is one that stayed empty"
            accent="var(--gold)"
          >
            {services.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-start">
                {/*
                  A dot per service, over its date.

                  This was a stacked bar chart first, and it was nonsense:
                  one person is present or not, so every bar was the same
                  height on an axis labelled 0.0 to 1.0. A chart of a
                  binary is a chart with no information in it. The dot
                  already carries the whole fact, and the date under it
                  says which Sunday — which is the thing you actually ask
                  when you see a run of hollows.
                */}
                <ul className="flex flex-wrap gap-x-2 gap-y-3 self-center">
                  {services.map((s) => (
                    <li key={s.date} className="min-w-[46px] flex-1 text-center">
                      <span
                        className={`${s.present ? "dot" : "dot-hollow"} mx-auto block h-[18px] w-[18px]`}
                        style={{ color: "var(--gold)" }}
                        aria-hidden
                      />
                      <span className="mt-1.5 block text-[10px] leading-tight text-ink-3">
                        {shortDate(s.date)}
                      </span>
                      <span className="sr-only">
                        {s.present ? "present" : "absent"}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-3">
                  <Rate
                    label="Them"
                    value={stats?.pct ?? null}
                    colour="var(--gold)"
                  />
                  <Rate
                    label={cell ? cell.name : "Their cell"}
                    value={stats?.cell_pct ?? null}
                    colour="var(--teal)"
                    note={
                      stats?.pct != null && stats.cell_pct != null
                        ? stats.pct >= stats.cell_pct
                          ? `${stats.pct - stats.cell_pct} points ahead of the cell`
                          : `${stats.cell_pct - stats.pct} points behind the cell`
                        : undefined
                    }
                  />
                </div>
              </div>
            ) : (
              <Empty>They have never been marked at a service.</Empty>
            )}
          </Panel>

          <div className="grid gap-3 sm:grid-cols-2">
            <Panel
              title="Placement"
              lede="Where they belong"
              accent="var(--violet)"
              aside={
                privileged && (
                  <PlacementEditor
                    action={savePlacement}
                    personId={person.id}
                    membership={member}
                    branches={branches.map((b) => ({ value: b.id, label: b.name }))}
                    cells={cellsHere.map((c) => ({ value: c.id, label: c.name }))}
                  />
                )
              }
            >
              {member ? (
                <dl className="rows">
                  <Detail label="Branch" value={branch?.name} />
                  <Detail label="Cell" value={cell?.name} />
                  <Detail
                    label="Status"
                    value={<span className="capitalize">{member.status}</span>}
                  />
                  <Detail label="Member no." value={member.membership_number} />
                  <Detail label="Joined" value={longDate(member.joined_date)} />
                </dl>
              ) : (
                <Empty>Not a member of this church.</Empty>
              )}
            </Panel>

            <Panel
              title="Authority"
              lede="What they may do"
              accent="var(--cobalt)"
              aside={
                privileged && (
                  <Link
                    href="/app/team"
                    className="text-[11px] font-medium text-ink-3 transition-colors hover:text-ink"
                  >
                    Manage →
                  </Link>
                )
              }
            >
              {roles.length === 0 ? (
                <Empty>No role. They are a member.</Empty>
              ) : (
                <ul className="rows">
                  {roles.map((grant) => (
                    <li key={grant.id} className="py-2 first:pt-0">
                      <p className="text-[12.5px] font-medium">{ROLE_LABEL[grant.role]}</p>
                      <p className="mt-0.5 text-[11.5px] leading-[1.45] text-ink-3">
                        {ROLE_BLURB[grant.role]}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className={`grid gap-3 sm:grid-cols-2 ${balanced ? "flex-1" : ""}`}>
            {/* What they give their time to. Off the branch/cell tree, so
                it never appears in the placement panel beside it. */}
            <Panel fill={balanced} title="Serving" lede="Departments they are on" accent="var(--teal)">
              {serving.length > 0 ? (
                <ul className="rows">
                  {serving.map((dept) => (
                    <li
                      key={dept.id}
                      className="flex items-baseline justify-between gap-3 py-2 first:pt-0"
                    >
                      <span className="flex min-w-0 items-baseline gap-2">
                        <span
                          className="dot shrink-0"
                          style={{ color: "var(--teal)" }}
                          aria-hidden
                        />
                        <span className="truncate text-[12.5px]">{dept.name}</span>
                      </span>
                      {dept.role && (
                        <span className="shrink-0 text-[11px] capitalize text-ink-3">
                          {dept.role}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>Not on a department yet.</Empty>
              )}
            </Panel>

            {giving && giving.gifts > 0 ? (
              <Panel
                fill={balanced}
                title="What they give for"
                lede={`${giving.gifts} completed gift${giving.gifts === 1 ? "" : "s"}`}
                accent="var(--emerald)"
              >
                <RingPanel
                  fill={balanced}
                  columns={1}
                  value={money(giving.total, currency)}
                  label="all time"
                  height={140}
                  chart={
                    <DonutChart
                      data={giving.types.map((t) => ({
                        label: t.label,
                        value: t.total,
                      }))}
                      colors={GIVING_TONES}
                      height={140}
                      thickness={0.28}
                      ariaLabel="Their giving split by type"
                    />
                  }
                  items={giving.types.map((t, i) => ({
                    label: t.label,
                    colour: GIVING_TONES[i % GIVING_TONES.length],
                    value: money(t.total, currency),
                  }))}
                />
              </Panel>
            ) : (
              <Panel
                fill={balanced}
                title="Care"
                lede={
                  privileged
                    ? "Every check-up on this person"
                    : "Visible to church administrators"
                }
                accent="var(--ruby)"
              >
                {checkups.length > 0 ? (
                  <ul className="rows">
                    {checkups.map((c) => (
                      <li key={`${c.date}-${c.status}`} className="py-2 first:pt-0">
                        <p className="flex items-baseline justify-between gap-3">
                          <span className="flex items-baseline gap-2">
                            <span
                              className="dot shrink-0"
                              style={{ color: CARE_TONE[c.status] ?? "var(--ink-3)" }}
                              aria-hidden
                            />
                            <span className="text-[12.5px] capitalize">
                              {c.status.replace(/_/g, " ")}
                            </span>
                          </span>
                          <span className="tnum shrink-0 text-[11px] text-ink-3">
                            {shortDate(c.date)}
                          </span>
                        </p>
                        {c.notes && (
                          <p className="mt-0.5 pl-4 text-[11.5px] leading-[1.45] text-ink-3">
                            {c.notes}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <Empty>
                    {privileged
                      ? "Nobody has logged a check-up."
                      : "Not visible at your level of access."}
                  </Empty>
                )}
              </Panel>
            )}
          </div>
        </div>

        {/* ================= who they are ================= */}
        <div className="flex flex-col gap-3">
          <section className="sheet sheet-lg text-center">
            {person.avatar_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={person.avatar_url}
                alt=""
                className="mx-auto h-24 w-24 rounded-full object-cover ring-1 ring-line"
              />
            ) : (
              <span
                className="mx-auto grid h-24 w-24 place-items-center rounded-full text-[30px] font-semibold ring-1 ring-line"
                style={{
                  background:
                    "linear-gradient(135deg, color-mix(in oklab, var(--cobalt) 20%, transparent), color-mix(in oklab, var(--violet) 16%, transparent))",
                  color: "var(--cobalt)",
                  fontFamily: "var(--font-display)",
                }}
                aria-hidden
              >
                {(person.full_name || "?")[0].toUpperCase()}
              </span>
            )}

            <h1 className="head mt-3 text-[19px] leading-tight">{person.full_name}</h1>

            <p className="mt-1.5 text-[11.5px] text-ink-3">
              {[branch?.name, cell?.name].filter(Boolean).join(" · ") || "Not placed yet"}
            </p>
            {member?.joined_date && (
              <p className="text-[11.5px] text-ink-3">{years(member.joined_date)}</p>
            )}

            {(roles.length > 0 || !person.is_active) && (
              <p className="mt-3 flex flex-wrap justify-center gap-1.5">
                {roles.map((grant) => (
                  <span
                    key={grant.id}
                    className="chip"
                    style={{
                      background: "color-mix(in oklab, var(--cobalt) 12%, transparent)",
                      color: "var(--cobalt)",
                    }}
                  >
                    <Shield className="h-3 w-3" aria-hidden />
                    {ROLE_LABEL[grant.role]}
                  </span>
                ))}
                {!person.is_active && (
                  <span className="chip bg-sunk text-ink-3">Inactive</span>
                )}
              </p>
            )}

            {/* Reaching them is the reason most people open this page. */}
            <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-left">
              <a
                href={`mailto:${person.email}`}
                className="flex items-center gap-2 text-[12px] text-ink-2 transition-colors hover:text-ink"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                <span className="truncate">{person.email}</span>
              </a>
              {person.phone_number && (
                <a
                  href={`tel:${person.phone_number}`}
                  className="flex items-center gap-2 text-[12px] text-ink-2 transition-colors hover:text-ink"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                  {person.phone_number}
                </a>
              )}
              {(person.address || person.location) && (
                <p className="flex items-start gap-2 text-[12px] text-ink-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                  <span>{person.address || person.location}</span>
                </p>
              )}
            </div>

            {facts.length > 0 && (
              <ul className="mt-1 border-t border-line pt-1.5 text-left">
                {facts.map((fact) => (
                  <Fact key={fact.label} {...fact} />
                ))}
              </ul>
            )}
          </section>

          {showEmergency && (
            <Panel title="In an emergency" accent="var(--ruby)" quiet>
              <p className="text-[12.5px] font-medium">{person.emergency_contact_name}</p>
              {person.emergency_contact_phone && (
                <a
                  href={`tel:${person.emergency_contact_phone}`}
                  className="mt-0.5 block text-[12px] text-ink-2 hover:text-ink"
                >
                  {person.emergency_contact_phone}
                </a>
              )}
            </Panel>
          )}

          <Panel
            fill={balanced}
            title="Notes"
            lede="Visible to church administrators"
            accent="var(--violet)"
          >
            {showNotes ? (
              <p className="text-[12.5px] leading-[1.65] text-ink-2">{person.notes}</p>
            ) : (
              <Empty>
                {privileged ? "Nothing written down." : "Not visible at your level of access."}
              </Empty>
            )}
          </Panel>
        </div>
      </div>
    </Page>
  );
}
