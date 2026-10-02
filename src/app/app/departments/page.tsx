import Link from "next/link";

import { saveDepartment } from "@/app/actions/manage";
import { DataTable, type TableColumn, type TableRow } from "@/components/data-table";
import { DepartmentEditor } from "@/components/editors";
import { DepartmentGrid, type DeptCard } from "@/components/department-grid";
import { DotRow, Page, PageHead, Panel, StatCard } from "@/components/panels";
import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import type { Branch, Department, Paged } from "@/lib/types";

export const metadata = { title: "Departments — Chapl" };

/** Ministry teams cycle the palette so a roster is identifiable at a glance. */
const TONES = [
  "var(--emerald)", "var(--cobalt)", "var(--violet)",
  "var(--teal)", "var(--gold)", "var(--ruby)",
];

export default async function DepartmentsPage() {
  await requireMe("/app/departments");

  const [list, rosters, branchList] = await Promise.all([
    api<Paged<Department>>("/departments/?limit=200&sort=name&order=asc"),
    // One query for every roster size. Fetching a roster per department
    // to length it would be twenty-one requests to answer one question.
    api<{ counts: Record<string, number> }>("/departments/rosters/counts"),
    api<Paged<Branch>>("/branches/?limit=200&sort=name&order=asc"),
  ]);

  if (!list.ok) {
    return (
      <Page>
        <h1 className="head text-[20px]">Departments are not available</h1>
        <p className="text-[13px] text-ink-2">{list.error.detail}</p>
      </Page>
    );
  }

  const branchName = new Map(
    branchList.ok ? branchList.data.items.map((b) => [b.id, b.name]) : [],
  );

  // A caller who cannot read rosters still gets the list — with no count
  // rather than no row.
  const size = new Map<string, number>(
    rosters.ok ? Object.entries(rosters.data.counts) : [],
  );

  /*
   * Colour cycles within a branch, not across the whole list.
   *
   * Indexing globally gave two teams at the same site the same hue —
   * which is fine in a list of twenty-one and useless in a view of
   * three, where the colour is the only thing separating one bar from
   * the next.
   */
  const seenPerBranch = new Map<string, number>();
  const rows = list.data.items.map((d) => {
    const key = d.branch_id ?? "church";
    const n = seenPerBranch.get(key) ?? 0;
    seenPerBranch.set(key, n + 1);
    return {
      ...d,
      people: size.get(d.id) ?? 0,
      tone: TONES[n % TONES.length],
    };
  });

  const serving = rows.reduce((sum, r) => sum + r.people, 0);
  const churchWide = rows.filter((r) => !r.branch_id).length;
  const biggest = [...rows].sort((a, b) => b.people - a.people)[0];
  const dash_ = <span className="text-ink-3">—</span>;

  // `DepartmentGrid` filters on {id, name}; a `Select` wants
  // {value, label}. Two shapes of the same list, named for what reads
  // them rather than converted at the call site.
  const branchOptions = (branchList.ok ? branchList.data.items : []).map((b) => ({
    id: b.id,
    name: b.name,
  }));
  const branchChoices = branchOptions.map((b) => ({ value: b.id, label: b.name }));

  const cards: DeptCard[] = rows.map((d) => ({
    id: d.id,
    name: d.name,
    branchId: d.branch_id,
    branchName: d.branch_id
      ? (branchName.get(d.branch_id) ?? "Unknown site")
      : "Church-wide",
    people: d.people,
    meetingDay: d.meeting_day,
    meetingTime: d.meeting_time,
    tone: d.tone,
  }));

  const columns: TableColumn[] = [
    { key: "name", label: "Department" },
    { key: "branch", label: "Scope" },
    { key: "description", label: "What it does" },
    { key: "meeting_day", label: "Meets" },
    { key: "meeting_time", label: "Time" },
    { key: "people", label: "Serving", align: "right", width: "180px" },
    { key: "is_active", label: "Active" },
  ];

  const tableRows: TableRow[] = rows.map((d) => ({
    id: d.id,
    cells: [
      <Link key="n" href={`/app/departments/${d.id}`} className="flex items-center gap-2">
        <span className="dot shrink-0" style={{ color: d.tone }} aria-hidden />
        <span className="font-medium text-ink hover:underline">{d.name}</span>
      </Link>,
      d.branch_id ? (
        (branchName.get(d.branch_id) ?? dash_)
      ) : (
        <span className="chip bg-sunk text-ink-3">whole church</span>
      ),
      d.description ?? dash_,
      d.meeting_day ? <span className="capitalize">{d.meeting_day}</span> : dash_,
      d.meeting_time?.slice(0, 5) ?? dash_,
      d.people ? (
        <span key="p" className="flex items-center justify-end gap-2">
          <DotRow total={d.people} colour={d.tone} cap={18} />
          <span className="tnum text-[11.5px] font-semibold">{d.people}</span>
        </span>
      ) : (
        dash_
      ),
      d.is_active ? (
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
  }));

  return (
    <Page fill>
      <PageHead
        eyebrow="Church"
        title="Departments"
        lede="Ministry teams, off the branch and cell tree."
        action={
          <DepartmentEditor action={saveDepartment} branches={branchChoices} />
        }
      />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Departments"
          value={String(rows.length)}
          colour="var(--emerald)"
          footnote={`${churchWide} church-wide · ${rows.length - churchWide} at a branch`}
        />
        <StatCard
          label="People serving"
          value={serving.toLocaleString()}
          colour="var(--cobalt)"
          footnote="active places on a team"
        />
        <StatCard
          label="Largest team"
          value={biggest ? String(biggest.people) : "—"}
          colour="var(--violet)"
          footnote={biggest?.name ?? "no rosters yet"}
        />
        <StatCard
          label="Average team"
          value={rows.length ? String(Math.round(serving / rows.length)) : "—"}
          colour="var(--gold)"
          footnote="people per department"
        />
      </section>

      {/*
        Grouped by site, because that is the fact that distinguishes them.
        "Worship", "Ushering" and "Children" exist at every branch — a flat
        list of eight cards with three names between them says nothing
        until you open each one to find out where it is.
      */}
      <Panel
        title="Who serves where"
        lede="One dot is one person · pick a site to narrow it"
        accent="var(--emerald)"
      >
        <DepartmentGrid departments={cards} branches={branchOptions} />
      </Panel>

      <Panel fill title="Every department" lede="Across the whole church" accent="var(--emerald)">
        <DataTable
          fill
          columns={columns}
          rows={tableRows}
          empty="No departments yet."
          footer={[
            `${rows.length} teams`,
            "",
            "",
            "",
            "",
            serving.toLocaleString(),
            "",
          ]}
        />
      </Panel>
    </Page>
  );
}
