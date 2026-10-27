import Link from "next/link";
import { CheckCheck } from "lucide-react";

import { markAllRead } from "@/app/actions/manage";
import { Empty, Page, PageHead, Panel } from "@/components/panels";
import { Notice } from "@/components/ui/form";
import { AutoRefresh } from "@/components/auto-refresh";
import { Tabs } from "@/components/tabs";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";
import { requireMe } from "@/lib/session";

export const metadata = { title: "Notifications — Chapl" };

type Item = Schemas["NotificationRead"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** The hue of a kind, by the domain it belongs to. */
function tone(kind: string): string {
  if (kind.startsWith("care") || kind === "checkup" || kind === "profile") return "var(--ruby)";
  if (kind === "gift") return "var(--emerald)";
  if (["checkin", "reminder", "attendance", "birthday"].some((k) => kind.startsWith(k))) return "var(--gold)";
  if (["placement", "team", "sermon"].some((k) => kind.startsWith(k))) return "var(--teal)";
  if (kind.startsWith("event") || kind.startsWith("church")) return "var(--violet)";
  return "var(--cobalt)";
}

function utc(iso: string): Date {
  return new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
}

function when(iso: string): string {
  const d = utc(iso);
  const h = d.getHours() % 12 || 12;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "am" : "pm"}`;
}

async function nowMs(): Promise<number> {
  return Date.now();
}

/**
 * Everything you have been told, not only what arrived while the page
 * was open — the bell shows the live ones; this is the record.
 */
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ unread?: string; page?: string }>;
}) {
  const me = await requireMe("/app/notifications");
  const { unread, page: pageParam } = await searchParams;
  const unreadOnly = unread === "1";
  const page = Math.max(1, Number(pageParam ?? 1) || 1);
  const size = 50;

  const result = await api<Schemas["NotificationList"]>(
    `/communication/notifications?limit=${size}&skip=${(page - 1) * size}${unreadOnly ? "&unread_only=true" : ""}`,
  );
  const items = result.ok ? result.data.items : [];
  const total = result.ok ? result.data.total : 0;

  const now = await nowMs();
  const day = 24 * 60 * 60 * 1000;
  const groups: { label: string; items: Item[] }[] = [
    { label: "Today", items: [] },
    { label: "This week", items: [] },
    { label: "Earlier", items: [] },
  ];
  for (const n of items) {
    const age = now - utc(n.created_at).getTime();
    groups[age < day ? 0 : age < 7 * day ? 1 : 2].items.push(n);
  }

  const tab = (label: string, href: string, on: boolean) => (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium ${on ? "bg-sunk text-ink" : "text-ink-3 hover:text-ink"}`}
    >
      {label}
    </Link>
  );

  const mineView = (
    <>
      {!result.ok && <Notice kind="error">{result.error.detail}</Notice>}

      {items.length === 0 ? (
        <Panel>
          <Empty>{unreadOnly ? "You are all caught up." : "Nothing yet."}</Empty>
        </Panel>
      ) : (
        groups
          .filter((g) => g.items.length > 0)
          .map((g) => (
            <Panel key={g.label} title={g.label}>
              <ul className="-mx-2">
                {g.items.map((n) => {
                  const body = (
                    <>
                      <span
                        className="dot mt-[7px] shrink-0"
                        style={{ color: tone(n.type), opacity: n.is_read ? 0.35 : 1 }}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className={`block text-[13px] leading-snug ${n.is_read ? "text-ink-2" : "font-semibold text-ink"}`}>
                          {n.title}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-ink-3">{n.message}</span>
                      </span>
                      <span className="tnum shrink-0 text-[11px] text-ink-3">{when(n.created_at)}</span>
                    </>
                  );
                  const shell = "flex items-start gap-3 rounded-xl px-2 py-2.5";
                  return (
                    <li key={n.id}>
                      {n.href ? (
                        <a
                          href={`/app/notifications/${n.id}?to=${encodeURIComponent(n.href)}`}
                          className={`${shell} hover:bg-mist`}
                        >
                          {body}
                        </a>
                      ) : (
                        <span className={shell}>{body}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ))
      )}

      {total > size && (
        <div className="flex items-center justify-between text-[12px] text-ink-3">
          {page > 1 ? (
            <Link href={`/app/notifications?page=${page - 1}${unreadOnly ? "&unread=1" : ""}`} className="hover:text-ink">
              Newer
            </Link>
          ) : <span />}
          <span className="tnum">{(page - 1) * size + 1}–{Math.min(page * size, total)} of {total}</span>
          {page * size < total ? (
            <Link href={`/app/notifications?page=${page + 1}${unreadOnly ? "&unread=1" : ""}`} className="hover:text-ink">
              Older
            </Link>
          ) : <span />}
        </div>
      )}
    </>
  );

  // Platform staff also see everything the platform is telling anyone —
  // the traffic, not their own tray. Refreshed every fifteen seconds.
  const feed = me.is_platform_staff
    ? await api<Schemas["NotificationFeed"]>("/communication/notifications/feed?limit=100", { churchId: "all" })
    : null;
  const feedView = !feed ? null : !feed.ok ? (
    <Notice kind="error">{feed.error.detail}</Notice>
  ) : feed.data.items.length === 0 ? (
    <Panel><Empty>Nothing has been sent yet.</Empty></Panel>
  ) : (
    <Panel>
      <ul className="-mx-2">
        {feed.data.items.map((n) => (
          <li key={n.id} className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-mist">
            <span className="dot mt-[7px] shrink-0" style={{ color: tone(n.type) }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] leading-snug text-ink">{n.title}</span>
              <span className="mt-0.5 block text-[12px] text-ink-3">{n.message}</span>
              <span className="mt-1 block text-[11px] text-ink-3">
                To {n.recipient_name ?? "a deleted account"}
                {n.church_name ? ` · ${n.church_name}` : ""} · <span className="font-mono">{n.type}</span>
                {n.is_read ? " · read" : ""}
              </span>
            </span>
            <span className="tnum shrink-0 text-[11px] text-ink-3">{when(n.created_at)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );

  return (
    <Page>
      <PageHead
        eyebrow="You"
        title="Notifications"
        action={
          <span className="flex items-center gap-2">
            <span className="flex items-center gap-1 rounded-xl border border-line p-0.5">
              {tab("All", "/app/notifications", !unreadOnly)}
              {tab("Unread", "/app/notifications?unread=1", unreadOnly)}
            </span>
            <form action={markAllRead}>
              <button type="submit" className="btn btn-quiet btn-sm">
                <CheckCheck className="h-3.5 w-3.5" aria-hidden />
                Mark all read
              </button>
            </form>
          </span>
        }
      />

      {me.is_platform_staff ? (
        <Tabs
          tabs={[
            { id: "mine", label: "Mine", count: total },
            { id: "platform", label: "Across the platform", count: feed?.ok ? feed.data.total : undefined },
          ]}
        >
          <div className="space-y-3">{mineView}</div>
          <div className="space-y-3">
            <AutoRefresh seconds={15} />
            {feedView}
          </div>
        </Tabs>
      ) : (
        mineView
      )}
    </Page>
  );
}
