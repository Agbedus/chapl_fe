import Link from "next/link";
import { Tabs } from "@/components/tabs";
import { notFound } from "next/navigation";
import { Check, Clock, ShieldCheck, X } from "lucide-react";

import { accountAction, grantPlatformRole, retryMail, revokeRole } from "@/app/actions/manage";
import { decideChurch } from "@/app/actions/church";
import { ActionButton } from "@/components/editors";
import { PlatformGrantForm } from "@/components/platform-team";
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
export default async function PlatformPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const q = params.q ?? "";
  const skip = Math.max(0, Number(params.skip) || 0);
  const me = await requireMe("/app/platform");
  // Not a 403 page: a church leader has no business knowing this route
  // exists, and a 404 says less than a refusal does.
  if (!me.is_platform_staff) notFound();

  const [queue, all, people] = await Promise.all([
    api<Paged<Church>>("/churches/pending?limit=100"),
    api<Paged<Church>>("/churches/?limit=200"),
    api<Paged<Person>>("/users/?limit=2000&sort=full_name&order=asc", { churchId: "all" }),
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
  const [summary, accounts, delivery] = await Promise.all([
    api<Record<string, number>>("/system/church-summary"),
    api<Paged<Person>>(`/users/?limit=45&skip=${skip}&q=${encodeURIComponent(q)}&sort=full_name&order=asc`, { churchId: "all" }),
    api<{ configured: boolean; missing: string[]; host: string | null; port: number; tls: string; hint: string | null; counts: Record<string, number>; failures: { id: string; subject: string; status: string; error: string | null }[] }>("/system/mail"),
  ]);
  const isSuper = me.assignments.some((a) => a.role === "super_admin");
  // Who holds platform authority. Names come from one lookup per person:
  // staff belong to no church, so they are missing from any church roll.
  const staffGrants = isSuper
    ? await api<Paged<{ id: string; user_id: string; role: string; is_active: boolean }>>("/assignments/?limit=200", { churchId: "all" })
    : null;
  const platformGrants = staffGrants?.ok
    ? staffGrants.data.items.filter((g) => (g.role === "super_admin" || g.role === "platform_admin") && g.is_active)
    : [];
  const staffPeople = new Map(
    await Promise.all(
      [...new Set(platformGrants.map((g) => g.user_id))].map(async (id) => {
        const who = await api<Person>(`/users/${id}`, { churchId: "all" });
        return [id, who.ok ? who.data : null] as const;
      }),
    ),
  );
  const byStatus = (s: string) => summary.ok ? summary.data[s] ?? 0 : everything.filter((c) => c.status === s).length;

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

  // Email only earns a tab when there is a failure to retry or mail is
  // not set up at all.
  const showMail = delivery.ok && (delivery.data.failures.length > 0 || !delivery.data.configured);

  return (
    <Page>
      <PageHead
        eyebrow="Platform"
        title="Verification"
      />

      {everything.some(c => !c.owner_id) && <Panel title="Churches needing an owner" accent="var(--gold)"><ul className="space-y-2">{everything.filter(c => !c.owner_id).map(c => <li key={c.id}><Link href={`/app/church?id=${c.id}`} className="text-[13px] hover:underline">{c.name} · Assign an owner</Link></li>)}</ul></Panel>}

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
        <StatCard label="All tenants" value={String(all.ok ? all.data.total : 0)}
                  colour="var(--cobalt)" footnote="on the platform" />
      </section>

      <Tabs
        tabs={[
          { id: "queue", label: "Waiting", count: waiting.length },
          { id: "churches", label: "Every church", count: everything.length },
          ...(isSuper ? [{ id: "accounts", label: "Accounts" }, { id: "team", label: "Platform team" }] : []),
          ...(showMail ? [{ id: "delivery", label: "Email", count: delivery.ok ? delivery.data.failures.length : 0 }] : []),
        ]}
      >
      <Panel
        title="Awaiting verification"
        accent="var(--gold)"
      >
        <DataTable
          columns={columns}
          rows={rows}
          empty="Nothing waiting."
        />
      </Panel>

      <Panel title="Every church" accent="var(--cobalt)">
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
      {isSuper && <Panel title="Accounts">
        <form className="mb-3 flex gap-2"><input name="q" defaultValue={q} placeholder="Name or email" aria-label="Search accounts" className="h-8 rounded-xl border border-line bg-paper px-3 text-[12px]" /><button className="btn btn-quiet btn-sm">Search</button></form>
        {accounts.ok ? <>
          <DataTable columns={[{ key: "name", label: "Person" }, { key: "email", label: "Email" }, { key: "status", label: "Status" }, { key: "actions", label: "Actions" }]}
            rows={accounts.data.items.map((person) => ({ id: person.id, cells: [<Link key="name" href={`/app/people/${person.id}`}>{person.full_name}</Link>, person.email,
              `${person.is_active ? "Active" : "Inactive"} · ${person.is_verified ? "Verified" : "Unverified"}`,
              <span key="actions" className="flex flex-wrap gap-1">
                {!person.is_verified && <><ActionButton action={accountAction} fields={{ id: person.id, operation: "resend" }} label="Resend code" /><ActionButton action={accountAction} fields={{ id: person.id, operation: "verify" }} label="Verify" confirm={`Manually verify ${person.email}? Confirm you have verified their identity.`} /></>}
                {person.id !== me.id && <><ActionButton action={accountAction} fields={{ id: person.id, operation: person.is_active ? "deactivate" : "reactivate" }} label={person.is_active ? "Deactivate" : "Reactivate"} confirm="Change this account's access across all churches?" />
</>}
              </span>]}))} empty="No matching accounts" />
          <div className="mt-3 flex gap-3 text-[12px]">
            {skip > 0 && <Link href={`/app/platform?q=${encodeURIComponent(q)}&skip=${Math.max(0, skip - 45)}`}>Previous</Link>}
            <span>{accounts.data.total} accounts</span>
            {skip + 45 < accounts.data.total && <Link href={`/app/platform?q=${encodeURIComponent(q)}&skip=${skip + 45}`}>Next</Link>}
          </div>
        </> : <Notice kind="error">{accounts.error.detail}</Notice>}
      </Panel>}

      {isSuper && (
        <Panel title="Platform team" accent="var(--violet)">
          <DataTable
            columns={[
              { key: "person", label: "Person" },
              { key: "role", label: "Role" },
              { key: "act", label: "", align: "right", width: "1%" },
            ]}
            rows={platformGrants.map((grant) => {
              const who = staffPeople.get(grant.user_id);
              return {
                id: grant.id,
                cells: [
                  <span key="p">
                    <span className="font-medium text-ink">{who?.full_name ?? "Unknown"}</span>
                    {who && <span className="block text-[11.5px] text-ink-3">{who.email}</span>}
                  </span>,
                  grant.role === "super_admin" ? "Super admin" : "Platform admin",
                  grant.user_id === me.id ? (
                    <span key="a" className="text-[11.5px] text-ink-3">You</span>
                  ) : (
                    <ActionButton
                      key="a"
                      action={revokeRole}
                      fields={{ id: grant.id }}
                      label="Revoke"
                      tone="danger"
                      confirm={`Remove ${who?.full_name ?? "this person"}'s platform access?`}
                    />
                  ),
                ],
              };
            })}
            empty="No platform grants found."
          />
          <div className="mt-4 border-t border-line pt-3">
            <PlatformGrantForm action={grantPlatformRole} />
          </div>
        </Panel>
      )}

      {/* Only when there is something to act on: a failed email to retry,
          or mail not configured at all. A healthy transport needs no panel. */}
      {showMail && delivery.ok && <Panel title="Email delivery" lede={delivery.data.configured ? undefined : `Missing mail settings: ${delivery.data.missing.join(", ")}`}>
        <DataTable columns={[{ key: "subject", label: "Email" }, { key: "status", label: "Status" }, { key: "action", label: "" }]}
          rows={delivery.data.failures.map((job) => ({ id: job.id, cells: [job.subject, `${job.status} · ${job.error ?? "expired"}`, job.status !== "expired" ? <ActionButton key="retry" action={retryMail} fields={{ id: job.id }} label="Retry" /> : <span key="expired">Request a new email</span>] }))} empty="No delivery failures" />
      </Panel>}
      </Tabs>
    </Page>
  );
}
