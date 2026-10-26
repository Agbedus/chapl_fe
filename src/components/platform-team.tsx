"use client";

import { Shield } from "lucide-react";
import { useActionState } from "react";

import type { FormState } from "@/app/actions/auth";
import { useResultToast } from "@/components/toaster";
import { Field, Notice, Select, Submit } from "@/components/ui/form";

type Action = (prev: FormState, data: FormData) => Promise<FormState>;

/**
 * Make somebody platform staff, by email.
 *
 * Its own small client module for the reason `editors.tsx` gives: it takes
 * a Server Action and nothing else, so it crosses the boundary cleanly.
 * Super admin only — the page does not render it for anyone else, and the
 * API would refuse the grant if it did.
 */
export function PlatformGrantForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, {});
  useResultToast(state);

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[1fr_12rem_auto] sm:items-start">
      <Field
        label="Their email address"
        name="email"
        type="email"
        required
        autoComplete="off"
        error={state.fieldErrors?.email}
      />
      <Select
        label="Role"
        name="role"
        required
        defaultValue="platform_admin"
        options={[
          { value: "platform_admin", label: "Platform admin" },
          { value: "super_admin", label: "Super admin" },
        ]}
      />
      {/* As tall as the fields beside it, so the row lines up. */}
      <Submit full={false} state={state} doneLabel="Granted" className="h-11 px-5"
              icon={<Shield className="h-3.5 w-3.5" aria-hidden />}>
        Grant
      </Submit>
      <div className="sm:col-span-3 empty:hidden">
        {state.error && <Notice kind="error">{state.error}</Notice>}
      </div>
    </form>
  );
}
