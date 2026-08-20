import { Pin } from "lucide-react";

import { saveNotice } from "@/app/actions/manage";
import { DataTable, type TableColumn, type TableRow } from "@/components/data-table";
import { NoticeEditor } from "@/components/editors";
import { Page, PageHead, Panel, StatCard } from "@/components/panels";
import { api } from "@/lib/api";
import { audienceOptions } from "@/lib/audience";
import { currentChurchId, requireMe } from "@/lib/session";
import type { Branch, Cell, Notice, Paged } from "@/lib/types";

export const metadata = { title: "Notices — Chapl" };

const PRIORITY_TONE = {
  normal: "var(--ink-3)",
  important: "var(--gold)",
  urgent: "var(--ruby)",
} as const;

function day(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    day: "2-digit", month: "short",
  });
}

export default async function NoticesPage() {
  const me = await requireMe("/app/notices");
  const churchId = await currentChurchId();

  const [list, branchList, cellList] = await Promise.all([
    api<Paged<Notice>>("/communication/notices/?limit=200&sort=created_at&order=desc"),
    api<Paged<Branch>>("/branches/?limit=200&sort=name&order=asc"),
    api<Paged<Cell>>("/cells/?limit=300&sort=code&order=asc"),
  ]);

  if (!list.ok) {
    return (
      <Page>
        <h1 className="head text-[20px]">Notices are not available</h1>
        <p className="text-[13px] text-ink-2">{list.error.detail}</p>
      </Page>
    );
  }

  const branches = branchList.ok ? branchList.data.items : [];
  const cells = cellList.ok ? cellList.data.items : [];
  const branchName = new Map(branches.map((b) => [b.id, b.name]));
  const cellName = new Map(cells.map((c) => [c.id, c.name]));

  // Only the scopes this person has authority over. An empty list means
  // they may read notices but not post them, so no button appears.
  const audiences = audienceOptions(me, churchId, branches, cells, "notice");

  const rows = list.data.items;
  const live = rows.filter((n) => n.is_active).length;
  const pinned = rows.filter((n) => n.is_pinned).length;
  const urgent = rows.filter((n) => n.priority === "urgent").length;
  const dash_ = <span className="text-ink-3">—</span>;

  const columns: TableColumn[] = [
    { key: "title", label: "Notice" },
    { key: "priority", label: "Priority" },
    { key: "scope", label: "Who sees it" },
    { key: "content", label: "What it says" },
    { key: "publish_at", label: "Published", align: "right" },
    { key: "expires_at", label: "Expires", align: "right" },
    { key: "is_active", label: "Live" },
  ];

  const tableRows: TableRow[] = rows.map((n) => ({
    id: n.id,
    cells: [
      <span key="t" className="flex items-center gap-2">
        {n.is_pinned && (
          <Pin className="h-3 w-3 shrink-0" style={{ color: "var(--gold)" }} aria-label="Pinned" />
        )}
        <span className="font-medium text-ink">{n.title}</span>
      </span>,
      <span key="p" className="chip capitalize"
        style={{
          background: `color-mix(in oklab, ${PRIORITY_TONE[n.priority]} 13%, transparent)`,
          color: PRIORITY_TONE[n.priority],
        }}>
        {n.priority}
      </span>,
      /* The narrowest scope set is the audience — a cell beats a branch,
         a branch beats the church, exactly as the fan-out resolves it. */
      n.cell_id ? (
        <span className="flex items-center gap-1.5">
          <span className="dot" style={{ color: "var(--teal)" }} aria-hidden />
          {cellName.get(n.cell_id) ?? "one cell"}
        </span>
      ) : n.branch_id ? (
        <span className="flex items-center gap-1.5">
          <span className="dot" style={{ color: "var(--violet)" }} aria-hidden />
          {branchName.get(n.branch_id) ?? "one branch"}
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <span className="dot" style={{ color: "var(--cobalt)" }} aria-hidden />
          Everyone
        </span>
      ),
      <span key="c" className="text-ink-3">
        {n.content.length > 70 ? `${n.content.slice(0, 70)}…` : n.content}
      </span>,
      day(n.publish_at ?? n.created_at),
      n.expires_at ? day(n.expires_at) : dash_,
      n.is_active ? (
        <span key="l" className="chip"
          style={{
            background: "color-mix(in oklab, var(--emerald) 12%, transparent)",
            color: "var(--emerald)",
          }}>
          yes
        </span>
      ) : (
        <span key="l" className="chip bg-sunk text-ink-3">no</span>
      ),
    ],
  }));

  return (
    <Page fill>
      <PageHead
        eyebrow="Activity"
        title="Notices"
        lede="Bulletins, and who they reached."
        action={
          audiences.length > 0 ? (
            <NoticeEditor action={saveNotice} audiences={audiences} />
          ) : undefined
        }
      />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Live" value={String(live)} colour="var(--cobalt)"
          footnote={`of ${rows.length} posted`} />
        <StatCard label="Pinned" value={String(pinned)} colour="var(--gold)"
          footnote="held at the top all year" />
        <StatCard label="Urgent" value={String(urgent)} colour="var(--ruby)"
          footnote="marked as needing attention" />
        <StatCard label="Church-wide" value={String(rows.filter((n) => !n.branch_id && !n.cell_id).length)}
          colour="var(--violet)" footnote="rest went to a branch or a cell" />
      </section>

      <Panel fill title="Every notice" lede="Most recent first" accent="var(--cobalt)">
        <DataTable fill columns={columns} rows={tableRows}
          empty="Nothing posted yet."
          footer={[`${rows.length} notices`, `${urgent} urgent`, "", "", "", "", `${live} live`]} />
      </Panel>
    </Page>
  );
}
