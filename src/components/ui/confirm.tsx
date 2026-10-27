"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, HelpCircle } from "lucide-react";

/**
 * "Are you sure?", in the product's own voice.
 *
 * It replaced `window.confirm`, which is grey, says the site's address
 * instead of what is about to happen, and looks like a different program
 * interrupting. Centred, unlike the forms: a confirmation is not anchored
 * to anything — it is the app stopping to ask — and it is small, because
 * the only thing in it is the question.
 *
 * Escape and the scrim cancel; Enter confirms; focus starts on Cancel
 * for a destructive action, so a reflexive Enter does not delete.
 */
export function ConfirmDialog({
  open,
  title,
  detail,
  confirmLabel,
  tone = "neutral",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  detail?: string;
  confirmLabel: string;
  tone?: "neutral" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    (tone === "danger" ? cancelRef : confirmRef).current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, tone, onCancel]);

  if (!open || typeof document === "undefined") return null;
  const danger = tone === "danger";
  const Icon = danger ? AlertTriangle : HelpCircle;
  const hue = danger ? "var(--ruby)" : "var(--cobalt)";

  return createPortal(
    <div className="modal-scrim confirm-scrim" role="presentation" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="modal-panel confirm-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3.5 p-5 pb-4">
          <span
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            style={{ background: `color-mix(in oklab, ${hue} 12%, transparent)`, color: hue }}
            aria-hidden
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id="confirm-title" className="text-[14.5px] font-semibold leading-snug text-ink">
              {title}
            </h2>
            {detail && <p className="mt-1 text-[12.5px] leading-[1.55] text-ink-3">{detail}</p>}
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">
          <button ref={cancelRef} type="button" onClick={onCancel} className="btn btn-quiet">
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="btn btn-primary"
            style={danger ? { background: "var(--ruby)", color: "#fff" } : undefined}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
