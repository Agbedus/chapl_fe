import Link from "next/link";
import type { Me } from "@/lib/types";

export function ProfileDot({ incomplete }: { incomplete: boolean }) {
  if (!incomplete) return null;
  return <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--gold)" }}><span className="sr-only">Complete your profile</span></span>;
}

export function ProfileCompletionPrompt({ profile }: { profile: Me["profile_completion"] }) {
  if (profile.complete) return null;
  return <aside className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-3" aria-label="Profile completion">
    <div className="text-[12px]"><p className="flex items-center gap-2 font-medium"><ProfileDot incomplete />Complete your profile · {profile.percent}%</p><p className="mt-1 text-ink-3">Still needed: {Object.values(profile.missing).join(", ")}</p></div>
    <Link href="/app/account#complete-profile" className="btn btn-quiet btn-sm">Complete profile</Link>
  </aside>;
}
