"use client";

import { useActionState, useEffect } from "react";
import { FileUp } from "lucide-react";

import type { ImportState } from "@/app/actions/people-import";
import { toast } from "@/components/toaster";
import { Area, Notice, Select, Submit } from "@/components/ui/form";

type Action = (prev: ImportState, data: FormData) => Promise<ImportState>;

const TEMPLATE =
  "full_name,email,phone,gender,date_of_birth,branch,cell,household,household_role\n" +
  "Kwame Mensah,kwame@example.com,0244000000,M,25/12/1980,Adenta,Adenta 2,The Mensah family,head\n" +
  "Abena Mensah,abena@example.com,0244000001,F,04/03/1982,Adenta,Adenta 2,The Mensah family,spouse\n";

const ACTION: Record<string, { label: string; tone: string }> = {
  create: { label: "New account", tone: "var(--emerald)" },
  add: { label: "Joins this church", tone: "var(--cobalt)" },
  update: { label: "Already here — blanks filled", tone: "var(--ink-3)" },
  skip: { label: "Skipped", tone: "var(--ruby)" },
};

/**
 * Preview, then import.
 *
 * The first submit is always a dry run — the API does the whole import
 * and rolls it back — so what is on screen is exactly what "Import" will
 * do. The second posts the same text with `commit`, carried in a hidden
 * field so a file does not have to be chosen twice.
 */
export function PeopleImport({ action, branches }: { action: Action; branches: { value: string; label: string }[] }) {
  const [state, formAction] = useActionState(action, {});
  const result = state.result;

  useEffect(() => {
    if (result && !result.dry_run) {
      toast(`Imported: ${result.created} new, ${result.added} joined, ${result.updated} updated.`);
    }
  }, [result]);

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <label className="btn btn-quiet btn-sm cursor-pointer">
            <FileUp className="h-3.5 w-3.5" aria-hidden />
            Choose CSV file
            <input type="file" name="file" accept=".csv,text/csv,text/plain" className="sr-only" />
          </label>
          <a
            href={`data:text/csv;charset=utf-8,${encodeURIComponent(TEMPLATE)}`}
            download="chapl-people-template.csv"
            className="text-[12px] text-ink-3 hover:underline"
          >
            Download a template
          </a>
        </div>
        <Area
          label="Or paste rows"
          name="csv"
          rows={5}
          placeholder="Or paste rows · first line names the columns: full_name, email, phone, branch, cell, household…"
        />
        {branches.length > 1 && (
          <Select
            label="Default branch"
            name="default_branch_id"
            options={branches}
            placeholder="Branch for rows without one · optional"
          />
        )}
        <Submit full={false}>Preview</Submit>
      </form>

      {state.error && <Notice kind="error">{state.error}</Notice>}

      {result && (
        <div className="space-y-3">
          <p className="text-[13px] text-ink">
            {result.dry_run ? "If you import this: " : "Imported: "}
            <strong>{result.created}</strong> new account{result.created === 1 ? "" : "s"},{" "}
            <strong>{result.added}</strong> joining from another church,{" "}
            <strong>{result.updated}</strong> already here,{" "}
            <strong>{result.skipped}</strong> skipped
            {result.households > 0 && <>, <strong>{result.households}</strong> household{result.households === 1 ? "" : "s"}</>}.
          </p>
          <p className="text-[11.5px] text-ink-3">Columns understood: {result.columns.join(", ")}</p>

          {result.dry_run && result.created + result.added + result.updated > 0 && (
            <form action={formAction} className="flex flex-wrap items-center gap-3">
              <input type="hidden" name="csv" value={state.csv ?? ""} />
              <input type="hidden" name="default_branch_id" value={state.branch ?? ""} />
              <input type="hidden" name="commit" value="true" />
              <label className="flex items-center gap-2 text-[12.5px] text-ink-2">
                <input type="checkbox" name="send_welcome" value="true" defaultChecked={state.welcome} />
                Email new people a link to set their password
              </label>
              <Submit full={false}>
                Import {result.created + result.added + result.updated} {result.created + result.added + result.updated === 1 ? "person" : "people"}
              </Submit>
            </form>
          )}

          <div className="-mx-2 overflow-x-auto px-2">
            <table className="w-full border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-[0.1em] text-ink-3">
                  <th className="px-2 pb-2">Line</th>
                  <th className="px-2 pb-2">Person</th>
                  <th className="px-2 pb-2">Placed in</th>
                  <th className="px-2 pb-2">Household</th>
                  <th className="px-2 pb-2">What happens</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((row) => {
                  const what = ACTION[row.action] ?? ACTION.skip;
                  return (
                    <tr key={row.line} className="border-b border-line last:border-0">
                      <td className="tnum px-2 py-2 text-ink-3">{row.line}</td>
                      <td className="px-2 py-2">
                        <span className="font-medium text-ink">{row.full_name ?? "—"}</span>
                        <span className="ml-1.5 text-ink-3">{row.email}</span>
                      </td>
                      <td className="px-2 py-2 text-ink-2">{[row.branch, row.cell].filter(Boolean).join(" · ") || "—"}</td>
                      <td className="px-2 py-2 text-ink-2">
                        {row.household ? `${row.household}${row.household_role ? ` (${row.household_role})` : ""}` : "—"}
                      </td>
                      <td className="px-2 py-2" style={{ color: what.tone }}>
                        {what.label}
                        {row.reason && <span className="block text-[11.5px]">{row.reason}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
