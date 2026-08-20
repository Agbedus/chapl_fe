"use client";

import { useActionState } from "react";

import type { FormState } from "@/app/actions/auth";
import { Field, Notice, Submit } from "@/components/ui/form";

export function VerifyForm({
  verifyAction,
  resendAction,
  email,
  purpose,
}: {
  verifyAction: (prev: FormState, data: FormData) => Promise<FormState>;
  resendAction: (prev: FormState, data: FormData) => Promise<FormState>;
  email: string;
  purpose: string;
}) {
  const [state, formAction] = useActionState(verifyAction, {});
  const [resend, resendFormAction] = useActionState(resendAction, {});

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="purpose" value={purpose} />

        {state.error && <Notice kind="error">{state.error}</Notice>}

        {!email && (
          <Field label="Email" name="email" type="email" required autoComplete="email" />
        )}
        <Field
          label="Six-digit code"
          name="otp"
          required
          inputMode="numeric"
          placeholder="000000"
          autoFocus
          autoComplete="one-time-code"
        />
        <Submit>Confirm</Submit>
      </form>

      <form action={resendFormAction} className="space-y-3">
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="purpose" value={purpose} />
        {resend.error && <Notice kind="error">{resend.error}</Notice>}
        {resend.message && <Notice kind="success">{resend.message}</Notice>}
        <button type="submit" className="text-[13px] text-ink-3 hover:text-ink">
          Didn&apos;t get it? Send another
        </button>
      </form>
    </div>
  );
}
