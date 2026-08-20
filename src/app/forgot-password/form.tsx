"use client";

import { useActionState } from "react";

import type { FormState } from "@/app/actions/auth";
import { Field, Notice, Submit } from "@/components/ui/form";

export function ForgotForm({
  action,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, {});

  if (state.message) {
    return (
      <div className="space-y-4">
        <Notice kind="success">{state.message}</Notice>
        <p className="text-[13px] leading-relaxed text-ink-3">
          The link expires in 30 minutes. Check spam if it hasn&apos;t arrived in a
          few minutes.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <Notice kind="error">{state.error}</Notice>}
      <Field label="Email" name="email" type="email" required autoComplete="email" autoFocus />
      <Submit>Send reset link</Submit>
    </form>
  );
}
