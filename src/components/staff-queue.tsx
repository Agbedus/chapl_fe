import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Empty } from "@/components/panels";
import type { StaffOverview } from "@/lib/types";

const TONE = { gold: "var(--gold)", ruby: "var(--ruby)", ink: "var(--ink-3)" } as const;

/**
 * What is waiting on the platform, worst first.
 *
 * The leader's queue opens into the people behind each number; this one
 * links to the page where each kind of thing is handled, because the work
 * here is a decision on a church or an account rather than a phone call.
 * An item with no destination is something that lives in the back-end
 * admin — it is shown, with where to look, so the count is not hidden just
 * because the fix is somewhere else.
 *
 * Only what is non-zero arrives, so an empty list means exactly what it
 * says.
 */
export function StaffQueue({ items }: { items: StaffOverview["attention"] }) {
  if (items.length === 0) {
    return <Empty>Nothing is waiting on you.</Empty>;
  }

  return (
    <ul className="rows">
      {items.map((item) => {
        const body = (
          <>
            <span className="dot shrink-0" style={{ color: TONE[item.tone] }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium">{item.label}</span>
              {item.detail && (
                <span className="block truncate text-[11px] text-ink-3">{item.detail}</span>
              )}
            </span>
            <span className="figure tnum shrink-0 text-[17px]">{item.count}</span>
            {item.href && <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />}
          </>
        );
        return (
          <li key={item.key}>
            {item.href ? (
              <Link href={item.href} className="flex items-center gap-2.5 py-2 hover:text-ink">
                {body}
              </Link>
            ) : (
              <span className="flex items-center gap-2.5 py-2">{body}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
