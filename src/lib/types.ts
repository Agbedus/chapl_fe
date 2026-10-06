import type { Schemas } from "@/lib/generated/api";

/** Shapes the Chapl API returns. Kept narrow — only what the UI reads. */

export type Role = Required<Schemas["Role"]>;

export type ScopeType = Required<Schemas["ScopeType"]>;

export type MembershipRef = Required<Schemas["MembershipRef"]>;

export type ScopeRef = Required<Schemas["ScopeRef"]>;

export type Me = Required<Schemas["UserMe"]>;

export type Token = Omit<Required<Schemas["Token"]>, "user"> & { user: Me };

export type Church = Required<Schemas["ChurchRead"]>;

export type ChurchStatus = Required<Schemas["ChurchStatus"]>;

export const CHURCH_STATUS_LABEL: Record<ChurchStatus, string> = {
  pending: "Awaiting verification",
  active: "Verified",
  rejected: "Not approved",
  suspended: "Suspended",
};

/** Status gets status colour, not a domain hue — it is not about people. */
export const CHURCH_STATUS_TONE: Record<ChurchStatus, string> = {
  pending: "var(--gold)",
  active: "var(--emerald)",
  rejected: "var(--ruby)",
  suspended: "var(--ink-3)",
};

export type ChurchStats = Required<Schemas["ChurchStats"]>;

export type Branch = Required<Schemas["BranchRead"]>;

export type InvitationPreview = Required<Schemas["InvitationPreview"]>;

export type Paged<T> = { items: T[]; total: number };

/** How a role reads to a person, and which domain colour it carries. */
export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super admin",
  platform_admin: "Platform admin",
  church_admin: "Church admin",
  senior_pastor: "Senior pastor",
  branch_pastor: "Branch pastor",
  branch_admin: "Branch admin",
  cell_leader: "Cell leader",
  cell_assistant: "Cell assistant",
  department_head: "Department head",
};

/* --- the dashboard ---------------------------------------------------- */

/**
 * One endpoint answers both audiences. A church leader gets their tenant;
 * platform staff with no tenant selected get `platform: true` and the same
 * fields computed across every church, plus a `churches` league table.
 *
 * The backend's Jinja admin screen is a different thing entirely — it
 * carries telemetry and table shortcuts, which no leader has any use for.
 */
export type TrendPoint = Schemas["TrendPoint"];
export type BranchRow = Schemas["BranchRow"];
export type CellRow = Schemas["CellRow"];
export type Slice = Schemas["Slice"];
export type Demographics = Schemas["Demographics"];
export type GivingMonth = Schemas["GivingMonth"];
export type GivingType = Schemas["GivingType"];
export type GrowthPoint = Schemas["GrowthPoint"];
export type ChurchRow = Schemas["ChurchRow"];
export type StaffOverview = Schemas["StaffOverview"];
/** Audience-specific blocks (`staff`, `churches`, `birthdays`…) may be absent. */
export type Dashboard = Schemas["Dashboard"];

/* --- the tenant tree --------------------------------------------------- */

export type Cell = Required<Schemas["CellRead"]>;

export type Person = Required<Schemas["UserRead"]>;

export type Membership = Required<Schemas["MembershipRead"]>;

/* --- invitations ------------------------------------------------------- */

export type InvitationStatus = Schemas["InvitationStatus"] | "expired";

export type Invitation = Required<Schemas["InvitationRead"]>;

/** The token comes back exactly once, on create or resend. */
export type InvitationCreated = Required<Schemas["InvitationCreated"]>;

/* --- authority --------------------------------------------------------- */

export type Assignment = Required<Schemas["AssignmentRead"]>;

export type GrantableRole = Schemas["GrantableRole"];

/** Which rung of the tree each role is granted on. */
export const ROLE_SCOPE: Record<Role, ScopeType> = {
  super_admin: "platform",
  platform_admin: "platform",
  church_admin: "church",
  senior_pastor: "church",
  branch_pastor: "branch",
  branch_admin: "branch",
  cell_leader: "cell",
  cell_assistant: "cell",
  department_head: "department",
};

/** What each role is actually for, in one line, for the grant form. */
export const ROLE_BLURB: Record<Role, string> = {
  super_admin: "Everything, across every church.",
  platform_admin: "Support access across churches. Cannot read giving.",
  church_admin: "Full authority inside this church, including giving and roles.",
  senior_pastor: "Sees the whole church. Reads giving, cannot change roles.",
  branch_pastor: "Runs one branch and every cell under it.",
  branch_admin: "Day-to-day admin for one branch. No giving.",
  cell_leader: "Marks attendance and records check-ups for one cell.",
  cell_assistant: "Marks attendance for one cell.",
  department_head: "Runs one department and its events.",
};


/** A ministry team: choir, ushers, media. Off the branch/cell tree. */
export type Department = Required<Schemas["DepartmentRead"]>;

export type DepartmentMembership = Required<Schemas["DepartmentMembershipRead"]>;

/** A gathering: service, rehearsal, outreach. */
export type ChurchEvent = Required<Schemas["EventRead"]>;

/** A bulletin posted to a scope. */
export type Notice = Required<Schemas["NoticeRead"]>;

/** One member, measured — `GET /users/{id}/profile`. */
export type PersonProfile = Schemas["PersonProfile"];

/** Who was not in a seat at one service. */
export type Absentee = Schemas["Absentee"];

/** One service, whole — `GET /attendance/service`. */
export type ServiceDetail = Schemas["ServiceDetail"];

export type EventRegistration = Required<Schemas["EventRegistrationRead"]>;
