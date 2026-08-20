"use client";

import { Check, Pencil, X } from "lucide-react";
import { useActionState, useState, type ReactNode } from "react";

import type { FormState } from "@/app/actions/auth";

/**
 * A real table: one column per field, one header per column.
 *
 * The earlier lists split every record into a name on the left and a blob
 * of metadata on the right, which reads fine for one row and stops being
 * comparable at ten — the whole reason to put records in a table is that
 * the eye can run down a column.
 *
 * **Nothing but data crosses the boundary.** This is a client component,
 * so it cannot take `render: (row) => ...` or `value: (row) => ...`
 * callbacks: a function cannot be passed from a Server Component, and
 * doing it fails at request time with "Functions cannot be passed
 * directly to Client Components" — which type-checks and builds cleanly
 * first. The server renders each cell to a `ReactNode` and hands over the
 * finished elements; the edit inputs arrive as plain strings.
 *
 * **Editing happens in the row.** A pencil turns that row's editable
 * cells into inputs; tick saves, cross cancels. Nothing navigates and
 * nothing opens a modal, so the row you were reading is the row you are
 * changing. Cells with no field keep their rendered value, which is what
 * stops the columns shifting under the cursor.
 */

export type TableColumn = {
  key: string;
  label: string;
  align?: "left" | "right";
  width?: string;
};

export type TableField = {
  /** The column this input sits in. */
  key: string;
  /** The form field it writes to. */
  name: string;
  type?: "text" | "number" | "date" | "time";
  value: string;
  options?: { value: string; label: string }[];
};

export type TableRow = {
  id: string;
  /** One finished element per column, in column order. */
  cells: ReactNode[];
  /** Only the columns this viewer may change. */
  fields?: TableField[];
  /** Everything the action needs that is not on screen. */
  hidden?: Record<string, string>;
};

export function DataTable({
  columns,
  rows,
  action,
  canEdit = false,
  empty,
  fill = false,
  footer,
}: {
  columns: TableColumn[];
  rows: TableRow[];
  action?: (state: FormState, data: FormData) => Promise<FormState>;
  canEdit?: boolean;
  empty: string;
  /** Take the rest of the panel and scroll the rows inside it. */
  fill?: boolean;
  /** One cell per column, pinned to the bottom. Totals, usually. */
  footer?: ReactNode[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const editable = canEdit && Boolean(action);

  if (rows.length === 0) {
    return (
      <p className="rounded-lg bg-mist px-4 py-10 text-center text-[12.5px] text-ink-3">
        {empty}
      </p>
    );
  }

  return (
    <div className={fill ? "table-fill -mx-1 px-1" : "-mx-1 overflow-x-auto px-1"}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th
                key={column.key}
                style={column.width ? { width: column.width } : undefined}
                className={`whitespace-nowrap px-2.5 pb-2 text-[10px] font-semibold uppercase
                            tracking-[0.12em] text-ink-3 ${
                              column.align === "right" ? "text-right" : "text-left"
                            }`}
              >
                {column.label}
              </th>
            ))}
            {editable && <th className="w-px pb-2" aria-label="Actions" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) =>
            editing === row.id && action ? (
              <EditRow
                key={row.id}
                row={row}
                columns={columns}
                action={action}
                onDone={() => setEditing(null)}
              />
            ) : (
              <tr
                key={row.id}
                className="border-b border-line transition-colors last:border-0 hover:bg-mist"
              >
                {columns.map((column, i) => (
                  <td
                    key={column.key}
                    className={`px-2.5 py-2.5 text-[12.5px] text-ink-2 ${
                      column.align === "right" ? "tnum text-right" : "text-left"
                    }`}
                  >
                    {row.cells[i]}
                  </td>
                ))}
                {editable && (
                  <td className="px-1 py-2.5 text-right">
                    {row.fields && row.fields.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => setEditing(row.id)}
                        aria-label="Edit row"
                        className="grid h-6 w-6 place-items-center rounded-md text-ink-3
                                   transition-colors hover:bg-sunk hover:text-ink"
                      >
                        <Pencil className="h-3 w-3" aria-hidden />
                      </button>
                    ) : null}
                  </td>
                )}
              </tr>
            ),
          )}
        </tbody>

        {/* Totals stay in view. A footer that scrolls away from the rows
            it sums is a footer you scroll back down to find. */}
        {footer && (
          <tfoot>
            <tr>
              {columns.map((column, i) => (
                <td
                  key={column.key}
                  className={`whitespace-nowrap px-2.5 py-2 text-[11.5px] font-semibold ${
                    column.align === "right" ? "tnum text-right" : "text-left"
                  }`}
                >
                  {footer[i]}
                </td>
              ))}
              {editable && <td />}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

/**
 * The same row with inputs in it.
 *
 * There is no `<form>` inside the row: a form element is not valid there
 * and the HTML parser will hoist it out. The inputs point at a form by
 * `id` instead, which is the one way to post a table row intact.
 */
function EditRow({
  row,
  columns,
  action,
  onDone,
}: {
  row: TableRow;
  columns: TableColumn[];
  action: (state: FormState, data: FormData) => Promise<FormState>;
  onDone: () => void;
}) {
  const [state, formAction] = useActionState(action, {} as FormState);
  const byColumn = new Map((row.fields ?? []).map((f) => [f.key, f]));
  const formId = `row-${row.id}`;

  // A save that landed closes the row. One that failed stays open with
  // the reason beside it, so the typing is never thrown away.
  if (state.message && !state.error) queueMicrotask(onDone);

  return (
    <tr className="border-b border-line last:border-0" style={{ background: "var(--mist)" }}>
      {columns.map((column, i) => {
        const field = byColumn.get(column.key);
        return (
          <td key={column.key} className="px-2.5 py-1.5">
            {field ? (
              field.options ? (
                <select
                  form={formId}
                  name={field.name}
                  defaultValue={field.value}
                  className="w-full rounded-md border border-line-strong bg-paper px-2 py-1
                             text-[12px] text-ink focus:border-transparent focus:outline-none
                             focus:ring-2 focus:ring-[var(--accent)]"
                >
                  {field.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  form={formId}
                  name={field.name}
                  type={field.type ?? "text"}
                  defaultValue={field.value}
                  className="w-full rounded-md border border-line-strong bg-paper px-2 py-1
                             text-[12px] text-ink focus:border-transparent focus:outline-none
                             focus:ring-2 focus:ring-[var(--accent)]"
                />
              )
            ) : (
              <span className="text-[12px] opacity-55">{row.cells[i]}</span>
            )}
          </td>
        );
      })}

      <td className="whitespace-nowrap px-1 py-1.5 text-right">
        <form action={formAction} id={formId} className="inline-flex">
          {Object.entries(row.hidden ?? { id: row.id }).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <button
            type="submit"
            aria-label="Save row"
            className="grid h-6 w-6 place-items-center rounded-md transition-colors
                       hover:bg-[color-mix(in_oklab,var(--emerald)_14%,transparent)]"
            style={{ color: "var(--emerald)" }}
          >
            <Check className="h-3.5 w-3.5" aria-hidden />
          </button>
        </form>
        <button
          type="button"
          onClick={onDone}
          aria-label="Cancel edit"
          className="ml-1 grid h-6 w-6 place-items-center rounded-md text-ink-3
                     transition-colors hover:bg-sunk hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
        {state.error && (
          <span className="ml-2 text-[10.5px]" style={{ color: "var(--ruby)" }}>
            {state.error}
          </span>
        )}
      </td>
    </tr>
  );
}
