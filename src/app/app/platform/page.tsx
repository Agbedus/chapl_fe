import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Clock, ShieldCheck, X } from "lucide-react";

import { decideChurch } from "@/app/actions/church";
import { ActionButton } from "@/components/editors";
import { DataTable, type TableColumn, type TableRow } from "@/components/data-table";
import { Page, PageHead, Panel, StatCard } from "@/components/panels";
import { Notice } from "@/components/ui/form";
import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import {
  CHURCH_STATUS_LABEL, CHURCH_STATUS_TONE, type Church, type Paged, type Person,
} from "@/lib/types";

export const metadata = { title: "Verification — Chapl" };

/**
 * The platform's queue.
 *
 * Anybody may register a church now; what the platform keeps is the
 * verification. This is where that happens — and it is deliberately
 * the only page in the product gated on platform staff rather than on
 * a resource permission, because "may I check other people's churches"
 * is not a thing a church role should ever imply.
 *
 * Oldest first. A review queue sorted newest-first is one where the
 * person who has waited longest is hardest to find.
 */
export default async function PlatformPage() {
  const me = await requireMe("/app/platform");
  // Not a 403 page: a church leader has no business knowing this route
  // exists, and a 404 says less than a refusal does.
  if (!me.is_platform_staff) notFound();

  const [queue, all, people] = await Promise.all([
    api<Paged<Church>>("/churches/pending?limit=100"),
    api<Paged<Church>>("/churches/?limit=200"),
    api<Paged<Person>>("/users/?limit=2000&sort=full_name&order=asc"),
  ]);

  if (!queue.ok) {
    return (
      <Page>
        <PageHead eyebrow="Platform" title="Verification" />
        <Notice kind="error">{queue.error.detail}</Notice>
      </Page>
    );
  }

  const waiting = queue.data.items;
  const everything = all.ok ? all.data.items : [];
  const named = new Map(people.ok ? people.data.items.map((p) => [p.id, p.full_name]) : []);
  const byStatus = (s: string) => everything.filter((c) => c.status === s).length;

  const columns: TableColumn[] = [
    { key: "church", label: "Church" },
    { key: "code", label: "Code" },
    { key: "owner", label: "Registered by" },
    { key: "when", label: "Waiting since", align: "right" },
    { key: "act", label: "", align: "right", width: "1%" },
  ];

  const rows: TableRow[] = waiting.map((church) => ({
    id: church.id,
    cells: [
      <span key="n" className="font-medium text-ink">{church.name}</span>,
      <span key="c" className="chip text-ink-3">{church.code}</span>,
      church.owner_id ? (
        <Link
          key="o"
          href={`/app/people/${church.owner_id}`}
          className="text-[12px] text-ink-2 hover:underline"
        >
          {named.get(church.owner_id) ?? "Unknown"}
        </Link>
      ) : (
        <span key="o" className="text-ink-3">—</span>
      ),
      <span key="w" className="text-[11.5px] tabular-nums text-ink-3">
        {new Date(church.created_at).toLocaleDateString("en-GB", {
          day: "2-digit", month: "short", year: "numeric",
        })}
      </span>,
      <span key="a" className="flex items-center justify-end gap-1.5">
        <ActionButton
          action={decideChurch}
          fields={{ id: church.id, status: "active" }}
          label="Verify"
          icon={<Check className="h-3 w-3" aria-hidden />}
          confirm={`Verify ${church.name}? The owner is told straight away.`}
        />
        {/*
          Declining needs a reason, so it cannot be a one-press button —
          `decideChurch` refuses a rejection with no note. The row links
          to the church instead, where the form that carries one lives.
        */}
        <Link
          href={`/app/church?id=${church.id}`}
          className="btn btn-quiet btn-sm"
          style={{ color: "var(--ruby)" }}
        >
          <X className="h-3 w-3" aria-hidden />
          Review
        </Link>
      </span>,
    ],
  }));

  return (
    <Page>
      <PageHead
        eyebrow="Platform"
        title="Verification"
        lede="Churches anybody registered, waiting to be checked. Oldest first."
      />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Waiting"
          value={String(queue.data.total)}
          colour="var(--gold)"
          footnote={waiting.length ? "oldest at the top" : "nothing to review"}
        />
        <StatCard label="Verified" value={String(byStatus("active"))}
                  colour="var(--emerald)" footnote="checked and live" />
        <StatCard label="Declined" value={String(byStatus("rejected"))}
                  colour="var(--ruby)" footnote="kept, not deleted" />
        <StatCard label="All tenants" value={String(everything.length)}
                  colour="var(--cobalt)" footnote="on the platform" />
      </section>

      <Panel
        title="Awaiting verification"
        lede="Verifying tells the owner immediately, by notification and email"
        accent="var(--gold)"
      >
        <DataTable
          columns={columns}
          rows={rows}
          empty="Nothing waiting. Every church on the platform has been looked at."
        />
      </Panel>

      <Panel title="Every church" lede="Across the whole platform" accent="var(--cobalt)">
        <DataTable
          columns={[
            { key: "name", label: "Church" },
            { key: "status", label: "Status" },
            { key: "owner", label: "Owner" },
            { key: "code", label: "Code", align: "right" },
          ]}
          rows={everything.map((church) => ({
            id: church.id,
            cells: [
              <Link key="n" href={`/app/church?id=${church.id}`}
                    className="font-medium text-ink hover:underline">
                {church.name}
              </Link>,
              <span key="s" className="chip"
                    style={{ color: CHURCH_STATUS_TONE[church.status] }}>
                {church.status === "pending" ? (
                  <Clock className="h-3 w-3" aria-hidden />
                ) : (
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                )}
                {CHURCH_STATUS_LABEL[church.status]}
              </span>,
              church.owner_id ? (
                <span key="o" className="text-[12px] text-ink-2">
                  {named.get(church.owner_id) ?? "Unknown"}
                </span>
              ) : (
                <span key="o" className="text-[11.5px] text-ink-3">nobody</span>
              ),
              <span key="c" className="text-[11.5px] text-ink-3">{church.code}</span>,
            ],
          }))}
          empty="No churches yet."
        />
      </Panel>
    </Page>
  );
}
