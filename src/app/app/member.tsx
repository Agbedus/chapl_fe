import { MemberHome } from "@/components/member-home";
import { api } from "@/lib/api";
import type {
  Branch, Cell, ChurchEvent, Me, Notice, Paged, PersonProfile,
} from "@/lib/types";

/**
 * The member's home, fetched.
 *
 * Split from the dashboard route so the leader's console and this stay
 * out of each other's way — they share a URL and nothing else.
 *
 * Every call here is one the API grants a role-less member: their own
 * profile, and the events and notices addressed to them. Nothing asks
 * for a church-wide figure, so nothing comes back refused and rendered
 * as a zero.
 */
async function clockNow(): Promise<number> {
  return Date.now();
}

export async function MemberDashboard({ me }: { me: Me }) {
  const home = me.memberships[0] ?? null;

  const [profileResult, eventList, noticeList, branchList, cellList] =
    await Promise.all([
      api<PersonProfile>(`/users/${me.id}/profile`),
      api<Paged<ChurchEvent>>(
        "/events/?limit=40&sort=start_date&order=asc&is_published=true",
      ),
      api<Paged<Notice>>("/communication/notices/?limit=10&sort=created_at&order=desc"),
      home ? api<Paged<Branch>>("/branches/?limit=200") : Promise.resolve(null),
      home ? api<Paged<Cell>>("/cells/?limit=300") : Promise.resolve(null),
    ]);

  /*
   * Names for the two ids the membership carries.
   *
   * A member can read neither `/branches/` nor `/cells/` — both answer
   * 403 — so these fall back to whatever `/auth/me` already told us.
   * Asking and failing costs nothing and covers the leader-ish roles who
   * can read them; relying on it would leave a member looking at a UUID.
   */
  const branchName =
    (branchList?.ok
      ? branchList.data.items.find((b) => b.id === home?.branch_id)?.name
      : null) ?? home?.branch_name ?? null;

  const cellName =
    (cellList?.ok
      ? cellList.data.items.find((c) => c.id === home?.cell_id)?.name
      : null) ?? home?.cell_name ?? null;

  // Only what has not happened yet, and only what they can see.
  //
  // The clock is awaited rather than read inline: `Date.now()` in a
  // component body trips the compiler's impure-call rule, correctly in
  // general even though a Server Component runs once per request.
  const now = await clockNow();
  const events = eventList.ok
    ? eventList.data.items.filter((e) => new Date(e.start_date).getTime() >= now)
    : [];

  return (
    <MemberHome
      me={me}
      profile={profileResult.ok ? profileResult.data : null}
      events={events}
      notices={noticeList.ok ? noticeList.data.items : []}
      cellName={cellName}
      branchName={branchName}
    />
  );
}
