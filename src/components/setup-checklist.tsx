import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";

import type { Dashboard } from "@/lib/types";

/**
 * The order a church actually gets set up in.
 *
 * Each step is inferred from the data rather than from a stored flag, so
 * it cannot disagree with reality — a church that adds its first branch
 * through the API sees the step tick without anything having to remember
 * to write it down.
 *
 * The whole block disappears once every step is done. A checklist that
 * stays on screen forever stops being a checklist and becomes furniture.
 */
export function SetupChecklist({
  data,
  invitations,
  hasTeam,
}: {
  data: Dashboard;
  invitations: number;
  hasTeam: boolean;
}) {
  const branches = data.branches.length;
  const cells = data.cells.length;
  const people = data.growth.at(-1)?.total ?? 0;
  const attendance = data.trend.length;

  const steps = [
    {
      done: branches > 0,
      label: "Add your first branch",
      note: "A branch is a place you meet. Everything else hangs off one.",
      href: "/app/branches",
      cta: "Add a branch",
    },
    {
      done: cells > 0,
      label: "Create a cell",
      note: "The small group where attendance and care actually happen.",
      href: "/app/cells",
      cta: "Add a cell",
    },
    {
      done: people > 1 || invitations > 0,
      label: "Invite someone",
      note: "An invitation places them in a branch the moment they accept.",
      href: "/app/invitations",
      cta: "Invite someone",
    },
    {
      done: hasTeam,
      label: "Give someone a role",
      note: "A pastor or a cell leader, so you are not the only one who can act.",
      href: "/app/team",
      cta: "Grant a role",
    },
    {
      done: attendance > 0,
      label: "Mark a service",
      note: "The first roll call is what every figure on this page is built from.",
      href: "/app/attendance",
      cta: "Mark attendance",
    },
  ];

  const remaining = steps.filter((s) => !s.done);
  if (remaining.length === 0) return null;

  const next = remaining[0];
  const done = steps.length - remaining.length;

  return (
    <section className="sheet">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="eyebrow text-ink-3">Getting started</p>
          <h2 className="head mt-2.5 text-[19px]">
            {done === 0
              ? "Set up your church"
              : `${done} of ${steps.length} done — next, ${next.label.toLowerCase()}`}
          </h2>
        </div>
        <Link
          href={next.href}
          className="btn btn-primary btn-sm"
        >
          {next.cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>

      <ol className="mt-6 space-y-3.5">
        {steps.map((step) => (
          <li key={step.label} className="flex items-start gap-3">
            <span
              className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border"
              style={{
                borderColor: step.done ? "var(--emerald)" : "var(--line-strong)",
                background: step.done ? "var(--emerald)" : "transparent",
              }}
              aria-hidden
            >
              {step.done && <Check className="h-2.5 w-2.5" style={{ color: "var(--paper)" }} />}
            </span>
            <span className="min-w-0">
              <span
                className="block text-[14.5px] font-medium"
                style={{ color: step.done ? "var(--ink-3)" : "var(--ink)" }}
              >
                {step.done ? <s>{step.label}</s> : step.label}
              </span>
              {!step.done && (
                <span className="mt-0.5 block text-[13px] leading-[1.5] text-ink-3">{step.note}</span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
