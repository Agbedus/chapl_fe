import { Mail, RotateCw, X } from "lucide-react";

import { revokeInvitation, resendInvitation, sendInvitation } from "@/app/actions/manage";
import { ActionButton, InviteEditor } from "@/components/editors";
import { DataTable, type TableColumn, type TableRow } from "@/components/data-table";
import { Page, PageHead, Panel, StatCard } from "@/components/panels";
import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import type { Branch, Cell, Invitation, Paged, Role } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/types";

export const metadata = { title: "Invitations — Chapl" };

/**
 * Roles a church administrator can hand out from here.
 *
 * Platform roles are missing on purpose — they are not a church's to
 * give, and the API would refuse them anyway. Offering a control that
 * always 403s is worse than not offering it.
 */
const INVITE_ROLES: Role[] = [
  "senior_pastor",
  "branch_pastor",
  "branch_admin",
  "cell_leader",
  "cell_assistant",
  "department_head",
];

function daysLeft(expires: string): number {
  return Math.ceil((new Date(expires).getTime() - Date.now()) / 86_400_000);
}

export default async function InvitationsPage() {
  await requireMe("/app/invitations");

  const [invites, branches, cells] = await Promise.all([
    api<Paged<Invitation>>("/invitations/?limit=100"),
    api<Paged<Branch>>("/branches/?limit=200"),
    api<Paged<Cell>>("/cells/?limit=300"),
  ]);

  if (!invites.ok) {
    return (
      <Page>
        <h1 className="head text-[24px]">Invitations are not available</h1>
        <p className="text-[15px] text-ink-2">{invites.error.detail}</p>
      </Page>
    );
  }

  const branchOptions = branches.ok
    ? branches.data.items
        .filter((b) => b.is_active)
        .map((b) => ({ value: b.id, label: `${b.name} · ${b.code}` }))
    : [];
  const cellOptions = cells.ok
    ? cells.data.items.map((c) => ({ value: c.id, label: `${c.name} · ${c.code}` }))
    : [];

  const items = invites.data.items;
  const pending = items.filter((i) => i.status === "pending");
  const settled = items.filter((i) => i.status !== "pending");

  const dash_ = <span className="text-ink-3">—</span>;
  const branchName = new Map(
    branches.ok ? branches.data.items.map((b) => [b.id, b.name]) : [],
  );
  const cellName = new Map(cells.ok ? cells.data.items.map((c) => [c.id, c.name]) : []);

  const pendingColumns: TableColumn[] = [
    { key: "email", label: "Invited" },
    { key: "branch", label: "Branch" },
    { key: "cell", label: "Cell" },
    { key: "role", label: "Role" },
    { key: "expires", label: "Expires", align: "right" },
    { key: "actions", label: "", align: "right", width: "1%" },
  ];

  const pendingRows: TableRow[] = pending.map((invite) => {
    const left = daysLeft(invite.expires_at);
    return {
      id: invite.id,
      cells: [
        <span key="e" className="flex items-center gap-2">
          <Mail className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
          <span className="font-medium text-ink">{invite.email}</span>
        </span>,
        branchName.get(invite.branch_id ?? "") ?? dash_,
        invite.cell_id ? (cellName.get(invite.cell_id) ?? dash_) : dash_,
        invite.role ? (
          <span
            key="r"
            className="chip"
            style={{
              background: "color-mix(in oklab, var(--cobalt) 12%, transparent)",
              color: "var(--cobalt)",
            }}
          >
            {ROLE_LABEL[invite.role]}
          </span>
        ) : (
          <span className="text-ink-3">member</span>
        ),
        <span
          key="x"
          className="tnum font-semibold"
          style={{ color: left <= 3 ? "var(--ruby)" : "var(--ink-3)" }}
        >
          {left <= 0 ? "today" : `${left}d`}
        </span>,
        <span key="a" className="flex items-center justify-end gap-1">
          <ActionButton
            action={resendInvitation}
            fields={{ id: invite.id }}
            label="Resend"
            icon={<RotateCw className="h-3 w-3" aria-hidden />}
          />
          <ActionButton
            action={revokeInvitation}
            fields={{ id: invite.id }}
            label=""
            icon={<X className="h-3 w-3" aria-hidden />}
            tone="danger"
            confirm={`Revoke the invitation to ${invite.email}?`}
          />
        </span>,
      ],
    };
  });

  const settledColumns: TableColumn[] = [
    { key: "email", label: "Invited" },
    { key: "branch", label: "Branch" },
    { key: "role", label: "Role" },
    { key: "status", label: "Outcome", align: "right" },
  ];

  const settledRows: TableRow[] = settled.map((invite) => ({
    id: invite.id,
    cells: [
      <span key="e" className="text-ink-2">{invite.email}</span>,
      branchName.get(invite.branch_id ?? "") ?? dash_,
      invite.role ? ROLE_LABEL[invite.role] : <span className="text-ink-3">member</span>,
      <span key="s" className="chip bg-sunk capitalize text-ink-3">
        {invite.status}
      </span>,
    ],
  }));

  return (
    <Page>
      <PageHead
        eyebrow="People"
        title="Invitations"
        lede="How someone joins. The branch and role are set before they arrive."
        action={
          <InviteEditor
            action={sendInvitation}
            branches={branchOptions}
            cells={cellOptions}
            roles={INVITE_ROLES.map((r) => ({ value: r, label: ROLE_LABEL[r] }))}
          />
        }
      />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Waiting"
          value={String(pending.length)}
          colour="var(--gold)"
          footnote="sent but not yet accepted"
        />
        <StatCard
          label="Accepted"
          value={String(items.filter((i) => i.status === "accepted").length)}
          colour="var(--emerald)"
          footnote="joined through an invitation"
        />
        <StatCard
          label="Expiring soon"
          value={String(
            pending.filter((i) => daysLeft(i.expires_at) <= 3).length,
          )}
          colour="var(--ruby)"
          goodWhenDown
          footnote="three days or fewer left"
        />
        <StatCard
          label="Revoked"
          value={String(items.filter((i) => i.status === "revoked").length)}
          colour="var(--ink-3)"
          footnote="withdrawn before acceptance"
        />
      </section>

      <Panel
        title="Waiting to be accepted"
        lede={
          pending.length
            ? "Nothing sends mail yet — resend to get a fresh link to pass on"
            : "Nothing outstanding"
        }
        accent="var(--gold)"
      >
        <DataTable
          columns={pendingColumns}
          rows={pendingRows}
          empty="No invitations are waiting. Everyone invited has joined."
        />
      </Panel>

      {settled.length > 0 && (
        <Panel title="Settled" lede="Accepted, expired or revoked" accent="var(--ink-3)">
          <DataTable
            columns={settledColumns}
            rows={settledRows}
            empty="Nothing settled yet."
          />
        </Panel>
      )}

    </Page>
  );
}
