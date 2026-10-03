/** Shapes the Chapl API returns. Kept narrow — only what the UI reads. */

export type Role =
  | "super_admin"
  | "platform_admin"
  | "church_admin"
  | "senior_pastor"
  | "branch_pastor"
  | "branch_admin"
  | "cell_leader"
  | "cell_assistant"
  | "department_head";

export type ScopeType = "platform" | "church" | "branch" | "cell" | "department";

export type MembershipRef = {
  church_id: string;
  church_name: string | null;
  branch_id: string;
  branch_name: string | null;
  cell_id: string | null;
  cell_name: string | null;
};

export type ScopeRef = { role: Role; scope_type: ScopeType; scope_id: string | null; church_id: string | null };

export type Me = {
  is_verified: boolean;
  churches: Pick<Church, "id" | "name" | "status" | "is_active">[];
  capabilities: Record<string, string[]>;
  id: string;
  email: string;
  full_name: string;
  phone_number: string | null;
  location: string | null;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: string | null;
  is_active: boolean;
  last_login_at: string | null;
  joined_date: string;
  memberships: MembershipRef[];
  assignments: ScopeRef[];
  is_platform_staff: boolean;
};

export type Token = { access_token: string; token_type: string; user: Me; church_id?: string | null };

export type Church = {
  id: string;
  code: string;
  name: string;
  legal_name: string | null;
  timezone: string;
  currency: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  denomination: string | null;
  founded_date: string | null;
  about: string | null;
  is_active: boolean;
  /**
   * Where a church is in its life, which `is_active` cannot express:
   * "a real congregation the platform has checked" and "somebody filled
   * in a form ten minutes ago" are different states.
   */
  status: ChurchStatus;
  verified_at: string | null;
  verified_by: string | null;
  /** Why it was turned down, owed to whoever registered it. */
  review_note: string | null;
  /**
   * The one account that answers for this tenant. Not the same as
   * `church_admin`, which is a grant several people can hold.
   */
  owner_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ChurchStatus = "pending" | "active" | "rejected" | "suspended";

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

export type ChurchStats = Church & {
  branch_count: number;
  cell_count: number;
  member_count: number;
};

export type Branch = {
  id: string;
  church_id: string;
  code: string;
  name: string;
  location: string | null;
  address: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  service_times: string | null;
  capacity: number | null;
  latitude: number | null;
  longitude: number | null;
  opened_date: string | null;
  is_active: boolean;
};

export type InvitationPreview = {
  church_name: string;
  branch_name: string;
  cell_name: string | null;
  email: string;
  role: Role | null;
  expires_at: string;
  needs_account: boolean;
};

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

export type Cell = {
  id: string;
  church_id: string;
  branch_id: string;
  code: string;
  name: string;
  motto: string | null;
  description: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  meeting_frequency: string | null;
  host_location: string | null;
  target_size: number | null;
  is_active: boolean;
};

export type Person = {
  id: string;
  email: string;
  full_name: string;
  /** Uploads are not wired up; this is a URL someone typed or an import set. */
  avatar_url: string | null;
  phone_number: string | null;
  location: string | null;
  address: string | null;
  date_of_birth: string | null;
  gender: string | null;
  marital_status: string | null;
  occupation: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  baptism_date: string | null;
  confirmation_date: string | null;
  notes: string | null;
  is_active: boolean;
  is_verified: boolean;
  last_login_at: string | null;
  joined_date: string;
};

export type Membership = {
  id: string;
  user_id: string;
  church_id: string;
  branch_id: string;
  cell_id: string | null;
  status: string;
  is_active: boolean;
  membership_number: string | null;
  joined_date: string | null;
  left_date: string | null;
};

/* --- invitations ------------------------------------------------------- */

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export type Invitation = {
  id: string;
  church_id: string;
  branch_id: string;
  cell_id: string | null;
  email: string;
  full_name: string | null;
  role: Role | null;
  status: InvitationStatus;
  expires_at: string;
  invited_by: string | null;
  accepted_at: string | null;
  accepted_by: string | null;
  created_at: string;
};

/** The token comes back exactly once, on create or resend. */
export type InvitationCreated = Invitation & {
  token: string;
  accept_url: string;
  invite_url: string;
  email_queued: boolean;
};

/* --- authority --------------------------------------------------------- */

export type Assignment = {
  id: string;
  user_id: string;
  church_id: string | null;
  role: Role;
  scope_type: ScopeType;
  scope_id: string | null;
  is_active: boolean;
  granted_by: string | null;
  granted_at: string;
};

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
export type Department = {
  id: string;
  church_id: string;
  branch_id: string | null;
  name: string;
  description: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  is_active: boolean;
};

export type DepartmentMembership = {
  id: string;
  department_id: string;
  user_id: string;
  role_in_department: string | null;
  is_active: boolean;
};

/** A gathering: service, rehearsal, outreach. */
export type ChurchEvent = {
  id: string;
  church_id: string;
  branch_id: string | null;
  cell_id: string | null;
  department_id: string | null;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  is_all_day: boolean;
  registration_required: boolean;
  max_attendees: number | null;
  is_published: boolean;
};

/** A bulletin posted to a scope. */
export type Notice = {
  id: string;
  church_id: string;
  branch_id: string | null;
  cell_id: string | null;
  title: string;
  content: string;
  priority: "normal" | "important" | "urgent";
  is_pinned: boolean;
  publish_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

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
