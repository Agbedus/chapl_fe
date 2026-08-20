"use client";

import { useActionState } from "react";

import type { FormState } from "@/app/actions/auth";
import { Field, Notice, Submit } from "@/components/ui/form";

export function AcceptForm({
  action,
  token,
  needsAccount,
  defaultName,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  token: string;
  needsAccount: boolean;
  defaultName: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="needs_account" value={needsAccount ? "1" : "0"} />

      {state.error && <Notice kind="error">{state.error}</Notice>}

      {needsAccount && (
        <>
          <Field
            label="Your name"
            name="full_name"
            required
            defaultValue={defaultName}
            autoComplete="name"
            autoFocus
          />
          <Field
            label="Choose a password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            hint="At least 8 characters"
            error={state.fieldErrors?.password}
          />
          <Field
            label="Confirm password"
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            error={state.fieldErrors?.confirm}
          />
        </>
      )}

      <Submit>{needsAccount ? "Create account and join" : "Accept invitation"}</Submit>
    </form>
  );
}
