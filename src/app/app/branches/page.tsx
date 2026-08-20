import { saveBranch } from "@/app/actions/manage";
import { Sparkline } from "@/components/charts";
import {
  DataTable, type TableColumn, type TableRow,
} from "@/components/data-table";
import { BranchEditor } from "@/components/editors";
import {
  DotRow, Leaderboard, Page, PageHead, Panel, StatCard,
} from "@/components/panels";
import { api } from "@/lib/api";
import { turnoutColour } from "@/lib/palette";
import { canAdminChurch, currentChurchId, requireMe } from "@/lib/session";
import type { Branch, BranchRow, Dashboard, Paged } from "@/lib/types";

export const metadata = { title: "Branches — Chapl" };

/** The branch plus whatever the dashboard already counted for it. */
type Row = Branch & Partial<Pick<BranchRow, "cells" | "members" | "present" | "turnout">>;

export default async function BranchesPage() {
  const me = await requireMe("/app/branches");
  const churchId = await currentChurchId();

  const [list, dash] = await Promise.all([
    api<Paged<Branch>>("/branches/?limit=200&sort=name&order=asc"),
    api<Dashboard>("/dashboard"),
  ]);

  if (!list.ok) {
    return (
      <Page>
        <h1 className="head text-[20px]">Branches are not available</h1>
        <p className="text-[13px] text-ink-2">{list.error.detail}</p>
      </Page>
    );
  }

  // Counts come from the dashboard's roll-up rather than a query per
  // branch — it has already done the joins.
  const rollup = new Map(dash.ok ? dash.data.branches.map((b) => [b.id, b]) : []);
  const rows: Row[] = list.data.items.map((b) => ({ ...b, ...rollup.get(b.id) }));

  const withPeople = rows.filter((r) => (r.members ?? 0) > 0);
  const people = withPeople.reduce((sum, r) => sum + (r.members ?? 0), 0);
  const present = withPeople.reduce((sum, r) => sum + (r.present ?? 0), 0);
  const cells = withPeople.reduce((sum, r) => sum + (r.cells ?? 0), 0);
  const turnout = people ? Math.round((present / people) * 100) : 0;
  const best = [...withPeople].sort((a, b) => (b.turnout ?? 0) - (a.turnout ?? 0))[0];

  // The church-wide series, for shape under the headline figures. Branch
  // history is not on the API, so every card that would need one falls
  // back to the church line rather than inventing a per-branch series.
  const turnoutLine = dash.ok
    ? dash.data.trend.map((p) => ({
        label: new Date(p.date).toLocaleDateString(undefined, {
          day: "2-digit",
          month: "short",
        }),
        value: p.pct,
      }))
    : [];

  const canWrite = canAdminChurch(me, churchId);

  const columns: TableColumn[] = [
    { key: "name", label: "Branch" },
    { key: "location", label: "Location" },
    { key: "service_times", label: "Services" },
    { key: "contact_phone", label: "Phone" },
    { key: "cells", label: "Cells", align: "right" },
    { key: "members", label: "People", align: "right" },
    { key: "capacity", label: "Seats", align: "right" },
    { key: "turnout", label: "Turnout", align: "right", width: "136px" },
    { key: "is_active", label: "Active" },
  ];

  const dash_ = <span className="text-ink-3">—</span>;

  const tableRows: TableRow[] = rows.map((r) => {
    const value = r.turnout ?? 0;
    return {
      id: r.id,
      cells: [
        <span key="n" className="flex items-center gap-2">
          <span
            className="mono rounded px-1.5 py-0.5 text-[9.5px] font-bold"
            style={{
              background: "color-mix(in oklab, var(--violet) 12%, transparent)",
              color: "var(--violet)",
            }}
          >
            {r.code}
          </span>
          <span className="font-medium text-ink">{r.name}</span>
        </span>,
        r.location ?? dash_,
        r.service_times ?? dash_,
        r.contact_phone ?? dash_,
        String(r.cells ?? 0),
        r.members ? (
          <span key="p" className="flex items-center gap-2">
            <DotRow
              total={r.members}
              present={r.present ?? 0}
              colour="var(--violet)"
              cap={16}
            />
            <span className="tnum text-[11.5px]">{r.members}</span>
          </span>
        ) : (
          dash_
        ),
        r.capacity ? r.capacity.toLocaleString() : dash_,
        r.members ? (
          <span key="t" className="flex items-center justify-end gap-2">
            <span
              className="block h-[3px] w-14 overflow-hidden rounded-full"
              style={{ background: "var(--sunk)" }}
            >
              <span
                className="block h-full rounded-full"
                style={{ width: `${value}%`, background: turnoutColour(value) }}
              />
            </span>
            <span
              className="tnum w-8 text-right font-semibold"
              style={{ color: turnoutColour(value) }}
            >
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
          <span key="a" className="chip bg-sunk text-ink-3">
            no
          </span>
        ),
      ],
      fields: canWrite
        ? [
            { key: "name", name: "name", value: r.name },
            { key: "location", name: "location", value: r.location ?? "" },
            { key: "service_times", name: "service_times", value: r.service_times ?? "" },
            { key: "contact_phone", name: "contact_phone", value: r.contact_phone ?? "" },
            {
              key: "capacity",
              name: "capacity",
              type: "number" as const,
              value: String(r.capacity ?? ""),
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
      /*
        Every field the action writes, not only the ones on screen.

        `saveBranch` builds a complete PATCH body, so a field absent from
        the form arrives as null and clears the stored value. The four
        columns the row does not show ride along as hidden inputs — else
        editing a phone number silently erases a branch's coordinates.
      */
      hidden: {
        id: r.id,
        address: r.address ?? "",
        contact_email: r.contact_email ?? "",
        latitude: r.latitude != null ? String(r.latitude) : "",
        longitude: r.longitude != null ? String(r.longitude) : "",
      },
    };
  });

  return (
    <Page fill>
      <PageHead
        eyebrow="Structure"
        title="Branches"
        lede="Where your church meets. Everyone belongs to one."
        action={<BranchEditor action={saveBranch} />}
      />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Sites"
          value={String(rows.length)}
          colour="var(--violet)"
          footnote={`${withPeople.length} with people on the roll`}
        />
        <StatCard
          label="People"
          value={people.toLocaleString()}
          colour="var(--cobalt)"
          footnote={`across ${cells} cells`}
        />
        <StatCard
          label="Turnout"
          value={String(turnout)}
          unit="%"
          colour="var(--gold)"
          footnote="church wide, last service"
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
          label="Strongest"
          value={best ? `${best.turnout ?? 0}%` : "—"}
          colour="var(--emerald)"
          footnote={best?.name ?? "no branch has people yet"}
        />
      </section>

      <section className="grid gap-2 lg:grid-cols-3">
        <Panel title="Turnout" lede="Best first" accent="var(--gold)">
          <Leaderboard
            colour="var(--gold)"
            unit="%"
            items={[...withPeople]
              .sort((a, b) => (b.turnout ?? 0) - (a.turnout ?? 0))
              .slice(0, 6)
              .map((r) => ({
                id: r.id,
                name: r.name,
                value: r.turnout ?? 0,
                note: `${r.present ?? 0}/${r.members ?? 0}`,
              }))}
            emptyLabel="No branch has anyone on the roll."
          />
        </Panel>

        <Panel title="Size" lede="People on the roll" accent="var(--cobalt)">
          <Leaderboard
            colour="var(--cobalt)"
            items={[...withPeople]
              .sort((a, b) => (b.members ?? 0) - (a.members ?? 0))
              .slice(0, 6)
              .map((r) => ({
                id: r.id,
                name: r.name,
                value: r.members ?? 0,
                note: `${r.cells ?? 0} cells`,
              }))}
          />
        </Panel>

        <Panel title="How full" lede="Present against seats" accent="var(--teal)">
          <Leaderboard
            colour="var(--teal)"
            unit="%"
            items={[...withPeople]
              .filter((r) => r.capacity)
              .sort(
                (a, b) =>
                  (b.present ?? 0) / (b.capacity ?? 1) -
                  (a.present ?? 0) / (a.capacity ?? 1),
              )
              .slice(0, 6)
              .map((r) => ({
                id: r.id,
                name: r.name,
                value: Math.round(((r.present ?? 0) / (r.capacity ?? 1)) * 100),
                note: `${r.capacity} seats`,
              }))}
            emptyLabel="No branch has a seat count recorded."
          />
        </Panel>
      </section>

      <Panel
        fill
        title="Every site"
        lede={
          canWrite
            ? "Click the pencil to edit a row in place"
            : "Read-only at your level of access"
        }
        accent="var(--violet)"
      >
        <DataTable
          fill
          columns={columns}
          rows={tableRows}
          action={saveBranch}
          canEdit={canWrite}
          empty="No branches yet. Add the first one before adding people."
          footer={[
            `${rows.length} sites`,
            "",
            "",
            "",
            String(cells),
            people.toLocaleString(),
            rows
              .reduce((sum, r) => sum + (r.capacity ?? 0), 0)
              .toLocaleString(),
            `${turnout}%`,
            "",
          ]}
        />
      </Panel>
    </Page>
  );
}
