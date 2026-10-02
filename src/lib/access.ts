import type { Me, Role } from "@/lib/types";

/**
 * What a signed-in person may see, mirrored from the API.
 *
 * The sidenav offered every page to everybody. A member with no role got
 * the whole administrative console — Branches, Everyone, Team & roles,
 * Giving — and a checklist telling them to "add your first branch". The
 * API refused all of it correctly, so the app rendered as a broken admin
 * screen: zero branches and zero cells beside a count of eight hundred
 * people, and a 404 on Giving.
 *
 * **This is not the security boundary.** `app/core/permissions.py` is,
 * and it is enforced on every request. This exists so the boundary is
 * never reached: offering someone a link that answers 403 is offering
 * them a broken app.
 *
 * The table below is a transcription of `PERMISSIONS` in that module. If
 * it changes there, it has to change here — and the cost of drift is a
 * dead link, not a leak.
 */

/** Resources, named as the API names them. */
export type Resource =
  | "church" | "branch" | "cell" | "user" | "membership" | "assignment"
  | "department" | "event" | "sermon" | "donation" | "attendance"
  | "checkup" | "notice" | "audit_log";

const ALL: Resource[] = [
  "church", "branch", "cell", "user", "membership", "assignment",
  "department", "event", "sermon", "donation", "attendance", "checkup",
  "notice", "audit_log",
];

/** What each role may **read**. Writing is the API's business, not the nav's. */
const READABLE: Record<Role, Resource[]> = {
  super_admin: ALL,
  platform_admin: [
    "church", "branch", "cell", "user", "membership", "assignment",
    "department", "event", "sermon", "attendance", "checkup", "notice",
    "audit_log",
  ],
  church_admin: ALL,
  senior_pastor: [
    "church", "branch", "cell", "user", "membership", "assignment",
    "department", "event", "sermon", "donation", "attendance", "checkup",
    "notice",
  ],
  branch_pastor: [
    "branch", "cell", "user", "membership", "department", "event",
    "sermon", "donation", "attendance", "checkup", "notice",
  ],
  branch_admin: [
    "branch", "cell", "user", "membership", "department", "event",
    "sermon", "attendance", "checkup", "notice",
  ],
  cell_leader: ["cell", "user", "membership", "attendance", "checkup", "event", "notice"],
  cell_assistant: ["cell", "user", "membership", "attendance", "checkup", "event", "notice"],
  department_head: ["department", "user", "event", "notice"],
};

/** Every resource this person can read, across all their grants. */
export function readable(me: Me): Set<Resource> {
  if (me.is_platform_staff) return new Set(ALL);
  const out = new Set<Resource>();
  for (const grant of me.assignments) {
    for (const resource of READABLE[grant.role] ?? []) out.add(resource);
  }
  return out;
}

export function canRead(me: Me, resource: Resource): boolean {
  return readable(me).has(resource);
}

/**
 * Somebody who holds no grant at all.
 *
 * Not the same as "cannot do much": a department head holds one narrow
 * grant and is still a leader. This is the person the app had nothing
 * for — they belong to a church and administer none of it.
 */
export function isPlainMember(me: Me): boolean {
  return !me.is_platform_staff && me.assignments.length === 0;
}

/**
 * May they *write* this resource, not merely read it?
 *
 * `readable()` answers what a page may show. This answers what it may
 * offer, and the two are not the same: a senior pastor reads giving and
 * cannot record it, so a "Record a gift" button on their screen is a
 * button that always comes back 403. A control that always fails is
 * worse than no control — the same rule that keeps platform roles off
 * the grant form.
 *
 * Transcribed from `PERMISSIONS` in `app/core/permissions.py`. It is a
 * second copy of that table and will drift if the first one changes,
 * which is why it covers only the handful of resources where read and
 * write genuinely diverge rather than mirroring the whole thing.
 */
const WRITERS: Partial<Record<Resource, Role[]>> = {
  // Giving is the sharpest split: everyone senior reads it, only a
  // church admin may enter it.
  donation: ["super_admin", "church_admin"],
  assignment: ["super_admin", "church_admin"],
  audit_log: [], // nobody — the API has no write route at all
  church: ["super_admin", "platform_admin", "church_admin"],
};

export function canWrite(me: Me, resource: Resource): boolean {
  const allowed = WRITERS[resource];
  // Not listed means read and write travel together for this resource,
  // so whoever may read it may write it.
  if (!allowed) return canRead(me, resource);
  return me.assignments.some((a) => allowed.includes(a.role));
}
