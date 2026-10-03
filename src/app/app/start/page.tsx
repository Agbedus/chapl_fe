import Link from "next/link";
import { Building2, Mail } from "lucide-react";

import { requireMe } from "@/lib/session";

export const metadata = { title: "Get started — Chapl" };

export default async function StartPage() {
  const me = await requireMe("/app/start");

  return (
    <div className="max-w-[680px] pb-16">
      <p className="eyebrow text-ink-3">Almost there</p>
      <h1 className="head mt-3 text-[28px]">You don&apos;t belong to a church yet</h1>
      <p className="mt-3 text-[15px] leading-[1.6] text-ink-2">
        Your account exists, {me.full_name.split(" ")[0]} — it just isn&apos;t
        attached to a congregation. There are two ways in.
      </p>

      <div className="mt-9 space-y-4">
        <div className="rounded-2xl border border-line p-6">
          <Mail className="h-5 w-5" style={{ color: "var(--cobalt)" }} strokeWidth={1.8} />
          <p className="mt-4 text-[15px] font-semibold">Wait for an invitation</p>
          <p className="mt-1.5 text-[13.5px] leading-[1.6] text-ink-2">
            Someone who runs a branch can invite {me.email}. Opening their link
            adds this account to their church — no second account needed.
          </p>
        </div>

        <Link
          href="/app/church/new"
          className="block rounded-2xl border border-line p-6 transition-colors hover:border-line-strong"
        >
          <Building2 className="h-5 w-5" style={{ color: "var(--violet)" }} strokeWidth={1.8} />
          <p className="mt-4 text-[15px] font-semibold">Start a church</p>
          <p className="mt-1.5 text-[13.5px] leading-[1.6] text-ink-2">
            Submit your church for verification. Chapl will notify you when the review is complete.
          </p>
        </Link>
      </div>
    </div>
  );
}
