"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Re-reads the page every so often while it is on screen.
 *
 * For a view that is a window onto traffic — the platform's notification
 * feed — where a second live socket would be one more thing to keep
 * alive for a page somebody glances at. Paused while the tab is hidden.
 */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
