import Link from "next/link";
import { notFound } from "next/navigation";

import { DonutChart, TrendChart } from "@/components/charts";
import { Empty, Page, Panel, RingPanel, Stat } from "@/components/panels";
import { recordGift } from "@/app/actions/manage";
import { canWrite } from "@/lib/access";
import { GiftEditor } from "@/components/editors";
import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import type { Dashboard, Paged, Person } from "@/lib/types";

export const metadata = { title: "Giving — Chapl" };

const TONES = [
  "var(--emerald)", "var(--teal)", "var(--cobalt)",
  "var(--violet)", "var(--gold)", "var(--ruby)",
];

const STATUS_TONE: Record<string, string> = {
  completed: "var(--emerald)",
  pending: "var(--gold)",
  failed: "var(--ruby)",
  refunded: "var(--ink-3)",
};

type Gift = {
  id: string;
  created_at: string;
  given_on: string | null;
  amount: number;
  currency: string;
  donation_type: string;
  status: string;
  is_anonymous: boolean;
  receipt_number: string | null;
  payment_method: string | null;
  user_id: string | null;
};

function money(value: number, currency: string, compact = false): string {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    notation: compact && value >= 10_000 ? "compact" : "standard",
    maximumFractionDigits: compact && value >= 10_000 ? 1 : 0,
  }).format(value);
}

/**
 * Month labels repeat when a window crosses a year boundary — two "Jan"
 * points would crash a chart that expects one value per position. If the
 * series repeats a label, every point gets its year appended.
 */
function seriesLabels(rows: { month: string; label: string }[]): string[] {
  const labels = rows.map((r) => r.label);
  if (new Set(labels).size === labels.length) return labels;
  return rows.map((r) => `${r.label} ${r.month.slice(2, 4)}`);
}

function when(gift: Gift): string {
  return new Date(gift.given_on ?? gift.created_at).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
  });
}

export default async function GivingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const me = await requireMe("/app/giving");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const PAGE = 25;

  const [dash, ledger, people] = await Promise.all([
    api<Dashboard>("/dashboard"),
    api<Paged<Gift>>(
      `/donations/?limit=${PAGE}&sort=given_on&order=desc&skip=${(page - 1) * PAGE}`,
    ),
    // For the entry form. A gift is always filed against a giver, even
    // an anonymous one — see `recordGift`.
    api<Paged<Person>>("/users/?limit=2000&sort=full_name&order=asc"),
  ]);

  /*
   * Giving is withheld by the API rather than hidden by the browser: a
   * caller who cannot read donations gets a null total and no types. A
   * page that would show nothing but a heading is a page that should not
   * have been reachable, so this 404s rather than teasing.
   */
  if (!dash.ok) notFound();
  const data = dash.data;
  if (data.giving_total == null) notFound();

  const currency = data.church.currency || "GHS";
  const gifts = ledger.ok ? ledger.data.items : [];
  const total = ledger.ok ? ledger.data.total : gifts.length;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const from = (page - 1) * PAGE + 1;
  const to = Math.min(page * PAGE, total);

  const months = data.giving_months;
  const monthLabels = seriesLabels(months);
  const thisMonth = months.at(-1);
  const lastMonth = months.at(-2);
  /*
   * The current month is partial, and comparing five days of August to
   * the whole of July produced a red "−69%" that was simply untrue.
   *
   * The API gives monthly totals, not daily ones, so a true like-for-like
   * to the same day last month is not available. Rather than guess with a
   * pro-rata, this states the honest relationship: how far into last
   * month's total this month has already reached. A share is a fact; the
   * invented change was not.
   */
  const now = new Date();
  const isPartial =
    thisMonth?.month === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const againstLast =
    thisMonth && lastMonth?.total
      ? Math.round((thisMonth.total / lastMonth.total) * 100)
      : null;
  const delta =
    !isPartial && thisMonth && lastMonth?.total
      ? Math.round(((thisMonth.total - lastMonth.total) / lastMonth.total) * 100)
      : null;

  const window = months.reduce((sum, m) => sum + m.total, 0);
  const gifts_in_window = data.giving_types.reduce((sum, t) => sum + t.gifts, 0);
  const average = gifts_in_window ? window / gifts_in_window : 0;
  const best = months.reduce<typeof thisMonth>(
    (top, m) => (!top || m.total > top.total ? m : top),
    undefined,
  );

  return (
    <Page>
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="eyebrow text-ink-3">Activity</p>
          <h1 className="head mt-2 text-[26px] tracking-[-0.025em] sm:text-[30px]">
            <span className="grad-text">Giving</span>
            <span className="ml-3 align-middle text-[11px] font-medium uppercase tracking-[0.14em] text-ink-3">
              {data.church.name}
            </span>
          </h1>
          <p className="mt-1.5 text-[12.5px] text-ink-3">
            Completed gifts, all time {money(data.giving_total, currency)} ·{" "}
            {total.toLocaleString()} recorded
          </p>
        </div>

        {/*
          The ledger could be read and never written to, which made this
          page a report on a table nothing in the product could fill.
          Online giving writes its own rows; this is the plate, the
          transfer and the envelope.

          `today` is resolved here rather than in the form: `new Date()`
          in a client render disagrees between the server pass and the
          hydration pass, and React throws away the subtree to fix it.
        */}
        {canWrite(me, "donation") && (
        <GiftEditor
          action={recordGift}
          currency={currency}
          today={new Date().toISOString().slice(0, 10)}
          people={
            people.ok
              ? people.data.items.map((p) => ({
                  value: p.id,
                  label: `${p.full_name} · ${p.email}`,
                }))
              : []
          }
        />
        )}
      </header>

      {/* ---------------- the shape of it ---------------- */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat
          label={isPartial ? "This month so far" : "This month"}
          value={thisMonth ? money(thisMonth.total, currency, true) : "—"}
          colour="var(--emerald)"
          delta={delta}
          deltaLabel="%"
          footnote={
            isPartial && againstLast != null
              ? `${againstLast}% of ${lastMonth?.label}'s total`
              : "on last month"
          }
        />
        <Stat
          label={`Last ${months.length} months`}
          value={money(window, currency, true)}
          colour="var(--teal)"
          footnote={`${gifts_in_window} gifts`}
        />
        <Stat
          label="Average gift"
          value={money(average, currency)}
          colour="var(--cobalt)"
          footnote="across the window"
        />
        <Stat
          label="Best month"
          value={best ? money(best.total, currency, true) : "—"}
          colour="var(--violet)"
          footnote={best?.label}
        />
      </section>

      {/* ---------------- the flow, then what it was for ---------------- */}
      <section className="grid gap-2 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title="Month by month"
          lede="Completed gifts, by the month they were given"
          accent="var(--emerald)"
          aside={
            isPartial ? (
              <span className="tnum text-[11.5px] text-ink-3">
                {thisMonth?.label} is still running
              </span>
            ) : (
              delta != null && (
                <span
                  className="tnum text-[11.5px] font-semibold"
                  style={{ color: delta >= 0 ? "var(--emerald)" : "var(--ruby)" }}
                >
                  {delta > 0 ? "+" : ""}
                  {delta}% this month
                </span>
              )
            )
          }
        >
          {months.length > 0 ? (
            <TrendChart
              data={months.map((m, i) => ({ label: monthLabels[i], value: m.total }))}
              color="var(--emerald)"
              height={186}
              ariaLabel="Total giving per month"
            />
          ) : (
            <Empty>No gifts in the window.</Empty>
          )}
        </Panel>

        <Panel title="What it was for" lede="Share of the window" accent="var(--teal)">
          <RingPanel
            height={186}
            value={money(window, currency, true)}
            label="in window"
            chart={
              <DonutChart
                data={data.giving_types.map((t) => ({ label: t.label, value: t.total }))}
                colors={TONES}
                height={186}
                thickness={0.28}
                ariaLabel="Giving split by type"
              />
            }
            items={data.giving_types.slice(0, 6).map((t, i) => ({
              label: t.label,
              colour: TONES[i % TONES.length],
              value: money(t.total, currency, true),
            }))}
          />
        </Panel>
      </section>

      {/* ---------------- and only then, the ledger ---------------- */}
      <Panel
        title="Recent gifts"
        lede="Most recent first"
        accent="var(--emerald)"
      >
        {gifts.length === 0 ? (
          <Empty>No gifts recorded yet.</Empty>
        ) : (
          <>
            <div className="-mx-1 overflow-x-auto px-1">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-line">
                    {["Given", "Amount", "Type", "Method", "Receipt", "Status"].map((label, i) => (
                      <th
                        key={label}
                        className={`whitespace-nowrap px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3 ${
                          i === 1 ? "text-right" : "text-left"
                        }`}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {gifts.map((gift) => (
                    <tr key={gift.id} className="border-b border-line last:border-0 hover:bg-mist">
                      <td className="tnum whitespace-nowrap px-2 py-2 text-[12px] text-ink-3">
                        {when(gift)}
                      </td>
                      <td className="tnum whitespace-nowrap px-2 py-2 text-right text-[12.5px] font-medium">
                        {money(Number(gift.amount), gift.currency || currency)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-[12px] capitalize text-ink-2">
                        {gift.donation_type?.replace(/_/g, " ")}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-[12px] capitalize text-ink-3">
                        {gift.payment_method?.replace(/_/g, " ") ?? "—"}
                      </td>
                      <td className="mono whitespace-nowrap px-2 py-2 text-[11px] text-ink-3">
                        {gift.receipt_number ?? "—"}
                        {gift.is_anonymous && (
                          <span className="ml-2 text-[10.5px] italic">anonymous</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2">
                        <span
                          className="chip capitalize"
                          style={{
                            background: `color-mix(in oklab, ${
                              STATUS_TONE[gift.status] ?? "var(--ink-3)"
                            } 12%, transparent)`,
                            color: STATUS_TONE[gift.status] ?? "var(--ink-3)",
                          }}
                        >
                          {gift.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3.5">
                <p className="tnum text-[12px] text-ink-3">
                  {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  {page > 1 && (
                    <Link href="/app/giving?page=1" className="btn btn-quiet btn-sm">
                      First
                    </Link>
                  )}
                  {page > 1 && (
                    <Link href={`/app/giving?page=${page - 1}`} className="btn btn-quiet btn-sm">
                      Previous
                    </Link>
                  )}
                  <span className="tnum px-1 text-[12px] text-ink-3">
                    Page {page} of {pages}
                  </span>
                  {page < pages && (
                    <Link href={`/app/giving?page=${page + 1}`} className="btn btn-quiet btn-sm">
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Panel>
    </Page>
  );
}
