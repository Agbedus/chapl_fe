import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { DeckRemote } from "@/components/service-deck";
import { requireMe } from "@/lib/session";

export const metadata = { title: "Remote — Chapl" };

/**
 * The phone remote for a presented service. It talks to the screen
 * through the leader's own live channel, so it needs nothing but the
 * same sign-in on both devices.
 */
export default async function RemotePage() {
  await requireMe("/app/live/remote");
  return (
    <div className="mx-auto w-full max-w-md">
      <Link href="/app/live" className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-ink-3 hover:text-ink">
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Live service
      </Link>
      <DeckRemote returnOnEnd />
    </div>
  );
}
