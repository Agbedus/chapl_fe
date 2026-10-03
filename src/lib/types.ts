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
export type TrendPoint = {
  date: string;
  marked: number;
  present: number;
  absent: number;
  pct: number;
};

export type BranchRow = {
  id: string;
  code: string;
  name: string;
  location: string | null;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  cells: number;
  members: number;
  present: number;
  turnout: number;
  fill: number | null;
};

export type CellRow = {
  id: string;
  name: string;
  code: string;
  /** Stable — a link filters on this, never on the name. */
  branch_id: string;
  branch: string;
  members: number;
  turnout: number;
  last_seen: string | null;
  band: "thriving" | "steady" | "at risk";
};

export type Slice = { label: string; value: number };

export type Demographics = {
  ages: Slice[];
  genders: Slice[];
  unknown_age: number;
};

export type GivingMonth = { month: string; label: string; total: number };
export type GivingType = { label: string; total: number; gifts: number };
export type GrowthPoint = {
  month: string;
  label: string;
  joined: number;
  total: number;
};

export type ChurchRow = {
  id: string;
  code: string;
  name: string;
  currency: string;
  is_active: boolean;
  branches: number;
  cells: number;
  members: number;
  present: number;
  turnout: number;
  last_service: string | null;
  giving: number;
  share: number;
};

export type Dashboard = {
  platform?: boolean;
  church: { id: string | null; name: string | null; currency: string };
  stats?: { name: string; count: number; resource: string }[];
  totals?: { name: string; count: number }[];
  churches?: ChurchRow[];
  last_service?: string | null;
  trend: TrendPoint[];
  branches: BranchRow[];
  cells: CellRow[];
  demographics: Demographics;
  care: Slice[];
  growth: GrowthPoint[];
  giving_months: GivingMonth[];
  giving_types: GivingType[];
  giving_total: number | null;
  birthdays?: {
    id: string;
    full_name: string;
    /** Carried so the queue can send the greeting, not only count them. */
    phone_number: string | null;
    date_of_birth: string;
    turns: number;
  }[];
  /** How many check-ups are actually open; `needs_followup` is capped. */
  followup_total?: number;
  needs_followup?: {
    /** The check-up's own id. */
    id: string;
    member_id: string;
    full_name: string;
    phone_number: string | null;
    checkup_date: string;
    status: string;
  }[];
  health?: "ok" | "warn" | "down";
  /** Platform staff only — the top bar shows it, nothing else reads it. */
  runtime?: {
    app_env: string;
    dialect: string;
    driver: string;
    python: string;
    sqlalchemy: string;
    uptime: string;
    cookie_secure: boolean;
  };
};

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

export type GrantableRole = {
  role: Role;
  scope_type: ScopeType;
  grantable: boolean;
};

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
export type PersonProfile = {
  attendance: { date: string; present: boolean }[];
  marked: number;
  present: number;
  pct: number | null;
  /** Services attended in a row, counted back from the most recent. */
  streak: number;
  /** Services missed in a row, same direction. Only one of the two is ever > 0. */
  missed: number;
  /** Their cell's rate, for comparison. Null when the cell has no records. */
  cell_pct: number | null;
  checkups: { date: string; status: string; notes: string | null }[];
  departments: { id: string; name: string; role: string | null }[];
  /** Null when the caller may read the record but not the offering. */
  giving: {
    total: number;
    gifts: number;
    months: GivingMonth[];
    types: GivingType[];
  } | null;
};

/** Who was not in a seat at one service. */
export type Absentee = {
  id: string;
  full_name: string;
  phone_number: string | null;
  branch: string;
  cell: string | null;
  /** The last service they were in a seat for. Null means never. */
  last_present: string | null;
};

/** One service, whole — `GET /attendance/service`. */
export type ServiceDetail = {
  /** Every marked service, oldest first. The stepper's range. */
  dates: string[];
  date: string | null;
  marked: number;
  present: number;
  absent: number;
  pct: number;
  /** Same shapes as the dashboard's, so the congregation field can draw them. */
  branches: BranchRow[];
  cells: CellRow[];
  absentees: Absentee[];
};

export type EventRegistration = Required<Schemas["EventRegistrationRead"]>;
