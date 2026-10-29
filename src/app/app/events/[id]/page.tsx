import Link from "next/link";
import { eventSignup, setReminder } from "@/app/actions/manage";
import { AccountLink } from "@/components/account-link";
import { ActionButton, ReminderControl } from "@/components/editors";
import { Page, PageHead, Panel } from "@/components/panels";
import { ShareButton } from "@/components/share-button";
import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import type { ChurchEvent, Person, Paged } from "@/lib/types";
import type { Schemas } from "@/lib/generated/api";

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireMe(`/app/events/${id}`);
  const event = await api<ChurchEvent>(`/events/${encodeURIComponent(id)}`);
  if (!event.ok) return <Page><PageHead eyebrow="Calendar" title="Event unavailable" lede={event.error.detail} /></Page>;
  const e = event.data;
  const summary = await api<Schemas["EventRegistrationSummary"]>(`/events/${id}/registrations`, { churchId: e.church_id });
  const roster = summary.ok ? summary.data.registrations ?? [] : [];
  const people = roster.length ? await api<Paged<Person>>("/users/?limit=2000", { churchId: e.church_id }) : null;
  const names = new Map(people?.ok ? people.data.items.map(p => [p.id, p.full_name]) : []);
  const reminders = await api<Schemas["EventReminderRead"][]>("/events/reminders/mine", { churchId: e.church_id });
  const mine = reminders.ok ? reminders.data.find((r) => r.event_id === id) : undefined;
  const upcoming = e.recurrence_rule || new Date(e.start_date).getTime() > (await nowMs());
  return <Page>
    <Link href="/app/events" className="text-[12px] text-ink-3 hover:underline">Back to calendar</Link>
    <PageHead eyebrow="Calendar" title={e.title} lede={e.description ?? e.location ?? undefined}
      action={<ShareButton title={e.title} text={e.location ?? undefined} path={`/app/events/${id}`} />} />
    <Panel title="Registration" accent="var(--violet)">
      <p className="text-[13px]">{new Date(e.start_date).toLocaleString()} · {e.location ?? "Location to follow"}</p>
      {summary.ok ? <div className="mt-3 space-y-3"><p className="text-[12px] text-ink-3">{summary.data.attendees} registered{summary.data.capacity ? ` of ${summary.data.capacity} places` : ""}</p>
        {e.registration_required ? <ActionButton action={eventSignup} fields={{ id, church_id: e.church_id, cancel: String(summary.data.registered) }} label={summary.data.registered ? "Cancel registration" : "Register"} /> : <p className="text-[12px] text-ink-3">Registration is not required.</p>}
      </div> : <p className="mt-3 text-[12px] text-ink-3">{summary.error.detail}</p>}
    </Panel>
    <Panel title="Reminder" lede={e.recurrence_rule ? "This event repeats — the reminder is for the next one" : undefined} accent="var(--gold)">
      {upcoming ? <div className="space-y-2">
        {mine && <p className="text-[12.5px] text-ink-2">We will remind you on {when(mine.reminder_time)}.</p>}
        <ReminderControl action={setReminder} eventId={id} current={mine?.reminder_time ?? null} />
      </div> : <p className="text-[12px] text-ink-3">This event has already happened.</p>}
    </Panel>
    {roster.length > 0 && <Panel title="Attendees"><ul className="space-y-2">{roster.map(r => <li key={r.id}><AccountLink id={r.user_id ?? null} name={r.user_id ? names.get(r.user_id) : undefined} /></li>)}</ul></Panel>}
  </Page>;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** A UTC time from the API, written out as `Sun 2 Nov, 9:00 am`. */
function when(iso: string): string {
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const h = d.getHours() % 12 || 12;
  return `${days[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "am" : "pm"}`;
}

/** Read off the render path, as the calendar page does. */
async function nowMs(): Promise<number> {
  return Date.now();
}
