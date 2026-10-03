import Link from "next/link";
import {
  ArrowLeft, Briefcase, Cake, Building2, Compass, Droplets, Heart, Mail,
  MapPin, Shield, Sparkles, Users,
} from "lucide-react";

import { changePassword } from "@/app/actions/auth";
import { saveMyDetails } from "@/app/actions/manage";
import { DonutChart } from "@/components/charts";
import { PhoneLink } from "@/components/contact";
import { PasswordEditor, SelfEditor } from "@/components/editors";
import {
  Empty, Meter, Page, Panel, RingPanel, StatCard,
} from "@/components/panels";
import { api } from "@/lib/api";
import { currentChurchId, requireMe } from "@/lib/session";
import type { Church, PersonProfile } from "@/lib/types";
import { ROLE_BLURB, ROLE_LABEL } from "@/lib/types";

export const metadata = { title: "Your account — Chapl" };

const GIVING_TONES = [
  "var(--emerald)", "var(--teal)", "var(--cobalt)",
  "var(--violet)", "var(--gold)", "var(--ruby)",
];

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

function when(value: string | null): string {
  if (!value) return "never";
  return new Date(value).toLocaleString(undefined, {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function years(from: string | null): string {
  if (!from) return "";
  const whole = Math.floor((Date.now() - new Date(from).getTime()) / 31_557_600_000);
  if (whole < 1) return "here since this year";
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

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <li className="flex items-start gap-2.5 py-2">
      <span className="mt-[3px] shrink-0 text-ink-3" aria-hidden>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[10.5px] uppercase tracking-[0.11em] text-ink-3">
          {label}
        </span>
        <span className="block break-words text-[12.5px] leading-[1.4] text-ink">
          {value}
        </span>
      </span>
    </li>
  );
}

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

export default async function AccountPage() {
  const me = await requireMe("/app/account");
  const churchId = await currentChurchId();

  const [profileResult, churchResult] = await Promise.all([
    churchId ? api<PersonProfile>(`/users/${me.id}/profile`) : Promise.resolve(null),
    churchId ? api<Church>(`/churches/${churchId}`) : Promise.resolve(null),
  ]);

  const record = me;
  const stats = profileResult?.ok ? profileResult.data : null;
  const currency = churchResult?.ok ? churchResult.data.currency : "GHS";

  const giving = stats?.giving ?? null;
  const services = stats?.attendance ?? [];
  const serving = stats?.departments ?? [];
  const home = me.memberships[0] ?? null;
  const theirAge = age(record?.date_of_birth ?? me.date_of_birth);

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
    (record?.date_of_birth ?? me.date_of_birth) && {
      icon: <Cake className="h-3.5 w-3.5" />,
      label: "Born",
      value: `${longDate(record?.date_of_birth ?? me.date_of_birth)}${
        theirAge != null ? ` · ${theirAge}` : ""
      }`,
    },
    (record?.gender ?? me.gender) && {
      icon: <Users className="h-3.5 w-3.5" />,
      label: "Gender",
      value: (record?.gender ?? me.gender) as string,
    },
    record?.marital_status && {
      icon: <Heart className="h-3.5 w-3.5" />,
      label: "Marital status",
      value: record.marital_status,
    },
    record?.occupation && {
      icon: <Briefcase className="h-3.5 w-3.5" />,
      label: "Occupation",
      value: record.occupation,
    },
    record?.baptism_date && {
      icon: <Droplets className="h-3.5 w-3.5" />,
      label: "Baptised",
      value: longDate(record.baptism_date),
    },
    record?.confirmation_date && {
      icon: <Sparkles className="h-3.5 w-3.5" />,
      label: "Confirmed",
      value: longDate(record.confirmation_date),
    },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string }[];

  return (
    <Page>
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Overview
        </Link>
        <div id="complete-profile" className="flex items-center gap-2">
          <PasswordEditor action={changePassword} avoid={[me.full_name, me.email]} />
          {record && <SelfEditor action={saveMyDetails} person={record} />}
        </div>
      </div>

      {me.profile_completion.complete && <Link href={me.churches.length ? "/app" : "/app/start"} className="btn btn-quiet btn-sm self-start">Continue to {me.churches.length ? "your church" : "church setup"}</Link>}
      {/* Your record on the right, your life in the church on the left —
          the same shape as a person's page, because it is the same page
          seen from the inside. Both columns end level: each is a flex
          column whose last panel takes `fill`. */}
      <div
        className={`grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px] ${
          balanced ? "" : "lg:items-start"
        }`}
      >
        {/* ================= your life in the church ================= */}
        <div className="flex flex-col gap-3">
          <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatCard
              label="Your turnout"
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
                  ? "services since you were last here"
                  : "consecutive services"
              }
            />
            <StatCard
              label="You serve on"
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
                label="You have given"
                value={money(giving.total, currency)}
                colour="var(--emerald)"
                footnote={`${giving.gifts} gift${giving.gifts === 1 ? "" : "s"} recorded`}
              />
            ) : (
              <StatCard
                label="Member since"
                value={String(new Date(me.joined_date).getFullYear())}
                colour="var(--cobalt)"
                footnote={years(me.joined_date)}
              />
            )}
          </section>

          <Panel
            title="Every service"
            lede="Filled is a seat taken, hollow is one that stayed empty"
            accent="var(--gold)"
          >
            {services.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-start">
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
                      <span className="sr-only">{s.present ? "present" : "absent"}</span>
                    </li>
                  ))}
                </ul>

                <div className="space-y-3">
                  <Rate label="You" value={stats?.pct ?? null} colour="var(--gold)" />
                  <Rate
                    label={home?.cell_name ?? "Your cell"}
                    value={stats?.cell_pct ?? null}
                    colour="var(--teal)"
                    note={
                      stats?.pct != null && stats.cell_pct != null
                        ? stats.pct >= stats.cell_pct
                          ? `${stats.pct - stats.cell_pct} points ahead of your cell`
                          : `${stats.cell_pct - stats.pct} points behind your cell`
                        : undefined
                    }
                  />
                </div>
              </div>
            ) : (
              <Empty>You have never been marked at a service.</Empty>
            )}
          </Panel>

          <div className="grid gap-3 sm:grid-cols-2">
            {/* One row per church, because platform staff and anyone who
                has transferred genuinely belong to more than one. */}
            <Panel
              title="Where you belong"
              lede={
                me.memberships.length > 1
                  ? `${me.memberships.length} churches`
                  : "Your church, branch and cell"
              }
              accent="var(--violet)"
            >
              {me.memberships.length > 0 ? (
                <ul className="rows">
                  {me.memberships.map((m) => (
                    <li key={m.church_id} className="py-2 first:pt-0">
                      <p className="flex items-baseline gap-2 text-[12.5px] font-medium">
                        <Building2
                          className="h-3.5 w-3.5 shrink-0 translate-y-[2px] text-ink-3"
                          aria-hidden
                        />
                        {m.church_name}
                      </p>
                      <p className="mt-0.5 pl-[22px] text-[11.5px] text-ink-3">
                        {m.branch_name}
                        {m.cell_name && ` · ${m.cell_name}`}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>You do not belong to a church yet.</Empty>
              )}
            </Panel>

            <Panel
              title="What you may do"
              lede="Your roles, and what each one carries"
              accent="var(--cobalt)"
            >
              {me.assignments.length > 0 ? (
                <ul className="rows">
                  {me.assignments.map((a) => (
                    <li
                      key={`${a.role}-${a.scope_id ?? "platform"}`}
                      className="py-2 first:pt-0"
                    >
                      <p className="flex items-center gap-2 text-[12.5px] font-medium">
                        <Shield
                          className="h-3.5 w-3.5 shrink-0"
                          style={{ color: "var(--cobalt)" }}
                          aria-hidden
                        />
                        {ROLE_LABEL[a.role]}
                      </p>
                      <p className="mt-0.5 pl-[22px] text-[11.5px] leading-[1.45] text-ink-3">
                        {ROLE_BLURB[a.role]}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No role. You are a member.</Empty>
              )}
            </Panel>
          </div>

          {/*
            Your record, and who to ring about you.
            These sat in the identity rail, stacked one field per line at
            320px. They are six short facts and one contact — in the wide
            column they lay out two and three across, read in a glance,
            and stop the rail running to twice the height of the page.
          */}
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_260px]">
            <Panel
              title="Your details"
              lede="What the church has on file"
              accent="var(--violet)"
              aside={
                <span className="text-[11px] text-ink-3">
                  Edit above to correct any of it
                </span>
              }
            >
              {facts.length > 0 ? (
                <ul className="grid gap-x-6 sm:grid-cols-2 xl:grid-cols-3">
                  {facts.map((fact) => (
                    <Fact key={fact.label} {...fact} />
                  ))}
                </ul>
              ) : (
                <Empty>Nothing recorded beyond your name and how to reach you.</Empty>
              )}
            </Panel>

            <Panel title="In an emergency" lede="Who the church would ring" accent="var(--ruby)">
              {record?.emergency_contact_name ? (
                <>
                  <p className="text-[13px] font-medium">
                    {record.emergency_contact_name}
                  </p>
                  <div className="mt-1.5">
                    <PhoneLink number={record.emergency_contact_phone} />
                  </div>
                </>
              ) : (
                <Empty>Nobody named yet.</Empty>
              )}
            </Panel>
          </div>

          <div className={`grid gap-3 sm:grid-cols-2 ${balanced ? "flex-1" : ""}`}>
            <Panel
              fill={balanced}
              title="What you serve on"
              lede="Departments you are a part of"
              accent="var(--teal)"
            >
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
                <Empty>You are not on a department yet.</Empty>
              )}
            </Panel>

            {giving && giving.gifts > 0 ? (
              <Panel
                fill={balanced}
                title="What you give for"
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
                      data={giving.types.map((t) => ({ label: t.label, value: t.total }))}
                      colors={GIVING_TONES}
                      height={140}
                      thickness={0.28}
                      ariaLabel="Your giving split by type"
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
                title="Your giving"
                lede="Completed gifts recorded against your name"
                accent="var(--emerald)"
              >
                <Empty>
                  Nothing recorded yet. Anonymous gifts never appear here, by design.
                </Empty>
              </Panel>
            )}
          </div>
        </div>

        {/* ================= who you are ================= */}
        {/*
          The rail carries identity and nothing else.
          It held the whole record before — six fields, the emergency
          contact and the account panel — which made a 320px column run
          twice the height of the working half beside it. Those are things
          you read, not things you are; they belong in the wide column
          with the rest of the detail, and the rail is left as the thing
          you glance at to confirm whose page this is.
        */}
        <div className="flex flex-col gap-3">
          <section className="sheet sheet-lg text-center">
            {(record?.avatar_url ?? me.avatar_url) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={(record?.avatar_url ?? me.avatar_url) as string}
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
                {(me.full_name || "?")[0].toUpperCase()}
              </span>
            )}

            <h1 className="head mt-3 text-[19px] leading-tight">{me.full_name}</h1>

            <p className="mt-1.5 text-[11.5px] text-ink-3">
              {[home?.branch_name, home?.cell_name].filter(Boolean).join(" \u00b7 ") ||
                "Not placed yet"}
            </p>
            <p className="text-[11.5px] text-ink-3">{years(me.joined_date)}</p>

            {(me.assignments.length > 0 || me.is_platform_staff) && (
              <p className="mt-3 flex flex-wrap justify-center gap-1.5">
                {me.is_platform_staff && (
                  <span
                    className="chip"
                    style={{
                      background: "color-mix(in oklab, var(--violet) 12%, transparent)",
                      color: "var(--violet)",
                    }}
                  >
                    <Compass className="h-3 w-3" aria-hidden />
                    Platform staff
                  </span>
                )}
                {me.assignments.map((a) => (
                  <span
                    key={`${a.role}-${a.scope_id ?? "platform"}`}
                    className="chip"
                    style={{
                      background: "color-mix(in oklab, var(--cobalt) 12%, transparent)",
                      color: "var(--cobalt)",
                    }}
                  >
                    <Shield className="h-3 w-3" aria-hidden />
                    {ROLE_LABEL[a.role]}
                  </span>
                ))}
              </p>
            )}

            <div className="mt-4 space-y-1.5 border-t border-line pt-3 text-left">
              <a
                href={`mailto:${me.email}`}
                className="flex items-center gap-2 text-[12px] text-ink-2 transition-colors hover:text-ink"
              >
                <Mail className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                <span className="truncate">{me.email}</span>
              </a>
              {(record?.phone_number ?? me.phone_number) && (
                <PhoneLink number={record?.phone_number ?? me.phone_number} />
              )}
              {(record?.address || record?.location || me.location) && (
                <p className="flex items-start gap-2 text-[12px] text-ink-2">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
                  <span>{record?.address || record?.location || me.location}</span>
                </p>
              )}
            </div>
          </section>

          {/*
            The account, as distinct from the person.
            Everything else is who you are to the church; this is the login
            itself. It sits under the identity because that is what it
            identifies, and it is the thing you only look at when something
            is wrong.
          */}
          <Panel fill title="This account" lede="The sign-in itself" accent="var(--gold)">
            <ul>
              <Fact
                icon={<Mail className="h-3.5 w-3.5" />}
                label="Signs in with"
                value={me.email}
              />
              <Fact
                icon={<Cake className="h-3.5 w-3.5" />}
                label="Account opened"
                value={longDate(me.joined_date)}
              />
              <Fact
                icon={<Shield className="h-3.5 w-3.5" />}
                label="Last signed in"
                value={when(me.last_login_at)}
              />
              <Fact
                icon={<Compass className="h-3.5 w-3.5" />}
                label="Status"
                value={me.is_active ? "Active" : "Deactivated"}
              />
            </ul>
            <p className="mt-3 border-t border-line pt-2.5 text-[11px] leading-[1.55] text-ink-3">
              Changing your password signs you out of every device. Your email and
              your roles are changed by a church administrator, not here.
            </p>
          </Panel>
        </div>
      </div>
    </Page>
  );
}
