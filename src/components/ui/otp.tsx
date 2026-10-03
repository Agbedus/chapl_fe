"use client";

import { useRef } from "react";

/**
 * A one-time code, one digit to a box.
 *
 * Controlled, with the digits as an array rather than a string: clearing
 * the middle box of a string-shaped value shifts every digit after it one
 * place left, which is not what anybody who pressed Backspace on the
 * third box meant.
 *
 * What it handles, because each of these is how a code actually arrives:
 *
 *   typing     a digit fills its box and focus moves on
 *   Backspace  clears the box; on an empty one it steps back and clears that
 *   arrows     move between boxes
 *   paste      spreads the digits across the boxes from the one pasted into,
 *              and ignores everything that is not a digit ("123 456")
 *   autofill   the OS's one-time-code suggestion drops the whole code into
 *              one box at once — `onChange` sees six characters, not one,
 *              and distributes them the same way paste does
 *
 * It owns no form field. The parent reads `digits` when it submits, so the
 * boxes post nothing themselves and there is no shadow input to keep in
 * step.
 */
export function OtpInput({
  digits,
  onChange,
  onComplete,
  label = "Verification code",
  invalid,
  readOnly,
  autoFocus,
}: {
  digits: string[];
  onChange: (next: string[]) => void;
  /** Called with the digits the moment the last box is filled. */
  onComplete?: (next: string[]) => void;
  label?: string;
  invalid?: boolean;
  /** While a code is being checked: no edits, but focus is kept. */
  readOnly?: boolean;
  autoFocus?: boolean;
}) {
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const length = digits.length;

  const focus = (index: number) => {
    const box = boxes.current[Math.max(0, Math.min(length - 1, index))];
    box?.focus();
    box?.select();
  };

  /** Lay `incoming` into the boxes starting at `from`; returns where focus should land. */
  const place = (from: number, incoming: string) => {
    const chars = incoming.replace(/\D/g, "").slice(0, length - from).split("");
    if (chars.length === 0) return;
    const next = [...digits];
    chars.forEach((c, i) => {
      next[from + i] = c;
    });
    onChange(next);
    focus(from + chars.length);
    if (next.every(Boolean)) onComplete?.(next);
  };

  return (
    <div role="group" aria-label={label} className="flex justify-between gap-2">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            boxes.current[index] = el;
          }}
          value={digit}
          // Not `type="number"`: it accepts "e", scrolls on the wheel and
          // strips a leading zero. A code is text that happens to be digits.
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          // Only the first box offers the OS autofill; the rest would each
          // ask for it and the suggestion would fight itself.
          autoComplete={index === 0 ? "one-time-code" : "off"}
          autoFocus={autoFocus && index === 0}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          readOnly={readOnly}
          aria-label={`${label}, digit ${index + 1} of ${length}`}
          aria-invalid={invalid || undefined}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => {
            if (readOnly) return;
            const typed = e.target.value.replace(/\D/g, "");
            if (!typed) {
              // The box was emptied by hand.
              const next = [...digits];
              next[index] = "";
              onChange(next);
              return;
            }
            // Typing over a filled box arrives as two characters; the new
            // one is the last. A whole autofilled code is longer than that
            // and is laid out from this box.
            place(index, typed.length > 2 ? typed : typed.slice(-1));
          }}
          onKeyDown={(e) => {
            if (readOnly) return;
            if (e.key === "Backspace" && !digit && index > 0) {
              e.preventDefault();
              const next = [...digits];
              next[index - 1] = "";
              onChange(next);
              focus(index - 1);
            } else if (e.key === "ArrowLeft") {
              e.preventDefault();
              focus(index - 1);
            } else if (e.key === "ArrowRight") {
              e.preventDefault();
              focus(index + 1);
            }
          }}
          onPaste={(e) => {
            if (readOnly) return;
            e.preventDefault();
            place(index, e.clipboardData.getData("text"));
          }}
          className="otp-box"
        />
      ))}
    </div>
  );
}
