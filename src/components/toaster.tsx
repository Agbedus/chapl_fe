"use client";

import { useEffect, useState } from "react";
import { Check, CircleAlert } from "lucide-react";

/**
 * Saying that something happened.
 *
 * A form that saved used to say so in a line under its button, and only
 * once its modal had closed — so the confirmation landed after the eye
 * had already moved on, or not at all. A toast arrives where the eye is
 * going next, says one sentence, and leaves on its own.
 *
 * One event on `window` carries it, so a form anywhere can announce a
 * result without a provider threaded through the tree, and the
 * `<Toaster>` in the app layout is the only thing that draws.
 */

type Tone = "ok" | "error";
type Toast = { id: number; text: string; tone: Tone };

const EVENT = "chapl:toast";

/** Show [text] for a few seconds. */
export function toast(text: string, tone: Tone = "ok") {
  if (typeof window === "undefined" || !text) return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { text, tone } }));
}

/**
 * Announce a Server Action's result once it arrives: `message` as a
 * success, and `error` too when [errors] is set. Forms that already show
 * their error beside the field leave [errors] off, so a refusal is said
 * once, where it can be fixed.
 */
export function useResultToast(
  state: { message?: string; error?: string },
  { errors = false }: { errors?: boolean } = {},
) {
  useEffect(() => {
    if (state.message) toast(state.message);
    else if (errors && state.error) toast(state.error, "error");
  }, [state, errors]);
}

let next = 0;

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    function onToast(event: Event) {
      const { text, tone } = (event as CustomEvent<{ text: string; tone: Tone }>).detail;
      const id = ++next;
      // Newest at the bottom, and never more than three: a fourth means
      // the first is old news.
      setToasts((all) => [...all.slice(-2), { id, text, tone }]);
      const timer = setTimeout(() => {
        setToasts((all) => all.filter((t) => t.id !== id));
        timers.delete(timer);
      }, tone === "error" ? 6000 : 3600);
      timers.add(timer);
    }
    window.addEventListener(EVENT, onToast);
    return () => {
      window.removeEventListener(EVENT, onToast);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      // Above the phone's tab bar; bottom-right on a desk.
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-[60]
                 flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end"
      aria-live="polite"
      role="status"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="toast-in pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-xl border px-3.5 py-2.5
                     text-[13px] font-medium shadow-lg backdrop-blur"
          style={{
            background: "color-mix(in oklab, var(--paper) 92%, transparent)",
            borderColor: "var(--line)",
            color: "var(--ink)",
          }}
        >
          {t.tone === "ok" ? (
            <Check className="h-4 w-4 shrink-0" style={{ color: "var(--emerald)" }} aria-hidden />
          ) : (
            <CircleAlert className="h-4 w-4 shrink-0" style={{ color: "var(--ruby)" }} aria-hidden />
          )}
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}
