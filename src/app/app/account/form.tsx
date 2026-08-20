"use client";

import { useActionState } from "react";

import type { FormState } from "@/app/actions/auth";
import { Field, Notice, Submit } from "@/components/ui/form";

export function PasswordForm({
  action,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Notice kind="error">{state.error}</Notice>}

      <Field
        label="Current password"
        name="current"
        type="password"
        required
        autoComplete="current-password"
        error={state.fieldErrors?.current}
      />
      <Field
        label="New password"
        name="password"
        type="password"
        required
        autoComplete="new-password"
        hint="At least 8 characters"
        error={state.fieldErrors?.password}
      />
      <Field
        label="Confirm new password"
        name="confirm"
        type="password"
        required
        autoComplete="new-password"
        error={state.fieldErrors?.confirm}
      />
      <Submit full={false}>Change password</Submit>
    </form>
  );
}
