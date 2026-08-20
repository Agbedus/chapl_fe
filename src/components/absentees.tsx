"use client";

import { Phone, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { Absentee } from "@/lib/types";

/**
 * Who was not there.
 *
 * A turnout percentage tells a leader something is wrong. A list of names
 * tells them what to do about it, which is why this is the largest thing
 * on the page rather than a footnote under a chart.
 *
 * **It is ordered by how long they have been gone, not alphabetically.**
 * Someone who missed one Sunday and someone who has not been seen in a
 * month are different problems wanting different calls, and a list that
 * cannot tell them apart makes you open every record to find out. The
 * longest absences come first inside each branch, so the top of every
 * group is the work.
 *
 * The branch is a heading between the rows rather than a fourth column
 * repeated a hundred and ninety times — the value changes every few dozen
 * rows, and a column that repeats itself carries no information. Both the
 * header and the branch headings stay put while the rows scroll, so you
 * never lose which site you are looking at halfway down.
 */

/** How long ago, said the way somebody would say it out loud. */
function gapLabel(last: string | null, service: string): { text: string; tone: string } {
  if (!last) return { text: "never seen", tone: "var(--ruby)" };

  const days = Math.round(
    (new Date(service).getTime() - new Date(last).getTime()) / 86_400_000,
  );
  const weeks = Math.max(1, Math.round(days / 7));

  if (weeks <= 1) return { text: "last week", tone: "var(--ink-3)" };
  if (weeks <= 3) return { text: `${weeks} weeks ago`, tone: "var(--gold)" };
  return { text: `${weeks} weeks ago`, tone: "var(--ruby)" };
}

export function Absentees({
  people,
  service,
}: {
  people: Absentee[];
  /** The service being looked at — every gap is measured back from it. */
  service: string;
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? people.filter((p) =>
          [p.full_name, p.cell, p.branch]
            .filter(Boolean)
            .some((field) => (field as string).toLowerCase().includes(needle)),
        )
      : people;

    const byBranch = new Map<string, Absentee[]>();
    for (const person of matched) {
      const list = byBranch.get(person.branch) ?? [];
      list.push(person);
      byBranch.set(person.branch, list);
    }

    // Never seen first, then longest gap first. A null sorts above every
    // date, which is the order somebody would work in anyway.
    for (const list of byBranch.values()) {
      list.sort((a, b) => {
        if (a.last_present === b.last_present) {
          return a.full_name.localeCompare(b.full_name);
        }
        if (!a.last_present) return -1;
        if (!b.last_present) return 1;
        return a.last_present.localeCompare(b.last_present);
      });
    }

    return [...byBranch.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [people, query]);

  const shown = groups.reduce((sum, [, list]) => sum + list.length, 0);
  const stale = people.filter(
    (p) => !p.last_present || p.last_present < service,
  ).length;
  const cold = people.filter((p) => {
    if (!p.last_present) return true;
    const days =
      (new Date(service).getTime() - new Date(p.last_present).getTime()) / 86_400_000;
    return days > 14;
  }).length;

  if (people.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-line bg-mist/70 px-4 py-10 text-center text-[12.5px] text-ink-3">
        Everybody marked for this service was in a seat.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <label className="relative flex-1 sm:max-w-[16rem]">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
            aria-hidden
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a name, cell or branch"
            aria-label="Filter the people who were not there"
            className="w-full rounded-lg border border-line bg-mist py-1.5 pl-8 pr-2.5
                       text-[12px] text-ink placeholder:text-ink-3
                       transition-colors duration-150 focus:border-line-strong focus:bg-paper"
          />
        </label>

        <p className="tnum flex items-center gap-3 text-[11px] text-ink-3">
          {cold > 0 && (
            <span className="flex items-center gap-1.5">
              <span className="dot" style={{ color: "var(--ruby)" }} aria-hidden />
              {cold} gone a fortnight or more
            </span>
          )}
          <span>
            {shown === stale ? `${people.length} to reach` : `${shown} of ${people.length}`}
          </span>
        </p>
      </div>

      {groups.length === 0 ? (
        <p className="px-4 py-10 text-center text-[12px] text-ink-3">
          Nobody by that name was missing.
        </p>
      ) : (
        <div className="max-h-[27rem] overflow-y-auto rounded-xl border border-line">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="sticky top-0 z-20 bg-mist">
                <Th className="w-[34%]">Name</Th>
                <Th className="w-[22%]">Cell</Th>
                <Th className="w-[20%]">Last seen</Th>
                <Th className="text-right">Phone</Th>
              </tr>
            </thead>

            {groups.map(([branch, list]) => (
              <tbody key={branch}>
                <tr className="sticky top-[29px] z-10 bg-sunk">
                  <th colSpan={3} className="px-3 py-1.5 text-[11px] font-semibold">
                    <span className="flex items-baseline gap-2">
                      <span
                        className="dot shrink-0 translate-y-[-1px]"
                        style={{ color: "var(--violet)" }}
                        aria-hidden
                      />
                      {branch}
                    </span>
                  </th>
                  <th className="tnum px-3 py-1.5 text-right text-[10.5px] font-normal text-ink-3">
                    {list.length} to reach
                  </th>
                </tr>

                {list.map((person) => {
                  const gap = gapLabel(person.last_present, service);
                  return (
                    <tr
                      key={person.id}
                      className="border-t border-line-soft transition-colors duration-150 hover:bg-mist"
                    >
                      <td className="px-3 py-[7px]">
                        {/*
                          The link fills its cell rather than wrapping only
                          the text, so working down a list of a hundred and
                          ninety names never asks you to aim.
                        */}
                        <Link
                          href={`/app/people/${person.id}`}
                          className="block truncate text-[12px] text-ink-2 hover:text-ink"
                        >
                          {person.full_name}
                        </Link>
                      </td>
                      <td className="truncate px-3 py-[7px] text-[11.5px] text-ink-3">
                        {person.cell ?? "no cell"}
                      </td>
                      <td className="px-3 py-[7px]">
                        <span
                          className="flex items-baseline gap-1.5 text-[11.5px]"
                          style={{ color: gap.tone }}
                        >
                          <span className="dot shrink-0 translate-y-[-1px]" aria-hidden />
                          {gap.text}
                        </span>
                      </td>
                      <td className="px-3 py-[7px] text-right">
                        {person.phone_number ? (
                          <a
                            href={`tel:${person.phone_number}`}
                            className="tnum inline-flex items-center gap-1.5 text-[11.5px] text-ink-3 hover:text-ink"
                          >
                            <Phone className="h-3 w-3 shrink-0" aria-hidden />
                            {person.phone_number}
                          </a>
                        ) : (
                          <span className="text-[11.5px] text-ink-3">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ className = "", children }: { className?: string; children: string }) {
  return (
    <th
      className={`px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-3 ${className}`}
    >
      {children}
    </th>
  );
}
