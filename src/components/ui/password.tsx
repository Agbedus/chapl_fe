"use client";

/**
 * The password input, everywhere a password is typed.
 *
 * Three jobs, in order of how often they matter:
 *
 *   1. **Show / hide.** Typing a password blind is the commonest reason
 *      a sign-in or a reset fails, and the only people it protects are
 *      the ones shoulder-surfing a phone.
 *   2. **Gentle feedback** while choosing a new one — one quiet line and
 *      a hairline meter, never a checklist, never red while you are
 *      still typing. The rules are in `lib/password.ts`; only two of
 *      them can stop a submit and both are the API's own.
 *   3. **Catching the mistakes a mask hides**: Caps Lock, and a
 *      confirmation that does not match.
 *
 * `variant` is what the field is *for*:
 *
 *   current   an existing password. Reveal and Caps Lock only — showing
 *             rules at sign-in helps nobody, and an old password may
 *             predate them.
 *   new       a password being chosen. Adds the strength line.
 *   confirm   the repeat of a `new` one. Adds the match line, and names
 *             the field it must equal in `matches`.
 *
 * It stays **uncontrolled**, like `Field`: the value lives in the DOM
 * and goes to the Server Action through `FormData`. What this adds is a
 * mirror of it in state, kept in step by listeners on the *form*, not on
 * the input — so editing the email while the password is already typed
 * re-checks it for "your email is in your password", and editing the
 * password re-checks the confirmation beside it.
 *
 * React resets an uncontrolled form after a Server Action returns, which
 * clears the inputs without telling their components. The `reset`
 * listener is what stops the meter describing a password that is no
 * longer there.
 */

import { ArrowBigUp, Check, Eye, EyeOff } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { INPUT_CLASS } from "@/components/ui/form";
import { MIN_LENGTH, checkPassword, matchState, validity } from "@/lib/password";

type Variant = "current" | "new" | "confirm";

type Seen = {
  value: string;
  /** Everything it should not be built from: fixed strings + other fields. */
  avoid: string[];
  /** The field this one must equal, for `confirm`. */
  other: string;
};

const EMPTY: Seen = { value: "", avoid: [], other: "" };

const sameSeen = (a: Seen, b: Seen) =>
  a.value === b.value && a.other === b.other && a.avoid.join("\u0000") === b.avoid.join("\u0000");

export function PasswordField({
  label,
  name,
  variant = "current",
  autoComplete,
  autoFocus,
  required = true,
  error,
  hint,
  avoid = [],
  avoidFields = [],
  matches,
  icon,
}: {
  label: string;
  name: string;
  variant?: Variant;
  autoComplete?: string;
  autoFocus?: boolean;
  required?: boolean;
  /** A server-side reason, shown in place of everything else. */
  error?: string;
  /** Shown while the field is empty. */
  hint?: string;
  /** Strings to refuse to find inside a `new` password: a name, an email. */
  avoid?: string[];
  /** Names of sibling inputs whose *current value* joins `avoid`. */
  avoidFields?: string[];
  /** For `confirm`: the name of the `new` field it must equal. */
  matches?: string;
  icon?: React.ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  const [visible, setVisible] = useState(false);
  const [caps, setCaps] = useState(false);
  const [touched, setTouched] = useState(false);
  const [seen, setSeen] = useState<Seen>(EMPTY);

  // Arrays are new on every render; the effect keys on their contents.
  const avoidKey = JSON.stringify(avoid);
  const fieldsKey = avoidFields.join("|");

  useEffect(() => {
    const el = input.current;
    const form = el?.form;
    if (!el || !form) return;

    const fixed: string[] = JSON.parse(avoidKey);
    const fields = fieldsKey ? fieldsKey.split("|") : [];
    const read = (n: string) =>
      (form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? "";

    const sync = () => {
      const strings = [...fixed, ...fields.map(read)].filter(Boolean);
      const other = matches ? read(matches) : "";
      // The browser's own submit gate, in our words. Only the hard rules
      // ever reach it; everything else is advice.
      el.setCustomValidity(validity(variant, el.value, other, strings));
      const next: Seen = { value: el.value, avoid: strings, other };
      setSeen((prev) => (sameSeen(prev, next) ? prev : next));
    };

    const clear = () => {
      el.setCustomValidity("");
      setSeen(EMPTY);
      setVisible(false);
      setTouched(false);
    };
    // Whatever just failed, the password should not stay on screen.
    const hide = () => setVisible(false);

    form.addEventListener("input", sync);
    form.addEventListener("change", sync);
    form.addEventListener("reset", clear);
    form.addEventListener("submit", hide);
    return () => {
      form.removeEventListener("input", sync);
      form.removeEventListener("change", sync);
      form.removeEventListener("reset", clear);
      form.removeEventListener("submit", hide);
    };
  }, [avoidKey, fieldsKey, matches, variant]);

  const report = variant === "new" && seen.value ? checkPassword(seen.value, seen.avoid) : null;

  const state = variant === "confirm" && seen.other ? matchState(seen.other, seen.value) : "empty";
  // A confirmation is wrong by definition until it is finished, so it is
  // only called wrong once it is as long as the original, or it is left.
  const showDiffers = state === "differs" && (touched || seen.value.length >= seen.other.length);
  const showMatch = state === "match";

  const note = id + "-note";
  const described = error ? undefined : report || showDiffers || showMatch ? note : hint ? id + "-hint" : undefined;

  // Announced to screen readers only when it *changes* — a live region
  // that rewrites itself every keystroke is unbearable.
  const spoken = report?.level
    ? `${report.label} password`
    : showMatch
      ? "Passwords match"
      : showDiffers
        ? "Passwords do not match"
        : "";

  const prompt = label + (required ? "" : " · optional");

  return (
    <div>
      <div className={icon ? "has-icon relative" : "relative"}>
        {icon && (
          <span className="field-icon" aria-hidden>
            {icon}
          </span>
        )}
        <input
          ref={input}
          id={id}
          name={name}
          aria-label={label}
          type={visible ? "text" : "password"}
          required={required}
          placeholder={prompt}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          // A password is not prose. Without these, `type="text"` while
          // revealed gets the spellchecker's red underline and, on a
          // phone, a capital first letter.
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : described}
          onKeyDown={(e) => setCaps(e.getModifierState("CapsLock"))}
          onKeyUp={(e) => setCaps(e.getModifierState("CapsLock"))}
          onBlur={() => {
            setCaps(false);
            setTouched(true);
          }}
          className={INPUT_CLASS}
          // Room for the button, inline so it beats the `px` in the shared class.
          style={{ borderColor: error ? "var(--ruby)" : "var(--line)", paddingRight: "2.75rem" }}
        />
        <button
          type="button"
          className="pw-reveal"
          aria-pressed={visible}
          aria-controls={id}
          aria-label="Show password"
          title={visible ? "Hide password" : "Show password"}
          // Without this the click moves focus to the button, which blurs
          // the input, which — for a confirmation — marks it "touched" and
          // calls it wrong before the person has finished typing.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {spoken}
      </span>

      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-[12px]" style={{ color: "var(--ruby)" }}>
          {error}
        </p>
      ) : report ? (
        <div id={note} className="pw-note">
          <div className="pw-meter" data-level={report.level} aria-hidden>
            <i />
            <i />
            <i />
            <i />
          </div>
          <p className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 text-[11.5px] text-ink-3">
            {report.label && <span className="font-medium text-ink-2">{report.label}</span>}
            {report.label && report.advice && <span aria-hidden>·</span>}
            {report.advice && (
              <span className={report.blocking && report.length >= MIN_LENGTH ? "pw-warn" : undefined}>
                {report.advice}
              </span>
            )}
          </p>
        </div>
      ) : showMatch ? (
        <p id={note} className="pw-note mt-1.5 flex items-center gap-1.5 text-[11.5px] text-ink-3">
          <Check className="h-3 w-3" style={{ color: "var(--emerald)" }} aria-hidden />
          Matches
        </p>
      ) : showDiffers ? (
        <p id={note} className="pw-note mt-1.5 text-[11.5px] pw-warn">
          Doesn&apos;t match yet
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-[12px] text-ink-3">
          {hint}
        </p>
      ) : null}

      {caps && (
        <p className="pw-note mt-1.5 flex items-center gap-1 text-[11.5px] pw-warn" role="status">
          <ArrowBigUp className="h-3.5 w-3.5" aria-hidden />
          Caps Lock is on
        </p>
      )}
    </div>
  );
}
