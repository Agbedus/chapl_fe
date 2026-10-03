"use client";

import { useActionState } from "react";

import type { FormState } from "@/app/actions/auth";
import { Field, Notice, Submit } from "@/components/ui/form";
import { PasswordField } from "@/components/ui/password";

export function RegisterForm({
  action,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Notice kind="error">{state.error}</Notice>}

      <Field label="Full name" name="full_name" required autoComplete="name" autoFocus />
      <Field
        label="Email"
        name="email"
        type="email"
        required
        autoComplete="email"
        error={state.fieldErrors?.email}
      />
      <PasswordField
        label="Password"
        name="password"
        variant="new"
        autoComplete="new-password"
        hint="At least 8 characters"
        avoidFields={["email", "full_name"]}
        error={state.fieldErrors?.password}
      />
      <Submit>Create account</Submit>

      <p className="text-[12px] leading-relaxed text-ink-3">
        We&apos;ll send a code to confirm the address before the account can be used.
      </p>
    </form>
  );
}
