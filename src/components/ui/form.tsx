"use client";

import { useFormStatus } from "react-dom";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

export function Field({
  label,
  name,
  type = "text",
  required,
  defaultValue,
  placeholder,
  autoComplete,
  error,
  hint,
  autoFocus,
  inputMode,
  example,
  icon,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  hint?: string;
  autoFocus?: boolean;
  inputMode?: "text" | "numeric" | "email" | "tel";
  /** A concrete instance, shown after the label so the shape is obvious. */
  example?: string;
  /** Sits inside the field. Names the thing without spending a line on it. */
  icon?: ReactNode;
}) {
  /*
   * The placeholder does three jobs: names the field, shows what a real
   * answer looks like, and says whether it can be skipped.
   *
   *   Branch name · e.g. Adenta
   *   Address · optional
   *
   * A stack of label-over-input doubles the height of every form and
   * says the name twice. The label survives for screen readers as
   * `aria-label`.
   */
  const prompt =
    placeholder ??
    [label, example && `e.g. ${example}`, !required && "optional"]
      .filter(Boolean)
      .join(" · ");

  return (
    <div className={icon ? "has-icon relative" : "relative"}>
      {icon && <span className="field-icon" aria-hidden>{icon}</span>}
      <input
        id={name}
        name={name}
        aria-label={label}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={prompt}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        inputMode={inputMode}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        className="w-full rounded-xl border bg-paper px-3.5 py-2.5 text-[14.5px] text-ink
                   transition-colors placeholder:text-ink-3 hover:border-line-strong
                   focus:border-transparent focus:outline-none focus:ring-2
                   focus:ring-[var(--accent)]"
        style={{ borderColor: error ? "var(--ruby)" : "var(--line)" }}
      />
      {error ? (
        <p id={`${name}-error`} className="mt-1.5 text-[12px]" style={{ color: "var(--ruby)" }}>
          {error}
        </p>
      ) : hint ? (
        <p id={`${name}-hint`} className="mt-1.5 text-[12px] text-ink-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Submit({
  children,
  full = true,
}: {
  children: ReactNode;
  full?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`btn btn-primary ${full ? "w-full" : ""} disabled:opacity-60`}
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Notice({
  kind,
  children,
}: {
  kind: "error" | "success" | "info";
  children: ReactNode;
}) {
  const tone =
    kind === "error" ? "var(--ruby)" : kind === "success" ? "var(--emerald)" : "var(--cobalt)";
  const Icon = kind === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className="flex items-start gap-2.5 rounded-2xl px-4 py-3.5 text-[13.5px] leading-[1.6]"
      style={{ background: `color-mix(in oklab, ${tone} 11%, transparent)`, color: tone }}
    >
      <Icon className="mt-px h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  required,
  error,
  hint,
  placeholder,
  icon,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={icon ? "has-icon relative" : "relative"}>
      {icon && <span className="field-icon" aria-hidden>{icon}</span>}
      <select
        id={name}
        name={name}
        aria-label={label}
        required={required}
        defaultValue={defaultValue ?? ""}
        aria-invalid={error ? true : undefined}
        className="w-full appearance-none rounded-xl border bg-paper px-3.5 py-2.5
                   text-[14.5px] text-ink transition-colors hover:border-line-strong
                   focus:border-transparent focus:outline-none focus:ring-2
                   focus:ring-[var(--accent)]"
        style={{ borderColor: error ? "var(--ruby)" : "var(--line)" }}
      >
        {/* The first option carries the label, so a select says what it
            is without a heading above it. */}
        <option value="">{placeholder ?? (required ? label : `${label} · optional`)}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p className="mt-1.5 text-[12px]" style={{ color: "var(--ruby)" }}>{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

export function Area({
  label,
  name,
  defaultValue,
  rows = 3,
  required,
  error,
  hint,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  rows?: number;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
        {label}
        {!required && <span className="font-normal text-ink-3"> · optional</span>}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="w-full resize-y rounded-xl border bg-paper px-3.5 py-2.5 text-[14.5px]
                   leading-[1.6] text-ink transition-colors placeholder:text-ink-3
                   hover:border-line-strong focus:border-transparent focus:outline-none
                   focus:ring-2 focus:ring-[var(--accent)]"
        style={{ borderColor: error ? "var(--ruby)" : "var(--line)" }}
      />
      {error ? (
        <p className="mt-1.5 text-[12px]" style={{ color: "var(--ruby)" }}>{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-[12px] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

/**
 * A destructive or secondary action inside a list row.
 *
 * Separate from `Submit` because it must not look like the primary way
 * forward: revoking an invitation and sending one are not the same weight
 * of decision, and a form with two identical buttons invites the wrong
 * one to be pressed.
 */
export function RowAction({
  children,
  tone = "neutral",
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "danger";
  title?: string;
}) {
  const { pending } = useFormStatus();
  const colour = tone === "danger" ? "var(--ruby)" : "var(--ink-2)";
  return (
    <button
      type="submit"
      disabled={pending}
      title={title}
      className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5
                 text-[12px] font-medium transition-colors disabled:opacity-50"
      style={{ borderColor: "var(--line)", color: colour }}
    >
      {pending && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}


/**
 * A labelled group of fields.
 *
 * Ten inputs in one column is a wall. Under a heading that says what the
 * group decides, the same ten become three short questions — and an
 * administrator can see at a glance which parts they may skip.
 */
export function Fieldset({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: ReactNode;
}) {
  return (
    <fieldset>
      <legend className="sr-only">{title}</legend>
      <p className="fieldset-head">
        <span className="fieldset-title">{title}</span>
      </p>
      {note && <p className="mb-3 text-[11.5px] leading-[1.5] text-ink-3">{note}</p>}
      <div className="grid gap-2.5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/** A field that should take the whole row inside a `Fieldset`. */
export function Wide({ children }: { children: ReactNode }) {
  return <div className="sm:col-span-2">{children}</div>;
}
