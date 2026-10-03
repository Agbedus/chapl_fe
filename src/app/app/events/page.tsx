import Link from "next/link";
import { canWrite } from "@/lib/access";
import { saveEvent } from "@/app/actions/manage";
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

  const [list, branchList, cellList, today] = await Promise.all([
    api<Paged<ChurchEvent>>("/events/?limit=400&sort=start_date&order=asc"),
    api<Paged<Branch>>("/branches/?limit=200&sort=name&order=asc"),
    api<Paged<Cell>>("/cells/?limit=300&sort=code&order=asc"),
    now(),
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

  const events: CalendarEvent[] = rows.map((e) => ({
    id: e.id,
    title: e.title,
    type: e.event_type ?? "other",
    tone: TYPE_TONE[e.event_type] ?? "var(--ink-3)",
    start: e.start_date,
    end: e.end_date,
    allDay: e.is_all_day,
    location: e.location,
    // The narrowest scope set is the audience, exactly as the fan-out
    // resolves it: a cell beats a branch, a branch beats the church.
    scope: e.cell_id
      ? (cellName.get(e.cell_id) ?? "One cell")
      : e.branch_id
        ? (branchName.get(e.branch_id) ?? "One branch")
        : "Everyone",
    published: e.is_published,
    needsSignup: e.registration_required,
  }));

  return (
    <Page fill>
      <PageHead
        eyebrow="Activity"
        title="Calendar"
        lede="Everything the church has on."
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
        lede="Month, timeline or list — the same events, three ways"
        accent="var(--violet)"
      >
        <Calendar events={events} today={today} />
      </Panel>
    </Page>
  );
}
