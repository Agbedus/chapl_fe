import Link from "next/link";
import { X } from "lucide-react";

import { saveCell } from "@/app/actions/manage";
import { Sparkline } from "@/components/charts";
import {
  DataTable, type TableColumn, type TableRow,
} from "@/components/data-table";
import { CellEditor } from "@/components/editors";
import {
  DotRow, Leaderboard, Page, PageHead, Panel, StatCard,
} from "@/components/panels";
import { api } from "@/lib/api";
import { canAdminChurch, currentChurchId, requireMe } from "@/lib/session";
import type { Branch, Cell, CellRow, Dashboard, Paged } from "@/lib/types";

export const metadata = { title: "Cells — Chapl" };

const BAND_TONE = {
  thriving: "var(--emerald)",
  steady: "var(--gold)",
  "at risk": "var(--ruby)",
} as const;

const DAYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
];

const FREQUENCIES = ["weekly", "fortnightly", "monthly", "quarterly", "ad_hoc"];

/** The cell record plus whatever the dashboard already worked out for it. */
type Row = Cell & Partial<Pick<CellRow, "members" | "turnout" | "band" | "last_seen">>;

export default async function CellsPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string }>;
}) {
  const me = await requireMe("/app/cells");
  const churchId = await currentChurchId();
  const params = await searchParams;

  const [list, branchList, dash] = await Promise.all([
    api<Paged<Cell>>("/cells/?limit=300&sort=code&order=asc"),
    api<Paged<Branch>>("/branches/?limit=200&sort=name&order=asc"),
    api<Dashboard>("/dashboard"),
  ]);

  if (!list.ok) {
    return (
      <Page>
        <h1 className="head text-[20px]">Cells are not available</h1>
        <p className="text-[13px] text-ink-2">{list.error.detail}</p>
      </Page>
    );
  }

  const branches = branchList.ok ? branchList.data.items : [];
  const branchName = new Map(branches.map((b) => [b.id, b.name]));
  const health = new Map(dash.ok ? dash.data.cells.map((c) => [c.id, c]) : []);

  /*
   * `?branch=` narrows the list.
   *
   * The dashboard and the attendance page both linked here with it set,
   * and it was read by nobody — so "open this cell at risk" landed on
   * eighty-one cells, unfiltered, which is the search the link existed to
   * save. It filters on the branch id rather than the name: a name is a
   * thing an administrator renames on a Tuesday.
   */
  const onlyBranch = params.branch && branches.some((b) => b.id === params.branch)
    ? params.branch
    : null;

  const rows: Row[] = list.data.items
    .filter((c) => !onlyBranch || c.branch_id === onlyBranch)
    .map((c) => ({ ...c, ...health.get(c.id) }))
    // Worst first: the reason to open this page is the bottom of the list.
    .sort((a, b) => (a.turnout ?? 999) - (b.turnout ?? 999));

  const withPeople = rows.filter((r) => (r.members ?? 0) > 0);
  const people = withPeople.reduce((sum, r) => sum + (r.members ?? 0), 0);
  const atRisk = rows.filter((r) => r.band === "at risk").length;
  const thriving = rows.filter((r) => r.band === "thriving").length;
  const average = withPeople.length
    ? Math.round(withPeople.reduce((s, r) => s + (r.turnout ?? 0), 0) / withPeople.length)
    : 0;

  const turnoutLine = dash.ok
    ? dash.data.trend.map((p) => ({
        label: new Date(p.date).toLocaleDateString(undefined, {
          day: "2-digit", month: "short",
        }),
        value: p.pct,
      }))
    : [];

  const canWrite = canAdminChurch(me, churchId);
  const dash_ = <span className="text-ink-3">—</span>;

  const columns: TableColumn[] = [
    { key: "name", label: "Cell" },
    { key: "branch", label: "Branch" },
    { key: "meeting_day", label: "Meets" },
    { key: "meeting_time", label: "Time" },
    { key: "meeting_frequency", label: "How often" },
    { key: "host_location", label: "Host" },
    { key: "members", label: "People", align: "right" },
    { key: "target_size", label: "Target", align: "right" },
    { key: "turnout", label: "Turnout", align: "right", width: "136px" },
    { key: "is_active", label: "Active" },
  ];

  const tableRows: TableRow[] = rows.map((r) => {
    const value = r.turnout ?? 0;
    const tone = BAND_TONE[r.band ?? "steady"];
    return {
      id: r.id,
      cells: [
        <span key="n" className="flex items-center gap-2">
          <span
            className="mono rounded px-1.5 py-0.5 text-[9.5px] font-bold"
            style={{
              background: "color-mix(in oklab, var(--teal) 12%, transparent)",
              color: "var(--teal)",
            }}
          >
            {r.code}
          </span>
          <span className="font-medium text-ink">{r.name}</span>
        </span>,
        branchName.get(r.branch_id) ?? dash_,
        r.meeting_day ? <span className="capitalize">{r.meeting_day}</span> : dash_,
        r.meeting_time?.slice(0, 5) ?? dash_,
        r.meeting_frequency ? (
          <span className="capitalize">{r.meeting_frequency.replace(/_/g, " ")}</span>
        ) : (
          dash_
        ),
        r.host_location ?? dash_,
        r.members ? (
          <span key="p" className="flex items-center gap-2">
            <DotRow
              total={r.members}
              present={Math.round(((r.members ?? 0) * (r.turnout ?? 0)) / 100)}
              colour="var(--teal)"
              cap={14}
            />
            <span className="tnum text-[11.5px]">{r.members}</span>
          </span>
        ) : (
          dash_
        ),
        r.target_size ? String(r.target_size) : dash_,
        r.members ? (
          <span key="t" className="flex items-center justify-end gap-2">
            <span
              className="block h-[3px] w-14 overflow-hidden rounded-full"
              style={{ background: "var(--sunk)" }}
            >
              <span
                className="block h-full rounded-full"
                style={{ width: `${value}%`, background: tone }}
              />
            </span>
            <span className="tnum w-8 text-right font-semibold" style={{ color: tone }}>
              {value}%
            </span>
          </span>
        ) : (
          dash_
        ),
        r.is_active ? (
          <span
            key="a"
            className="chip"
            style={{
              background: "color-mix(in oklab, var(--emerald) 12%, transparent)",
              color: "var(--emerald)",
            }}
          >
            yes
          </span>
        ) : (
          <span key="a" className="chip bg-sunk text-ink-3">no</span>
        ),
      ],
      fields: canWrite
        ? [
            { key: "name", name: "name", value: r.name },
            {
              key: "meeting_day",
              name: "meeting_day",
              value: r.meeting_day ?? "",
              options: [
                { value: "", label: "—" },
                ...DAYS.map((d) => ({ value: d, label: d })),
              ],
            },
            {
              key: "meeting_time",
              name: "meeting_time",
              type: "time" as const,
              value: r.meeting_time?.slice(0, 5) ?? "",
            },
            {
              key: "meeting_frequency",
              name: "meeting_frequency",
              value: r.meeting_frequency ?? "",
              options: [
                { value: "", label: "—" },
                ...FREQUENCIES.map((f) => ({ value: f, label: f.replace(/_/g, " ") })),
              ],
            },
            { key: "host_location", name: "host_location", value: r.host_location ?? "" },
            {
              key: "target_size",
              name: "target_size",
              type: "number" as const,
              value: String(r.target_size ?? ""),
            },
            {
              key: "is_active",
              name: "is_active",
              value: String(r.is_active),
              options: [
                { value: "true", label: "yes" },
                { value: "false", label: "no" },
              ],
            },
          ]
        : undefined,
      /* `saveCell` writes a complete body, so the two fields this table
         does not show would arrive as null and be cleared. */
      hidden: {
        id: r.id,
        motto: r.motto ?? "",
        description: r.description ?? "",
      },
    };
  });

  return (
    <Page fill>
      <PageHead
        eyebrow="Structure"
        title="Cells"
        lede={
          onlyBranch
            ? `${branchName.get(onlyBranch) ?? "One branch"} only \u00b7 ${rows.length} of ${list.data.total} cells`
            : "Groups small enough that someone notices you are missing."
        }
        action={
          <div className="flex items-center gap-2">
            {/* A filter with nothing on screen saying so is a page that
                looks broken. The way out sits next to the way in. */}
            {onlyBranch && (
              <Link href="/app/cells" className="btn btn-quiet btn-sm">
                <X className="h-3.5 w-3.5" aria-hidden />
                Every branch
              </Link>
            )}
            <CellEditor
              action={saveCell}
              branches={branches.map((b) => ({ value: b.id, label: b.name }))}
            />
          </div>
        }
      />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Cells"
          value={String(rows.length)}
          colour="var(--teal)"
          footnote={`${withPeople.length} with people on the roll`}
        />
        <StatCard
          label="At risk"
          value={String(atRisk)}
          colour="var(--ruby)"
          goodWhenDown
          footnote={`${thriving} thriving · under half the roll turned up`}
        />
        <StatCard
          label="Average turnout"
          value={String(average)}
          unit="%"
          colour="var(--gold)"
          footnote="across every cell with people"
          spark={
            turnoutLine.length > 1 ? (
              <Sparkline
                data={turnoutLine}
                color="var(--gold)"
                ariaLabel="Church-wide turnout at each of the last services"
              />
            ) : undefined
          }
        />
        <StatCard
          label="People in cells"
          value={people.toLocaleString()}
          colour="var(--cobalt)"
          footnote={`${branches.length} branches`}
        />
      </section>

      <section className="grid gap-2 lg:grid-cols-3">
        <Panel title="Strongest cells" lede="Highest turnout" accent="var(--emerald)">
          <Leaderboard
            colour="var(--emerald)"
            unit="%"
            items={[...withPeople]
              .sort((a, b) => (b.turnout ?? 0) - (a.turnout ?? 0))
              .slice(0, 6)
              .map((r) => ({
                id: r.id,
                name: r.name,
                value: r.turnout ?? 0,
                note: branchName.get(r.branch_id) ?? "",
              }))}
          />
        </Panel>

        <Panel title="Needing a call" lede="Lowest turnout" accent="var(--ruby)">
          <Leaderboard
            colour="var(--ruby)"
            unit="%"
            items={[...withPeople]
              .sort((a, b) => (a.turnout ?? 0) - (b.turnout ?? 0))
              .slice(0, 6)
              .map((r) => ({
                id: r.id,
                name: r.name,
                value: r.turnout ?? 0,
                note: branchName.get(r.branch_id) ?? "",
              }))}
          />
        </Panel>

        {/* Cells per branch: which sites are actually organised into
            groups, and which are one big room. */}
        <Panel title="Cells per branch" lede="How the church is divided" accent="var(--violet)">
          <Leaderboard
            colour="var(--violet)"
            items={branches
              .map((b) => ({
                id: b.id,
                name: b.name,
                value: rows.filter((r) => r.branch_id === b.id).length,
                note: `${rows
                  .filter((r) => r.branch_id === b.id)
                  .reduce((sum, r) => sum + (r.members ?? 0), 0)} people`,
              }))
              .filter((b) => b.value > 0)
              .sort((a, b) => b.value - a.value)
              .slice(0, 6)}
          />
        </Panel>
      </section>

      <Panel
        fill
        title="Every cell"
        lede={
          canWrite
            ? "Lowest turnout first · click the pencil to edit a row in place"
            : "Lowest turnout first"
        }
        accent="var(--teal)"
      >
        <DataTable
          fill
          columns={columns}
          rows={tableRows}
          action={saveCell}
          canEdit={canWrite}
          empty="No cells yet. Add one inside a branch."
          footer={[
            `${rows.length} cells`,
            `${branches.length} branches`,
            "",
            "",
            "",
            "",
            people.toLocaleString(),
            "",
            `${average}%`,
            "",
          ]}
        />
      </Panel>
    </Page>
  );
}
