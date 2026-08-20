import Link from "next/link";
import { redirect } from "next/navigation";

import { signIn } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { SignInForm } from "@/app/signin/form";
import { Notice } from "@/components/ui/form";
import { getMe } from "@/lib/session";

export const metadata = { title: "Sign in — Chapl" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (await getMe()) redirect("/app");
  const params = await searchParams;

  const note =
    params.verified ? "Your email is confirmed. Sign in to continue."
    : params.reset ? "Your password has been reset. Sign in with the new one."
    : params.changed ? "Password changed. Sign in again."
    : params.expired ? "Your session ended. Sign in to continue."
    : null;

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in"
      lede="Your church, its branches and cells — in one place."
      footer={
        <>
          No account yet?{" "}
          <Link href="/register" className="font-medium text-ink hover:underline">
            Create one
          </Link>
          <span className="mx-2 text-ink-3">·</span>
          <Link href="/forgot-password" className="font-medium text-ink hover:underline">
            Forgot password
          </Link>
        </>
      }
    >
      {note && (
        <div className="mb-5">
          <Notice kind="success">{note}</Notice>
        </div>
      )}
      <SignInForm action={signIn} next={params.next ?? ""} />
    </AuthShell>
  );
}
