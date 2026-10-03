"use client";

import { Loader2 } from "lucide-react";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";

import type { FormState } from "@/app/actions/auth";
import { Field, Notice } from "@/components/ui/form";
import { OtpInput } from "@/components/ui/otp";

const LENGTH = 6;
const BLANK = () => Array<string>(LENGTH).fill("");

export function VerifyForm({
  verifyAction,
  resendAction,
  email,
  purpose,
  next,
}: {
  verifyAction: (prev: FormState, data: FormData) => Promise<FormState>;
  resendAction: (prev: FormState, data: FormData) => Promise<FormState>;
  email: string;
  purpose: string;
  next: string;
}) {
  const [digits, setDigits] = useState<string[]>(BLANK);
  // The action reads the digits from here rather than from state: it runs
  // from inside the same event that filled the last box, before React has
  // re-rendered with the new value.
  const latest = useRef(digits);
  const form = useRef<HTMLFormElement>(null);

  const update = (next: string[]) => {
    latest.current = next;
    setDigits(next);
  };

  // The code is assembled here, so the boxes post nothing of their own.
  const verify = useCallback(
    (prev: FormState, data: FormData) => {
      data.set("otp", latest.current.join(""));
      return verifyAction(prev, data);
    },
    [verifyAction],
  );
  const [state, formAction, checking] = useActionState(verify, {});
  const [resend, resendFormAction] = useActionState(resendAction, {});

  // A wrong code stays in the boxes — it is usually one digit out, and
  // fixing that is quicker than retyping six — and is marked until it is
  // touched again.
  const [editedAfter, setEditedAfter] = useState<FormState | null>(null);
  const rejected = Boolean(state.error) && editedAfter !== state;

  // Put the cursor back in the boxes when a code is turned down.
  const wrapper = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.error) {
      const boxes = wrapper.current?.querySelectorAll<HTMLInputElement>("input");
      boxes?.[boxes.length - 1]?.focus();
    }
  }, [state]);

  const complete = digits.every(Boolean);

  return (
    <div className="space-y-5">
      <form ref={form} action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        {email && <input type="hidden" name="email" value={email} />}
        <input type="hidden" name="purpose" value={purpose} />

        {state.error && <Notice kind="error">{state.error}</Notice>}

        {!email && (
          <Field label="Email" name="email" type="email" required autoComplete="email" />
        )}

        <div ref={wrapper}>
          <OtpInput
            digits={digits}
            autoFocus={Boolean(email)}
            invalid={rejected}
            readOnly={checking}
            onChange={(next) => {
              update(next);
              setEditedAfter(state);
            }}
            // Checks itself the moment the sixth digit lands. If it is
            // wrong, the button below is how to try again.
            onComplete={(next) => {
              latest.current = next;
              if (!checking) form.current?.requestSubmit();
            }}
          />
        </div>

        <button
          type="submit"
          disabled={!complete || checking}
          className="btn btn-primary w-full disabled:opacity-60"
        >
          {checking && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {checking ? "Checking…" : "Confirm"}
        </button>
      </form>

      <form action={resendFormAction} className="space-y-3">
        {email && <input type="hidden" name="email" value={email} />}
        <input type="hidden" name="purpose" value={purpose} />
        {!email && <Field label="Email" name="email" type="email" required autoComplete="email" />}
        {resend.error && <Notice kind="error">{resend.error}</Notice>}
        {resend.message && <Notice kind="success">{resend.message}</Notice>}
        <button type="submit" className="text-[13px] text-ink-3 hover:text-ink">
          Didn&apos;t get it? Send another
        </button>
      </form>
    </div>
  );
}
