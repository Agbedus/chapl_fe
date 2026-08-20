import Link from "next/link";

import { resetPassword } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { ResetForm } from "@/app/reset-password/form";
import { Notice } from "@/components/ui/form";

export const metadata = { title: "Choose a new password — Chapl" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const token = (await searchParams).token ?? "";

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Choose a new password"
      lede="Setting a new password signs out every other device."
      footer={
        <Link href="/signin" className="font-medium text-ink hover:underline">
          Back to sign in
        </Link>
      }
    >
      {token ? (
        <ResetForm action={resetPassword} token={token} />
      ) : (
        <Notice kind="error">
          This link is missing its token. Request a new reset link.
        </Notice>
      )}
    </AuthShell>
  );
}
