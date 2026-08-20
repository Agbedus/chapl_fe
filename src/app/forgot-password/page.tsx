import Link from "next/link";

import { requestReset } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { ForgotForm } from "@/app/forgot-password/form";

export const metadata = { title: "Reset your password — Chapl" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      lede="Tell us the address on your account and we'll send a link to set a new password."
      footer={
        <Link href="/signin" className="font-medium text-ink hover:underline">
          Back to sign in
        </Link>
      }
    >
      <ForgotForm action={requestReset} />
    </AuthShell>
  );
}
