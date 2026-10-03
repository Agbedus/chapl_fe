import Link from "next/link";
import { AtSign, CalendarDays, Check, Globe, MapPin, Phone, ShieldCheck, Wallet } from "lucide-react";

import { updateChurch } from "@/app/actions/church";
import { DonutChart, StackedChart, TrendChart } from "@/components/charts";
import { ChurchEditor } from "@/components/editors";
import { Empty, Page, Panel, RingPanel, StatCard } from "@/components/panels";
import { Notice } from "@/components/ui/form";
import { decideChurch, handOverChurch } from "@/app/actions/church";
import { ActionButton, DeclineChurch, OwnerEditor } from "@/components/editors";
import { api } from "@/lib/api";
import { canAdminChurch, currentChurchId, requireMe } from "@/lib/session";
import type { ChurchStats, Dashboard, Department, Paged, Person } from "@/lib/types";
import { CHURCH_STATUS_LABEL, CHURCH_STATUS_TONE } from "@/lib/types";

export const metadata = { title: "Church — Chapl" };

const AGE_TONES = [
  "var(--teal)", "var(--cobalt)", "var(--violet)", "var(--gold)", "var(--ruby)",
];
const GIVING_TONES = [
  "var(--emerald)", "var(--teal)", "var(--cobalt)",
  "var(--violet)", "var(--gold)", "var(--ruby)",
];

function longDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric", month: "long", year: "numeric",
  });
}

function yearsSince(value: string | null): string {
  if (!value) return "";
  const years = Math.floor((Date.now() - new Date(value).getTime()) / 31_557_600_000);
  return years > 0 ? `${years} years old` : "founded this year";
}

function money(value: number, currency: string): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: value >= 10_000 ? 1 : 0,
  }).format(value);
}

/** One line of the church's record. */
function Fact({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
  href?: string;
}) {
  if (!value) return null;
  const body = (
    <>
      <span className="mt-[3px] shrink-0 text-ink-3" aria-hidden>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10px] uppercase tracking-[0.11em] text-ink-3">
          {label}
        </span>
        <span className="block break-words text-[12.5px] leading-[1.4] text-ink">
          {value}
        </span>
      </span>
    </>
  );
  return (
    <li>
      {href ? (
        <a href={href} className="flex items-start gap-2.5 py-1.5 hover:text-ink">
          {body}
        </a>
      ) : (
        <span className="flex items-start gap-2.5 py-1.5">{body}</span>
      )}
    </li>
  );
}

export default async function ChurchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const me = await requireMe("/app/church");
  const params = await searchParams;

  const churchId =
    params.id ?? (await currentChurchId()) ?? me.memberships[0]?.church_id ?? null;

  if (!churchId) {
    return (
      <Page>
        <h1 className="head text-[20px]">No church yet</h1>
        <p className="text-[13px] text-ink-2">
          You do not belong to a church, and none is selected.
        </p>
        <Link href="/app/church/new" className="btn btn-primary btn-sm w-fit">
          Create one
        </Link>
      </Page>
    );
  }

  const [churchResult, dash, deptList, people] = await Promise.all([
    api<ChurchStats>(`/churches/${churchId}`),
    api<Dashboard>("/dashboard"),
    api<Paged<Department>>("/departments/?limit=1"),
    // For naming the owner and for handing the church over.
    api<Paged<Person>>("/users/?limit=2000&sort=full_name&order=asc"),
  ]);

  if (!churchResult.ok) {
    return (
      <Page>
        <Notice kind="error">That church is not available to you.</Notice>
      </Page>
    );
  }

  const church = churchResult.data;
  const editable = canAdminChurch(me, churchId);

  const directory = people.ok
    ? people.data.items.map((p) => ({ value: p.id, label: `${p.full_name} · ${p.email}` }))
    : [];
  const ownerName =
    church.owner_id && people.ok
      ? (people.data.items.find((p) => p.id === church.owner_id)?.full_name ?? null)
      : null;
  // The owner may hand their own church on; platform staff may hand on
  // anybody's. A church admin who is not the owner may not.
  const canHandOver = me.is_platform_staff || church.owner_id === me.id;
  const currency = church.currency || "GHS";

  /*
   * Everything below is the mother church, whole.
   *
   * The dashboard breaks the same figures down by branch, because a
   * leader's question is "which site needs me". This page asks the other
   * one — "what is this church" — so nothing here is split by site. Where
   * the dashboard shows six branch turnouts, this shows one line for the
   * congregation entire.
   */
  const data = dash.ok ? dash.data : null;
  const growth = data?.growth ?? [];
  const joins = growth.map((g) => ({ label: g.label, value: g.joined }));
  const cumulative = growth.map((g) => ({ label: g.label, value: g.total }));
  const joinedYear = growth.reduce((sum, g) => sum + g.joined, 0);

  /*
   * The area chart is drawn from zero, which is the honest baseline for a
   * total — and which makes a year of real growth look like a flat line.
   * The percentage carries what the shape cannot.
   */
  const opening = growth[0]?.total ?? 0;
  const closing = growth.at(-1)?.total ?? 0;
  const growthPct =
    opening > 0 ? Math.round(((closing - opening) / opening) * 100) : null;

  const trend = data?.trend ?? [];
  const attendance = trend.flatMap((p) => [
    {
      label: new Date(p.date).toLocaleDateString(undefined, {
        day: "2-digit", month: "short",
      }),
      value: p.present,
      series: "present",
    },
    {
      label: new Date(p.date).toLocaleDateString(undefined, {
        day: "2-digit", month: "short",
      }),
      value: p.absent,
      series: "absent",
    },
  ]);
  const latest = trend.at(-1);

  const ages = (data?.demographics.ages ?? []).filter((a) => a.value > 0);
  const genders = (data?.demographics.genders ?? []).filter((g) => g.value > 0);
  const women = genders.find((g) => g.label === "female")?.value ?? 0;
  const genderTotal = genders.reduce((s, g) => s + g.value, 0) || 1;

  const showGiving = data?.giving_total != null && (data?.giving_types.length ?? 0) > 0;
  const givingMonths = data?.giving_months ?? [];
  const givingWindow = givingMonths.reduce((sum, m) => sum + m.total, 0);

  /*
   * The street, then the town, then the country — but a street address
   * often already ends in the town, and "Accra, Accra, Ghana" reads as a
   * bug rather than an address.
   */
  const where = [church.address, church.city, church.country]
    .filter((part): part is string => Boolean(part))
    .filter(
      (part, i, all) =>
        !all.some((other, j) => j < i && other.toLowerCase().includes(part.toLowerCase())),
    )
    .join(", ");

  /** Cell life across the whole church, not site by site. */
  const bands = ["thriving", "steady", "at risk"] as const;
  const health = bands
    .map((band) => ({
      label: band,
      value: (data?.cells ?? []).filter((c) => c.band === band).length,
    }))
    .filter((b) => b.value > 0);
  const BAND_TONES = ["var(--emerald)", "var(--cobalt)", "var(--ruby)"];

  const perBranch = church.branch_count
    ? Math.round(church.member_count / church.branch_count)
    : 0;
  const perCell = church.cell_count
    ? Math.round(church.member_count / church.cell_count)
    : 0;

  return (
    <Page>
      {params.created && (
        <Notice kind="success">
          Church created. Add its first branch — every member belongs to one.
        </Notice>
      )}

      {/*
        Verification, said plainly.

        A pending church works — the person who registered it can run it
        from the first minute. What it lacks is the platform vouching for
        it, and that is worth stating rather than leaving somebody to
        wonder whether something is broken. A rejection carries the
        reason, because the alternative is a dead end.
      */}
      {church.status === "pending" && (
        <Notice kind="info">
          <strong>{CHURCH_STATUS_LABEL.pending}.</strong> Everything here works
          already — this is the platform confirming the church is real, not a
          gate on using it.
        </Notice>
      )}
      {church.status === "rejected" && (
        <Notice kind="error">
          <strong>Not approved.</strong>{" "}
          {church.review_note ?? "No reason was recorded."}
        </Notice>
      )}
      {church.status === "suspended" && (
        <Notice kind="error">
          <strong>Suspended.</strong>{" "}
          {church.review_note ?? "Contact the platform."}
        </Notice>
      )}

      {/* The platform's own controls, only for platform staff. */}
      {me.is_platform_staff && church.status === "pending" && (
        <div className="sheet flex flex-wrap items-center gap-3">
          <ShieldCheck className="h-4 w-4" style={{ color: "var(--gold)" }} aria-hidden />
          <span className="text-[12.5px] text-ink-2">
            This church is waiting on you.
          </span>
          <span className="ml-auto flex items-center gap-2">
            <ActionButton
              action={decideChurch}
              fields={{ id: church.id, status: "active" }}
              label="Verify it"
              icon={<Check className="h-3 w-3" aria-hidden />}
              confirm={`Verify ${church.name}? The owner is told straight away.`}
            />
            <DeclineChurch action={decideChurch} church={{ id: church.id, name: church.name }} />
          </span>
        </div>
      )}

      {/*
        Two columns that end level.
        A grid row stretches both children to the taller of the two, so
        the last panel in each column takes `fill` and absorbs whatever
        slack the other column left — the congregation's dots spread down
        one side, the rings grow on the other, and neither column trails
        off above the other's baseline.
      */}
      <div className="grid gap-3 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* ================= the church itself ================= */}
        <div className="flex flex-col gap-3">
          <section className="sheet sheet-lg">
            <div className="text-center">
              {church.logo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={church.logo_url}
                  alt=""
                  className="mx-auto h-20 w-20 rounded-2xl object-cover"
                />
              ) : (
                <span
                  className="mx-auto grid h-20 w-20 place-items-center rounded-2xl text-[24px] font-bold"
                  style={{
                    background:
                      "linear-gradient(140deg, color-mix(in oklab, var(--cobalt) 20%, transparent), color-mix(in oklab, var(--violet) 16%, transparent))",
                    color: "var(--cobalt)",
                    fontFamily: "var(--font-display)",
                  }}
                  aria-hidden
                >
                  {church.code.slice(0, 2)}
                </span>
              )}

              <h1 className="head mt-3 text-[20px] leading-tight">{church.name}</h1>
              {church.legal_name && church.legal_name !== church.name && (
                <p className="mt-1 text-[11.5px] text-ink-3">{church.legal_name}</p>
              )}

              <p className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                <span
                  className="chip"
                  style={{
                    background: "color-mix(in oklab, var(--cobalt) 12%, transparent)",
                    color: "var(--cobalt)",
                  }}
                >
                  {church.code}
                </span>
                {church.denomination && (
                  <span className="chip bg-sunk text-ink-3">{church.denomination}</span>
                )}
                {!church.is_active && (
                  <span
                    className="chip"
                    style={{
                      background: "color-mix(in oklab, var(--ruby) 12%, transparent)",
                      color: "var(--ruby)",
                    }}
                  >
                    inactive
                  </span>
                )}
              </p>

              {church.founded_date && (
                <p className="mt-2 text-[11.5px] text-ink-3">
                  Founded {longDate(church.founded_date)} · {yearsSince(church.founded_date)}
                </p>
              )}
            </div>

            {church.about && (
              <p className="mt-4 border-t border-line pt-3.5 text-[12.5px] leading-[1.6] text-ink-2">
                {church.about}
              </p>
            )}

            <ul className="mt-3.5 border-t border-line pt-2.5">
              <Fact
                icon={<MapPin className="h-3.5 w-3.5" />}
                label="Address"
                value={where}
              />
              <Fact
                icon={<AtSign className="h-3.5 w-3.5" />}
                label="Email"
                value={church.contact_email}
                href={church.contact_email ? `mailto:${church.contact_email}` : undefined}
              />
              <Fact
                icon={<Phone className="h-3.5 w-3.5" />}
                label="Phone"
                value={church.contact_phone}
                href={church.contact_phone ? `tel:${church.contact_phone}` : undefined}
              />
              <Fact
                icon={<Globe className="h-3.5 w-3.5" />}
                label="Website"
                value={church.website}
                href={church.website ?? undefined}
              />
              <Fact
                icon={<Wallet className="h-3.5 w-3.5" />}
                label="Currency"
                value={church.currency}
              />
              <Fact
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                label="Timezone"
                value={church.timezone}
              />
            </ul>

            {editable && (
              <div className="mt-4 border-t border-line pt-3.5">
                <ChurchEditor action={updateChurch} church={church} />
              </div>
            )}
            {!editable && (
              <p className="mt-4 border-t border-line pt-3 text-[11px] text-ink-3">
                Read-only at your level of access.
              </p>
            )}
          </section>

          {/*
            Who answers for this church.

            Separate from "Team & roles", which lists everyone holding a
            grant: several people can be church_admin, exactly one is the
            owner. Only the owner or platform staff may hand it on, which
            is how a handover happens without anybody filing a ticket.
          */}
          <Panel title="Ownership" lede="The one account that answers for this church" accent="var(--cobalt)">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="text-[13px] font-medium text-ink">
                {church.owner_id ? (ownerName ?? "Someone outside this church") : "Nobody yet"}
              </span>
              <span className="chip" style={{ color: CHURCH_STATUS_TONE[church.status] }}>
                {CHURCH_STATUS_LABEL[church.status]}
              </span>
              {canHandOver && (
                <span className="ml-auto">
                  <OwnerEditor action={handOverChurch} churchId={church.id}
                               churchName={church.name} currentOwner={ownerName}
                               people={directory} />
                </span>
              )}
            </div>
            {church.verified_at && (
              <p className="mt-2.5 border-t border-line pt-2.5 text-[11.5px] text-ink-3">
                Verified {new Date(church.verified_at).toLocaleDateString("en-GB", {
                  day: "numeric", month: "long", year: "numeric",
                })}
                {church.review_note ? ` · ${church.review_note}` : ""}
              </p>
            )}
          </Panel>

          {/* The tree in one block. The only structural figures on this
              page, because everything else here is the church whole. */}
          <Panel title="The tree" lede="Church → branch → cell" accent="var(--violet)">
            <dl className="grid grid-cols-3 gap-2 text-center">
              {[
                { k: "branches", v: church.branch_count, tone: "var(--violet)", href: "/app/branches" },
                { k: "cells", v: church.cell_count, tone: "var(--teal)", href: "/app/cells" },
                { k: "people", v: church.member_count, tone: "var(--cobalt)", href: "/app/people" },
              ].map((row) => (
                <Link key={row.k} href={row.href} className="rounded-lg py-1 hover:bg-mist">
                  <dd className="figure text-[22px]" style={{ color: row.tone }}>
                    {row.v.toLocaleString()}
                  </dd>
                  <dt className="mt-0.5 text-[10.5px] uppercase tracking-[0.1em] text-ink-3">
                    {row.k}
                  </dt>
                </Link>
              ))}
            </dl>
            <p className="mt-3 border-t border-line pt-2.5 text-[11.5px] leading-[1.6] text-ink-3">
              Averaging <span className="tnum font-semibold text-ink-2">{perBranch}</span>{" "}
              people a branch and{" "}
              <span className="tnum font-semibold text-ink-2">{perCell}</span> a cell.
            </p>
          </Panel>

          {/*
            The whole church at one to one.
            The dashboard's field groups the same dots into cells and
            branches, because that is where the work is. Here the grouping
            is dropped on purpose: this is the congregation as one body,
            which is the only view the mother church has of itself.
          */}
          {latest && (
            <Panel
              fill
              title="The congregation"
              lede="One dot is one person"
              accent="var(--cobalt)"
            >
              <div
                className="flex flex-1 flex-wrap content-start gap-[3px]"
                style={{ color: "var(--cobalt)" }}
                aria-hidden
              >
                {Array.from({ length: church.member_count }, (_, i) => (
                  <span key={i} className={i < latest.present ? "dot" : "dot-hollow"} />
                ))}
              </div>
              <p className="mt-3 border-t border-line pt-2.5 text-[11.5px] leading-[1.6] text-ink-3">
                <span className="tnum font-semibold" style={{ color: "var(--cobalt)" }}>
                  {latest.present.toLocaleString()}
                </span>{" "}
                filled — everyone in a seat at the service on{" "}
                {new Date(latest.date).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "long",
                })}
                . The hollow ones are the rest of the roll.
              </p>
            </Panel>
          )}
        </div>

        {/* ================= the church, measured ================= */}
        <div className="flex flex-col gap-3">
          <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatCard
              label="On the roll"
              value={church.member_count.toLocaleString()}
              colour="var(--cobalt)"
              footnote={`${joinedYear} joined in 12 months`}
            />
            <StatCard
              label="Turnout"
              value={latest ? String(latest.pct) : "—"}
              unit="%"
              colour="var(--gold)"
              footnote={
                latest
                  ? `${latest.present.toLocaleString()} of ${latest.marked.toLocaleString()} marked`
                  : "nothing marked yet"
              }
            />
            <StatCard
              label="Departments"
              value={deptList.ok ? String(deptList.data.total) : "—"}
              colour="var(--teal)"
              footnote={`${church.cell_count} cells across ${church.branch_count} sites`}
              href="/app/departments"
            />
            {showGiving ? (
              <StatCard
                label="Given, all time"
                value={money(data?.giving_total ?? 0, currency)}
                colour="var(--emerald)"
                footnote={
                  Math.round(givingWindow) >= Math.round(data?.giving_total ?? 0)
                    ? `every gift recorded, over ${givingMonths.length} months`
                    : `${money(givingWindow, currency)} in the last ${givingMonths.length} months`
                }
              />
            ) : (
              <StatCard
                label="Founded"
                value={
                  church.founded_date
                    ? String(new Date(church.founded_date).getFullYear())
                    : "—"
                }
                colour="var(--violet)"
                footnote={yearsSince(church.founded_date)}
              />
            )}
          </section>

          {/* Two questions about growth that the dashboard's single
              cumulative line cannot answer at once: how big is it, and
              is it still growing. */}
          <section className="grid gap-3 lg:grid-cols-2">
            <Panel
              title="How it grew"
              lede="Everyone on the roll, month by month"
              accent="var(--cobalt)"
              aside={
                growthPct != null ? (
                  <span
                    className="tnum text-[11.5px] font-semibold"
                    style={{ color: growthPct >= 0 ? "var(--emerald)" : "var(--ruby)" }}
                  >
                    {growthPct >= 0 ? "+" : ""}
                    {growthPct}% in a year
                  </span>
                ) : undefined
              }
            >
              {cumulative.length > 1 ? (
                <TrendChart
                  data={cumulative}
                  color="var(--cobalt)"
                  height={186}
                  ariaLabel="Total membership at the end of each month"
                />
              ) : (
                <Empty>Not enough history yet.</Empty>
              )}
            </Panel>

            <Panel
              title="Who joined"
              lede="New members each month"
              accent="var(--emerald)"
              aside={
                <span className="tnum text-[11.5px] font-semibold" style={{ color: "var(--emerald)" }}>
                  +{joinedYear} in a year
                </span>
              }
            >
              {joins.length > 1 ? (
                <StackedChart
                  data={joins.map((j) => ({ ...j, series: "joined" }))}
                  domain={["joined"]}
                  colors={["var(--emerald)"]}
                  height={186}
                  ariaLabel="People who joined in each month"
                />
              ) : (
                <Empty>No join dates recorded.</Empty>
              )}
            </Panel>
          </section>

          <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Panel
              title="Who turns up"
              lede={`Present against absent, church wide · last ${trend.length} services`}
              accent="var(--gold)"
              aside={
                <span className="flex items-center gap-3 text-[11px] text-ink-3">
                  <span className="flex items-center gap-1.5">
                    <span className="dot" style={{ color: "var(--gold)" }} aria-hidden /> present
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="dot" style={{ color: "var(--sunk)" }} aria-hidden /> absent
                  </span>
                </span>
              }
            >
              {attendance.length > 0 ? (
                <StackedChart
                  data={attendance}
                  domain={["present", "absent"]}
                  colors={["var(--gold)", "var(--sunk)"]}
                  height={196}
                  ariaLabel="People present against absent at each service, church wide"
                />
              ) : (
                <Empty>No attendance recorded yet.</Empty>
              )}
            </Panel>

            {/* Cell life, whole. The dashboard lists the cells at risk by
                name because that is a leader's next job; this says what
                proportion of the church's cell life is in each state. */}
            <Panel title="Cell health" lede="Every cell by band" accent="var(--emerald)">
              {health.length > 0 ? (
                <RingPanel
                  columns={1}
                  value={String(church.cell_count)}
                  label="cells"
                  chart={
                    <DonutChart
                      data={health}
                      colors={BAND_TONES}
                      height={158}
                      thickness={0.28}
                      ariaLabel="Cells by health band"
                    />
                  }
                  items={health.map((b) => ({
                    label: b.label,
                    colour: BAND_TONES[bands.indexOf(b.label as (typeof bands)[number])],
                    value: String(b.value),
                  }))}
                />
              ) : (
                <Empty>No cells to judge yet.</Empty>
              )}
            </Panel>
          </section>

          <section className="grid flex-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <Panel fill title="Age" lede="Everyone active" accent="var(--violet)">
              {ages.length > 0 ? (
                <RingPanel
                  fill
                  value={ages.reduce((s, a) => s + a.value, 0).toLocaleString()}
                  label="on the roll"
                  chart={
                    <DonutChart
                      data={ages}
                      colors={AGE_TONES}
                      height={158}
                      thickness={0.28}
                      ariaLabel="The congregation by age band"
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

            <Panel fill title="Women and men" lede="Everyone active" accent="var(--cobalt)">
              {genders.length > 0 ? (
                <RingPanel
                  fill
                  value={`${Math.round((women / genderTotal) * 100)}%`}
                  label="women"
                  chart={
                    <DonutChart
                      data={genders}
                      colors={["var(--cobalt)", "var(--ruby)", "var(--sunk)"]}
                      height={158}
                      thickness={0.28}
                      ariaLabel="The congregation by gender"
                    />
                  }
                  items={genders.map((g, i) => ({
                    label: g.label,
                    colour: ["var(--cobalt)", "var(--ruby)", "var(--sunk)"][i] ?? "var(--sunk)",
                    value: String(g.value),
                  }))}
                />
              ) : (
                <Empty>No genders recorded.</Empty>
              )}
            </Panel>

            {showGiving ? (
              <Panel
                fill
                title="What is given for"
                lede={`Completed gifts · ${givingMonths.length} months`}
                accent="var(--emerald)"
              >
                <RingPanel
                  fill
                  value={money(givingWindow, currency)}
                  label="in window"
                  chart={
                    <DonutChart
                      data={(data?.giving_types ?? []).map((g) => ({
                        label: g.label,
                        value: g.total,
                      }))}
                      colors={GIVING_TONES}
                      height={158}
                      thickness={0.28}
                      ariaLabel="Giving split by type"
                    />
                  }
                  items={(data?.giving_types ?? []).slice(0, 6).map((g, i) => ({
                    label: g.label,
                    colour: GIVING_TONES[i % GIVING_TONES.length],
                    value: money(g.total, currency),
                  }))}
                />
              </Panel>
            ) : (
              <Panel fill title="Care" lede="Every check-up by state" accent="var(--ruby)">
                {(data?.care ?? []).some((c) => c.value > 0) ? (
                  <RingPanel
                    fill
                    value={String(
                      (data?.care ?? []).reduce((s, c) => s + c.value, 0),
                    )}
                    label="check-ups"
                    chart={
                      <DonutChart
                        data={(data?.care ?? []).filter((c) => c.value > 0)}
                        colors={["var(--ruby)", "var(--gold)", "var(--cobalt)", "var(--emerald)"]}
                        height={158}
                        thickness={0.28}
                        ariaLabel="Check-ups by status"
                      />
                    }
                    items={(data?.care ?? [])
                      .filter((c) => c.value > 0)
                      .map((c, i) => ({
                        label: c.label,
                        colour: ["var(--ruby)", "var(--gold)", "var(--cobalt)", "var(--emerald)"][i] ?? "var(--sunk)",
                        value: String(c.value),
                      }))}
                  />
                ) : (
                  <Empty>No check-ups recorded.</Empty>
                )}
              </Panel>
            )}
          </section>
        </div>
      </div>
    </Page>
  );
}
