"use client";

import { useActionState } from "react";

import type { FormState } from "@/app/actions/auth";
import { Field, Notice, Submit } from "@/components/ui/form";

export function SignInForm({
  action,
  next,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
  next: string;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      {state.error && <Notice kind="error">{state.error}</Notice>}

      <Field label="Email" name="email" type="email" required autoComplete="username" autoFocus />
      <Field
        label="Password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
      />
      <Submit>Sign in</Submit>
    </form>
  );
}
