"use client";

import { useState } from "react";
import { branches, totals } from "@/lib/congregation";

/**
 * The congregation field — the page's signature.
 *
 * One dot is one person. Dots pack into their cell group, cells pack into
 * their branch, branches make the church. A filled dot was in a seat last
 * Sunday; a hollow one wasn't. Nothing here is ornament: the shape of the
 * drawing is the shape of the church.
 */
export function CongregationField() {
  const [focused, setFocused] = useState<string | null>(null);
  let dotIndex = 0;

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-3 lg:grid-cols-6">
        {branches.map((branch) => {
          const dimmed = focused !== null && focused !== branch.id;

          return (
            <div
              key={branch.id}
              className={`field-branch flex flex-col ${
                dimmed ? "branch-dim" : ""
              }`}
              onMouseEnter={() => setFocused(branch.id)}
              onMouseLeave={() => setFocused(null)}
            >
              <div className="mb-3 flex items-baseline gap-2">
                <span
                  className="dot mt-px shrink-0"
                  style={{ color: branch.color }}
                  aria-hidden
                />
                <span className="text-[13px] font-semibold tracking-tight text-ink">
                  {branch.name}
                </span>
              </div>

              <div
                className="flex flex-wrap gap-x-3 gap-y-3"
                style={{ color: branch.color }}
                aria-hidden
              >
                {branch.cells.map((cell) => (
                  <div key={cell.id} className="grid grid-cols-4 gap-[3px]">
                    {Array.from({ length: cell.members }, (_, i) => {
                      const delay = Math.min(dotIndex++ * 1.1, 900);
                      return (
                        <span
                          key={i}
                          className={
                            i < cell.present
                              ? "dot settle"
                              : "dot-hollow settle"
                          }
                          style={{ animationDelay: `${240 + delay}ms` }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              <p className="tnum mt-auto pt-3 text-[11px] text-ink-3">
                {branch.cells.length} cells · {branch.members} people
              </p>
            </div>
          );
        })}
      </div>

      <p className="sr-only">
        {totals.members} members across {totals.branches} branches and{" "}
        {totals.cells} cell groups. {totals.present} attended last Sunday.
      </p>
    </div>
  );
}
