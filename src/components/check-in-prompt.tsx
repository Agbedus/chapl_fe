import Link from "next/link";

import { checkIn } from "@/app/actions/manage";
import { CheckInBox } from "@/components/editors";
import { Panel } from "@/components/panels";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";

/**
 * "Check-in is open" — at the top of the dashboard, only while it is.
 *
 * The member was just sent a notification saying so; the place it lands
 * should have the box in it, not a link to find the box. Renders nothing
 * once they are checked in or when no service is open.
 */
export async function CheckInPrompt() {
  const result = await api<Schemas["CheckInAvailable"][]>("/attendance/check-in/open");
  const open = result.ok ? result.data.filter((s) => !s.checked_in) : [];
  if (open.length === 0) return null;
  const first = open[0];
  return (
    <Panel
      title="Check-in is open"
      lede={`${first.branch_name ?? "The whole church"} · ${first.service_day} service. Type the code shown at church.`}
      accent="var(--gold)"
      aside={<Link href="/app/check-in" className="text-[11.5px] text-ink-3 hover:underline">More</Link>}
    >
      <CheckInBox action={checkIn} />
    </Panel>
  );
}
