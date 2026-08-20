"use client";

import { useActionState } from "react";

import type { FormState } from "@/app/actions/auth";
import { Field, Notice, Submit } from "@/components/ui/form";

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

      <Field
        label="New password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        hint="At least 8 characters"
        error={state.fieldErrors?.password}
        autoFocus
      />
      <Field
        label="Confirm password"
        name="confirm"
        type="password"
        required
        autoComplete="new-password"
        error={state.fieldErrors?.confirm}
      />
      <Submit>Set new password</Submit>
    </form>
  );
}
