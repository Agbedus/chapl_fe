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
