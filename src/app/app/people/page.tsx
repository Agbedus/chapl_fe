import { canWrite } from "@/lib/access";
import Link from "next/link";
import { Search, UserPlus } from "lucide-react";

import { Sparkline } from "@/components/charts";
import { DataTable, type TableColumn, type TableRow } from "@/components/data-table";
import { Action, Page, PageHead, Panel, StatCard } from "@/components/panels";
import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import type { Branch, Dashboard, Paged, Person } from "@/lib/types";

export const metadata = { title: "People — Chapl" };

const PAGE = 40;

function age(dob: string | null): string {
  if (!dob) return "—";
  const born = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  if (
    now.getMonth() < born.getMonth() ||
    (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())
  ) {
    years -= 1;
  }
  return String(years);
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const me = await requireMe("/app/people");
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const page = Math.max(1, Number(params.page ?? 1) || 1);

  // Search happens in the database, not here. A page of forty filtered in
  // Node would only ever search the forty it happened to fetch.
  const query = new URLSearchParams({
    limit: String(PAGE),
    skip: String((page - 1) * PAGE),
    sort: "full_name",
    order: "asc",
  });
  if (q) query.set("q", q);

  const [list, branchList, dash] = await Promise.all([
    api<Paged<Person>>(`/users/?${query}`),
    api<Paged<Branch>>("/branches/?limit=200"),
    api<Dashboard>("/dashboard"),
  ]);

  if (!list.ok) {
    return (
      <Page>
        <h1 className="head text-[20px]">People are not available</h1>
        <p className="text-[13px] text-ink-2">{list.error.detail}</p>
      </Page>
    );
  }

  const total = list.data.total;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const branchCount = branchList.ok ? branchList.data.total : 0;

  const growthLine = dash.ok
    ? dash.data.growth.map((g) => ({ label: g.label, value: g.total }))
    : [];
  const joined = dash.ok ? (dash.data.growth.at(-1)?.joined ?? null) : null;
  const newThisYear = dash.ok
    ? dash.data.growth.reduce((sum, g) => sum + g.joined, 0)
    : 0;
  const verified = list.data.items.filter((p) => p.is_verified).length;

  const dash_ = <span className="text-ink-3">—</span>;

  const columns: TableColumn[] = [
    { key: "full_name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone_number", label: "Phone" },
    { key: "occupation", label: "Occupation" },
    { key: "age", label: "Age", align: "right" },
    { key: "gender", label: "Gender" },
    { key: "marital_status", label: "Marital" },
    { key: "location", label: "Location" },
    { key: "is_active", label: "Status" },
  ];

  const rows: TableRow[] = list.data.items.map((person) => ({
    id: person.id,
    cells: [
      <Link
        key="n"
        href={`/app/people/${person.id}`}
        className="flex items-center gap-2.5 font-medium text-ink hover:underline"
      >
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold"
          style={{
            background: "color-mix(in oklab, var(--cobalt) 11%, transparent)",
            color: "var(--cobalt)",
          }}
          aria-hidden
        >
          {(person.full_name || "?")[0].toUpperCase()}
        </span>
        {person.full_name}
      </Link>,
      <a
        key="e"
        href={`mailto:${person.email}`}
        className="text-ink-2 hover:text-ink hover:underline"
      >
        {person.email}
      </a>,
      person.phone_number ?? dash_,
      person.occupation ?? dash_,
      age(person.date_of_birth),
      person.gender ? <span className="capitalize">{person.gender}</span> : dash_,
      person.marital_status ? (
        <span className="capitalize">{person.marital_status}</span>
      ) : (
        dash_
      ),
      person.location ?? dash_,
      person.is_active ? (
        <span
          key="s"
          className="chip"
          style={{
            background: "color-mix(in oklab, var(--emerald) 12%, transparent)",
            color: "var(--emerald)",
          }}
        >
          active
        </span>
      ) : (
        <span key="s" className="chip bg-sunk text-ink-3">inactive</span>
      ),
    ],
    /*
      No inline editing here on purpose.

      A person is a platform identity that may belong to several churches,
      and `savePerson` writes a body wide enough that a nine-column row
      could not carry it safely. The record's own page owns that edit,
      where the whole form is on screen — and it is one click away from
      the name.
    */
  }));

  return (
    <Page>
      <PageHead
        eyebrow="People"
        title={`${total.toLocaleString()} ${total === 1 ? "person" : "people"}`}
        lede="Everyone you can see. Search runs against the database."
        action={
          canWrite(me, "membership") ? <Action href="/app/invitations" icon={<UserPlus className="h-4 w-4" aria-hidden />}>
            Invite someone
          </Action> : null
        }
      />

      {branchCount === 0 && (
        <div className="sheet sheet-mist">
          <p className="text-[13px] font-semibold">There are no branches yet</p>
          <p className="measure mt-1 text-[12.5px] leading-[1.5] text-ink-2">
            Everyone belongs to a branch, so add the first one before inviting
            anybody.
          </p>
          <Link href="/app/branches" className="btn btn-primary btn-sm mt-3">
            Add a branch
          </Link>
        </div>
      )}

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="On the roll"
          value={total.toLocaleString()}
          colour="var(--cobalt)"
          delta={joined}
          deltaLabel=" joined"
          footnote="cumulative, 12 months"
          spark={
            growthLine.length > 1 ? (
              <Sparkline
                data={growthLine}
                color="var(--cobalt)"
                ariaLabel="Membership over twelve months"
              />
            ) : undefined
          }
        />
        <StatCard
          label="Joined this year"
          value={newThisYear.toLocaleString()}
          colour="var(--emerald)"
          footnote="across every branch"
        />
        <StatCard
          label="Branches"
          value={String(branchCount)}
          colour="var(--violet)"
          footnote="everyone belongs to one"
        />
        <StatCard
          label="Verified"
          value={`${verified}/${list.data.items.length}`}
          colour="var(--gold)"
          footnote="on this page · have confirmed their email"
        />
      </section>

      <Panel
        title={q ? `Matching “${q}”` : "Directory"}
        lede={`Page ${page} of ${pages} · click a name to open the record`}
        accent="var(--cobalt)"
        aside={
          <form action="/app/people" className="flex items-center gap-2">
            <span className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
                aria-hidden
              />
              <input
                type="search"
                name="q"
                defaultValue={q}
                placeholder="Name, email or phone"
                aria-label="Search people"
                className="w-56 rounded-full border border-line bg-paper py-1.5 pl-9 pr-3
                           text-[12.5px] text-ink transition-colors placeholder:text-ink-3
                           hover:border-line-strong focus:border-transparent focus:outline-none
                           focus:ring-2 focus:ring-[var(--accent)]"
              />
            </span>
            <button type="submit" className="btn btn-quiet btn-sm">Search</button>
            {q && (
              <Link href="/app/people" className="btn btn-sm text-ink-3 hover:text-ink">
                Clear
              </Link>
            )}
          </form>
        }
      >
        <DataTable
          columns={columns}
          rows={rows}
          empty={q ? `Nobody matches “${q}”.` : "Nobody is visible at your level of access."}
        />

        {pages > 1 && (
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
            <p className="tnum text-[11.5px] text-ink-3">
              {((page - 1) * PAGE + 1).toLocaleString()}–
              {Math.min(page * PAGE, total).toLocaleString()} of {total.toLocaleString()}
            </p>
            <div className="flex gap-2">
              <PageLink page={page - 1} q={q} disabled={page <= 1}>
                Previous
              </PageLink>
              <PageLink page={page + 1} q={q} disabled={page >= pages}>
                Next
              </PageLink>
            </div>
          </div>
        )}
      </Panel>
    </Page>
  );
}

/**
 * A pager step that keeps the search term.
 *
 * Disabled reads as present-but-unavailable rather than absent, so the
 * two buttons stay in the same place on every page.
 */
function PageLink({
  page,
  q,
  disabled,
  children,
}: {
  page: number;
  q: string;
  disabled: boolean;
  children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="btn btn-quiet btn-sm opacity-40" aria-disabled="true">
        {children}
      </span>
    );
  }
  const query = new URLSearchParams({ page: String(page) });
  if (q) query.set("q", q);
  return (
    <Link href={`/app/people?${query}`} className="btn btn-quiet btn-sm">
      {children}
    </Link>
  );
}
