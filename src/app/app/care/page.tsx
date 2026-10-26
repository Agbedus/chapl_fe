import Link from "next/link";
import { Check, CheckCheck, Lock } from "lucide-react";

import { raiseCareRequest, respondToCare } from "@/app/actions/manage";
import { ActionButton, CareRequestEditor } from "@/components/editors";
import { Empty, Page, PageHead, Panel, StatCard } from "@/components/panels";
import { Notice } from "@/components/ui/form";
import { canRead, canWrite } from "@/lib/access";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";
import { requireMe } from "@/lib/session";

type Request = Schemas["CareRequestRead"];

export const metadata = { title: "Care — Chapl" };

const URGENCY: Record<string, { label: string; tone: string }> = {
  urgent: { label: "Urgent", tone: "var(--ruby)" },
  soon: { label: "This week", tone: "var(--gold)" },
  whenever: { label: "Whenever", tone: "var(--ink-3)" },
};

/** `3 Nov, 6:30 pm` — written out, never left to a locale. */
function when(iso: string): string {
  const d = new Date(iso);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const h = d.getHours() % 12 || 12;
  return `${d.getDate()} ${months[d.getMonth()]}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "am" : "pm"}`;
}

/**
 * Prayer and call requests.
 *
 * Every care notification used to link to the dashboard because this
 * page did not exist. It is two pages in one: a leader's queue — what
 * is open in their scope, oldest-urgent first, with the controls to pick
 * it up and close it — and, for everybody, the requests they raised
 * themselves and where each one has got to.
 */
export default async function CarePage() {
  const me = await requireMe("/app/care");
  const leader = canRead(me, "checkup");
  const responder = canWrite(me, "checkup");

  const [queue, mine] = await Promise.all([
    leader ? api<Schemas["CareRequestList"]>("/care/requests?limit=200") : Promise.resolve(null),
    api<Schemas["CareRequestList"]>("/care/requests?mine=true&limit=50"),
  ]);

  const all = queue?.ok ? queue.data.items : [];
  const rank = { urgent: 0, soon: 1, whenever: 2 } as Record<string, number>;
  const open = all
    .filter((r) => r.status !== "closed")
    .sort((a, b) => (rank[a.urgency] ?? 3) - (rank[b.urgency] ?? 3) || a.created_at.localeCompare(b.created_at));
  const closed = all.filter((r) => r.status === "closed").slice(0, 20);
  const waiting = open.filter((r) => r.status === "open").length;

  return (
    <Page>
      <PageHead
        eyebrow="Care"
        title={leader ? "Care requests" : "Prayer and calls"}
        lede={
          leader
            ? "What people have asked for, and who has picked it up."
            : "Ask for prayer or for someone to call you. Your leaders see it straight away."
        }
        action={<CareRequestEditor action={raiseCareRequest} />}
      />

      {leader && (
        <>
          {queue && !queue.ok && <Notice kind="error">{queue.error.detail}</Notice>}
          <section className="grid gap-2 sm:grid-cols-3">
            <StatCard label="Waiting" value={String(waiting)} colour="var(--ruby)" footnote="nobody has picked these up" />
            <StatCard label="In hand" value={String(open.length - waiting)} colour="var(--gold)" footnote="picked up, not yet closed" />
            <StatCard label="Closed" value={String(all.length - open.length)} colour="var(--emerald)" footnote="of the latest 200" />
          </section>

          <Panel title="Open" accent="var(--ruby)">
            {open.length === 0 ? (
              <Empty>Nothing waiting. Everyone who asked has been looked after.</Empty>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {open.map((r) => (
                  <RequestRow key={r.id} request={r} responder={responder} />
                ))}
              </ul>
            )}
          </Panel>

          {closed.length > 0 && (
            <Panel title="Recently closed" accent="var(--emerald)" quiet>
              <ul className="divide-y divide-[var(--line)]">
                {closed.map((r) => (
                  <RequestRow key={r.id} request={r} responder={false} />
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}

      <Panel title="What you have asked for" accent="var(--cobalt)" quiet={leader}>
        {!mine.ok ? (
          <Empty>{mine.error.detail}</Empty>
        ) : mine.data.items.length === 0 ? (
          <Empty>Nothing yet. Use “Ask for prayer or a call” whenever you need it.</Empty>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {mine.data.items.map((r) => (
              <li key={r.id} className="flex items-baseline justify-between gap-3 py-2.5 text-[12.5px]">
                <span className="min-w-0">
                  <span className="font-medium text-ink">{r.subject}</span>
                  <span className="ml-2 text-[11px] text-ink-3">{r.kind === "call" ? "Call" : "Prayer"} · {when(r.created_at)}</span>
                </span>
                <span className="shrink-0 text-[11.5px] text-ink-2">
                  {r.status === "closed"
                    ? "Closed"
                    : r.status === "acknowledged"
                      ? `Picked up${r.acknowledged_by_name ? ` by ${r.acknowledged_by_name}` : ""}`
                      : "Waiting"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </Page>
  );
}

function RequestRow({ request: r, responder }: { request: Request; responder: boolean }) {
  const urgency = URGENCY[r.urgency] ?? URGENCY.whenever;
  return (
    <li className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
          <span className="font-medium text-ink">{r.subject}</span>
          {r.is_private && (
            <span className="inline-flex items-center gap-1 text-[11px] text-ink-3">
              <Lock className="h-3 w-3" aria-hidden /> Pastors only
            </span>
          )}
        </p>
        {r.body && <p className="mt-0.5 text-[12px] leading-[1.6] text-ink-2">{r.body}</p>}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-3">
          <span style={{ color: urgency.tone }}>{urgency.label}</span>
          <span>{r.kind === "call" ? "Wants a call" : "Prayer"}</span>
          <span>
            from{" "}
            {r.member_id ? (
              <Link href={`/app/people/${r.member_id}`} className="hover:underline">
                {r.member_name ?? "a member"}
              </Link>
            ) : (
              r.member_name ?? "a member"
            )}
          </span>
          <span>{when(r.created_at)}</span>
          {r.status === "acknowledged" && <span>· picked up by {r.acknowledged_by_name ?? "a leader"}</span>}
        </p>
      </div>
      {responder && r.status !== "closed" && (
        <span className="flex shrink-0 items-center gap-1">
          {r.status === "open" && (
            <ActionButton
              action={respondToCare}
              fields={{ id: r.id, step: "acknowledge" }}
              label="Pick up"
              icon={<Check className="h-3 w-3" aria-hidden />}
            />
          )}
          <ActionButton
            action={respondToCare}
            fields={{ id: r.id, step: "close" }}
            label="Close"
            icon={<CheckCheck className="h-3 w-3" aria-hidden />}
          />
        </span>
      )}
    </li>
  );
}
