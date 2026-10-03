import Link from "next/link";

import { acceptInvitation } from "@/app/actions/church";
import { AuthShell } from "@/components/auth-shell";
import { AcceptForm } from "@/app/invite/[token]/form";
import { Notice } from "@/components/ui/form";
import { api } from "@/lib/api";
import { getMe } from "@/lib/session";
import { ROLE_LABEL, type InvitationPreview } from "@/lib/types";

export const metadata = { title: "You've been invited — Chapl" };

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  // Deliberately unauthenticated: the invitee may have no account at all,
  // and the token is the credential.
  const preview = await api<InvitationPreview>(
    `/invitations/accept?token=${encodeURIComponent(token)}`,
    { auth: false },
  );

  if (!preview.ok) {
    return (
      <AuthShell
        eyebrow="Invitation"
        title="This invitation isn't valid"
        lede="It may have expired, been revoked, or already been used."
        footer={
          <Link href="/signin" className="font-medium text-ink hover:underline">
            Go to sign in
          </Link>
        }
      >
        <Notice kind="error">
          Ask whoever invited you to send a fresh link.
        </Notice>
      </AuthShell>
    );
  }

  const invite = preview.data;
  const me = await getMe();
  const needsAccount = invite.needs_account && !me;

  return (
    <AuthShell
      eyebrow="Invitation"
      title={`Join ${invite.church_name}`}
      lede={
        <>
          You&apos;ve been invited to <span className="text-ink">{invite.branch_name}</span>
          {invite.cell_name && (
            <>
              , in the <span className="text-ink">{invite.cell_name}</span> cell
            </>
          )}
          .
        </>
      }
    >
      <div className="space-y-5">
        <dl className="rounded-xl border border-line bg-mist px-4 py-3 text-[13px]">
          <div className="flex justify-between gap-4 py-1">
            <dt className="text-ink-3">Email</dt>
            <dd className="text-ink-2 text-right">{invite.email}</dd>
          </div>
          {invite.role && (
            <div className="flex justify-between gap-4 py-1">
              <dt className="text-ink-3">Role</dt>
              <dd className="text-ink-2 text-right">{ROLE_LABEL[invite.role]}</dd>
            </div>
          )}
          <div className="flex justify-between gap-4 py-1">
            <dt className="text-ink-3">Expires</dt>
            <dd className="tnum text-ink-2 text-right">
              {new Date(invite.expires_at).toLocaleDateString(undefined, {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </dd>
          </div>
        </dl>

        {me && (
          <Notice kind="info">
            You&apos;re signed in as {me.email}. Accepting adds this church to that
            account.
          </Notice>
        )}

        {!me && !invite.needs_account ? (
          <Link className="btn btn-primary" href={`/signin?next=${encodeURIComponent(`/invite/${token}`)}`}>Sign in to accept</Link>
        ) : me && me.email.toLowerCase() !== invite.email.toLowerCase() ? (
          <Notice kind="error">Sign out and sign in as {invite.email} to accept this invitation.</Notice>
        ) : <AcceptForm
          action={acceptInvitation}
          token={token}
          needsAccount={needsAccount}
          defaultName={me?.full_name ?? ""}
        />}
      </div>
    </AuthShell>
  );
}
