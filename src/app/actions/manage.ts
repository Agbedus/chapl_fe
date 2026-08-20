"use server";

/**
 * Everything a church administrator writes.
 *
 * All of it runs on the server. The browser posts a form to its own
 * origin, this module calls the API with the token from the httpOnly
 * cookie, and the token never enters a page. That is the same reason
 * `CHAPL_API_URL` has no `NEXT_PUBLIC_` prefix.
 *
 * Every action returns a `FormState` rather than throwing, so a rejected
 * write comes back into the form it came from with the reason attached
 * and the typed values still on screen.
 */

import { revalidatePath } from "next/cache";

import type { FormState } from "@/app/actions/auth";
import { api } from "@/lib/api";
import type {
  Assignment,
  Branch,
  Cell,
  Invitation,
  InvitationCreated,
  Membership,
  Person,
  Role,
} from "@/lib/types";

const str = (data: FormData, key: string) => String(data.get(key) ?? "").trim();
const orNull = (data: FormData, key: string) => str(data, key) || null;
const num = (data: FormData, key: string) => {
  const raw = str(data, key);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
};

function fail(error: { detail: string; fieldErrors?: Record<string, string> }): FormState {
  return { error: error.detail, fieldErrors: error.fieldErrors };
}

/** A code is the short handle a branch or cell is known by: CEN, ADT-04. */
function toCode(raw: string, fallback: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (cleaned) return cleaned.slice(0, 32);
  return fallback.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "NEW";
}

/* ------------------------------------------------------------------ */
/* branches                                                            */
/* ------------------------------------------------------------------ */

export async function saveBranch(_prev: FormState, data: FormData): Promise<FormState> {
  const id = str(data, "id");
  const name = str(data, "name");
  if (!name) return { error: "Give the branch a name.", fieldErrors: { name: "Required" } };

  const body: Record<string, unknown> = {
    name,
    location: orNull(data, "location"),
    address: orNull(data, "address"),
    contact_email: orNull(data, "contact_email"),
    contact_phone: orNull(data, "contact_phone"),
    service_times: orNull(data, "service_times"),
    capacity: num(data, "capacity"),
    latitude: num(data, "latitude"),
    longitude: num(data, "longitude"),
    is_active: str(data, "is_active") !== "false",
  };
  // The code identifies the branch to everyone who types it, so it is
  // set once at creation and not quietly rewritten by an edit.
  if (!id) body.code = toCode(str(data, "code"), name);

  const result = id
    ? await api<Branch>(`/branches/${id}`, { method: "PATCH", body })
    : await api<Branch>("/branches/", { method: "POST", body });

  if (!result.ok) {
    if (result.error.status === 409 || /uq_branch/i.test(result.error.detail)) {
      return { error: "That branch code is already used here.", fieldErrors: { code: "Already taken" } };
    }
    return fail(result.error);
  }

  revalidatePath("/app/branches");
  revalidatePath("/app");
  return { message: id ? `${name} saved.` : `${name} added.` };
}

/* ------------------------------------------------------------------ */
/* cells                                                               */
/* ------------------------------------------------------------------ */

export async function saveCell(_prev: FormState, data: FormData): Promise<FormState> {
  const id = str(data, "id");
  const name = str(data, "name");
  const branch_id = str(data, "branch_id");
  if (!name) return { error: "Give the cell a name.", fieldErrors: { name: "Required" } };
  if (!id && !branch_id) {
    return { error: "Every cell sits inside a branch.", fieldErrors: { branch_id: "Required" } };
  }

  const body: Record<string, unknown> = {
    name,
    motto: orNull(data, "motto"),
    description: orNull(data, "description"),
    meeting_day: orNull(data, "meeting_day"),
    meeting_time: orNull(data, "meeting_time"),
    meeting_frequency: orNull(data, "meeting_frequency"),
    host_location: orNull(data, "host_location"),
    target_size: num(data, "target_size"),
    is_active: str(data, "is_active") !== "false",
  };
  if (!id) {
    body.branch_id = branch_id;
    body.code = toCode(str(data, "code"), name);
  }

  const result = id
    ? await api<Cell>(`/cells/${id}`, { method: "PATCH", body })
    : await api<Cell>("/cells/", { method: "POST", body });

  if (!result.ok) {
    if (result.error.status === 409) {
      return { error: "That cell code is already used here.", fieldErrors: { code: "Already taken" } };
    }
    return fail(result.error);
  }

  revalidatePath("/app/cells");
  revalidatePath("/app");
  return { message: id ? `${name} saved.` : `${name} added.` };
}

/* ------------------------------------------------------------------ */
/* invitations                                                         */
/* ------------------------------------------------------------------ */

export async function sendInvitation(_prev: FormState, data: FormData): Promise<FormState> {
  const email = str(data, "email");
  const branch_id = str(data, "branch_id");
  if (!email) return { error: "Enter an email address.", fieldErrors: { email: "Required" } };
  if (!branch_id) return { error: "Choose a branch.", fieldErrors: { branch_id: "Required" } };

  const role = str(data, "role");
  const cell_id = str(data, "cell_id");

  const result = await api<InvitationCreated>("/invitations/", {
    method: "POST",
    body: {
      email,
      full_name: orNull(data, "full_name"),
      branch_id,
      cell_id: cell_id || null,
      role: role || null,
    },
  });

  if (!result.ok) {
    if (result.error.status === 409) {
      return { error: `${email} already belongs to this church.`, fieldErrors: { email: "Already a member" } };
    }
    return fail(result.error);
  }

  revalidatePath("/app/invitations");
  // Nothing sends mail yet, so the link is handed back rather than a
  // message claiming an email went out that never will.
  return {
    message: `Invitation ready for ${result.data.email}`,
    link: `/invite/${result.data.token}`,
  };
}

export async function resendInvitation(_prev: FormState, data: FormData): Promise<FormState> {
  const id = str(data, "id");
  if (!id) return { error: "No invitation named." };

  const result = await api<InvitationCreated>(`/invitations/${id}/resend`, { method: "POST" });
  if (!result.ok) return fail(result.error);

  revalidatePath("/app/invitations");
  // Reissuing mints a new token and retires the old one, so any link
  // already sent stops working — worth saying plainly.
  return {
    message: `New link for ${result.data.email}. The previous one no longer works.`,
    link: `/invite/${result.data.token}`,
  };
}

export async function revokeInvitation(_prev: FormState, data: FormData): Promise<FormState> {
  const id = str(data, "id");
  if (!id) return { error: "No invitation named." };

  const result = await api<Invitation>(`/invitations/${id}`, { method: "DELETE" });
  if (!result.ok) return fail(result.error);

  revalidatePath("/app/invitations");
  return { message: `Invitation to ${result.data.email} revoked.` };
}

/* ------------------------------------------------------------------ */
/* people                                                              */
/* ------------------------------------------------------------------ */

export async function savePerson(_prev: FormState, data: FormData): Promise<FormState> {
  const id = str(data, "id");
  if (!id) return { error: "No person named." };

  const body: Record<string, unknown> = {
    full_name: str(data, "full_name"),
    phone_number: orNull(data, "phone_number"),
    date_of_birth: orNull(data, "date_of_birth"),
    gender: orNull(data, "gender"),
    marital_status: orNull(data, "marital_status"),
    occupation: orNull(data, "occupation"),
    location: orNull(data, "location"),
    address: orNull(data, "address"),
    emergency_contact_name: orNull(data, "emergency_contact_name"),
    emergency_contact_phone: orNull(data, "emergency_contact_phone"),
    baptism_date: orNull(data, "baptism_date"),
    confirmation_date: orNull(data, "confirmation_date"),
    notes: orNull(data, "notes"),
  };

  const result = await api<Person>(`/users/${id}`, { method: "PATCH", body });
  if (!result.ok) return fail(result.error);

  revalidatePath(`/app/people/${id}`);
  revalidatePath("/app/people");
  return { message: "Saved." };
}

/**
 * Move someone to a different branch or cell, or end their membership.
 *
 * `PUT` rather than `PATCH`: a membership is one row per person per
 * church, and the API replaces it wholesale.
 */
export async function savePlacement(_prev: FormState, data: FormData): Promise<FormState> {
  const id = str(data, "id");
  const branch_id = str(data, "branch_id");
  if (!id) return { error: "No person named." };
  if (!branch_id) return { error: "Everyone belongs to a branch.", fieldErrors: { branch_id: "Required" } };

  const result = await api<Membership>(`/users/${id}/membership`, {
    method: "PUT",
    body: {
      branch_id,
      cell_id: orNull(data, "cell_id"),
      status: str(data, "status") || "active",
      is_active: str(data, "is_active") !== "false",
    },
  });
  if (!result.ok) return fail(result.error);

  revalidatePath(`/app/people/${id}`);
  revalidatePath("/app/people");
  return { message: "Placement updated." };
}

/* ------------------------------------------------------------------ */
/* authority                                                           */
/* ------------------------------------------------------------------ */

export async function grantRole(_prev: FormState, data: FormData): Promise<FormState> {
  const user_id = str(data, "user_id");
  const role = str(data, "role") as Role;
  const scope_id = str(data, "scope_id");
  if (!user_id) return { error: "Choose a person.", fieldErrors: { user_id: "Required" } };
  if (!role) return { error: "Choose a role.", fieldErrors: { role: "Required" } };

  const result = await api<Assignment>("/assignments/", {
    method: "POST",
    body: { user_id, role, scope_id: scope_id || null },
  });

  if (!result.ok) {
    if (result.error.status === 403) {
      return { error: "You cannot grant a role you do not hold yourself." };
    }
    return fail(result.error);
  }

  revalidatePath("/app/team");
  return { message: "Role granted." };
}

export async function revokeRole(_prev: FormState, data: FormData): Promise<FormState> {
  const id = str(data, "id");
  if (!id) return { error: "No grant named." };

  const result = await api<Assignment>(`/assignments/${id}`, { method: "DELETE" });
  if (!result.ok) return fail(result.error);

  revalidatePath("/app/team");
  return { message: "Role revoked." };
}

/* ------------------------------------------------------------------ */
/* notices                                                             */
/* ------------------------------------------------------------------ */

/**
 * Post a bulletin to a scope.
 *
 * The audience is a single `scope` field on the form — `church`, or
 * `branch:<id>`, or `cell:<id>` — rather than two nullable ids the
 * author has to reason about. The API resolves the narrowest set that is
 * populated, so sending both would be ambiguous in a way the UI should
 * never make possible.
 *
 * Nothing here decides *whether* the author may reach that audience: the
 * options they were offered were already filtered to their own scope,
 * and the API refuses anything outside it regardless.
 */
export async function saveNotice(_prev: FormState, data: FormData): Promise<FormState> {
  const id = str(data, "id");
  const title = str(data, "title");
  const content = str(data, "content");
  if (!title) return { error: "Give the notice a title.", fieldErrors: { title: "Required" } };
  if (!content) return { error: "A notice needs something to say.", fieldErrors: { content: "Required" } };

  const [kind, target] = (str(data, "scope") || "church").split(":");
  const body: Record<string, unknown> = {
    title,
    content,
    branch_id: kind === "branch" ? target : null,
    cell_id: kind === "cell" ? target : null,
    priority: str(data, "priority") || "normal",
    is_pinned: str(data, "is_pinned") === "true",
    expires_at: orNull(data, "expires_at"),
    is_active: str(data, "is_active") !== "false",
  };

  const result = id
    ? await api(`/communication/notices/${id}`, { method: "PATCH", body })
    : await api("/communication/notices/", { method: "POST", body });

  if (!result.ok) return fail(result.error);

  revalidatePath("/app/notices");
  revalidatePath("/app");
  return {
    message: id
      ? `${title} saved.`
      : `${title} posted — everyone in scope has been notified.`,
  };
}

/* ------------------------------------------------------------------ */
/* events                                                              */
/* ------------------------------------------------------------------ */

/**
 * Put something on the calendar.
 *
 * Same single-`scope` field as a notice, for the same reason. Publishing
 * is what turns an event into a notification, so a draft reaches nobody
 * until somebody decides it should.
 */
export async function saveEvent(_prev: FormState, data: FormData): Promise<FormState> {
  const id = str(data, "id");
  const title = str(data, "title");
  const start = str(data, "start_date");
  if (!title) return { error: "Give the event a title.", fieldErrors: { title: "Required" } };
  if (!start) return { error: "An event needs a date.", fieldErrors: { start_date: "Required" } };

  const [kind, target] = (str(data, "scope") || "church").split(":");
  const body: Record<string, unknown> = {
    title,
    description: orNull(data, "description"),
    event_type: str(data, "event_type") || "other",
    start_date: start,
    end_date: orNull(data, "end_date"),
    location: orNull(data, "location"),
    branch_id: kind === "branch" ? target : null,
    cell_id: kind === "cell" ? target : null,
    is_all_day: str(data, "is_all_day") === "true",
    registration_required: str(data, "registration_required") === "true",
    max_attendees: num(data, "max_attendees"),
    contact_phone: orNull(data, "contact_phone"),
    is_published: str(data, "is_published") !== "false",
  };

  const result = id
    ? await api(`/events/${id}`, { method: "PATCH", body })
    : await api("/events/", { method: "POST", body });

  if (!result.ok) return fail(result.error);

  revalidatePath("/app/events");
  revalidatePath("/app");
  return {
    message: id
      ? `${title} saved.`
      : body.is_published
        ? `${title} published — everyone in scope has been notified.`
        : `${title} saved as a draft. Publish it to notify anyone.`,
  };
}

/**
 * Your own record.
 *
 * Deliberately not `savePerson` with your own id: that posts to
 * `/users/{id}`, which requires the USER write over the branch you sit
 * in — authority an ordinary member does not have over themselves. The
 * API keeps a separate `/users/me` for exactly this, and it refuses to
 * flip `is_active`, because deactivating an account is an administrative
 * act rather than a self-service one.
 *
 * `notes` is absent on purpose. Pastoral notes are written *about* you by
 * the people caring for you; being able to edit them would make them
 * worthless to the person who wrote them.
 */
export async function saveMyDetails(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const body: Record<string, unknown> = {
    full_name: str(data, "full_name"),
    phone_number: orNull(data, "phone_number"),
    date_of_birth: orNull(data, "date_of_birth"),
    gender: orNull(data, "gender"),
    marital_status: orNull(data, "marital_status"),
    occupation: orNull(data, "occupation"),
    location: orNull(data, "location"),
    address: orNull(data, "address"),
    avatar_url: orNull(data, "avatar_url"),
    emergency_contact_name: orNull(data, "emergency_contact_name"),
    emergency_contact_phone: orNull(data, "emergency_contact_phone"),
  };

  const result = await api<Person>("/users/me", { method: "PATCH", body });
  if (!result.ok) return fail(result.error);

  revalidatePath("/app/account");
  revalidatePath("/app", "layout");
  return { message: "Saved." };
}

/**
 * Close a check-up off, from wherever you did the work.
 *
 * The care queue prompted a call and then had no way to say the call
 * happened, so a person you rang on Monday was still sitting in the queue
 * on Friday looking exactly like a person nobody had touched. A queue you
 * cannot clear stops being read.
 *
 * Reached and resolved are separate outcomes on purpose: *reached* means
 * you got hold of them, *resolved* means whatever prompted the check-up
 * is over. Both leave the queue, and the distinction is the one the next
 * person reading the record actually needs.
 */
export async function settleCheckup(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const id = str(data, "id");
  const status = str(data, "status");
  if (!id) return { error: "No check-up named." };
  if (status !== "reached" && status !== "resolved") {
    return { error: "That is not an outcome a check-up can end in." };
  }

  const result = await api<unknown>(`/checkups/${id}`, {
    method: "PATCH",
    body: { status },
  });
  if (!result.ok) return fail(result.error);

  revalidatePath("/app");
  revalidatePath("/app/people");
  return { message: status === "reached" ? "Marked as reached." : "Marked resolved." };
}
