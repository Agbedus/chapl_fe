"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { X } from "lucide-react";
import type { Me } from "@/lib/types";

export function ProfileDot({ incomplete }: { incomplete: boolean }) {
  if (!incomplete) return null;
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--gold)" }}><span className="sr-only">Complete your profile</span></span>;
}

/**
 * The profile nudge, shown once and then put away.
 *
 * It used to sit at the top of every page, which spent about 80px of every
 * screen on something answered in a minute and then ignored for a month.
 * Dismissing it is remembered against the *set of things still missing*, so
 * it comes back only if what is missing changes. The gold dot beside the
 * account link in the sidebar stays either way, so the way back in is never
 * hidden.
 *
 * The dismissal lives in `localStorage` and is read with
 * `useSyncExternalStore`: the server and the first paint both say "not
 * dismissed", so there is no state change in an effect and no hydration
 * mismatch.
 */
const KEY = "chapl:profile-prompt";
const listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  listeners.add(fn);
  window.addEventListener("storage", fn);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", fn);
  };
}

function read(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function ProfileCompletionPrompt({ profile }: { profile: Me["profile_completion"] }) {
  const missing = Object.values(profile.missing).join(", ");
  const dismissed = useSyncExternalStore(subscribe, read, () => "");

  if (profile.complete || dismissed === missing) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(KEY, missing);
    } catch {
      /* private mode: it simply comes back next page */
    }
    listeners.forEach((fn) => fn());
  };

  return (
    <aside className="profile-prompt" aria-label="Profile completion">
      <p className="flex min-w-0 flex-wrap items-center gap-x-2 text-[12px]">
        <ProfileDot incomplete />
        <span className="font-medium">Complete your profile · {profile.percent}%</span>
        <span className="text-ink-3">Still needed: {missing}</span>
      </p>
      <span className="flex shrink-0 items-center gap-1">
        <Link href="/app/account#complete-profile" className="btn btn-quiet btn-sm">
          Complete profile
        </Link>
        <button type="button" onClick={dismiss} className="icon-btn" aria-label="Dismiss for now">
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </span>
    </aside>
  );
}
