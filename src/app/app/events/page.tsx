import Link from "next/link";
import { canWrite } from "@/lib/access";
import { saveEvent } from "@/app/actions/manage";
import type { Schemas } from "@/lib/generated/api";
import { Calendar, type CalendarEvent } from "@/components/calendar";
import { EventEditor } from "@/components/editors";
import { Page, PageHead, Panel, StatCard } from "@/components/panels";
import { api } from "@/lib/api";
import { audienceOptions } from "@/lib/audience";
import { currentChurchId, requireMe } from "@/lib/session";
import type { Branch, Cell, ChurchEvent, Paged } from "@/lib/types";

export const metadata = { title: "Calendar — Chapl" };

const TYPE_TONE: Record<string, string> = {
  service: "var(--cobalt)",
  prayer: "var(--violet)",
  outreach: "var(--emerald)",
  rehearsal: "var(--teal)",
  meeting: "var(--gold)",
  conference: "var(--ruby)",
  other: "var(--ink-3)",
};

/**
 * The clock, read outside the render.
 *
 * `Date.now()` in a component body trips the compiler's impure-call rule
 * — correctly in general, even though a Server Component runs once per
 * request. Awaiting it makes the read an ordinary async value, and
 * passing the result down means the calendar and the page agree on what
 * "today" is.
 */
async function now(): Promise<string> {
  return new Date().toISOString();
}

export default async function EventsPage() {
  const me = await requireMe("/app/events");
  const churchId = await currentChurchId();

  // The calendar's window: a couple of months back, ten or so ahead.
  // The API answers at most 400 days at a time, and asking for more
  // fails the whole request — the calendar then falls back to showing
  // each repeating event once.
  // Whole days, so the window — and with it the cache key — stays the
  // same all day instead of changing every millisecond.
  const from = new Date();
  from.setMonth(from.getMonth() - 2, 1);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 395 * 24 * 60 * 60 * 1000);

  const [list, branchList, cellList, today, dated] = await Promise.all([
    api<Paged<ChurchEvent>>("/events/?limit=400&sort=start_date&order=asc"),
    api<Paged<Branch>>("/branches/?limit=200&sort=name&order=asc"),
    api<Paged<Cell>>("/cells/?limit=300&sort=code&order=asc"),
    now(),
    api<Schemas["EventOccurrenceList"]>(
      `/events/occurrences?start=${from.toISOString().slice(0, 19)}&end=${to.toISOString().slice(0, 19)}`,
    ),
  ]);

  if (!list.ok) {
    return (
      <Page>
        <h1 className="head text-[20px]">The calendar is not available</h1>
        <p className="text-[13px] text-ink-2">{list.error.detail}</p>
      </Page>
    );
  }

  const branches = branchList.ok ? branchList.data.items : [];
  const cells = cellList.ok ? cellList.data.items : [];
  const branchName = new Map(branches.map((b) => [b.id, b.name]));
  const cellName = new Map(cells.map((c) => [c.id, c.name]));

  // What this person may broadcast to. An empty list means they can read
  // the calendar but not add to it, so the button does not appear.
  const audiences = audienceOptions(me, churchId, branches, cells, "event");

  const rows = list.data.items;
  const cutoff = new Date(today).getTime();
  const upcoming = rows.filter((e) => new Date(e.start_date).getTime() >= cutoff);
  const published = rows.filter((e) => e.is_published).length;
  const needsSignup = rows.filter((e) => e.registration_required).length;
  const next = upcoming[0];

  // Repeats expanded by the API: a weekly service is on every Sunday,
  // not just the first. Falls back to the plain list if that fails.
  const byId = new Map(rows.map((e) => [e.id, e]));
  const occurrences = dated.ok
    ? dated.data.items.map((o) => ({ ...byId.get(o.event_id), ...o, id: o.event_id }))
    : rows.map((e) => ({ ...e, event_id: e.id, starts_at: e.start_date, ends_at: e.end_date, repeats: false }));

  const events: CalendarEvent[] = occurrences.map((e) => ({
    id: `${e.event_id}@${e.starts_at}`,
    href: `/app/events/${e.event_id}`,
    repeats: Boolean(e.repeats),
    title: e.title ?? "",
    type: e.event_type ?? "other",
    tone: TYPE_TONE[e.event_type ?? "other"] ?? "var(--ink-3)",
    start: e.starts_at,
    end: e.ends_at ?? null,
    allDay: Boolean(e.is_all_day),
    location: e.location ?? null,
    // The narrowest scope set is the audience, exactly as the fan-out
    // resolves it: a cell beats a branch, a branch beats the church.
    scope: e.cell_id
      ? (cellName.get(e.cell_id) ?? "One cell")
      : e.branch_id
        ? (branchName.get(e.branch_id) ?? "One branch")
        : "Everyone",
    published: Boolean(e.is_published),
    needsSignup: Boolean((e as { registration_required?: boolean }).registration_required),
  }));

  return (
    <Page fill>
      <PageHead
        eyebrow="Activity"
        title="Calendar"
        action={
          canWrite(me, "event") && audiences.length > 0 ? (
            <EventEditor action={saveEvent} audiences={audiences} />
          ) : undefined
        }
      />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Coming up"
          value={String(upcoming.length)}
          colour="var(--violet)"
          footnote={`of ${rows.length} on the calendar`}
        />
        <StatCard
          label="Next"
          value={
            next
              ? new Date(next.start_date).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                })
              : "—"
          }
          colour="var(--cobalt)"
          footnote={next?.title ?? "nothing scheduled"}
        />
        <StatCard
          label="Published"
          value={String(published)}
          colour="var(--emerald)"
          footnote={`${rows.length - published} still drafts`}
        />
        <StatCard
          label="Needing sign-up"
          value={String(needsSignup)}
          colour="var(--gold)"
          footnote="people must confirm they are coming"
        />
      </section>

      {upcoming.some(e => e.registration_required && e.is_published) && <Panel title="Event sign-up" accent="var(--gold)"><ul className="space-y-2">{upcoming.filter(e => e.registration_required && e.is_published).map(e => <li key={e.id}><Link href={`/app/events/${e.id}`} className="text-[13px] font-medium hover:underline">{e.title} · View registration</Link></li>)}</ul></Panel>}

      <Panel
        fill
        title="The calendar"
        accent="var(--violet)"
      >
        <Calendar events={events} today={today} />
      </Panel>
    </Page>
  );
}
