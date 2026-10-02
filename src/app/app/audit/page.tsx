import Link from "next/link";
import { History, Search } from "lucide-react";

import { DataTable, type TableColumn, type TableRow } from "@/components/data-table";
import { Page, PageHead, Panel, StatCard } from "@/components/panels";
import { Notice } from "@/components/ui/form";
import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import type { Paged } from "@/lib/types";

export const metadata = { title: "Audit log — Chapl" };

const PAGE = 50;

type Entry = {
  id: string;
  church_id: string | null;
  user_id: string | null;
  /** Resolved by the API — see `_named` there, and why. */
  user_name: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
};

/** Verbs get the colour of what they do, not of what they touched. */
const ACTION_TONE: Record<string, string> = {
  create: "var(--emerald)",
  insert: "var(--emerald)",
  update: "var(--gold)",
  delete: "var(--ruby)",
  login: "var(--cobalt)",
  logout: "var(--ink-3)",
};

function toneFor(action: string): string {
  const verb = action.toLowerCase();
  for (const [key, tone] of Object.entries(ACTION_TONE)) {
    if (verb.includes(key)) return tone;
  }
  return "var(--ink-3)";
}

/**
 * What actually changed, as a list of field names.
 *
 * The rows carry two whole JSON blobs, and printing either of them in a
 * table is printing forty columns nobody asked for. The difference
 * between them is the part somebody scrolling this is looking for —
 * "who changed the giving amount" rather than "here is a record".
 */
function changed(entry: Entry): string[] {
  const before = entry.old_data ?? {};
  const after = entry.new_data ?? {};
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  const out: string[] = [];
  for (const key of keys) {
    if (key === "updated_at" || key === "created_at") continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) out.push(key);
  }
  return out;
}

/**
 * The trail.
 *
 * `GET /audit_logs` has always been there and nothing in this product
 * read it — the one surface that answers "who changed this, and when",
 * and it was reachable only through the backend's own admin screen.
 *
 * Read-only on purpose, all the way down: the API has no POST, PUT or
 * DELETE for this table, because a log the application can rewrite is
 * worth nothing. So there are no controls on this page either, and
 * that absence is the feature.
 */
export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; table?: string }>;
}) {
  await requireMe("/app/audit");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const term = (params.q ?? "").trim();

  const query = new URLSearchParams({
    limit: String(PAGE),
    skip: String((page - 1) * PAGE),
  });
  if (term) query.set("q", term);
  if (params.table) query.set("table_name", params.table);

  /*
   * The log names its own actors.
   *
   * This used to fetch the whole directory and join on `user_id`, which
   * rendered almost every row as "Unknown": `/users/` lists a church's
   * *roll*, and the accounts that show up in a trail are
   * disproportionately staff ones with no membership. The name comes
   * from the API now, off a single join it was always able to make.
   */
  const log = await api<Paged<Entry>>(`/audit_logs/?${query}`);

  if (!log.ok) {
    return (
      <Page>
        <PageHead eyebrow="Platform" title="Audit log" />
        <Notice kind="error">{log.error.detail}</Notice>
        <p className="text-[12.5px] text-ink-3">
          Reading the trail takes church-admin authority.
        </p>
      </Page>
    );
  }

  const entries = log.data.items;
  const total = log.data.total;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  // Built from the page in hand rather than asked for separately. It is
  // a way back out of a filter, not a census of every table.
  const tables = [...new Set(entries.map((e) => e.table_name).filter(Boolean))].sort();
  const writers = new Set(entries.map((e) => e.user_id).filter(Boolean));

  const columns: TableColumn[] = [
    { key: "when", label: "When" },
    { key: "who", label: "Who" },
    { key: "action", label: "Did what" },
    { key: "table", label: "To" },
    { key: "changed", label: "Fields touched" },
    { key: "ip", label: "From", align: "right" },
  ];

  const rows: TableRow[] = entries.map((entry) => {
    const fields = changed(entry);
    const when = new Date(entry.created_at);
    return {
      id: entry.id,
      cells: [
        <span key="w" className="whitespace-nowrap text-[11.5px] tabular-nums text-ink-2">
          {when.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
          <span className="ml-1.5 text-ink-3">
            {when.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </span>,
        entry.user_id ? (
          <Link
            key="u"
            href={`/app/people/${entry.user_id}`}
            className="font-medium text-ink hover:underline"
          >
            {entry.user_name ?? "A deleted account"}
          </Link>
        ) : (
          <span key="u" className="text-[11.5px] text-ink-3">system</span>
        ),
        <span key="a" className="chip" style={{ color: toneFor(entry.action) }}>
          {entry.action}
        </span>,
        entry.table_name ? (
          <Link
            key="t"
            href={`/app/audit?table=${entry.table_name}`}
            className="text-[11.5px] text-ink-2 hover:underline"
          >
            {entry.table_name}
          </Link>
        ) : (
          <span key="t" className="text-ink-3">—</span>
        ),
        fields.length ? (
          <span key="f" className="flex flex-wrap gap-1">
            {fields.slice(0, 5).map((field) => (
              <span key={field} className="chip text-ink-3">{field}</span>
            ))}
            {fields.length > 5 && (
              <span className="text-[11px] text-ink-3">+{fields.length - 5}</span>
            )}
          </span>
        ) : (
          <span key="f" className="text-[11.5px] text-ink-3">—</span>
        ),
        <span key="i" className="text-[11px] tabular-nums text-ink-3">
          {entry.ip_address ?? "—"}
        </span>,
      ],
    };
  });

  return (
    <Page>
      <PageHead
        eyebrow="Platform"
        title="Audit log"
        lede="Who changed what, and when. Nothing here can be edited — that is the point."
      />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Entries" value={total.toLocaleString()} colour="var(--cobalt)"
                  footnote={term || params.table ? "matching this filter" : "all time"} />
        <StatCard label="On this page" value={String(entries.length)} colour="var(--violet)"
                  footnote={`${writers.size} distinct ${writers.size === 1 ? "person" : "people"}`} />
        <StatCard label="Tables touched" value={String(tables.length)} colour="var(--gold)"
                  footnote="on this page" />
      </section>

      <Panel
        title="The trail"
        lede="Newest first"
        accent="var(--cobalt)"
        aside={
          <form className="flex items-center gap-2">
            {params.table && <input type="hidden" name="table" value={params.table} />}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
                      aria-hidden />
              <input
                name="q"
                defaultValue={term}
                placeholder="Search action or table"
                aria-label="Search the audit log"
                className="w-56 rounded-lg border border-line bg-paper py-1.5 pl-9 pr-3 text-[12px]
                           placeholder:text-ink-3 focus:border-transparent focus:outline-none
                           focus:ring-2 focus:ring-[var(--accent)]"
              />
            </div>
            <button type="submit" className="btn btn-quiet btn-sm">Search</button>
          </form>
        }
      >
        {(term || params.table) && (
          <p className="mb-2.5 flex items-center gap-2 text-[11.5px] text-ink-3">
            <History className="h-3.5 w-3.5" aria-hidden />
            Filtered
            {params.table && <> to <strong className="text-ink-2">{params.table}</strong></>}
            {term && <> by <strong className="text-ink-2">&ldquo;{term}&rdquo;</strong></>}
            <Link href="/app/audit" className="underline hover:text-ink">clear</Link>
          </p>
        )}

        <DataTable
          columns={columns}
          rows={rows}
          empty="Nothing in the trail yet."
        />

        {pages > 1 && (
          <nav className="mt-3 flex items-center justify-between text-[11.5px] text-ink-3">
            <span className="tabular-nums">Page {page} of {pages}</span>
            <span className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/app/audit?${new URLSearchParams({
                    ...(term ? { q: term } : {}),
                    ...(params.table ? { table: params.table } : {}),
                    page: String(page - 1),
                  })}`}
                  className="btn btn-quiet btn-sm"
                >
                  Newer
                </Link>
              )}
              {page < pages && (
                <Link
                  href={`/app/audit?${new URLSearchParams({
                    ...(term ? { q: term } : {}),
                    ...(params.table ? { table: params.table } : {}),
                    page: String(page + 1),
                  })}`}
                  className="btn btn-quiet btn-sm"
                >
                  Older
                </Link>
              )}
            </span>
          </nav>
        )}
      </Panel>
    </Page>
  );
}
