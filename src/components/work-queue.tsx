"use client";

import { ArrowUpRight, Cake, Check, HeartPulse, Mail, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";

import type { FormState } from "@/app/actions/auth";
import { PhoneLink } from "@/components/contact";

/**
 * The queue, opened.
 *
 * "13 birthdays this week" used to be a link to `/app/people`, where you
 * arrived at a directory of eight hundred names and had to work out which
 * thirteen it meant. The count was the answer to a question nobody asked;
 * the names, and a way to reach them, are what the row was pointing at.
 *
 * So the row opens rather than navigates. Every queue lists the actual
 * people or cells behind the number, and every row carries the action you
 * came to take — a birthday gets a greeting with the message already
 * written, a follow-up gets a call button, a thin cell gets a way in. The
 * page underneath keeps its scroll and its state, and closing puts you
 * back where you were rather than one press of Back away from it.
 *
 * Nothing here sends anything. Both actions are ordinary links that hand
 * off to the phone's dialler or to WhatsApp, where the message is still
 * sitting in the composer for the sender to read and send themselves.
 */

/** Icons cross the boundary as names, never as components. */
const ICONS = {
  care: HeartPulse,
  cells: ArrowUpRight,
  invitations: Mail,
  birthdays: Cake,
} as const;

export type QueueKind = keyof typeof ICONS;

export type QueueRow = {
  id: string;
  /** The person, cell or invitation. */
  name: string;
  /** Status, turnout, when it was sent — whatever qualifies the row. */
  note: string;
  /** Rendered on the right, before the actions. */
  badge?: string;
  badgeTone?: string;
  phone?: string | null;
  /** Prefilled for WhatsApp, when there is something obvious to say. */
  message?: string;
  /** Names the WhatsApp button where sending it is the point of the row. */
  actionLabel?: string;
  /** Present when the row is something you can finish. */
  settle?: { id: string; label: string };
  href?: string;
  hrefLabel?: string;
};

export type QueueItem = {
  kind: QueueKind;
  tone: string;
  count: number;
  label: string;
  detail: string;
  /** Shown under the modal title — what this queue is and why it matters. */
  context: string;
  rows: QueueRow[];
  /** Where the whole list lives, for the footer. */
  href: string;
  cta: string;
  /**
   * How many there really are, when the list is capped.
   *
   * The queue counted the rows it had been handed and called that the
   * total, which under-reported a backlog of twenty-seven as ten.
   */
  total?: number;
};

export function WorkQueue({
  items,
  settleAction,
}: {
  items: QueueItem[];
  /** Marks a check-up done without leaving the modal. */
  settleAction?: (state: FormState, data: FormData) => Promise<FormState>;
}) {
  const [open, setOpen] = useState<QueueItem | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (items.length === 0) {
    return (
      <div className="rounded-xl bg-mist px-5 py-9 text-center">
        <p className="text-[13px] font-medium">Nothing is waiting</p>
        <p className="mt-1 text-[12px] text-ink-3">
          Every cell turned up and every call has been made.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rows">
        {items.map((item) => {
          const Icon = ICONS[item.kind];
          return (
            <button
              key={item.kind}
              type="button"
              onClick={() => setOpen(item)}
              className="group -mx-1 flex w-full items-center gap-3 rounded-xl px-1.5 py-2 text-left
                         transition-[background-color,transform] duration-150
                         hover:bg-mist active:scale-[0.995]"
            >
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl"
                style={{
                  background: `color-mix(in oklab, ${item.tone} 12%, transparent)`,
                  color: item.tone,
                }}
                aria-hidden
              >
                <Icon className="h-4 w-4" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-1.5">
                  <span className="figure text-[16px]" style={{ color: item.tone }}>
                    {item.total ?? item.count}
                  </span>
                  <span className="truncate text-[12.5px] font-medium">{item.label}</span>
                </span>
                <span className="block truncate text-[11px] text-ink-3">
                  {item.detail}
                </span>
              </span>

              <span
                aria-hidden
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line
                           text-ink-3 transition-colors duration-150
                           group-hover:border-line-strong group-hover:bg-paper group-hover:text-ink"
              >
                <ArrowUpRight className="h-3 w-3" />
              </span>
            </button>
          );
        })}
      </div>

      {open && (
        <QueueModal
          item={open}
          settleAction={settleAction}
          onClose={() => setOpen(null)}
        />
      )}
    </>
  );
}

function QueueModal({
  item,
  settleAction,
  onClose,
}: {
  item: QueueItem;
  settleAction?: (state: FormState, data: FormData) => Promise<FormState>;
  onClose: () => void;
}) {
  const Icon = ICONS[item.kind];
  const total = item.total ?? item.count;
  const capped = total > item.rows.length;

  return (
    <div
      className="modal-scrim"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.count} ${item.label}`}
      onClick={onClose}
    >
      <div
        className="modal-panel"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
              style={{
                background: `color-mix(in oklab, ${item.tone} 12%, transparent)`,
                color: item.tone,
              }}
              aria-hidden
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="head text-[18px] tracking-[-0.02em]">
                <span className="tnum" style={{ color: item.tone }}>
                  {total}
                </span>{" "}
                {item.label}
              </h2>
              <p className="measure mt-1 text-[12.5px] leading-[1.5] text-ink-3">
                {item.context}
                {capped && ` Showing the ${item.rows.length} longest waiting.`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-3
                       transition-colors duration-150 hover:bg-sunk hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="modal-body">
          <ul className="rows">
            {item.rows.map((row) => (
              <li
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5 first:pt-0"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    {row.href ? (
                      <Link
                        href={row.href}
                        className="truncate text-[13px] font-medium hover:underline"
                      >
                        {row.name}
                      </Link>
                    ) : (
                      <span className="truncate text-[13px] font-medium">{row.name}</span>
                    )}
                    {row.badge && (
                      <span
                        className="chip shrink-0"
                        style={{
                          background: `color-mix(in oklab, ${row.badgeTone ?? item.tone} 12%, transparent)`,
                          color: row.badgeTone ?? item.tone,
                        }}
                      >
                        {row.badge}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">
                    {row.note}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-2">
                  {row.phone !== undefined && (
                    <PhoneLink
                      number={row.phone ?? null}
                      message={row.message}
                      actionLabel={row.actionLabel}
                    />
                  )}
                  {row.settle && settleAction && (
                    <SettleButton
                      action={settleAction}
                      id={row.settle.id}
                      label={row.settle.label}
                    />
                  )}
                  {row.href && row.hrefLabel && (
                    <Link href={row.href} className="btn btn-quiet btn-sm">
                      {row.hrefLabel}
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="modal-foot">
          <Link href={item.href} className="btn btn-primary btn-sm">
            {item.cta}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="btn text-ink-3 transition-colors hover:text-ink"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * "I have done this one."
 *
 * The row stays put and goes quiet rather than vanishing under the
 * cursor: a list that reorders itself the instant you press something is
 * a list that loses your place, and you are usually working down several
 * of these in a row. It clears on the next load, by which time you have
 * finished the batch.
 */
function SettleButton({
  action,
  id,
  label,
}: {
  action: (state: FormState, data: FormData) => Promise<FormState>;
  id: string;
  label: string;
}) {
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 text-[11.5px] font-medium"
        style={{ color: "var(--emerald)" }}
      >
        <Check className="h-3.5 w-3.5" aria-hidden />
        {label}
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        const data = new FormData();
        data.set("id", id);
        data.set("status", "reached");
        start(async () => {
          const result = await action({}, data);
          if (!result.error) setDone(true);
        });
      }}
      className="btn btn-quiet btn-sm disabled:opacity-50"
    >
      <Check className="h-3.5 w-3.5" aria-hidden />
      {pending ? "Saving" : "Reached"}
    </button>
  );
}
