import Link from "next/link";
import { Check, Mail } from "lucide-react";

import { accountAction } from "@/app/actions/manage";
import { ActionButton } from "@/components/editors";
import { Empty, Panel } from "@/components/panels";
import { Notice } from "@/components/ui/form";
import type { Church, Person } from "@/lib/types";
import { CHURCH_STATUS_LABEL, CHURCH_STATUS_TONE } from "@/lib/types";

export type TrailEntry = {
  id: string;
  user_name: string | null;
  action: string;
  created_at: string;
  new_data: Record<string, unknown> | null;
};

/** What each recorded action means to someone reading a church's history. */
const WORDS: Record<string, string> = {
  CREATE: "Registered",
  "VERIFY:active": "Verified",
  "VERIFY:rejected": "Turned down",
  "VERIFY:suspended": "Suspended",
  RESUBMIT: "Resubmitted for review",
  OWNER: "Ownership handed over",
  UPDATE: "Details edited",
};

function when(value: string): string {
  return new Date(value).toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

/**
 * Everything a reviewer needs in one place before deciding.
 *
 * The church's own record is on the page already. What was missing was
 * the other half of the question — *who* registered it, and whether that
 * person can be approved at all. The API refuses to approve a church whose
 * owner has not confirmed their email, and that refusal used to be
 * discovered by pressing Verify. It is stated here instead, with the way
 * out beside it: resend the code, or (for a super admin) confirm the
 * address by hand.
 *
 * The history is the church's own trail, so a church that has been turned
 * down and resubmitted twice reads as that, with each reason.
 */
export function ChurchReview({
  church,
  owner,
  trail,
  superAdmin,
}: {
  church: Church;
  owner: Person | null;
  trail: TrailEntry[];
  superAdmin: boolean;
}) {
  const stuck = church.status !== "active";
  const blocker = !owner
    ? "This church has no owner. Hand it to an active, verified account before approving."
    : !owner.is_active
      ? "The owner's account is switched off, so this church cannot be approved."
      : !owner.is_verified
        ? "The owner has not confirmed their email address, so this church cannot be approved yet."
        : null;

  return (
    <Panel title="Registration" lede="Who submitted this, and what has been decided" accent="var(--gold)">
      <dl className="grid gap-x-6 gap-y-3 text-[12.5px] sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="eyebrow text-ink-3">Status</dt>
          <dd className="mt-1 font-medium" style={{ color: CHURCH_STATUS_TONE[church.status] }}>
            {CHURCH_STATUS_LABEL[church.status]}
          </dd>
        </div>
        <div>
          <dt className="eyebrow text-ink-3">Submitted by</dt>
          <dd className="mt-1">
            {owner ? (
              <Link href={`/app/people/${owner.id}`} className="font-medium hover:underline">
                {owner.full_name}
              </Link>
            ) : (
              <span className="text-ink-3">Nobody</span>
            )}
            {owner && <span className="block truncate text-[11.5px] text-ink-3">{owner.email}</span>}
          </dd>
        </div>
        <div>
          <dt className="eyebrow text-ink-3">Owner&apos;s email</dt>
          <dd className="mt-1 flex items-center gap-1.5">
            {owner?.is_verified ? (
              <>
                <Check className="h-3.5 w-3.5" style={{ color: "var(--emerald)" }} aria-hidden />
                Confirmed
              </>
            ) : (
              <span style={{ color: "var(--gold)" }}>Not confirmed</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="eyebrow text-ink-3">Registered</dt>
          <dd className="mt-1">{when(church.created_at)}</dd>
        </div>
      </dl>

      {stuck && blocker && (
        <div className="mt-3 space-y-2">
          <Notice kind="info">{blocker}</Notice>
          {owner && !owner.is_verified && (
            <div className="flex flex-wrap items-center gap-2">
              {superAdmin ? (
                <>
                  <ActionButton
                    action={accountAction}
                    fields={{ id: owner.id, operation: "resend" }}
                    label="Resend their code"
                    icon={<Mail className="h-3 w-3" aria-hidden />}
                  />
                  <ActionButton
                    action={accountAction}
                    fields={{ id: owner.id, operation: "verify" }}
                    label="Confirm their email"
                    icon={<Check className="h-3 w-3" aria-hidden />}
                    confirm={`Confirm ${owner.email} by hand? Only do this once you are sure the address is theirs.`}
                  />
                </>
              ) : (
                <span className="text-[12px] text-ink-3">
                  A super admin can resend their code or confirm the address.
                </span>
              )}
            </div>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-line pt-3">
        <h3 className="eyebrow text-ink-3">History</h3>
        {trail.length === 0 ? (
          <Empty>Nothing recorded for this church yet.</Empty>
        ) : (
          <ul className="rows mt-1.5">
            {trail.map((entry) => {
              const note = typeof entry.new_data?.review_note === "string" ? entry.new_data.review_note : "";
              return (
                <li key={entry.id} className="flex items-baseline justify-between gap-3 py-1.5">
                  <span className="min-w-0 text-[12px]">
                    <span className="font-medium">{WORDS[entry.action] ?? entry.action.toLowerCase()}</span>
                    <span className="text-ink-3"> · {entry.user_name ?? "System"}</span>
                    {entry.action.startsWith("VERIFY:") && entry.action !== "VERIFY:active" && note && (
                      <span className="block text-[11.5px] text-ink-2">&ldquo;{note}&rdquo;</span>
                    )}
                  </span>
                  <span className="tnum shrink-0 text-[11px] text-ink-3">{when(entry.created_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Panel>
  );
}
