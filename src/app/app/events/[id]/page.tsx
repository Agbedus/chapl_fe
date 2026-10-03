import Link from "next/link";
import { eventSignup } from "@/app/actions/manage";
import { AccountLink } from "@/components/account-link";
import { ActionButton } from "@/components/editors";
import { Page, PageHead, Panel } from "@/components/panels";
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
  return <Page>
    <Link href="/app/events" className="text-[12px] text-ink-3 hover:underline">Back to calendar</Link>
    <PageHead eyebrow="Calendar" title={e.title} lede={e.description ?? e.location ?? undefined} />
    <Panel title="Registration" accent="var(--violet)">
      <p className="text-[13px]">{new Date(e.start_date).toLocaleString()} · {e.location ?? "Location to follow"}</p>
      {summary.ok ? <div className="mt-3 space-y-3"><p className="text-[12px] text-ink-3">{summary.data.attendees} registered{summary.data.capacity ? ` of ${summary.data.capacity} places` : ""}</p>
        {e.registration_required ? <ActionButton action={eventSignup} fields={{ id, church_id: e.church_id, cancel: String(summary.data.registered) }} label={summary.data.registered ? "Cancel registration" : "Register"} /> : <p className="text-[12px] text-ink-3">Registration is not required.</p>}
      </div> : <p className="mt-3 text-[12px] text-ink-3">{summary.error.detail}</p>}
    </Panel>
    {roster.length > 0 && <Panel title="Attendees"><ul className="space-y-2">{roster.map(r => <li key={r.id}><AccountLink id={r.user_id ?? null} name={r.user_id ? names.get(r.user_id) : undefined} /></li>)}</ul></Panel>}
  </Page>;
}
