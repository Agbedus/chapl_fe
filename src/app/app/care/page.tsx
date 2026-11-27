import Link from "next/link";
import { Check, CheckCheck, HandHeart, Lock, Phone, Search, X } from "lucide-react";

import { raiseCareRequest, respondToCare } from "@/app/actions/manage";
import { WhatsAppIcon } from "@/components/contact";
import { ActionButton, CareRequestEditor } from "@/components/editors";
import { Empty, Page, PageHead } from "@/components/panels";
import { Avatar, PersonLink } from "@/components/person";
import { Notice } from "@/components/ui/form";
import { canRead, canWrite } from "@/lib/access";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";
import { requireMe } from "@/lib/session";

type Request = Schemas["CareRequestRead"];

export const metadata = { title: "Care — Chapl" };

/* ------------------------------------------------------------------ */
/* the filters                                                         */
/* ------------------------------------------------------------------ */

const STATUSES = [
  { id: "active", label: "Needs action", match: (r: Request) => r.status !== "closed" },
  { id: "waiting", label: "Waiting", match: (r: Request) => r.status === "open" },
  { id: "in-hand", label: "In hand", match: (r: Request) => r.status === "acknowledged" },
  { id: "closed", label: "Closed", match: (r: Request) => r.status === "closed" },
  { id: "all", label: "All", match: () => true },
] as const;

const KINDS = [
  { id: "call", label: "Calls" },
  { id: "prayer", label: "Prayer" },
] as const;

const URGENCY: Record<string, { label: string; tone: string }> = {
  urgent: { label: "Urgent", tone: "var(--ruby)" },
  soon: { label: "This week", tone: "var(--gold)" },
  whenever: { label: "Whenever", tone: "var(--ink-3)" },
};

const STATE: Record<string, { label: string; tone: string }> = {
  open: { label: "Waiting", tone: "var(--ruby)" },
  acknowledged: { label: "In hand", tone: "var(--gold)" },
  closed: { label: "Closed", tone: "var(--emerald)" },
};

type Filters = { show: string; kind: string; urgency: string; from: string; q: string };

/** The URL for these filters with some of them changed; defaults drop out. */
function href(current: Filters, change: Partial<Filters>): string {
  const next = { ...current, ...change };
  const params = new URLSearchParams();
  if (next.show && next.show !== "active") params.set("show", next.show);
  if (next.kind) params.set("kind", next.kind);
  if (next.urgency) params.set("urgency", next.urgency);
  if (next.from) params.set("from", next.from);
  if (next.q) params.set("q", next.q);
  const query = params.toString();
  return query ? `/app/care?${query}` : "/app/care";
}

/* ------------------------------------------------------------------ */
/* time, written out                                                   */
/* ------------------------------------------------------------------ */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** `3 Nov, 6:30 pm` — written out, never left to a locale. */
function when(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours() % 12 || 12;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "am" : "pm"}`;
}

/** How long ago, in the unit a person would say it in. Server-rendered, so the clock is safe to read. */
function since(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 2) return "just now";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} h`;
  const days = Math.round(hours / 24);
  return days === 1 ? "1 day" : `${days} days`;
}

/* ------------------------------------------------------------------ */
/* the page                                                            */
/* ------------------------------------------------------------------ */

/**
 * Prayer and call requests, as one list.
 *
 * It used to be three: a panel of calls waiting, a tabbed queue, and the
 * reader's own requests in a tab beside it, with a strip of counts on
 * top. The same request could be on screen twice, and finding one meant
 * guessing which of the three it was in. Now there is one list and the
 * filters say what is in it: where it stands (with a count each), call
 * or prayer, how urgent, raised by you, and a search over the name and
 * what was asked. The filters are the URL, so a view can be linked to,
 * and they combine.
 *
 * The default is "Needs action", worst first: waiting before in hand,
 * urgent before whenever, a call before a prayer (somebody is waiting by
 * a phone), and the longest waiting first within that.
 */
export default async function CarePage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; kind?: string; urgency?: string; from?: string; q?: string }>;
}) {
  const me = await requireMe("/app/care");
  const leader = canRead(me, "checkup");
  const responder = canWrite(me, "checkup");
  const raw = await searchParams;

  const filters: Filters = {
    show: STATUSES.some((s) => s.id === raw.show) ? raw.show! : "active",
    kind: KINDS.some((k) => k.id === raw.kind) ? raw.kind! : "",
    urgency: raw.urgency && raw.urgency in URGENCY ? raw.urgency : "",
    from: leader && raw.from === "me" ? "me" : "",
    q: (raw.q ?? "").trim().slice(0, 80),
  };

  const [queue, mine] = await Promise.all([
    leader ? api<Schemas["CareRequestList"]>("/care/requests?limit=200") : Promise.resolve(null),
    api<Schemas["CareRequestList"]>("/care/requests?mine=true&limit=100"),
  ]);

  const source = leader && !filters.from ? queue : mine;
  const all = source?.ok ? source.data.items : [];
  const capped = source?.ok && source.data.total > all.length;

  // Every filter but status, so the status counts say what each would show.
  const needle = filters.q.toLowerCase();
  const narrowed = all.filter(
    (r) =>
      (!filters.kind || r.kind === filters.kind) &&
      (!filters.urgency || r.urgency === filters.urgency) &&
      (!needle ||
        r.subject.toLowerCase().includes(needle) ||
        (r.body ?? "").toLowerCase().includes(needle) ||
        (r.member_name ?? "").toLowerCase().includes(needle)),
  );

  const status = STATUSES.find((s) => s.id === filters.show)!;
  const rankStatus = { open: 0, acknowledged: 1, closed: 2 } as Record<string, number>;
  const rankUrgency = { urgent: 0, soon: 1, whenever: 2 } as Record<string, number>;
  const rows = narrowed.filter(status.match).sort((a, b) => {
    if (a.status === "closed" && b.status === "closed") {
      return (b.closed_at ?? b.created_at).localeCompare(a.closed_at ?? a.created_at);
    }
    return (
      (rankStatus[a.status] ?? 3) - (rankStatus[b.status] ?? 3) ||
      (rankUrgency[a.urgency] ?? 3) - (rankUrgency[b.urgency] ?? 3) ||
      (a.kind === "call" ? 0 : 1) - (b.kind === "call" ? 0 : 1) ||
      a.created_at.localeCompare(b.created_at)
    );
  });

  const narrowing = Boolean(filters.kind || filters.urgency || filters.from || filters.q);
  const waiting = all.filter((r) => r.status === "open").length;

  return (
    <Page>
      <PageHead
        title={leader ? "Care" : "Prayer and calls"}
        lede={
          leader
            ? waiting > 0
              ? `${waiting} waiting for someone to pick them up`
              : "Nobody is waiting"
            : "Ask for prayer or a call. Your leaders see it straight away."
        }
        action={<CareRequestEditor action={raiseCareRequest} />}
      />

      {source && !source.ok && <Notice kind="error">{source.error.detail}</Notice>}

      <section className="sheet care-list">
        {/* ---------------- filters ---------------- */}
        <div className="care-bar">
          <nav className="care-status" aria-label="Status">
            {STATUSES.map((s) => (
              <Link
                key={s.id}
                href={href(filters, { show: s.id })}
                aria-current={filters.show === s.id ? "page" : undefined}
                className="care-tab"
              >
                {s.label}
                <span className="care-tab-count tnum">{narrowed.filter(s.match).length}</span>
              </Link>
            ))}
          </nav>

          <form action="/app/care" method="get" className="care-search" role="search">
            {filters.show !== "active" && <input type="hidden" name="show" value={filters.show} />}
            {filters.kind && <input type="hidden" name="kind" value={filters.kind} />}
            {filters.urgency && <input type="hidden" name="urgency" value={filters.urgency} />}
            {filters.from && <input type="hidden" name="from" value={filters.from} />}
            <Search className="h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden />
            <input
              type="search"
              name="q"
              defaultValue={filters.q}
              placeholder="Search names and requests"
              aria-label="Search names and requests"
            />
          </form>
        </div>

        <div className="care-chips">
          <span className="care-chips-group" role="group" aria-label="Type">
            {KINDS.map((k) => (
              <Link
                key={k.id}
                href={href(filters, { kind: filters.kind === k.id ? "" : k.id })}
                aria-pressed={filters.kind === k.id}
                className="care-chip"
              >
                {k.id === "call" ? <Phone className="h-3 w-3" aria-hidden /> : <HandHeart className="h-3 w-3" aria-hidden />}
                {k.label}
              </Link>
            ))}
          </span>
          <span className="care-chips-rule" aria-hidden />
          <span className="care-chips-group" role="group" aria-label="Urgency">
            {Object.entries(URGENCY).map(([id, u]) => (
              <Link
                key={id}
                href={href(filters, { urgency: filters.urgency === id ? "" : id })}
                aria-pressed={filters.urgency === id}
                className="care-chip"
              >
                <span className="dot" style={{ color: u.tone }} aria-hidden />
                {u.label}
              </Link>
            ))}
          </span>
          {leader && (
            <>
              <span className="care-chips-rule" aria-hidden />
              <Link
                href={href(filters, { from: filters.from ? "" : "me" })}
                aria-pressed={Boolean(filters.from)}
                className="care-chip"
              >
                Raised by me
              </Link>
            </>
          )}
          {narrowing && (
            <Link href={href(filters, { kind: "", urgency: "", from: "", q: "" })} className="care-clear">
              <X className="h-3 w-3" aria-hidden />
              Clear
            </Link>
          )}
        </div>

        {/* ---------------- the list ---------------- */}
        {rows.length === 0 ? (
          <div className="p-4">
            <Empty
              action={narrowing ? { href: href(filters, { kind: "", urgency: "", from: "", q: "" }), label: "Clear filters" } : undefined}
            >
              {narrowing
                ? "Nothing matches these filters."
                : filters.show === "active" || filters.show === "waiting"
                  ? leader
                    ? "Nothing waiting. Everyone who asked has been looked after."
                    : "Nothing open. Use “Ask for prayer or a call” whenever you need it."
                  : "Nothing here yet."}
            </Empty>
          </div>
        ) : (
          <ul className="care-rows">
            {rows.map((r) => (
              <CareRow key={r.id} request={r} responder={responder && leader && !filters.from} showWho={leader && !filters.from} />
            ))}
          </ul>
        )}

        {capped && (
          <p className="care-foot">Showing the latest {all.length}. Search or filter to find an older one.</p>
        )}
      </section>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* one request                                                         */
/* ------------------------------------------------------------------ */

function CareRow({
  request: r,
  responder,
  showWho,
}: {
  request: Request;
  responder: boolean;
  /** A leader reads who asked; a member reading their own list already knows. */
  showWho: boolean;
}) {
  const urgency = URGENCY[r.urgency] ?? URGENCY.whenever;
  const state = STATE[r.status] ?? STATE.open;
  const name = r.member_name ?? "A member";
  const live = r.status !== "closed";

  const clock =
    r.status === "open"
      ? `Waiting ${since(r.created_at)}`
      : r.status === "acknowledged"
        ? `Picked up by ${r.acknowledged_by_name ?? "a leader"}${r.acknowledged_at ? `, ${since(r.acknowledged_at)} ago` : ""}`
        : `Closed${r.closed_at ? ` ${when(r.closed_at)}` : ""}`;

  return (
    <li className="care-row" data-status={r.status} style={{ "--tone": live ? urgency.tone : "transparent" } as React.CSSProperties}>
      {showWho && <Avatar name={name} src={r.member_avatar_url} size={32} />}

      <div className="care-main">
        <p className="care-line">
          {showWho &&
            (r.member_id ? (
              <PersonLink id={r.member_id} name={name} showAvatar={false} className="care-who hover:underline" />
            ) : (
              <span className="care-who">{name}</span>
            ))}
          <span className="care-subject">{r.subject}</span>
        </p>
        {r.body && <p className="care-body">{r.body}</p>}
        <p className="care-meta">
          <span className="care-pill" style={{ color: state.tone }}>
            <span className="dot" aria-hidden />
            {state.label}
          </span>
          <span className="inline-flex items-center gap-1">
            {r.kind === "call" ? <Phone className="h-3 w-3" aria-hidden /> : <HandHeart className="h-3 w-3" aria-hidden />}
            {r.kind === "call" ? "Wants a call" : "Prayer"}
          </span>
          {r.urgency !== "whenever" && <span style={{ color: urgency.tone }}>{urgency.label}</span>}
          {r.is_private && (
            <span className="inline-flex items-center gap-1">
              <Lock className="h-3 w-3" aria-hidden /> Pastors only
            </span>
          )}
          <span>{clock}</span>
          <span className="care-date" title={when(r.created_at)}>
            Asked {when(r.created_at)}
          </span>
        </p>
      </div>

      {live && (showWho || responder) && (
        <div className="care-actions">
          {showWho && <Reach request={r} />}
          {responder && r.status === "open" && (
            <ActionButton
              action={respondToCare}
              fields={{ id: r.id, step: "acknowledge" }}
              label="Pick up"
              icon={<Check className="h-3 w-3" aria-hidden />}
            />
          )}
          {responder && (
            <ActionButton
              action={respondToCare}
              fields={{ id: r.id, step: "close" }}
              label="Close"
              icon={<CheckCheck className="h-3 w-3" aria-hidden />}
            />
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Call and WhatsApp, for the person who asked. Ordinary links, so they
 * open the leader's own dialler and WhatsApp: nothing is sent from here,
 * and a message only leaves when they press send. A call request makes
 * the call the primary button; a prayer request is often best answered
 * with a message saying someone is praying.
 */
function Reach({ request: r }: { request: Request }) {
  const number = r.member_phone;
  if (!number) return <span className="care-nophone">No number on file</span>;
  const first = (r.member_name ?? "").split(" ")[0] || "there";
  const message =
    r.kind === "call"
      ? `Hi ${first}, it's your church care team. You asked for a call. Is now a good time?`
      : `Hi ${first}, we saw your prayer request ("${r.subject}"). We are praying with you.`;
  const digits = number.replace(/[^\d]/g, "");
  return (
    <>
      <a
        href={`tel:${number}`}
        className={`btn btn-sm ${r.kind === "call" && r.status === "open" ? "btn-primary" : "btn-quiet"}`}
        title={`Call ${number}`}
      >
        <Phone className="h-3.5 w-3.5" aria-hidden />
        Call
      </a>
      <a
        href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="care-wa"
        title={`WhatsApp ${number}`}
      >
        <WhatsAppIcon className="h-[15px] w-[15px]" />
        <span className="sr-only">WhatsApp {first}</span>
      </a>
    </>
  );
}
