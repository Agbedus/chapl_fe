"use client";

import { useActionState } from "react";

import type { FormState } from "@/app/actions/auth";
import { Notice, Submit } from "@/components/ui/form";
import { PasswordField } from "@/components/ui/password";

export function ResetForm({
  action,
  token,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  token: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && <Notice kind="error">{state.error}</Notice>}

      <PasswordField
        label="New password"
        name="password"
        variant="new"
        autoComplete="new-password"
        hint="At least 8 characters"
        error={state.fieldErrors?.password}
        autoFocus
      />
      <PasswordField
        label="Confirm password"
        name="confirm"
        variant="confirm"
        matches="password"
        autoComplete="new-password"
        error={state.fieldErrors?.confirm}
      />
      <Submit>Set new password</Submit>
    </form>
  );
}
