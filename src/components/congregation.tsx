"use client";

import Link from "next/link";
import { useState } from "react";

import type { BranchRow, CellRow } from "@/lib/types";

/**
 * The congregation, drawn.
 *
 * One dot is one person. Dots pack into their cell, cells into their
 * branch, branches make the church. A filled dot was in a seat at the
 * last service; a hollow one was not.
 *
 * This is the marketing page's signature moved into the product, and it
 * earns its place here for a reason a chart cannot: it is not a summary
 * of the church, it *is* the church at one-to-one. A branch with three
 * hollow columns tells an administrator which cells, how many, and how
 * they sit next to each other — none of which a percentage says.
 *
 * **It is navigation, not decoration.** Hovering a cell names it and
 * gives its turnout; clicking a branch opens it. A one-to-one map of the
 * church that you cannot touch is a picture of the product rather than
 * the product.
 */

const BRANCH_TONES = [
  "var(--cobalt)",
  "var(--violet)",
  "var(--teal)",
  "var(--emerald)",
  "var(--gold)",
  "var(--ruby)",
];

type Cluster = { id: string; name: string; members: number; present: number; turnout: number };

type Group = {
  id: string;
  name: string;
  tone: string;
  members: number;
  present: number;
  turnout: number;
  cells: Cluster[];
};

export function CongregationField({
  branches,
  cells,
}: {
  branches: BranchRow[];
  cells: CellRow[];
}) {
  const [focused, setFocused] = useState<string | null>(null);
  const [hovered, setHovered] = useState<Cluster | null>(null);

  // Cells carry a turnout percentage, not a head count — the head count
  // is what a dot needs, so it is recovered here rather than asking the
  // API for a number it can already produce.
  const groups: Group[] = branches
    .filter((b) => b.members > 0)
    .map((branch, index) => ({
      id: branch.id,
      name: branch.name,
      tone: BRANCH_TONES[index % BRANCH_TONES.length],
      members: branch.members,
      present: branch.present,
      turnout: branch.turnout,
      cells: cells
        .filter((c) => c.branch === branch.name && c.members > 0)
        .map((c) => ({
          id: c.id,
          name: c.name,
          members: c.members,
          turnout: c.turnout,
          present: Math.round((c.members * c.turnout) / 100),
        })),
    }))
    .filter((g) => g.cells.length > 0);

  if (groups.length === 0) {
    return (
      <div className="rounded-xl bg-mist px-6 py-14 text-center">
        <p className="text-[14px] font-medium">Nobody to draw yet</p>
        <p className="measure mx-auto mt-1.5 text-[12.5px] leading-[1.6] text-ink-3">
          This becomes one dot per member as soon as a branch has people in it
          and a service has been marked.
        </p>
        <Link href="/app/branches" className="btn btn-primary btn-sm mt-4">
          Add a branch
        </Link>
      </div>
    );
  }

  // One shared counter, so the settle runs across the whole field as a
  // single wave rather than restarting inside every branch.
  let dotIndex = 0;

  return (
    <div className="field">
      <div className="grid grid-cols-2 gap-x-7 gap-y-7 sm:grid-cols-3 lg:grid-cols-6">
        {groups.map((group) => {
          const dimmed = focused !== null && focused !== group.id;

          return (
            <div
              key={group.id}
              className={`field-branch flex flex-col ${dimmed ? "branch-dim" : ""}`}
              onMouseEnter={() => setFocused(group.id)}
              onMouseLeave={() => {
                setFocused(null);
                setHovered(null);
              }}
            >
              <Link
                href={`/app/cells?branch=${group.id}`}
                className="group/branch mb-3 flex items-baseline gap-2"
              >
                <span className="dot mt-px shrink-0" style={{ color: group.tone }} aria-hidden />
                <span className="truncate text-[13px] font-semibold tracking-tight text-ink group-hover/branch:underline">
                  {group.name}
                </span>
                <span
                  className="tnum ml-auto shrink-0 text-[12px] font-semibold"
                  style={{ color: group.tone }}
                >
                  {group.turnout}%
                </span>
              </Link>

              <div
                className="flex flex-wrap gap-x-2.5 gap-y-2.5"
                style={{ color: group.tone }}
              >
                {group.cells.map((cell) => (
                  <Link
                    key={cell.id}
                    href={`/app/cells?branch=${group.id}`}
                    onMouseEnter={() => setHovered(cell)}
                    aria-label={`${cell.name}: ${cell.present} of ${cell.members} present`}
                    className={`cell-cluster grid grid-cols-3 gap-[3px] ${
                      hovered && hovered.id === cell.id ? "cell-lit" : ""
                    }`}
                  >
                    {Array.from({ length: cell.members }, (_, i) => {
                      const delay = Math.min(dotIndex++ * 0.9, 700);
                      return (
                        <span
                          key={i}
                          className={i < cell.present ? "dot settle" : "dot-hollow settle"}
                          style={{ animationDelay: `${160 + delay}ms` }}
                          aria-hidden
                        />
                      );
                    })}
                  </Link>
                ))}
              </div>

              {/*
                The caption becomes the hovered cell's own numbers. One
                line that changes rather than a tooltip that floats: at
                this density a floating box would cover the dots it is
                describing.
              */}
              <p className="tnum mt-auto pt-3 text-[11.5px] leading-tight">
                {hovered && focused === group.id ? (
                  <span style={{ color: group.tone }}>
                    {hovered.name} · {hovered.present}/{hovered.members}
                  </span>
                ) : (
                  <span className="text-ink-3">
                    {group.present} of {group.members} · {group.cells.length} cell
                    {group.cells.length === 1 ? "" : "s"}
                  </span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
