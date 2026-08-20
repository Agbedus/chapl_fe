import Link from "next/link";

import { Empty, Page, PageHead, Panel } from "@/components/panels";
import { api } from "@/lib/api";
import type { Paged } from "@/lib/types";

type Column<T> = {
  key: keyof T & string;
  label: string;
  align?: "left" | "right";
  render?: (row: T) => React.ReactNode;
};

/** Rows per page. A table exists so the eye can meet a manageable chunk. */
const PAGE = 50;

/**
 * A read-only list of records — a table, paginated.
 *
 * Header alignment follows the column, not the other way round — a label
 * set left above a column of right-set figures reads as though it has come
 * loose from its data.
 *
 * Rows are separated by a hairline and nothing else: no zebra striping, no
 * cell borders. A grid drawn in full is a grid you read the lines of
 * instead of the numbers. Anything past `PAGE` rows becomes a second page
 * rather than a scroll, because the page number is the bookmark.
 */
export async function RecordTable<T extends { id: string }>({
  eyebrow = "Records",
  title,
  lede,
  path,
  columns,
  empty,
  searchParams,
}: {
  eyebrow?: string;
  title: string;
  lede: string;
  /** The collection, without its own limit/skip. */
  path: string;
  columns: Column<T>[];
  empty: string;
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const sep = path.includes("?") ? "&" : "?";
  const result = await api<Paged<T>>(
    `${path}${sep}limit=${PAGE}&skip=${(page - 1) * PAGE}`,
  );

  const total = result.ok ? result.data.total : 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const from = (page - 1) * PAGE + 1;
  const to = Math.min((page - 1) * PAGE + PAGE, total);

  return (
    <Page>
      <PageHead
        eyebrow={eyebrow}
        title={title}
        lede={lede}
        action={
          result.ok ? (
            <p className="tnum text-[13px] text-ink-3">
              {total.toLocaleString()} record
              {total === 1 ? "" : "s"}
            </p>
          ) : undefined
        }
      />

      <Panel>
        {!result.ok ? (
          <Empty>{result.error.detail}</Empty>
        ) : result.data.items.length === 0 ? (
          <Empty>{empty}</Empty>
        ) : (
          <>
            <div className="-mx-2 overflow-x-auto px-2">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-line">
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={`whitespace-nowrap px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3 ${
                          column.align === "right" ? "text-right" : "text-left"
                        }`}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.data.items.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-line transition-colors last:border-0 hover:bg-mist"
                    >
                      {columns.map((column) => (
                        <td
                          key={column.key}
                          className={`whitespace-nowrap px-3 py-3.5 text-[14px] text-ink-2 ${
                            column.align === "right" ? "tnum text-right" : "text-left"
                          }`}
                        >
                          {column.render
                            ? column.render(row)
                            : String(row[column.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3.5">
                <p className="tnum text-[12px] text-ink-3">
                  {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
                </p>
                <div className="flex items-center gap-2">
                  <Pager page={page} pages={pages} />
                </div>
              </div>
            )}
          </>
        )}
      </Panel>
    </Page>
  );
}

function Pager({ page, pages }: { page: number; pages: number }) {
  return (
    <>
      {page > 1 && (
        <Link
          href={`?page=${page - 1}`}
          className="btn btn-quiet btn-sm"
          aria-label="Previous page"
        >
          Previous
        </Link>
      )}
      <span className="tnum px-1 text-[12px] text-ink-3">
        Page {page} of {pages}
      </span>
      {page < pages && (
        <Link
          href={`?page=${page + 1}`}
          className="btn btn-quiet btn-sm"
          aria-label="Next page"
        >
          Next
        </Link>
      )}
    </>
  );
}