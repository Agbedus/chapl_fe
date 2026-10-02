import Link from "next/link";
import { ClipboardCheck } from "lucide-react";

import { Absentees } from "@/components/absentees";
import { BarsChart, DonutChart, StackedChart } from "@/components/charts";
import { CongregationField } from "@/components/congregation";
import {
  Empty, Page, PageHead, Panel, RingPanel, StatCard,
} from "@/components/panels";
import { ServiceStepper } from "@/components/service-stepper";
import { api } from "@/lib/api";
import { turnoutColour } from "@/lib/palette";
import { requireMe } from "@/lib/session";
import type { Dashboard, ServiceDetail } from "@/lib/types";

export const metadata = { title: "Attendance — Chapl" };

const BANDS = ["thriving", "steady", "at risk"] as const;
const BAND_TONES = ["var(--emerald)", "var(--cobalt)", "var(--ruby)"];

function shortDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit", month: "short",
  });
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  await requireMe("/app/attendance");
  const params = await searchParams;

  const [serviceResult, dash] = await Promise.all([
    api<ServiceDetail>(
      params.date
        ? `/attendance/service?attendance_date=${params.date}`
        : "/attendance/service",
    ),
    api<Dashboard>("/dashboard"),
  ]);

  if (!serviceResult.ok) {
    return (
      <Page>
        <PageHead eyebrow="Activity" title="Attendance" />
        <Empty>{serviceResult.error.detail}</Empty>
      </Page>
    );
  }

  const service = serviceResult.data;

  if (!service.date || service.dates.length === 0) {
    return (
      <Page>
        <PageHead
          eyebrow="Activity"
          title="Attendance"
          lede="Who was in a seat, service by service."
        />
        <Empty>
          No service has been marked yet. Once a register is taken, this page
          draws it.
        </Empty>
        <Link href="/app/attendance/register" className="btn btn-primary btn-sm w-fit">
          <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
          Take the first register
        </Link>
      </Page>
    );
  }

  /*
   * Stepping is a repeated action.
   *
   * The page cascade is right the first time you land here and wrong on
   * every press of the arrow after that: a control you use ten times in a
   * row must not make you watch the page assemble itself ten times over.
   * So the cascade runs on arrival and is off once a service has been
   * chosen — which is exactly what `?date=` in the URL means.
   */
  const stepped = Boolean(params.date);

  const trend = dash.ok ? dash.data.trend : [];
  const attendance = trend.flatMap((p) => [
    { label: shortDate(p.date), value: p.present, series: "present" },
    { label: shortDate(p.date), value: p.absent, series: "absent" },
  ]);

  // Branches ranked worst first — the thin ones are what is being looked
  // for, so they are not at the bottom of the list.
  const ranked = [...service.branches]
    .filter((b) => b.members > 0)
    .sort((a, b) => a.turnout - b.turnout);
  const branchBars = ranked.map((b) => ({ label: b.name, value: b.turnout }));
  const branchTones = Object.fromEntries(
    ranked.map((b) => [b.name, turnoutColour(b.turnout)]),
  );

  // A cell nobody marked has no turnout to judge, so it is counted in the
  // caption rather than drawn at zero — which would read as "nobody came".
  const markedCells = service.cells.filter((c) => c.last_seen === service.date);
  const unmarked = service.cells.length - markedCells.length;
  const thin = [...markedCells].sort((a, b) => a.turnout - b.turnout).slice(0, 8);

  const health = BANDS.map((band) => ({
    label: band,
    value: markedCells.filter((c) => c.band === band).length,
  })).filter((b) => b.value > 0);

  // Formatted here rather than in the stepper: it is a Client Component,
  // and Node and the browser disagree on what a locale date looks like.
  const serviceLabel = new Date(service.date).toLocaleDateString(undefined, {
    weekday: "long", day: "numeric", month: "long",
  });

  const previous = service.dates[service.dates.indexOf(service.date) - 1];
  const previousPct = previous
    ? (trend.find((p) => p.date === previous)?.pct ?? null)
    : null;

  return (
    <Page quiet={stepped}>
      <PageHead
        eyebrow="Activity"
        title="Attendance"
        lede="Who was in a seat, service by service."
        action={
          <span className="flex items-center gap-2">
            <ServiceStepper
              dates={service.dates}
              current={service.date}
              label={serviceLabel}
            />
            <Link href="/app/attendance/register" className="btn btn-primary btn-sm">
            <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
            Take the register
          </Link>
          </span>
        }
      />

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard
          label="Turnout"
          value={String(service.pct)}
          unit="%"
          colour={turnoutColour(service.pct)}
          delta={previousPct != null ? service.pct - previousPct : null}
          deltaLabel="pts on the service before"
          footnote={`${service.present.toLocaleString()} of ${service.marked.toLocaleString()} marked`}
        />
        <StatCard
          label="In a seat"
          value={service.present.toLocaleString()}
          colour="var(--gold)"
          footnote={`across ${ranked.length} branches`}
        />
        <StatCard
          label="Not there"
          value={service.absent.toLocaleString()}
          colour="var(--ruby)"
          footnote={
            service.absentees.length < service.absent
              ? `${service.absentees.length} named below`
              : "every one of them named below"
          }
        />
        <StatCard
          label="Cells marked"
          value={String(markedCells.length)}
          colour="var(--teal)"
          footnote={
            unmarked > 0
              ? `${unmarked} took no register`
              : "every cell took a register"
          }
          href="/app/cells"
        />
      </section>

      {/*
        The register, drawn.
        One dot per person, filled if they were in a seat — which is what
        attendance *is*. This is the one page where the congregation field
        is not a signature borrowed from somewhere else.
      */}
      <Panel
        title="The register"
        lede="One dot is one person · filled means they were there"
        accent="var(--gold)"
        aside={
          <span className="text-[11px] text-ink-3">
            {new Date(service.date).toLocaleDateString(undefined, {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
          </span>
        }
      >
        <CongregationField branches={service.branches} cells={service.cells} />
      </Panel>

      <section className="grid gap-3 lg:grid-cols-2">
        <Panel
          title="Across the services"
          lede={`Present against absent · last ${trend.length}`}
          accent="var(--gold)"
          aside={
            <span className="flex items-center gap-3 text-[11px] text-ink-3">
              <span className="flex items-center gap-1.5">
                <span className="dot" style={{ color: "var(--gold)" }} aria-hidden />
                present
              </span>
              <span className="flex items-center gap-1.5">
                <span className="dot" style={{ color: "var(--sunk)" }} aria-hidden />
                absent
              </span>
            </span>
          }
        >
          {attendance.length > 0 ? (
            <StackedChart
              data={attendance}
              domain={["present", "absent"]}
              colors={["var(--gold)", "var(--sunk)"]}
              height={200}
              ariaLabel="People present against absent at each of the recent services"
            />
          ) : (
            <Empty>Nothing to plot yet.</Empty>
          )}
        </Panel>

        <Panel
          title="Which sites were thin"
          lede="Turnout at this service, worst first"
          accent="var(--violet)"
        >
          {branchBars.length > 0 ? (
            <BarsChart
              data={branchBars}
              colorByLabel={branchTones}
              max={100}
              height={Math.max(140, branchBars.length * 26 + 24)}
              ariaLabel="Turnout at each branch for this service"
            />
          ) : (
            <Empty>No branch was marked at this service.</Empty>
          )}
        </Panel>
      </section>

      <section className="grid items-stretch gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Panel
          fill
          title="Cell health"
          lede="Cells marked at this service"
          accent="var(--teal)"
        >
          {health.length > 0 ? (
            <RingPanel
              fill
              columns={1}
              value={String(markedCells.length)}
              label="cells marked"
              height={150}
              chart={
                <DonutChart
                  data={health}
                  colors={BAND_TONES}
                  height={150}
                  thickness={0.28}
                  ariaLabel="Cells by health band at this service"
                />
              }
              items={health.map((b) => ({
                label: b.label,
                colour: BAND_TONES[BANDS.indexOf(b.label)],
                value: String(b.value),
              }))}
            />
          ) : (
            <Empty>No cell took a register.</Empty>
          )}
        </Panel>

        <Panel
          title="The thinnest cells"
          lede="Where the empty seats were concentrated"
          accent="var(--teal)"
        >
          {thin.length > 0 ? (
            <ul className="rows">
              {thin.map((cell) => (
                <li key={cell.id}>
                  <Link
                    href={`/app/cells?branch=${cell.branch_id}`}
                    className="flex items-baseline justify-between gap-3 rounded-lg px-1.5 py-[7px]
                               transition-colors duration-150 hover:bg-mist"
                  >
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span
                        className="dot shrink-0"
                        style={{ color: turnoutColour(cell.turnout) }}
                        aria-hidden
                      />
                      <span className="truncate text-[12.5px]">{cell.name}</span>
                      <span className="shrink-0 text-[10.5px] text-ink-3">
                        {cell.branch}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2.5">
                      <span
                        className="dotrow"
                        style={{ color: turnoutColour(cell.turnout) }}
                        aria-hidden
                      >
                        {Array.from({ length: Math.min(cell.members, 12) }, (_, i) => (
                          <span
                            key={i}
                            className={
                              i < Math.round((cell.members * cell.turnout) / 100)
                                ? "dot"
                                : "dot-hollow"
                            }
                          />
                        ))}
                      </span>
                      <span
                        className="tnum w-9 text-right text-[12px] font-semibold"
                        style={{ color: turnoutColour(cell.turnout) }}
                      >
                        {cell.turnout}%
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No cell took a register at this service.</Empty>
          )}
        </Panel>
      </section>

      {/*
        The work.
        Everything above is the shape of the problem; this is the list
        somebody works down, so it comes last and takes the full width.
      */}
      <Panel
        title="Who was not there"
        lede="Longest gone first, within each branch · every name opens their record"
        accent="var(--ruby)"
      >
        <Absentees people={service.absentees} service={service.date} />
      </Panel>
    </Page>
  );
}
