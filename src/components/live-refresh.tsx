"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-reads the page when the live channel says something it shows has
 * changed — a service opening, the room filling, an answer coming in.
 *
 * It opens no socket of its own: the bell's connection announces every
 * message as a `chapl:live` window event, and this listens for the ones
 * whose `type` starts with `prefix`. A burst (forty people answering in
 * a second) is one refresh, not forty. A slow poll covers a socket that
 * is down, so the page is never more than `fallback` seconds behind.
 */
export function LiveRefresh({ prefix, fallback = 30 }: { prefix: string; fallback?: number }) {
  const router = useRouter();
  useEffect(() => {
    let pending: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (pending) return;
      pending = setTimeout(() => {
        pending = null;
        router.refresh();
      }, 400);
    };
    const onLive = (event: Event) => {
      const type = (event as CustomEvent<{ type?: string }>).detail?.type;
      if (type?.startsWith(prefix)) soon();
    };
    window.addEventListener("chapl:live", onLive);
    const poll = setInterval(() => {
      if (!document.hidden) soon();
    }, fallback * 1000);
    return () => {
      window.removeEventListener("chapl:live", onLive);
      clearInterval(poll);
      if (pending) clearTimeout(pending);
    };
  }, [router, prefix, fallback]);
  return null;
}
