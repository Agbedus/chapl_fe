"use client";

import { Radio } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * The way into Live service, in the top bar where it cannot be missed.
 *
 * It was one row among eleven in the side nav, and on a Sunday morning
 * it is the one page that matters. Here it is a dark button of its own,
 * the control room's colour, and when a service is open it says so:
 * a pulsing dot and "On air", so a leader walking in sees from any page
 * that the room is live. It shows only with one church in scope (the
 * layout decides), because a service belongs to a church.
 *
 * It listens on the bell's connection for a service opening or closing
 * and re-reads the page then, and only then: the room filling and the
 * answers coming in are the live page's business, not every page's.
 */
export function LiveServiceLink({ onAir }: { onAir: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const here = pathname === "/app/live" || pathname.startsWith("/app/live/");

  useEffect(() => {
    let timer = 0;
    const onLive = (event: Event) => {
      const type = (event as CustomEvent<{ type?: string }>).detail?.type;
      if (type !== "service.opened" && type !== "service.closed") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => router.refresh(), 400);
    };
    window.addEventListener("chapl:live", onLive);
    return () => {
      window.removeEventListener("chapl:live", onLive);
      window.clearTimeout(timer);
    };
  }, [router]);

  const label = onAir > 0 ? (onAir > 1 ? `${onAir} on air` : "On air") : "Live service";
  return (
    <Link
      href="/app/live"
      className="live-link"
      data-on-air={onAir > 0 ? "" : undefined}
      aria-current={here ? "page" : undefined}
      aria-label={onAir > 0 ? `Live service, ${label.toLowerCase()}` : "Live service"}
      title={onAir > 0 ? "A service is open" : "Open the live service"}
    >
      {onAir > 0 ? <span className="live-link-dot" aria-hidden /> : <Radio className="h-4 w-4" aria-hidden />}
      <span className="live-link-text">{label}</span>
    </Link>
  );
}
