"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { BarsChart } from "@/components/charts";

/**
 * Departments, one scope at a time.
 *
 * A flat list was unreadable for a real church: "Worship", "Ushering" and
 * "Children" exist at every branch, so a wall of cards showed the same
 * three names five times and you had to open each to find which site it
 * was. The branch is the organising fact, so it becomes the frame —
 * stepped through with arrows rather than picked from a row of pills,
 * the same control the calendar uses for its months.
 *
 * The chart and the dots answer different questions about the same
 * scope. Bars rank the teams against each other; the dot grid says how
 * many people that actually is, ten to a row, so a card's height is the
 * roster divided by ten and two teams are comparable by shape before
 * either number is read.
 */

export type DeptCard = {
  id: string;
  name: string;
  branchId: string | null;
  branchName: string;
  people: number;
  meetingDay: string | null;
  meetingTime: string | null;
  tone: string;
};

type Scope = { id: string; label: string };

export function DepartmentGrid({
  departments,
  branches,
}: {
  departments: DeptCard[];
  branches: { id: string; name: string }[];
}) {
  const churchWide = departments.filter((d) => !d.branchId);

  /*
   * The cycle: everything first, then whole-church teams, then each site
   * that actually has one. A site with no department would be a step that
   * exists only to be stepped past.
   */
  const scopes: Scope[] = [
    { id: "__all__", label: "All departments" },
    ...(churchWide.length ? [{ id: "__church__", label: "Church-wide" }] : []),
    ...branches
      .filter((b) => departments.some((d) => d.branchId === b.id))
      .map((b) => ({ id: b.id, label: b.name })),
  ];

  const [index, setIndex] = useState(0);
  const scope = scopes[Math.min(index, scopes.length - 1)];

  const shown =
    scope.id === "__all__"
      ? departments
      : scope.id === "__church__"
        ? churchWide
        : departments.filter((d) => d.branchId === scope.id);

  const ranked = [...shown].sort((a, b) => b.people - a.people);
  const serving = ranked.reduce((sum, d) => sum + d.people, 0);

  // Duplicate names are the whole problem this view exists to solve, so
  // across every branch a bar has to say which site it belongs to.
  const bars = ranked.slice(0, 10).map((d) => ({
    label: scope.id === "__all__" ? `${d.name} · ${d.branchName}` : d.name,
    value: d.people,
  }));
  const barTones = Object.fromEntries(
    ranked.slice(0, 10).map((d) => [
      scope.id === "__all__" ? `${d.name} · ${d.branchName}` : d.name,
      d.tone,
    ]),
  );

  const atStart = index <= 0;
  const atEnd = index >= scopes.length - 1;

  return (
    <div>
      {/* ---------------- the stepper ----------------
          Arrows only, disabled at either end rather than wrapping: a
          cycle that loops gives no sense of where the list stops. */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={atStart}
            aria-label="Previous branch"
            className="grid h-7 w-7 place-items-center rounded-lg text-ink-3
                       transition-colors enabled:hover:bg-sunk enabled:hover:text-ink
                       disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>

          <p className="min-w-[10.5rem] text-center text-[13px] font-semibold tracking-tight">
            {scope.label}
          </p>

          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(scopes.length - 1, i + 1))}
            disabled={atEnd}
            aria-label="Next branch"
            className="grid h-7 w-7 place-items-center rounded-lg text-ink-3
                       transition-colors enabled:hover:bg-sunk enabled:hover:text-ink
                       disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>

          {index > 0 && (
            <button
              type="button"
              onClick={() => setIndex(0)}
              className="btn btn-quiet btn-sm ml-1"
            >
              All
            </button>
          )}
        </div>

        <span className="tnum text-[11.5px] text-ink-3">
          {serving.toLocaleString()} serving across {ranked.length} team
          {ranked.length === 1 ? "" : "s"}
          <span className="ml-2 opacity-60">
            {index + 1} of {scopes.length}
          </span>
        </span>
      </div>

      {ranked.length === 0 ? (
        <p className="rounded-lg bg-mist px-4 py-10 text-center text-[12.5px] text-ink-3">
          No department at this site yet.
        </p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* ---------------- chart, left ---------------- */}
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-ink-3">
              Ranked by roster
            </p>
            <BarsChart
              data={bars}
              colorByLabel={barTones}
              height={Math.max(140, bars.length * 26 + 24)}
              ariaLabel={`People serving on each team in ${scope.label}`}
            />
          </div>

          {/* ---------------- dots, right ---------------- */}
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-[0.12em] text-ink-3">
              One dot is one person
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {ranked.slice(0, 10).map((dept) => (
                <li key={dept.id} className="sheet">
                  <div className="mb-2 flex items-baseline justify-between gap-2">
                    <span className="flex min-w-0 items-baseline gap-1.5">
                      <span
                        className="dot shrink-0 translate-y-[-1px]"
                        style={{ color: dept.tone }}
                        aria-hidden
                      />
                      <span className="truncate text-[12px] font-semibold">
                        {dept.name}
                      </span>
                    </span>
                    <span
                      className="figure shrink-0 text-[15px]"
                      style={{ color: dept.tone }}
                    >
                      {dept.people}
                    </span>
                  </div>

                  <div
                    className="grid w-fit gap-[3px]"
                    style={{
                      gridTemplateColumns: "repeat(10, minmax(0, 1fr))",
                      color: dept.tone,
                    }}
                    aria-hidden
                  >
                    {Array.from({ length: Math.min(dept.people, 60) }, (_, i) => (
                      <span key={i} className="dot" />
                    ))}
                  </div>

                  <p className="mt-2 flex items-center justify-between gap-2 text-[10px] text-ink-3">
                    <span className="truncate">
                      {scope.id === "__all__" ? dept.branchName : ""}
                    </span>
                    <span className="shrink-0 capitalize">
                      {dept.meetingDay
                        ? `${dept.meetingDay}${
                            dept.meetingTime ? ` · ${dept.meetingTime.slice(0, 5)}` : ""
                          }`
                        : "no set time"}
                    </span>
                  </p>
                </li>
              ))}
            </ul>

            {ranked.length > 10 && (
              <p className="mt-2 text-[11px] text-ink-3">
                and {ranked.length - 10} smaller team
                {ranked.length - 10 === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
