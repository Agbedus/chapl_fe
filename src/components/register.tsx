"use client";

/**
 * Taking the register.
 *
 * The one thing a church does every single week, and the reason every
 * attendance figure in this product exists. It was the only part of
 * the loop missing: the dashboard could draw turnout, the attendance
 * page could report on a service, and nothing could record one.
 *
 * Three decisions worth knowing:
 *
 * **Present is the default.** A roll call marks who came, and in a
 * healthy cell that is most of it — starting from all-absent means
 * forty taps to record a normal Tuesday. `Everyone` and `Nobody` are
 * there because the two-thirds case is faster from one end or the
 * other.
 *
 * **It posts once.** Every mark travels in a single `FormData` to
 * `takeRegister`, which sends one bulk request. A checkbox per person
 * hitting the API per change would be forty requests and a sheet that
 * can end half-written.
 *
 * **An unchecked box sends nothing**, which is how HTML forms work and
 * is a trap here: the absent would simply vanish rather than being
 * recorded as absent. So the whole roster rides along in hidden inputs
 * and the action takes the difference.
 */

import { Check, Search, UserCheck, UserX, Users } from "lucide-react";
import { useActionState, useMemo, useState } from "react";

import { takeRegister } from "@/app/actions/manage";
import type { FormState } from "@/app/actions/auth";
import { Notice, Submit } from "@/components/ui/form";

export type RegisterPerson = {
  id: string;
  full_name: string;
  cell_name: string | null;
  branch_name: string | null;
};

const EMPTY: FormState = {};

export function Register({
  people,
  date,
  serviceDay,
}: {
  people: RegisterPerson[];
  date: string;
  serviceDay: string;
}) {
  const [state, formAction] = useActionState(takeRegister, EMPTY);
  const [present, setPresent] = useState<Set<string>>(
    () => new Set(people.map((p) => p.id)),
  );
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return people;
    return people.filter(
      (p) =>
        p.full_name.toLowerCase().includes(term) ||
        (p.cell_name ?? "").toLowerCase().includes(term),
    );
  }, [people, query]);

  // Grouped by cell, because that is the unit the sheet is read in: one
  // person calls one cell's names, and a flat list of four hundred
  // makes them hunt for each one.
  const groups = useMemo(() => {
    const out = new Map<string, RegisterPerson[]>();
    for (const person of shown) {
      const key = person.cell_name ?? "No cell";
      const list = out.get(key) ?? [];
      list.push(person);
      out.set(key, list);
    }
    return [...out.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [shown]);

  function toggle(id: string) {
    setPresent((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setAll(ids: string[], value: boolean) {
    setPresent((current) => {
      const next = new Set(current);
      for (const id of ids) {
        if (value) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  const counted = present.size;
  const missing = people.length - counted;
  const pct = people.length ? Math.round((counted / people.length) * 100) : 0;

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="attendance_date" value={date} />
      <input type="hidden" name="service_day" value={serviceDay} />
      {/* The sheet, so the action can tell absent from simply not sent. */}
      {people.map((person) => (
        <input key={person.id} type="hidden" name="roster" value={person.id} />
      ))}

      {state.error && <Notice kind="error">{state.error}</Notice>}
      {state.message && <Notice kind="success">{state.message}</Notice>}

      {/* The running count, pinned. Whoever is holding the sheet wants
          to know the number without scrolling back to the top. */}
      <div className="sheet sticky top-20 z-20 flex flex-wrap items-center gap-x-5 gap-y-2">
        <span className="flex items-baseline gap-1.5">
          <span className="figure text-[20px]" style={{ color: "var(--emerald)" }}>
            {counted}
          </span>
          <span className="text-[11px] text-ink-3">present</span>
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="figure text-[20px] text-ink-3">{missing}</span>
          <span className="text-[11px] text-ink-3">missing</span>
        </span>
        <span className="flex items-baseline gap-1.5">
          <span className="figure text-[20px]" style={{ color: "var(--gold)" }}>{pct}%</span>
          <span className="text-[11px] text-ink-3">turnout</span>
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={() => setAll(people.map((p) => p.id), true)}
                  className="btn btn-quiet btn-sm">
            <UserCheck className="h-3.5 w-3.5" aria-hidden />
            Everyone
          </button>
          <button type="button" onClick={() => setAll(people.map((p) => p.id), false)}
                  className="btn btn-quiet btn-sm">
            <UserX className="h-3.5 w-3.5" aria-hidden />
            Nobody
          </button>
          <Submit full={false}>Save the register</Submit>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
                aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a name or a cell"
          aria-label="Filter the sheet"
          className="w-full rounded-xl border border-line bg-paper py-2.5 pl-10 pr-3.5 text-[13px]
                     transition-colors placeholder:text-ink-3 hover:border-line-strong
                     focus:border-transparent focus:outline-none focus:ring-2
                     focus:ring-[var(--accent)]"
        />
      </div>

      {groups.length === 0 ? (
        <p className="sheet text-[12.5px] text-ink-3">Nobody matches that.</p>
      ) : (
        groups.map(([cell, members]) => {
          const ids = members.map((m) => m.id);
          const here = ids.filter((id) => present.has(id)).length;
          return (
            <section key={cell} className="sheet">
              <header className="mb-2.5 flex items-center gap-2.5">
                <Users className="h-3.5 w-3.5" style={{ color: "var(--teal)" }} aria-hidden />
                <h2 className="text-[13px] font-semibold text-ink">{cell}</h2>
                <span className="text-[11px] tabular-nums text-ink-3">
                  {here}/{members.length}
                </span>
                <div className="ml-auto flex gap-1.5">
                  <button type="button" onClick={() => setAll(ids, true)}
                          className="text-[11px] text-ink-3 transition-colors hover:text-ink">
                    All
                  </button>
                  <span className="text-[11px] text-ink-3" aria-hidden>·</span>
                  <button type="button" onClick={() => setAll(ids, false)}
                          className="text-[11px] text-ink-3 transition-colors hover:text-ink">
                    None
                  </button>
                </div>
              </header>

              <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((person) => {
                  const here = present.has(person.id);
                  return (
                    <li key={person.id}>
                      {/*
                        A label wrapping a real checkbox: the whole row is
                        the target, the keyboard reaches it, and a screen
                        reader is told what it is — none of which a div
                        with an onClick gives you.
                      */}
                      <label className="register-row" data-present={here}>
                        <input
                          type="checkbox"
                          name="present"
                          value={person.id}
                          checked={here}
                          onChange={() => toggle(person.id)}
                        />
                        <span className="register-tick" aria-hidden>
                          {here && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                        <span className="min-w-0 truncate text-[12.5px]">
                          {person.full_name}
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </form>
  );
}
