"use client";

import { useActionState } from "react";

import type { FormState } from "@/app/actions/auth";
import { Field, Notice, Submit } from "@/components/ui/form";

export function NewChurchForm({
  action,
}: {
  action: (prev: FormState, data: FormData) => Promise<FormState>;
}) {
  const [state, formAction] = useActionState(action, {});

  return (
    <form action={formAction} className="space-y-5">
      {state.error && <Notice kind="error">{state.error}</Notice>}

      <Field
        label="Church name"
        name="name"
        required
        placeholder="Grace Chapel"
        error={state.fieldErrors?.name}
        autoFocus
      />
      <Field
        label="Short code"
        name="code"
        placeholder="GRACE"
        hint="Used in URLs and references. Letters and numbers. Left blank, we derive one from the name."
        error={state.fieldErrors?.code}
      />
      <Field
        label="Legal name"
        name="legal_name"
        placeholder="Grace Chapel International"
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Timezone" name="timezone" defaultValue="Africa/Accra" />
        <Field label="Currency" name="currency" defaultValue="GHS" hint="Three-letter code" />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Contact email" name="contact_email" type="email" />
        <Field label="Contact phone" name="contact_phone" type="tel" />
      </div>

      <Submit>Create church</Submit>
    </form>
  );
}
