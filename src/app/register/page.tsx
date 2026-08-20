import Link from "next/link";
import { redirect } from "next/navigation";

import { register } from "@/app/actions/auth";
import { AuthShell } from "@/components/auth-shell";
import { RegisterForm } from "@/app/register/form";
import { getMe } from "@/lib/session";

export const metadata = { title: "Create an account — Chapl" };

export default async function RegisterPage() {
  if (await getMe()) redirect("/app");

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create an account"
      lede="This creates your identity. Joining a church happens by invitation, or by starting one of your own."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/signin" className="font-medium text-ink hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm action={register} />
    </AuthShell>
  );
}
