"use client";

import { Bell, Check } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { Popover } from "@/components/ui/popover";
import { useRealtime, type LiveNotification } from "@/lib/use-realtime";

/**
 * The tray.
 *
 * Opening it marks everything read, because that is what opening it
 * means — a badge that survives you looking at it is a badge you stop
 * believing. The rows stay on screen after being marked so the list does
 * not empty itself under the cursor.
 *
 * The dot on the bell is the connection, not the count: a tray that is
 * quiet because the socket is down looks exactly like a tray that is
 * quiet because nothing happened, and those are very different.
 */

const TONE: Record<string, string> = {
  "care.prayer": "var(--violet)",
  "care.call": "var(--ruby)",
  "care.escalated": "var(--ruby)",
  "care.acknowledged": "var(--emerald)",
};

export function NotificationBell({
  getTicket,
  getUnread,
  onOpen,
}: {
  getTicket: () => Promise<{ ticket: string } | null>;
  getUnread: () => Promise<number>;
  onOpen: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const { unread, latest, connected, clear } = useRealtime({ getTicket, getUnread });

  const show = () => {
    setOpen(true);
    if (unread > 0) {
      clear();
      void onOpen();
    }
  };

  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => (open ? setOpen(false) : show())}
        aria-label={unread > 0 ? `${unread} unread notifications` : "Notifications"}
        className="relative grid h-9 w-9 place-items-center rounded-xl border border-line
                   bg-paper text-ink-2 transition-[background-color,color,transform]
                   duration-150 hover:bg-mist hover:text-ink active:scale-95"
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unread > 0 && (
          <span
            className="tnum absolute -right-1 -top-1 grid h-[17px] min-w-[17px] place-items-center
                       rounded-full px-1 text-[10px] font-bold"
            style={{ background: "var(--ruby)", color: "#fff" }}
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
        {/* Live, and quietly so. Absent when the socket is down, which is
            the only way to tell silence from disconnection. */}
        {connected && unread === 0 && (
          <span
            className="absolute bottom-1 right-1 h-[5px] w-[5px] rounded-full"
            style={{ background: "var(--emerald)" }}
            aria-hidden
          />
        )}
      </button>

      <Popover open={open} onClose={() => setOpen(false)} anchor={trigger} width={340}>
        <div className="flex items-center justify-between border-b border-line px-3 py-2">
          <span className="text-[12px] font-semibold">Notifications</span>
          <span className="text-[10.5px]" style={{ color: connected ? "var(--emerald)" : "var(--ink-3)" }}>
            {connected ? "live" : "reconnecting"}
          </span>
        </div>

        <div className="max-h-[20rem] overflow-y-auto p-1.5">
          {latest.length === 0 ? (
            <p className="px-2.5 py-8 text-center text-[12px] text-ink-3">
              Nothing new. Anything that arrives lands here without a reload.
            </p>
          ) : (
            latest.map((n) => <Row key={n.id} notification={n} onGo={() => setOpen(false)} />)
          )}
        </div>
      </Popover>
    </>
  );
}

function Row({
  notification,
  onGo,
}: {
  notification: LiveNotification;
  onGo: () => void;
}) {
  const tone = TONE[notification.kind] ?? "var(--cobalt)";
  const body = (
    <>
      <span className="dot mt-[6px] shrink-0" style={{ color: tone }} aria-hidden />
      <span className="min-w-0">
        <span className="block text-[12px] font-medium leading-snug">
          {notification.title}
        </span>
        <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">
          {notification.message}
        </span>
      </span>
    </>
  );

  const shell = "flex items-start gap-2 rounded-lg px-2.5 py-2 transition-colors duration-150";

  return notification.href ? (
    <Link href={notification.href} onClick={onGo} className={`${shell} hover:bg-mist`}>
      {body}
    </Link>
  ) : (
    <span className={shell}>{body}</span>
  );
}
