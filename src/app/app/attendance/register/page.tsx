import Link from "next/link";
import { ArrowLeft, CalendarDays } from "lucide-react";

import { Page, PageHead } from "@/components/panels";
import { Register, type RegisterPerson } from "@/components/register";
import { Notice } from "@/components/ui/form";
import { DateField } from "@/components/ui/pickers";
import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import type { Branch, Cell, Membership, Paged, Person } from "@/lib/types";

export const metadata = { title: "Take the register — Chapl" };

/*
 * How much of the roll to ask for.
 *
 * Not a guess at the API's ceiling — it has none, and a church of 822
 * comes back whole at this limit. The first version asked for 500 and
 * announced "the first 500 people", which was wrong in the worse
 * direction: the names it dropped were dropped from the *sheet*, so
 * those people were neither present nor absent, they simply were not
 * asked about.
 */
const FETCH = 2000;

const DAYS = [
  "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
] as const;

/**
 * The sheet.
 *
 * Built on the server so the roll arrives with the page rather than
 * after it — whoever is holding this is standing in a hall, often on a
 * phone, and a spinner followed by four hundred names is worse than a
 * page that takes a moment.
 *
 * The date and service day are resolved **here**, not in the browser.
 * `new Date()` in a client render is impure — it disagrees between the
 * server pass and the hydration pass, and React throws away the subtree
 * to fix it. The same rule that made the calendar format its own times
 * longhand.
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; branch?: string; cell?: string }>;
}) {
  await requireMe("/app/attendance/register");
  const params = await searchParams;

  const now = new Date();
  const today = params.date ?? now.toISOString().slice(0, 10);
  const serviceDay = DAYS[new Date(`${today}T12:00:00`).getDay()];

  // The roll comes from `/memberships/`, not `/users/` — a user row
  // carries no branch or cell, and the sheet is read cell by cell. It
  // also lets the API do the narrowing rather than fetching everybody
  // and throwing most of them away here.
  const scope = new URLSearchParams({ limit: String(FETCH) });
  if (params.cell) scope.set("cell_id", params.cell);
  else if (params.branch) scope.set("branch_id", params.branch);

  const [roster, people, branches, cells] = await Promise.all([
    api<Paged<Membership>>(`/memberships/?${scope}`),
    api<Paged<Person>>(`/users/?limit=${FETCH}&sort=full_name&order=asc`),
    api<Paged<Branch>>("/branches/?limit=200&sort=name&order=asc"),
    api<Paged<Cell>>("/cells/?limit=400&sort=name&order=asc"),
  ]);

  if (!roster.ok) {
    return (
      <Page>
        <PageHead eyebrow="Attendance" title="Take the register" />
        <Notice kind="error">{roster.error.detail}</Notice>
      </Page>
    );
  }
  if (!people.ok) {
    return (
      <Page>
        <PageHead eyebrow="Attendance" title="Take the register" />
        <Notice kind="error">{people.error.detail}</Notice>
      </Page>
    );
  }

  const named = new Map(people.data.items.map((p) => [p.id, p.full_name]));
  const branchName = new Map(
    branches.ok ? branches.data.items.map((b) => [b.id, b.name]) : [],
  );
  const cellName = new Map(cells.ok ? cells.data.items.map((c) => [c.id, c.name]) : []);

  const roll: RegisterPerson[] = roster.data.items
    .filter((m): m is typeof m & { user_id: string } => m.is_active && m.user_id !== null && named.has(m.user_id))
    .map((m) => ({
      id: m.user_id,
      full_name: named.get(m.user_id) as string,
      cell_name: m.cell_id ? (cellName.get(m.cell_id) ?? null) : null,
      branch_name: branchName.get(m.branch_id) ?? null,
    }))
    .sort((a, b) => a.full_name.localeCompare(b.full_name));

  // The list endpoint reports the page length as the total, so a roll
  // that comes back exactly at the limit is a roll that may have been
  // cut. Saying so is the difference between an incomplete register and
  // one somebody trusts.
  const truncated = roster.data.items.length >= FETCH;

  const narrowed =
    (params.cell && cellName.get(params.cell)) ||
    (params.branch && branchName.get(params.branch)) ||
    null;

  return (
    <Page quiet>
      <PageHead
        eyebrow="Attendance"
        title="Take the register"
        lede={
          narrowed
            ? `${roll.length} on the sheet · ${narrowed}`
            : `${roll.length} on the sheet · the whole church`
        }
        action={
          <Link href="/app/attendance" className="btn btn-quiet btn-sm">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Back to attendance
          </Link>
        }
      />

      <div className="sheet flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-center gap-2 text-[12.5px] text-ink-2">
          <CalendarDays className="h-3.5 w-3.5 text-ink-3" aria-hidden />
          {new Date(`${today}T12:00:00`).toLocaleDateString("en-GB", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </span>
        <span className="text-[11px] uppercase tracking-[0.1em] text-ink-3">
          {serviceDay} service
        </span>
        {/*
          Narrowing is a navigation, not a form field — the sheet is
          re-fetched for that scope rather than filtered in the browser,
          so the API does the work and the URL is something a cell
          leader can bookmark for next Tuesday.

          The page read `?branch=` and `?cell=` from the day it was
          written and offered no way to set them, which meant the only
          sheet anybody could reach was the whole church.
        */}
        <form className="ml-auto flex flex-wrap items-center gap-2">
          <input type="hidden" name="date" value={today} />
          <select
            name="branch"
            defaultValue={params.branch ?? ""}
            aria-label="Narrow to a branch"
            className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[12px] text-ink"
          >
            <option value="">The whole church</option>
            {(branches.ok ? branches.data.items : []).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <select
            name="cell"
            defaultValue={params.cell ?? ""}
            aria-label="Narrow to a cell"
            className="rounded-lg border border-line bg-paper px-2.5 py-1.5 text-[12px] text-ink"
          >
            <option value="">Every cell</option>
            {(cells.ok ? cells.data.items : []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {/* A `<select>` in a GET form navigates nowhere on its own,
              and auto-submitting on change would need this page to be a
              client component for the sake of two dropdowns. */}
          <button type="submit" className="btn btn-quiet btn-sm">Show</button>
        </form>

        <form className="flex items-center gap-2">
          {params.branch && <input type="hidden" name="branch" value={params.branch} />}
          {params.cell && <input type="hidden" name="cell" value={params.cell} />}
          {/* `DateField`, not `type="date"` — there are none of those
              left in this app, and a GET form takes its hidden value
              exactly like a POST one does. */}
          <div className="w-44">
            <DateField label="Service date" name="date" required defaultValue={today}
                       startYear={new Date(today).getFullYear()} />
          </div>
          <button type="submit" className="btn btn-quiet btn-sm">Change date</button>
        </form>
      </div>

      {truncated && (
        <Notice kind="info">
          This sheet is showing the first {FETCH} people. Narrow it to a branch or a
          cell before marking, or some of the church will be left off the register.
        </Notice>
      )}

      {roll.length === 0 ? (
        <Notice kind="info">
          Nobody is on this sheet. Place people into a branch and a cell first.
        </Notice>
      ) : (
        <Register people={roll} date={today} serviceDay={serviceDay} />
      )}
    </Page>
  );
}
