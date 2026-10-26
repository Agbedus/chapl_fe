"use server";

/**
 * Importing a spreadsheet of people.
 *
 * Its own module because it returns more than a `FormState`: the preview
 * is a table, one row per line of the file, and the page needs all of it
 * to show what will happen before anything does. The CSV text travels
 * through the server action like any other form field, so the token
 * stays in the httpOnly cookie as it does everywhere else.
 */

import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";

export type ImportResult = Schemas["PeopleImportResult"];

export type ImportState = {
  error?: string;
  result?: ImportResult;
  /** The text that was previewed, so "Import these" commits exactly it. */
  csv?: string;
  branch?: string;
  welcome?: boolean;
};

export async function importPeople(_prev: ImportState, data: FormData): Promise<ImportState> {
  let csv = String(data.get("csv") ?? "");
  const file = data.get("file");
  if (file && typeof file === "object" && "text" in file && file.size > 0) {
    if (file.size > 2_000_000) return { error: "That file is over 2 MB. Split it and import the parts." };
    csv = await file.text();
  }
  csv = csv.trim();
  const branch = String(data.get("default_branch_id") ?? "").trim();
  const welcome = data.get("send_welcome") === "true";
  if (!csv) return { error: "Choose a CSV file, or paste the rows." };

  const commit = data.get("commit") === "true";
  const result = await api<ImportResult>("/users/import", {
    method: "POST",
    body: {
      csv,
      default_branch_id: branch || null,
      dry_run: !commit,
      send_welcome: commit && welcome,
    },
  });
  if (!result.ok) return { error: result.error.detail, csv, branch, welcome };

  if (commit) {
    revalidatePath("/app/people");
    revalidatePath("/app/households");
  }
  return { result: result.data, csv, branch, welcome };
}
