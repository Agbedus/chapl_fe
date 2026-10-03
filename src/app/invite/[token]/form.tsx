"use client";

import { useActionState } from "react";

import type { FormState } from "@/app/actions/auth";
import { Field, Notice, Submit } from "@/components/ui/form";
import { PasswordField } from "@/components/ui/password";

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
          <PasswordField
            label="Choose a password"
            name="password"
            variant="new"
            autoComplete="new-password"
            hint="At least 8 characters"
            avoidFields={["full_name"]}
            error={state.fieldErrors?.password}
          />
          <PasswordField
            label="Confirm password"
            name="confirm"
            variant="confirm"
            matches="password"
            autoComplete="new-password"
            error={state.fieldErrors?.confirm}
          />
        </>
      )}

      <Submit>{needsAccount ? "Create account and join" : "Accept invitation"}</Submit>
    </form>
  );
}
