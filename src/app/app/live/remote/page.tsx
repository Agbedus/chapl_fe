import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DeckRemote } from "@/components/service-deck";
import { canWrite } from "@/lib/access";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";
import { currentChurchId, requireMe } from "@/lib/session";

export const metadata = { title: "Remote — Chapl" };

/**
 * The phone remote for a presented service. It reaches the leader's own
 * screens, and the screens of every open service they could run: a
 * branch pastor's, their branch's; a church admin's, the church's. The
 * API checks each signal against the service, so the list here is a
 * courtesy, not the lock.
 */
export default async function RemotePage() {
  const me = await requireMe("/app/live/remote");
  const churchId = await currentChurchId();
  const runs = canWrite(me, "attendance") && !(me.is_platform_staff && !churchId);
  const listed = runs ? await api<Schemas["CheckInSessionList"]>("/attendance/check-in/sessions") : null;
  const sessions = listed?.ok ? listed.data.items.filter((s) => s.is_open).map((s) => s.id) : [];
  return (
    <div className="mx-auto w-full max-w-md">
      <Link href="/app/live" className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Live service
      </Link>
      <DeckRemote returnOnEnd sessions={sessions} />
    </div>
  );
}
