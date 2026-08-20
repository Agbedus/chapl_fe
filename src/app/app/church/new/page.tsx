import Link from "next/link";

import { createChurch } from "@/app/actions/church";
import { NewChurchForm } from "@/app/app/church/new/form";
import { Notice } from "@/components/ui/form";
import { requireMe } from "@/lib/session";

export const metadata = { title: "Create a church — Chapl" };

export default async function NewChurchPage() {
  const me = await requireMe("/app/church/new");

  return (
    <div className="max-w-[680px] pb-16">
      <Link href="/app" className="text-[13px] text-ink-3 hover:text-ink">
        ← Back
      </Link>

      <p className="eyebrow mt-8 text-ink-3">New tenant</p>
      <h1 className="head mt-3 text-[28px]">Create a church</h1>
      <p className="mt-3 max-w-[46ch] text-[15px] leading-[1.6] text-ink-2">
        A church is the top of the tree. Branches sit inside it, cells inside
        those, and every record belongs to exactly one church.
      </p>

      {!me.is_platform_staff && (
        <div className="mt-6">
          <Notice kind="info">
            Creating a church is a platform-level action. If this is refused,
            ask a Chapl administrator to create it and make you its admin.
          </Notice>
        </div>
      )}

      <div className="mt-8">
        <NewChurchForm action={createChurch} />
      </div>
    </div>
  );
}
