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
  AlertTriangle, AtSign, Briefcase, Building2, CalendarDays, Check, Clock,
  Compass, Copy, Hash, Heart, Image as ImageIcon, KeyRound, Landmark, Link2,
  MapPin, Megaphone, Navigation, Pencil, Phone, Pin, Plus, ShieldCheck, Tag,
  Target, ToggleLeft, User, Users, Wallet, X,
} from "lucide-react";
import { useActionState, useEffect, useState } from "react";

import type { FormState } from "@/app/actions/auth";
import {
  Area, Field, Fieldset, Notice, Select, Submit, Wide,
} from "@/components/ui/form";
import {
  ComboField, DateField, DateTimeField, TimeField,
} from "@/components/ui/pickers";
import type { Branch, Cell, Church, Membership, Person } from "@/lib/types";

type Action = (state: FormState, data: FormData) => Promise<FormState>;
type Option = { value: string; label: string };

const EMPTY: FormState = {};

/* ------------------------------------------------------------------ */
/* shared shell                                                        */
/* ------------------------------------------------------------------ */

/**
 * A panel that opens to reveal a form, and closes itself once the write
 * lands — so a saved edit returns you to the list rather than leaving a
 * filled-in form to wonder about.
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
  children: (state: FormState) => React.ReactNode;
  closeOnSuccess?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(action, EMPTY);

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

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
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
            className={wide ? "modal-panel modal-wide" : "modal-panel"}
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

            <div className="modal-body space-y-4">
              {state.error && <Notice kind="error">{state.error}</Notice>}
              {state.message && !state.link && <Notice kind="success">{state.message}</Notice>}
              {state.link && <LinkResult message={state.message ?? ""} link={state.link} />}
              {children(state)}
            </div>

            {/* Pinned, so a long form never pushes Save past the fold. */}
            <div className="modal-foot">
              <Submit full={false}>{submit}</Submit>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="btn text-ink-3 transition-colors hover:text-ink"
              >
                Cancel
              </button>
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
    >
      {(state) => (
        <div className="space-y-5">
          <input type="hidden" name="id" value={church.id} />

          <Fieldset title="What it is called">
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
          </Fieldset>

          <Fieldset title="Where it is">
            <Wide>
              <Field label="Address" name="address" defaultValue={church.address ?? ""}
                     example="22 Airport Hills Ave" icon={<MapPin className="h-full w-full" />} />
            </Wide>
            <Field label="City" name="city" defaultValue={church.city ?? ""} example="Accra"
                   icon={<MapPin className="h-full w-full" />} />
            <Field label="Country" name="country" defaultValue={church.country ?? ""}
                   example="Ghana" icon={<Compass className="h-full w-full" />} />
          </Fieldset>

          <Fieldset title="Getting in touch">
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
          </Fieldset>

          <Fieldset title="How it keeps time and money">
            <Field label="Timezone" name="timezone" required defaultValue={church.timezone}
                   example="Africa/Accra" icon={<Clock className="h-full w-full" />}
                   hint="An IANA name. Every service time is read in it." />
            <Field label="Currency" name="currency" required defaultValue={church.currency}
                   example="GHS" icon={<Wallet className="h-full w-full" />}
                   hint="Three letters. Every figure on the giving page is in it." />
          </Fieldset>

          <Fieldset title="In its own words">
            <Wide>
              <Area label="About" name="about" rows={3} defaultValue={church.about ?? ""}
                    hint="A sentence or two, shown wherever the church introduces itself." />
            </Wide>
          </Fieldset>
        </div>
      )}
    </Editor>
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
      tone={branch ? "var(--sunk)" : "var(--accent)"}
    >
      {(state) => (
        <div className="space-y-5">
          {branch && <input type="hidden" name="id" value={branch.id} />}

          <Fieldset title="What it is called">
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
          </Fieldset>

          <Fieldset title="Where to find it">
            <Field label="Area" name="location" defaultValue={branch?.location ?? ""}
                   example="Adenta" icon={<MapPin className="h-full w-full" />} />
            <Field label="Address" name="address" defaultValue={branch?.address ?? ""}
                   example="12 Oxford St" icon={<MapPin className="h-full w-full" />} />
            <Field label="Latitude" name="latitude" inputMode="numeric"
                   example="5.7060" icon={<Navigation className="h-full w-full" />}
                   defaultValue={branch?.latitude != null ? String(branch.latitude) : ""}
                   hint="Puts it on the dashboard map." />
            <Field label="Longitude" name="longitude" inputMode="numeric"
                   example="-0.1660" icon={<Navigation className="h-full w-full" />}
                   defaultValue={branch?.longitude != null ? String(branch.longitude) : ""} />
          </Fieldset>

          <Fieldset title="Getting in touch">
            <Field label="Email" name="contact_email" type="email"
                   example="adenta@church.org" icon={<AtSign className="h-full w-full" />}
                   defaultValue={branch?.contact_email ?? ""} />
            <Field label="Phone" name="contact_phone" type="tel"
                   example="+233 20 123 4567" icon={<Phone className="h-full w-full" />}
                   defaultValue={branch?.contact_phone ?? ""} />
          </Fieldset>

          <Fieldset title="When it meets">
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
          </Fieldset>
        </div>
      )}
    </Editor>
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
      tone={cell ? "var(--sunk)" : "var(--accent)"}
    >
      {(state) => (
        <div className="space-y-5">
          {cell && <input type="hidden" name="id" value={cell.id} />}

          <Fieldset title="What it is called">
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
          </Fieldset>

          {!cell && (
            <Fieldset
              title="Which site"
              note="A cell belongs to one branch and cannot be moved between them here."
            >
              <Wide>
                <Select label="Branch" name="branch_id" required options={branches}
                        icon={<Building2 className="h-full w-full" />}
                        placeholder="Branch · choose the site it meets at"
                        error={state.fieldErrors?.branch_id} />
              </Wide>
            </Fieldset>
          )}

          <Fieldset title="When and where it meets">
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
          </Fieldset>

          <Fieldset title="How it should grow">
            <Field label="Target size" name="target_size" type="number" inputMode="numeric"
                   example="15" icon={<Target className="h-full w-full" />}
                   defaultValue={cell?.target_size != null ? String(cell.target_size) : ""}
                   hint="Outgrowing this is the signal to plant another." />
            <Field label="Motto" name="motto" defaultValue={cell?.motto ?? ""}
                   icon={<Tag className="h-full w-full" />}
                   placeholder="Motto · e.g. Nobody sits alone." />
            <Wide>
              <Area label="Description" name="description" rows={2}
                    defaultValue={cell?.description ?? ""}
                    placeholder="Description · what this cell is for · optional" />
            </Wide>
          </Fieldset>
        </div>
      )}
    </Editor>
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
    >
      {(state) => (
        <div className="space-y-5">
          <Fieldset title="Who you are">
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
          </Fieldset>

          <Fieldset title="How to reach you">
            <Field label="Phone" name="phone_number" type="tel"
                   defaultValue={person.phone_number ?? ""} example="+233 20 123 4567"
                   icon={<Phone className="h-full w-full" />} />
            <Field label="Occupation" name="occupation" defaultValue={person.occupation ?? ""}
                   example="Accountant" icon={<Briefcase className="h-full w-full" />} />
            <Field label="Area" name="location" defaultValue={person.location ?? ""}
                   example="Adenta" icon={<MapPin className="h-full w-full" />} />
            <Field label="Address" name="address" defaultValue={person.address ?? ""}
                   example="12 Oxford St" icon={<MapPin className="h-full w-full" />} />
          </Fieldset>

          <Fieldset title="Who to call in an emergency">
            <Field label="Their name" name="emergency_contact_name"
                   defaultValue={person.emergency_contact_name ?? ""} example="Kwesi Appiah"
                   icon={<Heart className="h-full w-full" />} />
            <Field label="Their phone" name="emergency_contact_phone" type="tel"
                   defaultValue={person.emergency_contact_phone ?? ""}
                   example="+233 24 904 1319"
                   icon={<Phone className="h-full w-full" />} />
          </Fieldset>
        </div>
      )}
    </Editor>
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
      context="Their own details. Where they sit in the church is set under Placement."
    >
      {(state) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="id" value={person.id} />
          <Field label="Name" name="full_name" required defaultValue={person.full_name}
                 error={state.fieldErrors?.full_name} />
          <Field label="Phone" name="phone_number" type="tel" defaultValue={person.phone_number ?? ""} />
          <DateField label="Date of birth" name="date_of_birth"
                     defaultValue={person.date_of_birth ?? ""} startYear={1990} />
          <Select label="Gender" name="gender" options={GENDERS}
                  defaultValue={person.gender ?? ""} placeholder="Not stated" />
          <Select label="Marital status" name="marital_status" options={MARITAL}
                  defaultValue={person.marital_status ?? ""} placeholder="Not stated" />
          <Field label="Occupation" name="occupation" defaultValue={person.occupation ?? ""} />
          <Field label="Area" name="location" defaultValue={person.location ?? ""} />
          <Field label="Address" name="address" defaultValue={person.address ?? ""} />
          <Field label="Emergency contact" name="emergency_contact_name"
                 defaultValue={person.emergency_contact_name ?? ""} />
          <Field label="Emergency phone" name="emergency_contact_phone" type="tel"
                 defaultValue={person.emergency_contact_phone ?? ""} />
          <DateField label="Baptised" name="baptism_date"
                     defaultValue={person.baptism_date ?? ""} startYear={1990} />
          <DateField label="Confirmed" name="confirmation_date"
                     defaultValue={person.confirmation_date ?? ""} startYear={1990} />
          <div className="sm:col-span-2">
            <Area label="Notes" name="notes" rows={3} defaultValue={person.notes ?? ""}
                  hint="Pastoral notes. Visible to anyone who can read this record." />
          </div>
        </div>
      )}
    </Editor>
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

export function GrantEditor({
  action,
  people,
  roles,
  scopes,
  legend,
}: {
  action: Action;
  people: Option[];
  roles: Option[];
  scopes: Option[];
  legend: { label: string; blurb: string; scope: string }[];
}) {
  return (
    <Editor
      label="Grant a role"
      submit="Grant role"
      action={action}
      context="A role says what someone may do and on which rung — the whole church, one branch, or one cell."
    >
      {(state) => (
        <div className="space-y-4">
          <ComboField label="Person" name="user_id" required options={people}
                  placeholder="Choose a person" error={state.fieldErrors?.user_id} />
          <Select label="Role" name="role" required options={roles}
                  placeholder="Choose a role" error={state.fieldErrors?.role} />
          <Select label="Over what" name="scope_id" options={scopes}
                  placeholder="The whole church"
                  hint="Branch and cell roles need the branch or cell they cover. Church roles do not." />
          <div className="rounded-xl bg-mist p-3.5">
            <p className="text-[12px] font-semibold text-ink-2">What each role means</p>
            <ul className="mt-2 space-y-1">
              {legend.map((row) => (
                <li key={row.label} className="text-[12px] text-ink-3">
                  <span className="font-medium text-ink-2">{row.label}</span> — {row.blurb}{" "}
                  <span>({row.scope} scope)</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </Editor>
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
      tone={event ? "var(--sunk)" : "var(--accent)"}
    >
      {(state) => (
        <div className="space-y-5">
          {event && <input type="hidden" name="id" value={event.id} />}

          <Fieldset title="What it is">
            <Wide>
              <Field
                label="Event title"
                name="title"
                required
                error={state.fieldErrors?.title}
                example="Watchnight service"
                icon={<CalendarDays className="h-full w-full" />}
              />
            </Wide>
            <Select
              label="Kind"
              name="event_type"
              required
              options={EVENT_TYPES}
              defaultValue="service"
              icon={<Tag className="h-full w-full" />}
            />
            <Select
              label="All day"
              name="is_all_day"
              required
              defaultValue="false"
              icon={<Clock className="h-full w-full" />}
              options={[
                { value: "false", label: "No — it has a time" },
                { value: "true", label: "Yes — runs all day" },
              ]}
            />
          </Fieldset>

          <Fieldset title="When">
            <DateTimeField
              label="Starts"
              name="start_date"
              required
              error={state.fieldErrors?.start_date}
            />
            <DateTimeField
              label="Ends"
              name="end_date"
              hint="Leave blank for a single-session event."
            />
          </Fieldset>

          <Fieldset title="Where, and who for">
            <Field
              label="Location"
              name="location"
              example="Central, main hall"
              icon={<MapPin className="h-full w-full" />}
            />
            <ComboField
              label="Audience"
              name="scope"
              required
              options={audiences}
              icon={<Megaphone className="h-full w-full" />}
              placeholder="Audience · who this is for"
              hint="Only the scopes you have authority over are listed."
            />
          </Fieldset>

          <Fieldset title="Coming along">
            <Select
              label="Sign-up"
              name="registration_required"
              required
              defaultValue="false"
              icon={<Users className="h-full w-full" />}
              options={[
                { value: "false", label: "Open — just turn up" },
                { value: "true", label: "Required — people must confirm" },
              ]}
            />
            <Field
              label="Capacity"
              name="max_attendees"
              type="number"
              inputMode="numeric"
              example="300"
              icon={<Users className="h-full w-full" />}
            />
            <Field
              label="Contact"
              name="contact_phone"
              type="tel"
              example="+233 20 123 4567"
              icon={<Phone className="h-full w-full" />}
            />
            <Select
              label="Publish"
              name="is_published"
              required
              defaultValue="true"
              icon={<Megaphone className="h-full w-full" />}
              options={[
                { value: "true", label: "Publish and notify" },
                { value: "false", label: "Save as a draft" },
              ]}
            />
          </Fieldset>

          <Wide>
            <Area
              label="Description"
              name="description"
              rows={2}
              placeholder="Description · anything people should know before they come · optional"
            />
          </Wide>
        </div>
      )}
    </Editor>
  );
}
