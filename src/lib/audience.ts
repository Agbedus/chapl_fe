import "server-only";

import type { Branch, Cell, Me, Role } from "@/lib/types";

/**
 * Who a person may broadcast to, and whether they may broadcast at all.
 *
 * Notices and events both carry a scope — the whole church, one branch,
 * or one cell — and which of those an author may choose follows their
 * own authority and nothing else.
 *
 * The API enforces this and refuses anything outside it, so this is not
 * the security boundary. It exists so the boundary is never reached:
 * offering someone an audience they cannot use is offering them a 403.
 *
 * **The two resources differ**, which is easy to miss and was wrong here
 * first time round. A cell leader can read notices and events but write
 * neither, so they get no button. A department head can create an event
 * but not post a notice. The table below mirrors `PERMISSIONS` in
 * `app/core/permissions.py`; if that changes, this has to follow.
 */

/** Roles that may write, per resource. */
const MAY_WRITE: Record<"notice" | "event", Set<Role>> = {
  notice: new Set<Role>([
    "super_admin",
    "church_admin",
    "senior_pastor",
    "branch_pastor",
    "branch_admin",
  ]),
  event: new Set<Role>([
    "super_admin",
    "church_admin",
    "senior_pastor",
    "branch_pastor",
    "branch_admin",
    "department_head",
  ]),
};

/** Roles whose authority covers the whole tenant. */
const CHURCH_WIDE = new Set<Role>(["super_admin", "church_admin", "senior_pastor"]);

export type ScopeOption = { value: string; label: string };

export function audienceOptions(
  me: Me,
  churchId: string | null,
  branches: Branch[],
  cells: Cell[],
  resource: "notice" | "event",
): ScopeOption[] {
  const writers = MAY_WRITE[resource];

  // Only grants inside this church count, and only those that carry the
  // write. A cell-scoped grant that cannot write reaches nobody.
  const grants = me.assignments.filter(
    (a) =>
      // `/auth/me` returns active grants only, so there is nothing to
      // filter for revocation here.
      writers.has(a.role) &&
      (a.scope_type !== "church" || !churchId || a.scope_id === churchId),
  );

  if (grants.length === 0 && !me.is_platform_staff) return [];

  const wholeChurch =
    me.is_platform_staff || grants.some((a) => CHURCH_WIDE.has(a.role));

  const branchIds = new Set(
    grants
      .filter((a) => a.scope_type === "branch" && a.scope_id)
      .map((a) => a.scope_id as string),
  );

  const reachableBranches = wholeChurch
    ? branches
    : branches.filter((b) => branchIds.has(b.id));

  // A branch pastor reaches every cell inside their branch. Nobody
  // reaches a cell without reaching its branch first, which is why there
  // is no cell-scoped grant in this list: the roles that hold one cannot
  // write either resource.
  const reachableCells = wholeChurch
    ? cells
    : cells.filter((c) => branchIds.has(c.branch_id));

  const options: ScopeOption[] = [];
  if (wholeChurch) {
    options.push({ value: "church", label: "Everyone in the church" });
  }
  for (const branch of reachableBranches) {
    options.push({ value: `branch:${branch.id}`, label: `Branch · ${branch.name}` });
  }
  for (const cell of reachableCells) {
    options.push({ value: `cell:${cell.id}`, label: `Cell · ${cell.name}` });
  }
  return options;
}
