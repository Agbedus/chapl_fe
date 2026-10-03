"use client";

/**
 * Every form an administrator fills in.
 *
 * They live together in one client module for a reason that is easy to
 * get wrong: **a function cannot be passed from a Server Component to a
 * Client Component.** An earlier version of this took its fields as a
 * render prop — `children: (state) => ReactNode` — which type-checked,
 * built cleanly, and then failed at request time with "Functions are not
 * valid as a child of Client Components".
 *
 * So each form owns its own fields outright and receives only things that
 * serialise: the record it is editing, the options for its selects, and
 * the Server Action to post to. Server Actions cross the boundary by
 * design; that is what they are for.
 *
 * Each also owns its own open/closed state, so a list of forty branches
 * is not forty expanded forms.
 */

import {
  AlertTriangle, AtSign, Briefcase, Building2, CalendarDays, Check, ChevronLeft,
  ChevronRight, Clock, Compass, Copy, Hash, Heart, Image as ImageIcon, KeyRound,
  Landmark, Layers, Link2, MapPin, Megaphone, Navigation, Pencil, Phone, Pin,
  Plus, ShieldCheck, Tag, Target, ToggleLeft, User, Users, Wallet, X,
} from "lucide-react";
import { Fragment, useActionState, useEffect, useRef, useState } from "react";

import type { FormState } from "@/app/actions/auth";
import {
  Area, Field, Fieldset, Notice, Select, Submit, Wide,
} from "@/components/ui/form";
import {
  ComboField, DateField, DateTimeField, TimeField,
} from "@/components/ui/pickers";
import type {
  Branch, Cell, Church, Membership, Person, Role, ScopeType,
} from "@/lib/types";
import { ROLE_SCOPE } from "@/lib/types";

type Action = (state: FormState, data: FormData) => Promise<FormState>;
type Option = { value: string; label: string };

const EMPTY: FormState = {};

/* ------------------------------------------------------------------ */
/* shared shell                                                        */
/* ------------------------------------------------------------------ */

/**
 * One step of a form that has been broken into several.
 *
 * `fields` names the inputs the step owns. It is there so a validation
 * error coming back from the server can open the step that caused it —
 * without it, a form says "Required" about a field three steps away and
 * leaves you to go looking for it.
 */
type Step = {
  title: string;
  /** One line under the heading, saying what this step is for. */
  note?: string;
  fields?: string[];
  render: (state: FormState) => React.ReactNode;
};

/**
 * The rail across the top of a stepped form.
 *
 * It answers the question a long form never does: how much of this is
 * left. Steps already passed are marked and clickable, because the
 * commonest reason to look at a rail is to go back and check something.
 */
function Stepper({
  steps,
  current,
  reached,
  onJump,
}: {
  steps: Step[];
  current: number;
  reached: number;
  onJump: (index: number) => void;
}) {
  return (
    <nav className="stepper" aria-label="Progress">
      {steps.map((step, index) => {
        const state =
          index === current ? "current" : index < current ? "done" : "pending";
        return (
          <Fragment key={step.title}>
            {index > 0 && (
              <span className="stepper-line" data-done={index <= current} aria-hidden />
            )}
            <button
              type="button"
              className="stepper-item"
              data-state={state}
              disabled={index > reached}
              aria-current={index === current ? "step" : undefined}
              onClick={() => onJump(index)}
            >
              <span className="stepper-mark" aria-hidden>
                {index < current ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span className="stepper-label">{step.title}</span>
            </button>
          </Fragment>
        );
      })}
    </nav>
  );
}

/**
 * The two-column grid a `Fieldset` draws, without the heading — a step
 * already carries its name on the rail, and printing it twice makes the
 * step look like it contains a section rather than being one.
 */
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-2.5 sm:grid-cols-2">{children}</div>;
}

/**
 * A panel that opens to reveal a form, and closes itself once the write
 * lands — so a saved edit returns you to the list rather than leaving a
 * filled-in form to wonder about.
 *
 * Give it `children` for a short form, or `steps` for a long one. A
 * stepped form keeps every step mounted and merely hides the ones you
 * are not on: there is one `<form>` and one submission, so a field on
 * step 1 has to still be in the document when step 4 posts — and
 * unmounting would also throw away anything typed the moment somebody
 * stepped back to check a spelling.
 */
function Editor({
  label,
  submit,
  action,
  tone = "var(--accent)",
  context,
  icon,
  wide,
  children,
  steps,
  closeOnSuccess = true,
}: {
  label: string;
  submit: string;
  action: Action;
  tone?: string;
  /** One line saying what this form is for, inside the modal. */
  context?: string;
  /** Defaults to a plus. An edit is not an addition, so it takes a pencil. */
  icon?: React.ReactNode;
  wide?: boolean;
  children?: (state: FormState) => React.ReactNode;
  /** Long forms take these instead of `children`. */
  steps?: Step[];
  closeOnSuccess?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  // The furthest step reached, so the rail can be used to go back
  // without letting it skip a step that has not been filled in.
  const [reached, setReached] = useState(0);
  const [state, formAction] = useActionState(action, EMPTY);
  const bodyRef = useRef<HTMLDivElement>(null);

  const stepped = Boolean(steps && steps.length > 1);
  const last = stepped ? steps!.length - 1 : 0;
  // `--sunk` is a surface, not a hue. An edit form still wants a colour
  // on its rail, so the quiet tone falls back to the accent there.
  const stepTone = tone === "var(--sunk)" ? "var(--accent)" : tone;

  // A link is the payload, not a receipt — an invitation stays open so it
  // can be copied.
  const settled = Boolean(closeOnSuccess && state.message && !state.link);

  /*
   * Close once the write lands.
   *
   * `settled` was computed and then never acted on, so every form stayed
   * open over the page it had just changed, showing "Saved." above fields
   * you had no more use for — and the confirmation line under the button,
   * which is guarded on `!open`, could never appear at all.
   *
   * Adjusted during render rather than in an effect. An effect would run
   * after the modal had already painted once more, and the compiler's
   * `set-state-in-effect` rule refuses it outright; this is React's own
   * escape hatch for state that has to follow other state, and it
   * re-renders before anything reaches the screen.
   */
  const [wasSettled, setWasSettled] = useState(false);
  if (settled !== wasSettled) {
    setWasSettled(settled);
    if (settled) setOpen(false);
  }

  /*
   * A rejected write opens the step that was rejected.
   *
   * Same render-phase adjustment, and for the same reason: by the time
   * an effect ran, the form would already have painted showing whichever
   * step you happened to submit from, with the error attached to a field
   * that is not on screen.
   */
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    const culprit = Object.keys(state.fieldErrors ?? {})[0];
    if (culprit && steps) {
      const owner = steps.findIndex((s) => s.fields?.includes(culprit));
      if (owner >= 0) {
        setStep(owner);
        setReached((r) => Math.max(r, owner));
      }
    }
  }

  // Escape closes it, which is the shortcut anyone reaches for before
  // they look for a button.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function controls(within?: Element | null): HTMLInputElement[] {
    const scope = within ?? bodyRef.current;
    if (!scope) return [];
    return Array.from(scope.querySelectorAll("input, select, textarea"));
  }

  function go(next: number) {
    setStep(next);
    setReached((r) => Math.max(r, next));
    // A step change is a new page as far as the reader is concerned, so
    // it starts at the top rather than wherever the last one was left.
    bodyRef.current?.scrollTo({ top: 0 });
  }

  /** Move on, but only once this step is actually answered. */
  function advance() {
    const here = bodyRef.current?.querySelector(`[data-step="${step}"]`);
    const bad = controls(here).find((el) => !el.checkValidity());
    if (bad) {
      bad.focus();
      bad.reportValidity();
      return;
    }
    go(Math.min(step + 1, last));
  }

  /*
   * The browser cannot report a problem it cannot show you.
   *
   * With every step in the document, a required field two steps back is
   * `display: none` at submit time — Chrome blocks the submit and logs
   * "An invalid form control is not focusable", which is a dead end. So
   * the form carries `noValidate` and does the check itself: find the
   * first control that fails, open the step it lives on, then let the
   * browser say what is wrong now that the field is on screen.
   */
  function guard(event: React.FormEvent<HTMLFormElement>) {
    if (!stepped) return;
    const bad = controls().find((el) => !el.checkValidity());
    if (!bad) return;
    event.preventDefault();
    const owner = bad.closest("[data-step]")?.getAttribute("data-step");
    if (owner !== null && owner !== undefined) go(Number(owner));
    requestAnimationFrame(() => {
      bad.focus();
      bad.reportValidity();
    });
  }

  /*
   * Enter means "next", not "save".
   *
   * In a one-page form Enter submitting is the right answer. In a
   * stepped one it posts a half-filled record from step 1. Textareas
   * keep Enter for what it is for; the pickers and the combo box open
   * in a portal outside this form, so their own Enter never arrives
   * here at all.
   */
  function onKeyDown(event: React.KeyboardEvent<HTMLFormElement>) {
    if (!stepped || step >= last) return;
    if (event.key !== "Enter") return;
    const target = event.target as HTMLElement;
    if (target.tagName === "TEXTAREA" || target.tagName === "BUTTON") return;
    event.preventDefault();
    advance();
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          setStep(0);
          setReached(0);
          setOpen(true);
        }}
        className={`btn btn-sm ${tone === "var(--sunk)" ? "btn-quiet" : "btn-primary"}`}
        style={tone === "var(--sunk)" ? undefined : { background: tone }}
      >
        {icon ?? <Plus className="h-3.5 w-3.5" aria-hidden />}
        {label}
      </button>

      {settled && !open && (
        <p className="mt-2 text-[12.5px]" style={{ color: "var(--emerald)" }}>
          {state.message}
        </p>
      )}

      {open && (
        /*
          A create form is a detour, not a place. It arrives over the page
          it was launched from and leaves again, so the list underneath
          keeps its scroll position and whatever was typed into its search
          box. Clicking the scrim closes it; clicking the panel does not,
          which is why the stop is on the panel rather than the scrim.
        */
        <div
          className="modal-scrim"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={() => setOpen(false)}
        >
          <form
            action={formAction}
            noValidate={stepped}
            onSubmit={guard}
            onKeyDown={onKeyDown}
            className={wide ? "modal-panel modal-wide" : "modal-panel"}
            style={{ ["--step-tone" as string]: stepTone }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-head flex items-start justify-between gap-4">
              <div>
                <h2 className="head text-[18px] tracking-[-0.02em]">{label}</h2>
                {context && (
                  <p className="measure mt-1 text-[12.5px] leading-[1.5] text-ink-3">
                    {context}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-3
                           transition-colors hover:bg-sunk hover:text-ink"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {stepped && (
              <Stepper steps={steps!} current={step} reached={reached} onJump={go} />
            )}

            <div className="modal-body space-y-4" ref={bodyRef}>
              {state.error && <Notice kind="error">{state.error}</Notice>}
              {state.message && !state.link && <Notice kind="success">{state.message}</Notice>}
              {state.link && <LinkResult message={state.message ?? ""} link={state.link} />}

              {steps
                ? steps.map((one, index) => (
                    <div key={one.title} data-step={index} hidden={index !== step}>
                      {one.note && (
                        <p className="measure mb-3.5 text-[12px] leading-[1.55] text-ink-3">
                          {one.note}
                        </p>
                      )}
                      {one.render(state)}
                    </div>
                  ))
                : children?.(state)}
            </div>

            {/* Pinned, so a long form never pushes Save past the fold. */}
            <div className="modal-foot">
              {stepped && step > 0 && (
                <button type="button" onClick={() => go(step - 1)} className="btn btn-quiet">
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
                  Back
                </button>
              )}

              {stepped && step < last ? (
                <button type="button" onClick={advance} className="btn btn-primary">
                  Next
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              ) : (
                <Submit full={false}>{submit}</Submit>
              )}

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn text-ink-3 transition-colors hover:text-ink"
              >
                Cancel
              </button>

              {stepped && (
                <span className="ml-auto text-[11px] tabular-nums text-ink-3">
                  Step {step + 1} of {steps!.length}
                </span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * The invitation link, with a copy button.
 *
 * No mail is sent yet, so this link is the whole delivery mechanism.
 * Printing it inside a sentence would mean asking someone to select a
 * sixty-character token by hand.
 */
export function LinkResult({ message, link }: { message: string; link: string }) {
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");
  // Read after mount: `window` does not exist during the server render,
  // and reading it inline would make the two renders disagree.
  if (typeof window !== "undefined" && !origin) setOrigin(window.location.origin);
  const full = `${origin}${link}`;

  return (
    <div
      className="rounded-xl px-4 py-3.5"
      style={{ background: "color-mix(in oklab, var(--emerald) 11%, transparent)" }}
    >
      <p className="flex items-center gap-2 text-[13px] font-semibold" style={{ color: "var(--emerald)" }}>
        <Link2 className="h-4 w-4 shrink-0" aria-hidden />
        {message}
      </p>
      <p className="mt-1 text-[12px] text-ink-2">
        Nothing sends mail yet — pass this link on yourself. It works once.
      </p>
      <div className="mt-2.5 flex items-center gap-2">
        <code
          className="min-w-0 flex-1 truncate rounded-lg px-2.5 py-1.5 text-[12px] text-ink-2"
          style={{ background: "var(--paper)" }}
        >
          {full}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(full);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium"
          style={{ borderColor: "var(--line)", color: "var(--ink-2)" }}
        >
          {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

/**
 * A one-button form — revoke, resend, remove.
 *
 * Its own state, so one row's failure is reported against that row rather
 * than a page banner that does not say which of forty it means.
 */
export function ActionButton({
  action,
  fields,
  label,
  icon,
  tone = "neutral",
  confirm,
}: {
  action: Action;
  fields: Record<string, string>;
  label: string;
  icon?: React.ReactNode;
  tone?: "neutral" | "danger";
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, EMPTY);
  const colour = tone === "danger" ? "var(--ruby)" : "var(--ink-2)";

  return (
    <div className="flex flex-col items-end gap-1.5">
      <form
        action={formAction}
        onSubmit={(event) => {
          if (confirm && !window.confirm(confirm)) event.preventDefault();
        }}
      >
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <button
          type="submit"
          className="btn btn-quiet btn-sm"
          style={{ color: colour }}
        >
          {icon}
          {label}
        </button>
      </form>
      {state.error && (
        <span className="text-[11.5px]" style={{ color: "var(--ruby)" }}>{state.error}</span>
      )}
      {state.link ? (
        <div className="w-full max-w-md">
          <LinkResult message={state.message ?? "New link"} link={state.link} />
        </div>
      ) : (
        state.message && (
          <span className="text-[11.5px]" style={{ color: "var(--emerald)" }}>{state.message}</span>
        )
      )}
    </div>
  );
}

/**
 * A member asking for prayer, or asking to be called.
 *
 * The only form in this file a person with no role ever opens, and the
 * copy is written for that: no jargon, no scope picker, nothing about
 * branches. Where it goes is decided by where they belong, which the
 * server already knows.
 *
 * `is_private` is the field that matters. Ticked, it routes past the
 * cell leader to pastors only — enforced when the notification is
 * written, not when a list is drawn, so it cannot leak by somebody
 * opening a page later.
 */
export function CareRequestEditor({ action }: { action: Action }) {
  return (
    <Editor
      label="Ask for prayer or a call"
      submit="Send it"
      action={action}
      icon={<Heart className="h-3.5 w-3.5" aria-hidden />}
      context="This goes to your cell leader and your branch pastor. Tick private and it goes to the pastors only."
    >
      {(state) => (
        <div className="space-y-5">
          <Fieldset title="What do you need?">
            <Select
              label="I would like"
              name="kind"
              required
              defaultValue="prayer"
              icon={<Heart className="h-full w-full" />}
              options={[
                { value: "prayer", label: "Prayer" },
                { value: "call", label: "Someone to call me" },
              ]}
            />
            <Select
              label="How soon"
              name="urgency"
              required
              defaultValue="whenever"
              icon={<Clock className="h-full w-full" />}
              options={[
                { value: "whenever", label: "Whenever there is time" },
                { value: "soon", label: "Some time this week" },
                { value: "urgent", label: "As soon as possible" },
              ]}
            />
            <Wide>
              <Field
                label="In a few words"
                name="subject"
                required
                example="My mother is unwell"
                error={state.fieldErrors?.subject}
                icon={<Megaphone className="h-full w-full" />}
                hint="This is what a leader sees first."
              />
            </Wide>
            <Wide>
              <Area
                label="Anything else"
                name="body"
                rows={4}
                hint="Only if you want to. You can say the rest on the phone."
              />
            </Wide>
          </Fieldset>

          <Fieldset title="Who sees it">
            <Select
              label="Privacy"
              name="is_private"
              required
              defaultValue="false"
              icon={<ShieldCheck className="h-full w-full" />}
              options={[
                { value: "false", label: "My cell leader and pastors" },
                { value: "true", label: "Pastors only" },
              ]}
            />
            <Select
              label="Tell me when it is picked up"
              name="notify_me"
              required
              defaultValue="true"
              icon={<Check className="h-full w-full" />}
              options={[
                { value: "true", label: "Yes, let me know" },
                { value: "false", label: "No need" },
              ]}
            />
          </Fieldset>
        </div>
      )}
    </Editor>
  );
}

/* ------------------------------------------------------------------ */
/* the church itself                                                   */
/* ------------------------------------------------------------------ */

/**
 * The mother church's own record.
 *
 * It edits in a modal rather than sitting open on the page, because the
 * church page is read far more often than it is changed — and a form
 * left open reads as work outstanding. The facts stay legible on the
 * left; this is the way in when one of them is wrong.
 */
export function ChurchEditor({
  action,
  church,
}: {
  action: Action;
  church: Church;
}) {
  return (
    <Editor
      label="Edit church details"
      submit="Save changes"
      context="Everything here shows wherever the church introduces itself — invitations, the sign-in page, and this record."
      action={action}
      tone="var(--sunk)"
      icon={<Pencil className="h-3.5 w-3.5" aria-hidden />}
      wide
      steps={[
        {
          title: "Identity",
          note: "The name people use, and the one on the paperwork.",
          fields: ["name", "legal_name", "denomination", "founded_date", "logo_url"],
          render: (state) => (
            <Row>
              <input type="hidden" name="id" value={church.id} />
              <Field label="Name" name="name" required defaultValue={church.name}
                     error={state.fieldErrors?.name} example="Grace Chapel"
                     icon={<Landmark className="h-full w-full" />} />
              <Field label="Legal name" name="legal_name" defaultValue={church.legal_name ?? ""}
                     example="Grace Chapel International"
                     icon={<ShieldCheck className="h-full w-full" />}
                     hint="Only if it differs from the name people use." />
              <Field label="Denomination" name="denomination" example="Pentecostal"
                     defaultValue={church.denomination ?? ""}
                     icon={<Tag className="h-full w-full" />} />
              <DateField label="Founded" name="founded_date"
                         defaultValue={church.founded_date ?? ""} startYear={1980} />
              <Wide>
                <Field label="Logo" name="logo_url" defaultValue={church.logo_url ?? ""}
                       example="https://gracechapel.org/logo.png"
                       icon={<ImageIcon className="h-full w-full" />}
                       hint="A square image reads best. Left empty, the church code stands in." />
              </Wide>
            </Row>
          ),
        },
        {
          title: "Place",
          note: "Where the church is registered. Branches carry their own addresses.",
          fields: ["address", "city", "country"],
          render: () => (
            <Row>
              <Wide>
                <Field label="Address" name="address" defaultValue={church.address ?? ""}
                       example="22 Airport Hills Ave" icon={<MapPin className="h-full w-full" />} />
              </Wide>
              <Field label="City" name="city" defaultValue={church.city ?? ""} example="Accra"
                     icon={<MapPin className="h-full w-full" />} />
              <Field label="Country" name="country" defaultValue={church.country ?? ""}
                     example="Ghana" icon={<Compass className="h-full w-full" />} />
            </Row>
          ),
        },
        {
          title: "Contact",
          note: "Where an enquiry should land.",
          fields: ["contact_email", "contact_phone", "website"],
          render: () => (
            <Row>
              <Field label="Email" name="contact_email" type="email"
                     defaultValue={church.contact_email ?? ""} example="office@church.org"
                     icon={<AtSign className="h-full w-full" />} />
              <Field label="Phone" name="contact_phone" type="tel"
                     defaultValue={church.contact_phone ?? ""} example="+233 20 123 4567"
                     icon={<Phone className="h-full w-full" />} />
              <Wide>
                <Field label="Website" name="website" defaultValue={church.website ?? ""}
                       example="https://gracechapel.org"
                       icon={<Link2 className="h-full w-full" />} />
              </Wide>
            </Row>
          ),
        },
        {
          title: "Time & money",
          note: "Every service time is read in this timezone, and every figure on the giving page is in this currency.",
          fields: ["timezone", "currency"],
          render: () => (
            <Row>
              <Field label="Timezone" name="timezone" required defaultValue={church.timezone}
                     example="Africa/Accra" icon={<Clock className="h-full w-full" />}
                     hint="An IANA name." />
              <Field label="Currency" name="currency" required defaultValue={church.currency}
                     example="GHS" icon={<Wallet className="h-full w-full" />}
                     hint="Three letters." />
            </Row>
          ),
        },
        {
          title: "About",
          note: "A sentence or two, shown wherever the church introduces itself.",
          fields: ["about"],
          render: () => (
            <Area label="About" name="about" rows={4} defaultValue={church.about ?? ""} />
          ),
        },
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* branches                                                            */
/* ------------------------------------------------------------------ */

export function BranchEditor({
  action,
  branch,
}: {
  action: Action;
  branch?: Branch;
}) {
  return (
    <Editor
      label={branch ? "Edit" : "Add a branch"}
      submit={branch ? "Save" : "Add branch"}
      context="A branch is a place your church meets. Everyone belongs to one, and cells sit inside them."
      action={action}
      tone={branch ? "var(--sunk)" : "var(--violet)"}
      steps={[
        {
          title: "Name",
          note: "What this site is called, and whether it is open.",
          fields: ["name", "code", "is_active"],
          render: (state) => (
            <Row>
              {branch && <input type="hidden" name="id" value={branch.id} />}
              <Field label="Branch name" name="name" required defaultValue={branch?.name}
                     error={state.fieldErrors?.name} example="Adenta"
                     icon={<Building2 className="h-full w-full" />} />
              {!branch && (
                <Field label="Code" name="code" error={state.fieldErrors?.code} example="ADT"
                       icon={<Hash className="h-full w-full" />}
                       hint="Short handle, unique in this church. Set once." />
              )}
              <Select label="Status" name="is_active" required
                      icon={<ToggleLeft className="h-full w-full" />}
                      defaultValue={branch ? String(branch.is_active) : "true"}
                      options={[{ value: "true", label: "Active" }, { value: "false", label: "Closed" }]} />
            </Row>
          ),
        },
        {
          title: "Place",
          note: "Coordinates are optional, but they are what puts this branch on the dashboard map.",
          fields: ["location", "address", "latitude", "longitude"],
          render: () => (
            <Row>
              <Field label="Area" name="location" defaultValue={branch?.location ?? ""}
                     example="Adenta" icon={<MapPin className="h-full w-full" />} />
              <Field label="Address" name="address" defaultValue={branch?.address ?? ""}
                     example="12 Oxford St" icon={<MapPin className="h-full w-full" />} />
              <Field label="Latitude" name="latitude" inputMode="numeric"
                     example="5.7060" icon={<Navigation className="h-full w-full" />}
                     defaultValue={branch?.latitude != null ? String(branch.latitude) : ""} />
              <Field label="Longitude" name="longitude" inputMode="numeric"
                     example="-0.1660" icon={<Navigation className="h-full w-full" />}
                     defaultValue={branch?.longitude != null ? String(branch.longitude) : ""} />
            </Row>
          ),
        },
        {
          title: "Contact",
          note: "Who to reach at this site, rather than at the church office.",
          fields: ["contact_email", "contact_phone"],
          render: () => (
            <Row>
              <Field label="Email" name="contact_email" type="email"
                     example="adenta@church.org" icon={<AtSign className="h-full w-full" />}
                     defaultValue={branch?.contact_email ?? ""} />
              <Field label="Phone" name="contact_phone" type="tel"
                     example="+233 20 123 4567" icon={<Phone className="h-full w-full" />}
                     defaultValue={branch?.contact_phone ?? ""} />
            </Row>
          ),
        },
        {
          title: "Meeting",
          note: "When it gathers, and how many it seats.",
          fields: ["service_times", "capacity"],
          render: () => (
            <Row>
              <Wide>
                <Field label="Service times" name="service_times"
                       defaultValue={branch?.service_times ?? ""}
                       icon={<Clock className="h-full w-full" />}
                       placeholder="Service times · e.g. Sun 7:30 & 10:00 · Wed 18:30"
                       hint="Free text — write it the way you would put it on the sign." />
              </Wide>
              <Field label="Seats" name="capacity" type="number" inputMode="numeric"
                     example="350" icon={<Users className="h-full w-full" />}
                     defaultValue={branch?.capacity != null ? String(branch.capacity) : ""} />
            </Row>
          ),
        },
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* cells                                                               */
/* ------------------------------------------------------------------ */

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]
  .map((d) => ({ value: d, label: d[0].toUpperCase() + d.slice(1) }));

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "ad_hoc", label: "As needed" },
];

export function CellEditor({
  action,
  cell,
  branches,
}: {
  action: Action;
  cell?: Cell;
  branches: Option[];
}) {
  return (
    <Editor
      label={cell ? "Edit" : "Add a cell"}
      submit={cell ? "Save" : "Add cell"}
      context="A cell is the group small enough that someone notices when you are missing."
      action={action}
      tone={cell ? "var(--sunk)" : "var(--teal)"}
      steps={[
        {
          title: "Name",
          note: "What the group is called, and whether it is still meeting.",
          fields: ["name", "code", "is_active"],
          render: (state) => (
            <Row>
              {cell && <input type="hidden" name="id" value={cell.id} />}
              <Field label="Cell name" name="name" required defaultValue={cell?.name}
                     error={state.fieldErrors?.name} example="Bethany"
                     icon={<Compass className="h-full w-full" />} />
              {!cell && (
                <Field label="Code" name="code" error={state.fieldErrors?.code} example="CEN-04"
                       icon={<Hash className="h-full w-full" />}
                       hint="Short handle, unique in this church. Set once." />
              )}
              <Select label="Status" name="is_active" required
                      icon={<ToggleLeft className="h-full w-full" />}
                      defaultValue={cell ? String(cell.is_active) : "true"}
                      options={[{ value: "true", label: "Active" }, { value: "false", label: "Dormant" }]} />
            </Row>
          ),
        },
        ...(cell
          ? []
          : [
              {
                title: "Site",
                note: "A cell belongs to one branch, and cannot be moved between them afterwards.",
                fields: ["branch_id"],
                render: (state: FormState) => (
                  <Select label="Branch" name="branch_id" required options={branches}
                          icon={<Building2 className="h-full w-full" />}
                          placeholder="Branch · choose the site it meets at"
                          error={state.fieldErrors?.branch_id} />
                ),
              },
            ]),
        {
          title: "Meeting",
          note: "When and where it gathers. All optional — fill in what is settled.",
          fields: ["meeting_day", "meeting_time", "meeting_frequency", "host_location"],
          render: () => (
            <Row>
              <Select label="Meets on" name="meeting_day" options={DAYS}
                      icon={<CalendarDays className="h-full w-full" />}
                      defaultValue={cell?.meeting_day ?? ""} placeholder="Meets on · e.g. Tuesday" />
              <TimeField label="Time" name="meeting_time"
                         defaultValue={cell?.meeting_time ?? ""} />
              <Select label="How often" name="meeting_frequency" options={FREQUENCIES}
                      icon={<Clock className="h-full w-full" />}
                      defaultValue={cell?.meeting_frequency ?? ""}
                      placeholder="How often · e.g. Weekly" />
              <Field label="Where" name="host_location" defaultValue={cell?.host_location ?? ""}
                     example="Melissa Village" icon={<MapPin className="h-full w-full" />} />
            </Row>
          ),
        },
        {
          title: "Character",
          note: "What this cell is for, and the size at which it should plant another.",
          fields: ["target_size", "motto", "description"],
          render: () => (
            <Row>
              <Field label="Target size" name="target_size" type="number" inputMode="numeric"
                     example="15" icon={<Target className="h-full w-full" />}
                     defaultValue={cell?.target_size != null ? String(cell.target_size) : ""}
                     hint="Outgrowing this is the signal to plant another." />
              <Field label="Motto" name="motto" defaultValue={cell?.motto ?? ""}
                     icon={<Tag className="h-full w-full" />}
                     placeholder="Motto · e.g. Nobody sits alone." />
              <Wide>
                <Area label="Description" name="description" rows={3}
                      defaultValue={cell?.description ?? ""}
                      placeholder="Description · what this cell is for · optional" />
              </Wide>
            </Row>
          ),
        },
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* invitations                                                         */
/* ------------------------------------------------------------------ */

export function InviteEditor({
  action,
  branches,
  cells,
  roles,
}: {
  action: Action;
  branches: Option[];
  cells: Option[];
  roles: Option[];
}) {
  return (
    <Editor
      label="Invite someone"
      submit="Create invitation"
      context="The branch, cell and role are decided now, so accepting places them correctly rather than leaving an account that belongs nowhere."
      action={action}
      closeOnSuccess={false}
    >
      {(state) => (
        <div className="space-y-5">
          <Fieldset title="Who you are inviting">
            <Field label="Email" name="email" type="email" required autoComplete="off"
                   error={state.fieldErrors?.email} example="ama@example.org"
                   icon={<AtSign className="h-full w-full" />} />
            <Field label="Name" name="full_name" example="Ama Owusu"
                   icon={<User className="h-full w-full" />}
                   hint="So the invitation reads properly." />
          </Fieldset>

          <Fieldset
            title="Where they will belong"
            note="Decided now, so accepting places them correctly rather than leaving an account that belongs nowhere."
          >
            <Select label="Branch" name="branch_id" required options={branches}
                    icon={<Building2 className="h-full w-full" />}
                    placeholder="Branch · everyone belongs to exactly one"
                    error={state.fieldErrors?.branch_id} />
            <ComboField label="Cell" name="cell_id" options={cells}
                    icon={<Compass className="h-full w-full" />}
                    placeholder="Cell · optional, can be set later" />
          </Fieldset>

          <Fieldset title="What they may do">
            <Wide>
              <Select label="Role" name="role" options={roles}
                      icon={<ShieldCheck className="h-full w-full" />}
                      placeholder="Role · member, with no special authority"
                      hint="Granted the moment they accept. You cannot grant a role above your own." />
            </Wide>
          </Fieldset>
        </div>
      )}
    </Editor>
  );
}

/* ------------------------------------------------------------------ */
/* people                                                              */
/* ------------------------------------------------------------------ */

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const MARITAL = ["single", "married", "engaged", "widowed", "divorced", "separated"]
  .map((v) => ({ value: v, label: v[0].toUpperCase() + v.slice(1) }));

const STATUSES = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "transferred", label: "Transferred" },
  { value: "deceased", label: "Deceased" },
];

/**
 * Your own record, edited by you.
 *
 * The same fields as `PersonEditor` minus two: the pastoral notes, which
 * are written about you rather than by you, and the sacrament dates,
 * which the church records rather than the member. Everything left is
 * something only you can actually correct.
 */
export function SelfEditor({ action, person }: { action: Action; person: Person }) {
  return (
    <Editor
      label="Edit your details"
      submit="Save changes"
      action={action}
      tone="var(--sunk)"
      icon={<Pencil className="h-3.5 w-3.5" aria-hidden />}
      wide
      context="What the church has on file for you. Your branch, cell and roles are set by your leaders."
      steps={[
        {
          title: "You",
          fields: ["full_name", "date_of_birth", "gender", "marital_status", "avatar_url"],
          render: (state) => (
            <Row>
              <Field label="Name" name="full_name" required defaultValue={person.full_name}
                     error={state.fieldErrors?.full_name} example="Ama Mensah"
                     icon={<User className="h-full w-full" />} />
              {/* `startYear` because a birthday picker that opens on this
                  month asks a seventy-year-old to press "previous" eight
                  hundred times. The year select is the real fix; this just
                  points it the right way first. */}
              <DateField label="Date of birth" name="date_of_birth"
                         defaultValue={person.date_of_birth ?? ""} startYear={1990}
                         hint="Your cell leader gets a nudge on the day." />
              <Select label="Gender" name="gender" options={GENDERS}
                      icon={<Users className="h-full w-full" />}
                      defaultValue={person.gender ?? ""} placeholder="Gender · optional" />
              <Select label="Marital status" name="marital_status" options={MARITAL}
                      icon={<Heart className="h-full w-full" />}
                      defaultValue={person.marital_status ?? ""}
                      placeholder="Marital status · optional" />
              <Wide>
                <Field label="Photo" name="avatar_url" defaultValue={person.avatar_url ?? ""}
                       example="https://…/you.jpg"
                       icon={<ImageIcon className="h-full w-full" />}
                       hint="A square image reads best. Left empty, your initial stands in." />
              </Wide>
            </Row>
          ),
        },
        {
          title: "Contact",
          note: "How your cell leader reaches you when you are missed.",
          fields: ["phone_number", "occupation", "location", "address"],
          render: () => (
            <Row>
              <Field label="Phone" name="phone_number" type="tel"
                     defaultValue={person.phone_number ?? ""} example="+233 20 123 4567"
                     icon={<Phone className="h-full w-full" />} />
              <Field label="Occupation" name="occupation" defaultValue={person.occupation ?? ""}
                     example="Accountant" icon={<Briefcase className="h-full w-full" />} />
              <Field label="Area" name="location" defaultValue={person.location ?? ""}
                     example="Adenta" icon={<MapPin className="h-full w-full" />} />
              <Field label="Address" name="address" defaultValue={person.address ?? ""}
                     example="12 Oxford St" icon={<MapPin className="h-full w-full" />} />
            </Row>
          ),
        },
        {
          title: "Emergency",
          note: "One person the church should call if something happens to you.",
          fields: ["emergency_contact_name", "emergency_contact_phone"],
          render: () => (
            <Row>
              <Field label="Their name" name="emergency_contact_name"
                     defaultValue={person.emergency_contact_name ?? ""} example="Kwesi Appiah"
                     icon={<Heart className="h-full w-full" />} />
              <Field label="Their phone" name="emergency_contact_phone" type="tel"
                     defaultValue={person.emergency_contact_phone ?? ""}
                     example="+233 24 904 1319"
                     icon={<Phone className="h-full w-full" />} />
            </Row>
          ),
        },
      ]}
    />
  );
}

/**
 * Changing your password.
 *
 * It closes on success like every other editor, but the redirect that
 * follows is the real feedback: the API bumps `token_version`, so the
 * cookie this page was rendered with is dead the moment it returns.
 */
export function PasswordEditor({ action }: { action: Action }) {
  return (
    <Editor
      label="Change password"
      submit="Change it"
      action={action}
      tone="var(--sunk)"
      icon={<KeyRound className="h-3.5 w-3.5" aria-hidden />}
      context="Changing your password signs you out everywhere, including on this device."
    >
      {(state) => (
        <div className="space-y-4">
          <Field label="Current password" name="current" type="password" required
                 autoComplete="current-password" error={state.fieldErrors?.current}
                 icon={<KeyRound className="h-full w-full" />} />
          <Field label="New password" name="password" type="password" required
                 autoComplete="new-password" hint="At least 8 characters"
                 error={state.fieldErrors?.password}
                 icon={<ShieldCheck className="h-full w-full" />} />
          <Field label="Confirm new password" name="confirm" type="password" required
                 autoComplete="new-password" error={state.fieldErrors?.confirm}
                 icon={<ShieldCheck className="h-full w-full" />} />
        </div>
      )}
    </Editor>
  );
}

export function PersonEditor({ action, person }: { action: Action; person: Person }) {
  return (
    <Editor
      label="Edit record"
      submit="Save"
      action={action}
      tone="var(--sunk)"
      icon={<Pencil className="h-3.5 w-3.5" aria-hidden />}
      wide
      context="Their own details. Where they sit in the church is set under Placement."
      steps={[
        {
          title: "Person",
          fields: ["full_name", "date_of_birth", "gender", "marital_status", "occupation"],
          render: (state) => (
            <Row>
              <input type="hidden" name="id" value={person.id} />
              <Field label="Name" name="full_name" required defaultValue={person.full_name}
                     error={state.fieldErrors?.full_name} example="Ama Mensah"
                     icon={<User className="h-full w-full" />} />
              <DateField label="Date of birth" name="date_of_birth"
                         defaultValue={person.date_of_birth ?? ""} startYear={1990} />
              <Select label="Gender" name="gender" options={GENDERS}
                      icon={<Users className="h-full w-full" />}
                      defaultValue={person.gender ?? ""} placeholder="Gender · not stated" />
              <Select label="Marital status" name="marital_status" options={MARITAL}
                      icon={<Heart className="h-full w-full" />}
                      defaultValue={person.marital_status ?? ""}
                      placeholder="Marital status · not stated" />
              <Field label="Occupation" name="occupation" defaultValue={person.occupation ?? ""}
                     example="Accountant" icon={<Briefcase className="h-full w-full" />} />
            </Row>
          ),
        },
        {
          title: "Contact",
          note: "Where they are, and who to ring if something happens.",
          fields: [
            "phone_number", "location", "address",
            "emergency_contact_name", "emergency_contact_phone",
          ],
          render: () => (
            <Row>
              <Field label="Phone" name="phone_number" type="tel"
                     defaultValue={person.phone_number ?? ""} example="+233 20 123 4567"
                     icon={<Phone className="h-full w-full" />} />
              <Field label="Area" name="location" defaultValue={person.location ?? ""}
                     example="Adenta" icon={<MapPin className="h-full w-full" />} />
              <Field label="Address" name="address" defaultValue={person.address ?? ""}
                     example="12 Oxford St" icon={<MapPin className="h-full w-full" />} />
              <div className="hidden sm:block" aria-hidden />
              <Field label="Emergency contact" name="emergency_contact_name"
                     defaultValue={person.emergency_contact_name ?? ""} example="Kwesi Appiah"
                     icon={<Heart className="h-full w-full" />} />
              <Field label="Emergency phone" name="emergency_contact_phone" type="tel"
                     defaultValue={person.emergency_contact_phone ?? ""}
                     example="+233 24 904 1319" icon={<Phone className="h-full w-full" />} />
            </Row>
          ),
        },
        {
          title: "Church life",
          note: "Milestones, and anything pastoral worth writing down.",
          fields: ["baptism_date", "confirmation_date", "notes"],
          render: () => (
            <Row>
              <DateField label="Baptised" name="baptism_date"
                         defaultValue={person.baptism_date ?? ""} startYear={1990} />
              <DateField label="Confirmed" name="confirmation_date"
                         defaultValue={person.confirmation_date ?? ""} startYear={1990} />
              <Wide>
                <Area label="Notes" name="notes" rows={4} defaultValue={person.notes ?? ""}
                      hint="Pastoral notes. Visible to anyone who can read this record." />
              </Wide>
            </Row>
          ),
        },
      ]}
    />
  );
}

export function PlacementEditor({
  action,
  personId,
  membership,
  branches,
  cells,
}: {
  action: Action;
  personId: string;
  membership: Membership | null;
  branches: Option[];
  cells: Option[];
}) {
  return (
    <Editor
      label={membership ? "Move them" : "Place them"}
      submit="Save placement"
      context="Which branch, and optionally which cell. Only cells inside the chosen branch are offered."
      action={action}
      tone="var(--sunk)"
    >
      {(state) => (
        <div className="space-y-4">
          <input type="hidden" name="id" value={personId} />
          <Select label="Branch" name="branch_id" required options={branches}
                  defaultValue={membership?.branch_id ?? ""} placeholder="Choose a branch"
                  error={state.fieldErrors?.branch_id} />
          <ComboField label="Cell" name="cell_id" options={cells}
                  defaultValue={membership?.cell_id ?? ""} placeholder="No cell"
                  hint="Only cells in their current branch. Save the branch first to change this." />
          <Select label="Status" name="status" required
                  defaultValue={membership?.status ?? "active"} options={STATUSES} />
        </div>
      )}
    </Editor>
  );
}

/* ------------------------------------------------------------------ */
/* authority                                                           */
/* ------------------------------------------------------------------ */

/*
 * A rung of the tree, in the hue that rung already wears elsewhere in
 * the product: cobalt for the church, violet for a branch, teal for a
 * cell — the same bindings the dashboard and the congregation field
 * use. Departments sit off the tree and take the emerald the
 * departments page gives them.
 */
const SCOPE_TONE: Record<ScopeType, string> = {
  platform: "var(--ink-3)",
  church: "var(--cobalt)",
  branch: "var(--violet)",
  cell: "var(--teal)",
  department: "var(--emerald)",
};


/**
 * What the scope step asks for, per rung of the tree. The role decides
 * this — a cell leader is granted over a cell and nothing else — so the
 * form asks the one question that can follow rather than offering every
 * branch and every cell at once and trusting the API to refuse the
 * combinations that make no sense.
 */
const SCOPE_ASK: Record<
  ScopeType,
  { title: string; note: string; label: string; placeholder: string; icon: React.ReactNode }
> = {
  platform: {
    title: "The platform",
    note: "Above every church. Not a church's to grant.",
    label: "Scope",
    placeholder: "—",
    icon: <ShieldCheck className="h-full w-full" />,
  },
  church: {
    title: "The whole church",
    note: "Every branch, every cell, everyone.",
    label: "Church",
    placeholder: "The whole church",
    icon: <Landmark className="h-full w-full" />,
  },
  branch: {
    title: "One branch",
    note: "That site and every cell under it.",
    label: "Branch",
    placeholder: "Branch · which site",
    icon: <Building2 className="h-full w-full" />,
  },
  cell: {
    title: "One cell",
    note: "That group only.",
    label: "Cell",
    placeholder: "Cell · which group",
    icon: <Compass className="h-full w-full" />,
  },
  department: {
    title: "One department",
    note: "That team and its events, wherever its members sit.",
    label: "Department",
    placeholder: "Department · which team",
    icon: <Layers className="h-full w-full" />,
  },
};

/**
 * Granting a role, one decision at a time.
 *
 * The old form was three selects side by side: a person, a role, and
 * "Over what" — a single list holding every branch and every cell in
 * the church, with a hint underneath explaining that church roles did
 * not need it. It asked the administrator to know the rung each role
 * sits on, and then trusted them not to pick a cell for a branch
 * pastor.
 *
 * The role already knows. `ROLE_SCOPE` is the same table the API
 * validates against, so choosing *cell leader* is choosing "over a
 * cell", and the only question left is which one. Church roles ask
 * nothing at all and say what they cover instead.
 */
export function GrantEditor({
  action,
  people,
  roles,
  branches,
  cells,
  departments,
  church,
}: {
  action: Action;
  people: Option[];
  roles: { role: Role; label: string; blurb: string; scope: ScopeType }[];
  branches: Option[];
  cells: Option[];
  departments: Option[];
  church: { id: string; name: string };
}) {
  const [role, setRole] = useState<Role | "">("");
  const scope = role ? ROLE_SCOPE[role] : null;
  const chosen = roles.find((r) => r.role === role);

  const options =
    scope === "branch" ? branches : scope === "cell" ? cells : scope === "department" ? departments : [];

  return (
    <Editor
      label="Grant a role"
      submit="Grant role"
      action={action}
      wide
      context="A role says what someone may do, and on which rung — the whole church, one branch, one cell, or one department."
      steps={[
        {
          title: "Person",
          note: "Anyone on the roll can hold a role. Search by name or email.",
          fields: ["user_id"],
          render: (state) => (
            <ComboField
              label="Person"
              name="user_id"
              required
              options={people}
              placeholder="Person · search by name or email"
              icon={<User className="h-full w-full" />}
              error={state.fieldErrors?.user_id}
            />
          ),
        },
        {
          title: "Role",
          note: "What they may do. The rung it is granted on follows from the role, and decides what the next step asks for.",
          fields: ["role"],
          render: (state) => (
            <div className="space-y-2">
              {roles.map((option, index) => (
                <label
                  key={option.role}
                  className="choice"
                  style={{ ["--choice-tone" as string]: SCOPE_TONE[option.scope] }}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.role}
                    required={index === 0}
                    checked={role === option.role}
                    onChange={() => setRole(option.role)}
                  />
                  <span className="choice-mark" aria-hidden />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-[13px] font-semibold text-ink">{option.label}</span>
                      <span
                        className="chip"
                        style={{ color: SCOPE_TONE[option.scope] }}
                      >
                        {SCOPE_ASK[option.scope].title}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-[1.5] text-ink-3">
                      {option.blurb}
                    </span>
                  </span>
                </label>
              ))}
              {state.fieldErrors?.role && (
                <p className="text-[12px]" style={{ color: "var(--ruby)" }}>
                  {state.fieldErrors.role}
                </p>
              )}
            </div>
          ),
        },
        {
          title: "Over what",
          note: "Where that authority reaches.",
          fields: ["scope_id"],
          render: (state) => {
            if (!scope || !chosen) {
              return (
                <p className="text-[12.5px] text-ink-3">
                  Choose a role first — what this step asks for depends on it.
                </p>
              );
            }

            const ask = SCOPE_ASK[scope];
            const tone = SCOPE_TONE[scope];

            return (
              <div className="space-y-3.5">
                {/* What has been decided so far, so the last step is not
                    a lone dropdown with no memory of what it is for. */}
                <div
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-3.5 py-2.5"
                  style={{ background: `color-mix(in oklab, ${tone} 8%, transparent)` }}
                >
                  <ShieldCheck className="h-3.5 w-3.5 shrink-0" style={{ color: tone }} aria-hidden />
                  <span className="text-[12.5px] font-semibold text-ink">{chosen.label}</span>
                  <span className="text-[12px] text-ink-3">
                    — granted over {ask.title.toLowerCase()}. {ask.note}
                  </span>
                </div>

                {scope === "church" ? (
                  <>
                    {/* Church roles still carry a scope: the API stores the
                        church the grant is written against, and refuses a
                        church-scoped grant that names none. The old form
                        sent nothing here and every grant was rejected. */}
                    <input type="hidden" name="scope_id" value={church.id} />
                    <div className="flex items-center gap-2.5 rounded-xl border border-line bg-mist px-3.5 py-3">
                      <Landmark className="h-4 w-4 shrink-0 text-ink-3" aria-hidden />
                      <span className="text-[13px] font-medium text-ink">{church.name}</span>
                      <span className="ml-auto text-[11.5px] text-ink-3">Nothing to choose</span>
                    </div>
                  </>
                ) : options.length === 0 ? (
                  <Notice kind="info">
                    There are no {ask.label.toLowerCase()}s to grant this role over yet. Create one
                    first, then come back.
                  </Notice>
                ) : (
                  <ComboField
                    label={ask.label}
                    name="scope_id"
                    required
                    options={options}
                    placeholder={ask.placeholder}
                    icon={ask.icon}
                    error={state.fieldErrors?.scope_id}
                  />
                )}
              </div>
            );
          },
        },
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* notices                                                             */
/* ------------------------------------------------------------------ */

const PRIORITIES = [
  { value: "normal", label: "Normal" },
  { value: "important", label: "Important" },
  { value: "urgent", label: "Urgent" },
];

/**
 * Post a bulletin.
 *
 * The audience is one field, not two nullable ids — an author picks who
 * hears it, and the narrowest scope is resolved for them. The options
 * they see were filtered to their own authority before they got here.
 */
export function NoticeEditor({
  action,
  audiences,
}: {
  action: Action;
  audiences: Option[];
}) {
  return (
    <Editor
      label="Post a notice"
      submit="Post notice"
      context="Everyone in the scope you choose gets it in their tray straight away."
      action={action}
    >
      {(state) => (
        <div className="space-y-5">
          <Fieldset title="Who hears it">
            <Wide>
              <ComboField
                label="Audience"
                name="scope"
                required
                options={audiences}
                icon={<Megaphone className="h-full w-full" />}
                placeholder="Audience · who this reaches"
                error={state.fieldErrors?.scope}
                hint="Only the scopes you have authority over are listed."
              />
            </Wide>
          </Fieldset>

          <Fieldset title="What it says">
            <Wide>
              <Field
                label="Title"
                name="title"
                required
                error={state.fieldErrors?.title}
                example="Watchnight service"
                icon={<Tag className="h-full w-full" />}
              />
            </Wide>
            <Wide>
              <Area
                label="Notice"
                name="content"
                rows={4}
                required
                placeholder="Notice · what everyone needs to know"
              />
            </Wide>
          </Fieldset>

          <Fieldset title="How it should behave">
            <Select
              label="Priority"
              name="priority"
              required
              options={PRIORITIES}
              defaultValue="normal"
              icon={<AlertTriangle className="h-full w-full" />}
            />
            <Select
              label="Pin it"
              name="is_pinned"
              required
              defaultValue="false"
              icon={<Pin className="h-full w-full" />}
              options={[
                { value: "false", label: "No — list it by date" },
                { value: "true", label: "Yes — hold it at the top" },
              ]}
            />
            <Wide>
              <DateField
                label="Expires"
                name="expires_at"
                hint="Leave blank and it stays until you take it down."
              />
            </Wide>
          </Fieldset>
        </div>
      )}
    </Editor>
  );
}

/* ------------------------------------------------------------------ */
/* events                                                              */
/* ------------------------------------------------------------------ */

const EVENT_TYPES = [
  { value: "service", label: "Service" },
  { value: "meeting", label: "Meeting" },
  { value: "prayer", label: "Prayer" },
  { value: "rehearsal", label: "Rehearsal" },
  { value: "outreach", label: "Outreach" },
  { value: "conference", label: "Conference" },
  { value: "other", label: "Something else" },
];

/**
 * Put something on the calendar.
 *
 * Publishing is what turns an event into a notification, so it is the
 * last decision on the form rather than a checkbox lost among the
 * details — a draft reaches nobody until somebody says it should.
 */
export function EventEditor({
  action,
  audiences,
  event,
}: {
  action: Action;
  audiences: Option[];
  event?: { id: string; title: string };
}) {
  return (
    <Editor
      label={event ? "Edit" : "Add an event"}
      submit={event ? "Save" : "Add event"}
      context="Published events notify everyone in scope. Drafts reach nobody until you publish them."
      action={action}
      tone={event ? "var(--sunk)" : "var(--gold)"}
      steps={[
        {
          title: "What",
          fields: ["title", "event_type", "is_all_day"],
          render: (state) => (
            <Row>
              {event && <input type="hidden" name="id" value={event.id} />}
              <Wide>
                <Field label="Event title" name="title" required
                       error={state.fieldErrors?.title} example="Watchnight service"
                       icon={<CalendarDays className="h-full w-full" />} />
              </Wide>
              <Select label="Kind" name="event_type" required options={EVENT_TYPES}
                      defaultValue="service" icon={<Tag className="h-full w-full" />} />
              <Select label="All day" name="is_all_day" required defaultValue="false"
                      icon={<Clock className="h-full w-full" />}
                      options={[
                        { value: "false", label: "No — it has a time" },
                        { value: "true", label: "Yes — runs all day" },
                      ]} />
            </Row>
          ),
        },
        {
          title: "When",
          note: "Leave the end blank for a single-session event.",
          fields: ["start_date", "end_date"],
          render: (state) => (
            <Row>
              <DateTimeField label="Starts" name="start_date" required
                             error={state.fieldErrors?.start_date} />
              <DateTimeField label="Ends" name="end_date" />
            </Row>
          ),
        },
        {
          title: "Where & who",
          note: "Only the scopes you have authority over are listed.",
          fields: ["location", "scope"],
          render: () => (
            <Row>
              <Field label="Location" name="location" example="Central, main hall"
                     icon={<MapPin className="h-full w-full" />} />
              <ComboField label="Audience" name="scope" required options={audiences}
                          icon={<Megaphone className="h-full w-full" />}
                          placeholder="Audience · who this is for" />
            </Row>
          ),
        },
        {
          title: "Attending",
          note: "A draft reaches nobody. Publishing notifies everyone in the audience above.",
          fields: [
            "registration_required", "max_attendees", "contact_phone",
            "is_published", "description",
          ],
          render: () => (
            <Row>
              <Select label="Sign-up" name="registration_required" required defaultValue="false"
                      icon={<Users className="h-full w-full" />}
                      options={[
                        { value: "false", label: "Open — just turn up" },
                        { value: "true", label: "Required — people must confirm" },
                      ]} />
              <Field label="Capacity" name="max_attendees" type="number" inputMode="numeric"
                     example="300" icon={<Users className="h-full w-full" />} />
              <Field label="Contact" name="contact_phone" type="tel"
                     example="+233 20 123 4567" icon={<Phone className="h-full w-full" />} />
              <Select label="Publish" name="is_published" required defaultValue="true"
                      icon={<Megaphone className="h-full w-full" />}
                      options={[
                        { value: "true", label: "Publish and notify" },
                        { value: "false", label: "Save as a draft" },
                      ]} />
              <Wide>
                <Area label="Description" name="description" rows={3}
                      placeholder="Description · anything people should know before they come · optional" />
              </Wide>
            </Row>
          ),
        },
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* departments                                                         */
/* ------------------------------------------------------------------ */

const DEPARTMENT_ROLES = [
  { value: "lead", label: "Lead" },
  { value: "assistant", label: "Assistant" },
  { value: "member", label: "Member" },
];

export function DepartmentEditor({
  action,
  department,
  branches,
}: {
  action: Action;
  department?: {
    id: string;
    name: string;
    description: string | null;
    branch_id: string | null;
    meeting_day: string | null;
    meeting_time: string | null;
    is_active: boolean;
  };
  branches: Option[];
}) {
  return (
    <Editor
      label={department ? "Edit" : "Add a team"}
      submit={department ? "Save" : "Add team"}
      context="A department is a team that serves — choir, ushers, media. It sits off the branch and cell tree, so its people can come from anywhere."
      action={action}
      tone={department ? "var(--sunk)" : "var(--emerald)"}
      icon={department ? <Pencil className="h-3.5 w-3.5" aria-hidden /> : undefined}
    >
      {(state) => (
        <div className="space-y-4">
          {department && <input type="hidden" name="id" value={department.id} />}

          <Field label="Team name" name="name" required defaultValue={department?.name}
                 error={state.fieldErrors?.name} example="Choir"
                 icon={<Layers className="h-full w-full" />} />

          {/* Left empty on purpose is a real answer: a choir that draws
              from every branch belongs to none of them. */}
          <Select label="Branch" name="branch_id" options={branches}
                  defaultValue={department?.branch_id ?? ""}
                  icon={<Building2 className="h-full w-full" />}
                  placeholder="Branch · leave empty for church-wide"
                  hint="Only if this team belongs to one site." />

          <div className="grid gap-2.5 sm:grid-cols-2">
            <Select label="Meets on" name="meeting_day" options={DAYS}
                    icon={<CalendarDays className="h-full w-full" />}
                    defaultValue={department?.meeting_day ?? ""}
                    placeholder="Meets on · optional" />
            <TimeField label="Time" name="meeting_time"
                       defaultValue={department?.meeting_time ?? ""} />
          </div>

          <Select label="Status" name="is_active" required
                  icon={<ToggleLeft className="h-full w-full" />}
                  defaultValue={department ? String(department.is_active) : "true"}
                  options={[
                    { value: "true", label: "Active" },
                    { value: "false", label: "Disbanded" },
                  ]} />

          <Area label="Description" name="description" rows={2}
                defaultValue={department?.description ?? ""}
                placeholder="Description · what this team does · optional" />
        </div>
      )}
    </Editor>
  );
}

/**
 * Putting somebody on a team.
 *
 * The person picker is a combo box rather than a select because a
 * church directory is hundreds long, and the roster it is adding to is
 * already on screen — so the list here is everyone *not* already
 * serving, filtered before it arrives.
 */
export function RosterEditor({
  action,
  departmentId,
  candidates,
}: {
  action: Action;
  departmentId: string;
  candidates: Option[];
}) {
  return (
    <Editor
      label="Add someone"
      submit="Add to team"
      context="Anyone on the roll can serve on a team, whatever branch or cell they belong to."
      action={action}
      tone="var(--emerald)"
    >
      {(state) => (
        <div className="space-y-4">
          <input type="hidden" name="department_id" value={departmentId} />
          {candidates.length === 0 ? (
            <Notice kind="info">
              Everybody on the roll is already on this team.
            </Notice>
          ) : (
            <>
              <ComboField label="Person" name="user_id" required options={candidates}
                          placeholder="Person · search by name or email"
                          icon={<User className="h-full w-full" />}
                          error={state.fieldErrors?.user_id} />
              <Select label="What they do" name="role_in_department"
                      options={DEPARTMENT_ROLES}
                      icon={<ShieldCheck className="h-full w-full" />}
                      placeholder="What they do · optional" />
            </>
          )}
        </div>
      )}
    </Editor>
  );
}

/* ------------------------------------------------------------------ */
/* giving                                                              */
/* ------------------------------------------------------------------ */

const GIFT_TYPES = [
  { value: "offering", label: "Offering" },
  { value: "tithe", label: "Tithe" },
  { value: "pledge", label: "Pledge" },
  { value: "seed", label: "Seed" },
  { value: "building", label: "Building fund" },
  { value: "missions", label: "Missions" },
  { value: "welfare", label: "Welfare" },
  { value: "other", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile money" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "card", label: "Card" },
];

/**
 * Recording a gift that was counted rather than taken by a gateway.
 *
 * The ledger could be read and never written to, so `/app/giving` was a
 * report on a table nothing in this product could fill.
 */
export function GiftEditor({
  action,
  people,
  currency,
  today,
}: {
  action: Action;
  people: Option[];
  currency: string;
  /** Resolved on the server: `new Date()` in a client render is impure. */
  today: string;
}) {
  return (
    <Editor
      label="Record a gift"
      submit="Record it"
      context="What was counted, and who gave it. Online giving writes its own rows — this is the plate, the transfer and the envelope."
      action={action}
      tone="var(--emerald)"
      steps={[
        {
          title: "The gift",
          note: "Amount and what it was given for.",
          fields: ["amount", "donation_type", "given_on"],
          render: (state) => (
            <Row>
              <input type="hidden" name="currency" value={currency} />
              <Field label={`Amount (${currency})`} name="amount" required
                     inputMode="numeric" example="50.00"
                     error={state.fieldErrors?.amount}
                     icon={<Wallet className="h-full w-full" />} />
              <Select label="What for" name="donation_type" required options={GIFT_TYPES}
                      defaultValue="offering" icon={<Tag className="h-full w-full" />} />
              <Wide>
                <DateField label="Given on" name="given_on" required defaultValue={today}
                           startYear={new Date(today).getFullYear()} />
              </Wide>
            </Row>
          ),
        },
        {
          title: "Who gave",
          note: "Anonymous keeps the name off reports. The gift is still filed against them, or it would land in the record of whoever counted it.",
          fields: ["user_id", "is_anonymous"],
          render: (state) => (
            <div className="space-y-4">
              <ComboField label="Giver" name="user_id" required options={people}
                          placeholder="Giver · search by name or email"
                          icon={<User className="h-full w-full" />}
                          error={state.fieldErrors?.user_id} />
              <Select label="On reports" name="is_anonymous" required defaultValue="false"
                      icon={<ShieldCheck className="h-full w-full" />}
                      options={[
                        { value: "false", label: "Show their name" },
                        { value: "true", label: "Anonymous" },
                      ]} />
            </div>
          ),
        },
        {
          title: "How",
          note: "Optional, but it is what reconciles the count against the bank.",
          fields: ["payment_method", "receipt_number", "description"],
          render: () => (
            <Row>
              <Select label="Method" name="payment_method" options={PAYMENT_METHODS}
                      icon={<Wallet className="h-full w-full" />}
                      placeholder="Method · optional" />
              <Field label="Receipt number" name="receipt_number" example="R-00412"
                     icon={<Hash className="h-full w-full" />} />
              <Wide>
                <Area label="Note" name="description" rows={2}
                      placeholder="Note · anything worth remembering about this gift · optional" />
              </Wide>
            </Row>
          ),
        },
      ]}
    />
  );
}

/* ------------------------------------------------------------------ */
/* platform verification                                               */
/* ------------------------------------------------------------------ */

const DECLINE_REASONS = [
  { value: "rejected", label: "Decline — this is not a real congregation" },
  { value: "suspended", label: "Suspend — it was active and should not be" },
];

/**
 * Turning a church down.
 *
 * A form rather than a button, because declining requires a reason and
 * `decideChurch` refuses one without. Somebody registered a church and
 * is owed an answer they can act on; "no" on its own is a dead end, and
 * the API emails them whatever is typed here.
 */
export function DeclineChurch({
  action,
  church,
}: {
  action: Action;
  church: { id: string; name: string };
}) {
  return (
    <Editor
      label="Decline"
      submit="Send the decision"
      tone="var(--sunk)"
      icon={<X className="h-3.5 w-3.5" aria-hidden />}
      action={action}
      context={`Whatever you write is emailed to whoever registered ${church.name}, so write it to them.`}
    >
      {(state) => (
        <div className="space-y-4">
          <input type="hidden" name="id" value={church.id} />
          <Select label="Decision" name="status" required options={DECLINE_REASONS}
                  defaultValue="rejected"
                  icon={<AlertTriangle className="h-full w-full" />} />
          <Area label="Reason" name="note" rows={3} required
                error={state.fieldErrors?.note}
                placeholder="Reason · what you checked and what was missing"
                hint="Required. The record is kept rather than deleted, so the same name arriving twice is visible." />
        </div>
      )}
    </Editor>
  );
}

/**
 * Handing a church to somebody else.
 *
 * Ownership is not `church_admin` — that is a grant several people can
 * hold at once. The owner is the one account that answers for the
 * tenant, and the API gives the new owner `church_admin` if they do not
 * already have it, because an owner who cannot administer their own
 * church is a title and nothing else.
 */
export function OwnerEditor({
  action,
  churchId,
  churchName,
  currentOwner,
  people,
}: {
  action: Action;
  churchId: string;
  churchName: string;
  currentOwner: string | null;
  people: Option[];
}) {
  return (
    <Editor
      label="Hand over"
      submit="Hand it over"
      tone="var(--sunk)"
      icon={<ShieldCheck className="h-3.5 w-3.5" aria-hidden />}
      action={action}
      context={`Whoever you choose becomes the account that answers for ${churchName}, and gets church admin over it if they do not already hold it.`}
    >
      {(state) => (
        <div className="space-y-4">
          <input type="hidden" name="id" value={churchId} />
          {currentOwner && (
            <p className="text-[12.5px] text-ink-3">
              Currently <span className="font-medium text-ink-2">{currentOwner}</span>.
            </p>
          )}
          <ComboField label="New owner" name="user_id" required options={people}
                      placeholder="Person · search by name or email"
                      icon={<User className="h-full w-full" />}
                      error={state.fieldErrors?.user_id} />
        </div>
      )}
    </Editor>
  );
}
