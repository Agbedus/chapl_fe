import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  CalendarDays,
  CheckCheck,
  Church,
  HandCoins,
  HeartHandshake,
  Inbox,
  Megaphone,
  MailOpen,
  PlayCircle,
  Search,
  Users,
  type LucideIcon,
} from "lucide-react";

import { markAllRead } from "@/app/actions/manage";
import { Empty, Page, PageHead, Panel } from "@/components/panels";
import { Notice } from "@/components/ui/form";
import { AutoRefresh } from "@/components/auto-refresh";
import { LiveRefresh } from "@/components/live-refresh";
import { Tabs } from "@/components/tabs";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";
import { requireMe } from "@/lib/session";

export const metadata = { title: "Notifications — Chapl" };

type Item = Schemas["NotificationRead"];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * What a notification is about, in the words a person would sort their
 * inbox by. Each topic has the hue of the domain it belongs to, an icon,
 * and the kinds the API sends that fall under it.
 */
const TOPICS: { id: string; label: string; icon: LucideIcon; hue: string; kinds: string[] }[] = [
  { id: "sunday", label: "Sunday and check-in", icon: CalendarCheck, hue: "var(--gold)", kinds: ["service", "checkin", "attendance"] },
  { id: "notices", label: "Notices", icon: Megaphone, hue: "var(--cobalt)", kinds: ["notice"] },
  { id: "events", label: "Events", icon: CalendarDays, hue: "var(--violet)", kinds: ["event", "reminder"] },
  { id: "sermons", label: "Sermons", icon: PlayCircle, hue: "var(--teal)", kinds: ["sermon"] },
  { id: "care", label: "Prayer and care", icon: HeartHandshake, hue: "var(--ruby)", kinds: ["care", "checkup"] },
  { id: "people", label: "People and teams", icon: Users, hue: "var(--cobalt)", kinds: ["welcome", "member", "placement", "team", "role", "profile", "birthday", "household"] },
  { id: "church", label: "Church", icon: Church, hue: "var(--violet)", kinds: ["church", "invitation"] },
  { id: "giving", label: "Giving", icon: HandCoins, hue: "var(--emerald)", kinds: ["gift"] },
];
const OTHER: (typeof TOPICS)[number] = { id: "other", label: "Other", icon: Bell, hue: "var(--ink-3)", kinds: [] };

function topicOf(kind: string): (typeof TOPICS)[number] {
  return TOPICS.find((t) => t.kinds.some((k) => kind === k || kind.startsWith(`${k}.`))) ?? OTHER;
}

function utc(iso: string): Date {
  return new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
}

/** `Today`, a weekday, or `12 Oct`: how an inbox dates a row. */
function stamp(iso: string, now: number): string {
  const d = utc(iso);
  const h = d.getHours() % 12 || 12;
  const time = `${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "am" : "pm"}`;
  const age = now - d.getTime();
  if (age < 24 * 60 * 60 * 1000 && new Date(now).getDate() === d.getDate()) return time;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

async function nowMs(): Promise<number> {
  return Date.now();
}

const PAGE = 30;

/**
 * Everything you have been told, laid out like an inbox: topics down the
 * left with how many are waiting in each, the list beside them, newest
 * first and grouped by day. The bell shows what arrives while a page is
 * open; this is the record. The filters are the URL, so a view can be
 * linked to and the back button means something.
 */
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string; unread?: string; q?: string; page?: string }>;
}) {
  const me = await requireMe("/app/notifications");
  const { topic: topicParam, unread, q = "", page: pageParam } = await searchParams;
  const unreadOnly = unread === "1";
  const topic = TOPICS.find((t) => t.id === topicParam) ?? (topicParam === "other" ? OTHER : null);
  const page = Math.max(1, Number(pageParam ?? 1) || 1);

  // The latest two hundred, once: the counts beside each topic and the
  // list itself are read off the same set, so they always agree.
  const result = await api<Schemas["NotificationList"]>("/communication/notifications?limit=200");
  const all = result.ok ? result.data.items : [];
  const total = result.ok ? result.data.total : 0;

  const count = (pick: (n: Item) => boolean) => all.filter(pick).length;
  const unreadAll = count((n) => !n.is_read);

  const needle = q.trim().toLowerCase();
  const matching = all.filter(
    (n) =>
      (!topic || topicOf(n.type).id === topic.id) &&
      (!unreadOnly || !n.is_read) &&
      (!needle || `${n.title} ${n.message}`.toLowerCase().includes(needle)),
  );
  const items = matching.slice((page - 1) * PAGE, page * PAGE);

  const now = await nowMs();
  const dayMs = 24 * 60 * 60 * 1000;
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const sections: { label: string; items: Item[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This week", items: [] },
    { label: "Earlier", items: [] },
  ];
  for (const n of items) {
    const age = startOfToday.getTime() - utc(n.created_at).getTime();
    sections[age <= 0 ? 0 : age <= dayMs ? 1 : age <= 6 * dayMs ? 2 : 3].items.push(n);
  }

  /** A link that keeps the other filters and resets the page. */
  const link = (over: { topic?: string | null; unread?: boolean; q?: string | null; page?: number }) => {
    const params = new URLSearchParams();
    const t = over.topic === undefined ? topic?.id : over.topic;
    const u = over.unread === undefined ? unreadOnly : over.unread;
    const query = over.q === undefined ? q : over.q;
    if (t) params.set("topic", t);
    if (u) params.set("unread", "1");
    if (query) params.set("q", query);
    if (over.page && over.page > 1) params.set("page", String(over.page));
    const text = params.toString();
    return `/app/notifications${text ? `?${text}` : ""}`;
  };

  const rail = (
    <nav aria-label="Notification filters" className="notif-rail">
      <Link href={link({ topic: null, unread: false })} aria-current={!topic && !unreadOnly ? "page" : undefined} className="notif-filter">
        <Inbox className="h-4 w-4" aria-hidden />
        <span className="flex-1">All</span>
        <span className="tnum notif-count">{all.length}</span>
      </Link>
      <Link href={link({ topic: null, unread: true })} aria-current={!topic && unreadOnly ? "page" : undefined} className="notif-filter">
        <MailOpen className="h-4 w-4" aria-hidden />
        <span className="flex-1">Unread</span>
        {unreadAll > 0 && <span className="notif-badge tnum">{unreadAll}</span>}
      </Link>
      <p className="notif-rail-title">Topics</p>
      {[...TOPICS, OTHER].map((t) => {
        const here = count((n) => topicOf(n.type).id === t.id);
        if (here === 0 && topic?.id !== t.id) return null;
        const fresh = count((n) => topicOf(n.type).id === t.id && !n.is_read);
        const Icon = t.icon;
        return (
          <Link
            key={t.id}
            href={link({ topic: t.id })}
            aria-current={topic?.id === t.id ? "page" : undefined}
            className="notif-filter"
            style={{ "--hue": t.hue } as React.CSSProperties}
          >
            <Icon className="h-4 w-4 notif-icon" aria-hidden />
            <span className="flex-1">{t.label}</span>
            {fresh > 0 ? <span className="notif-badge tnum">{fresh}</span> : <span className="tnum notif-count">{here}</span>}
          </Link>
        );
      })}
    </nav>
  );

  const mineView = (
    <div className="notif-layout">
      {rail}

      <section className="min-w-0">
        <form action="/app/notifications" className="notif-search">
          <Search className="h-4 w-4 text-ink-3" aria-hidden />
          {topic && <input type="hidden" name="topic" value={topic.id} />}
          {unreadOnly && <input type="hidden" name="unread" value="1" />}
          <input name="q" defaultValue={q} placeholder="Search notifications" aria-label="Search notifications" autoComplete="off" />
          {q && (
            <Link href={link({ q: null })} className="text-[12px] text-ink-3 hover:text-ink">
              Clear
            </Link>
          )}
        </form>

        {!result.ok && <Notice kind="error">{result.error.detail}</Notice>}

        {matching.length === 0 ? (
          <Panel>
            <Empty>
              {needle
                ? "Nothing matches that search."
                : unreadOnly
                  ? "You are all caught up."
                  : topic
                    ? `No ${topic.label.toLowerCase()} notifications.`
                    : "Nothing yet."}
            </Empty>
          </Panel>
        ) : (
          sections
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <div key={g.label} className="mt-5 first:mt-0">
                <h2 className="notif-day">{g.label}</h2>
                <ul className="notif-list">
                  {g.items.map((n) => {
                    const t = topicOf(n.type);
                    const Icon = t.icon;
                    const row = (
                      <>
                        <span className="notif-avatar" style={{ "--hue": t.hue } as React.CSSProperties}>
                          <Icon className="h-[17px] w-[17px]" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline gap-2">
                            <span className={`truncate text-[13.5px] ${n.is_read ? "text-ink-2" : "font-semibold text-ink"}`}>{n.title}</span>
                            {!n.is_read && <span className="dot shrink-0" style={{ color: "var(--cobalt)" }} aria-label="Unread" />}
                          </span>
                          <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">{n.message}</span>
                          <span className="notif-topic">{t.label}</span>
                        </span>
                        <span className="tnum shrink-0 text-[11.5px] text-ink-3">{stamp(n.created_at, now)}</span>
                      </>
                    );
                    return (
                      <li key={n.id} data-unread={n.is_read ? undefined : ""}>
                        {n.href ? (
                          <a href={`/app/notifications/${n.id}?to=${encodeURIComponent(n.href)}`} className="notif-row">
                            {row}
                          </a>
                        ) : (
                          <span className="notif-row">{row}</span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
        )}

        {matching.length > PAGE && (
          <div className="mt-5 flex items-center justify-between text-[12px] text-ink-3">
            {page > 1 ? (
              <Link href={link({ page: page - 1 })} className="hover:text-ink">Newer</Link>
            ) : <span />}
            <span className="tnum">{(page - 1) * PAGE + 1}–{Math.min(page * PAGE, matching.length)} of {matching.length}</span>
            {page * PAGE < matching.length ? (
              <Link href={link({ page: page + 1 })} className="hover:text-ink">Older</Link>
            ) : <span />}
          </div>
        )}
        {total > all.length && (
          <p className="mt-4 text-[11.5px] text-ink-3">Showing your latest {all.length} of {total}.</p>
        )}
      </section>
    </div>
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
            <span className="dot mt-[7px] shrink-0" style={{ color: topicOf(n.type).hue }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] leading-snug text-ink">{n.title}</span>
              <span className="mt-0.5 block text-[12px] text-ink-3">{n.message}</span>
              <span className="mt-1 block text-[11px] text-ink-3">
                To {n.recipient_name ?? "a deleted account"}
                {n.church_name ? ` · ${n.church_name}` : ""} · <span className="font-mono">{n.type}</span>
                {n.is_read ? " · read" : ""}
              </span>
            </span>
            <span className="tnum shrink-0 text-[11px] text-ink-3">{stamp(n.created_at, now)}</span>
          </li>
        ))}
      </ul>
    </Panel>
  );

  return (
    <Page>
      {/* New ones arrive while this page is open: the bell hears them, and
          this re-reads the list so they appear here too. */}
      <LiveRefresh prefix="notification" fallback={60} />
      <PageHead
        eyebrow="You"
        title="Notifications"
        lede={unreadAll > 0 ? `${unreadAll} unread` : "You are all caught up"}
        action={
          <form action={markAllRead}>
            <button type="submit" className="btn btn-quiet btn-sm" disabled={unreadAll === 0}>
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              Mark all read
            </button>
          </form>
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
