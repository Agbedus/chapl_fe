import Link from "next/link";
import { ShieldCheck, X } from "lucide-react";

import { grantRole, revokeRole } from "@/app/actions/manage";
import { ActionButton, GrantEditor } from "@/components/editors";
import { DataTable, type TableColumn, type TableRow } from "@/components/data-table";
import { Page, PageHead, Panel, StatCard } from "@/components/panels";
import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import type { Assignment, Branch, Cell, Paged, Person, Role } from "@/lib/types";
import { ROLE_BLURB, ROLE_LABEL, ROLE_SCOPE } from "@/lib/types";

export const metadata = { title: "Team — Chapl" };

/**
 * Roles a church can grant. Platform roles are absent because they are
 * not a church's to give — the API refuses them, and a control that
 * always 403s is worse than no control.
 */
const GRANTABLE: Role[] = [
  "church_admin",
  "senior_pastor",
  "branch_pastor",
  "branch_admin",
  "cell_leader",
  "cell_assistant",
  "department_head",
];

export default async function TeamPage() {
  await requireMe("/app/team");

  const [grants, people, branches, cells] = await Promise.all([
    api<Paged<Assignment>>("/assignments/?limit=200"),
    api<Paged<Person>>("/users/?limit=300&sort=full_name&order=asc"),
    api<Paged<Branch>>("/branches/?limit=200&sort=name&order=asc"),
    api<Paged<Cell>>("/cells/?limit=300&sort=code&order=asc"),
  ]);

  if (!grants.ok) {
    return (
      <Page>
        <h1 className="head text-[24px]">Roles are not available</h1>
        <p className="text-[15px] text-ink-2">{grants.error.detail}</p>
        <p className="text-[13.5px] text-ink-3">
          Reading who holds what takes church-admin authority.
        </p>
      </Page>
    );
  }

  const names = new Map(people.ok ? people.data.items.map((p) => [p.id, p.full_name]) : []);
  const scopeNames = new Map<string, string>([
    ...(branches.ok ? branches.data.items.map((b) => [b.id, b.name] as [string, string]) : []),
    ...(cells.ok ? cells.data.items.map((c) => [c.id, c.name] as [string, string]) : []),
  ]);

  const active = grants.data.items.filter((g) => g.is_active);
  // Grouped by role, strongest first, because "who runs this church" is
  // the question this page exists to answer.
  const order = new Map(GRANTABLE.map((r, i) => [r, i]));
  const byRole = new Map<Role, Assignment[]>();
  for (const grant of active) {
    const group = byRole.get(grant.role) ?? [];
    group.push(grant);
    byRole.set(grant.role, group);
  }

  const peopleOptions = people.ok
    ? people.data.items.map((p) => ({ value: p.id, label: `${p.full_name} · ${p.email}` }))
    : [];
  const scopeOptions = [
    ...(branches.ok
      ? branches.data.items.map((b) => ({ value: b.id, label: `Branch · ${b.name}` }))
      : []),
    ...(cells.ok
      ? cells.data.items.map((c) => ({ value: c.id, label: `Cell · ${c.name} (${c.code})` }))
      : []),
  ];

  const teamColumns: TableColumn[] = [
    { key: "person", label: "Person" },
    { key: "role", label: "Role" },
    { key: "scope", label: "Over" },
    { key: "what", label: "What they may do" },
    { key: "granted", label: "Since", align: "right" },
    { key: "revoke", label: "", align: "right", width: "1%" },
  ];

  // Flattened and sorted by authority: "who runs this church" is the
  // question this page exists to answer, and a panel per role made you
  // read six lists to answer it.
  const teamRows: TableRow[] = [...active]
    .sort((a, b) => (order.get(a.role) ?? 99) - (order.get(b.role) ?? 99))
    .map((grant) => ({
      id: grant.id,
      cells: [
        <Link
          key="p"
          href={`/app/people/${grant.user_id}`}
          className="font-medium text-ink hover:underline"
        >
          {names.get(grant.user_id) ?? "Unknown person"}
        </Link>,
        <span
          key="r"
          className="chip"
          style={{
            background: "color-mix(in oklab, var(--cobalt) 12%, transparent)",
            color: "var(--cobalt)",
          }}
        >
          <ShieldCheck className="h-3 w-3" aria-hidden />
          {ROLE_LABEL[grant.role]}
        </span>,
        grant.scope_id ? (
          (scopeNames.get(grant.scope_id) ?? (
            <span className="capitalize">{grant.scope_type}</span>
          ))
        ) : (
          <span className="capitalize">{grant.scope_type}</span>
        ),
        <span key="w" className="text-[11.5px] text-ink-3">
          {ROLE_BLURB[grant.role]}
        </span>,
        grant.granted_at ? (
          new Date(grant.granted_at).toLocaleDateString(undefined, {
            month: "short",
            year: "numeric",
          })
        ) : (
          <span className="text-ink-3">—</span>
        ),
        <ActionButton
          key="x"
          action={revokeRole}
          fields={{ id: grant.id }}
          label=""
          icon={<X className="h-3 w-3" aria-hidden />}
          tone="danger"
          confirm={`Revoke ${ROLE_LABEL[grant.role]} from ${
            names.get(grant.user_id) ?? "this person"
          }?`}
        />,
      ],
    }));

  return (
    <Page>
      <PageHead
        eyebrow="People"
        title="Team & roles"
        lede="Who may do what, and on which rung."
        action={
          <GrantEditor
          action={grantRole}
          people={peopleOptions}
          roles={GRANTABLE.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          scopes={scopeOptions}
          legend={GRANTABLE.map((r) => ({
            label: ROLE_LABEL[r],
            blurb: ROLE_BLURB[r],
            scope: ROLE_SCOPE[r],
            }))}
          />
        }
      />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Holding office"
          value={String(active.length)}
          colour="var(--cobalt)"
          footnote={`${byRole.size} distinct role${byRole.size === 1 ? "" : "s"}`}
        />
        <StatCard
          label="Church wide"
          value={String(
            active.filter((g) => g.scope_type === "church").length,
          )}
          colour="var(--violet)"
          footnote="authority over everything"
        />
        <StatCard
          label="Branch level"
          value={String(active.filter((g) => g.scope_type === "branch").length)}
          colour="var(--teal)"
          footnote="pastors and administrators"
        />
        <StatCard
          label="Cell level"
          value={String(active.filter((g) => g.scope_type === "cell").length)}
          colour="var(--gold)"
          footnote="leaders and assistants"
        />
      </section>

      <Panel
        title="Who holds what"
        lede="Strongest role first · a person may hold more than one"
        accent="var(--cobalt)"
      >
        <DataTable
          columns={teamColumns}
          rows={teamRows}
          empty="Nobody holds a role yet. Everyone is a member until you grant one."
        />
      </Panel>

    </Page>
  );
}
