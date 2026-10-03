"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";
import { setChurch } from "@/lib/session";
import type { Church, Token } from "@/lib/types";
import type { FormState } from "@/app/actions/auth";

const str = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

/** A code is the short handle a church is known by: GRACE, HOPE, CORNER. */
function toCode(raw: string, fallback: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  if (cleaned) return cleaned.slice(0, 32);
  return fallback.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8) || "CHURCH";
}

export async function createChurch(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const name = str(data, "name");
  if (!name) return { error: "Give the church a name.", fieldErrors: { name: "Required" } };

  const body = {
    name,
    code: toCode(str(data, "code"), name),
    legal_name: str(data, "legal_name") || null,
    logo_url: str(data, "logo_url") || null,
    timezone: str(data, "timezone") || "Africa/Accra",
    currency: str(data, "currency") || "GHS",
    contact_email: str(data, "contact_email") || null,
    contact_phone: str(data, "contact_phone") || null,
  };

  const result = await api<Church>("/churches/", { method: "POST", body });

  if (!result.ok) {
    if (result.error.status === 409 || /taken/i.test(result.error.detail)) {
      return {
        error: "That church code is already in use. Pick another.",
        fieldErrors: { code: "Already taken" },
      };
    }
    if (result.error.status === 403) {
      return {
        error:
          "Confirm your account and check your access before creating a church.",
      };
    }
    return { error: result.error.detail, fieldErrors: result.error.fieldErrors };
  }

  // Work inside the church you just made, rather than leaving the session
  // pointed at nothing.
  await setChurch(result.data.id);
  revalidatePath("/app", "layout");
  redirect("/app/church?created=1");
}

export async function updateChurch(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const id = str(data, "id");
  if (!id) return { error: "No church to update." };

  const body: Record<string, unknown> = {
    name: str(data, "name"),
    legal_name: str(data, "legal_name") || null,
    timezone: str(data, "timezone"),
    currency: str(data, "currency"),
    contact_email: str(data, "contact_email") || null,
    contact_phone: str(data, "contact_phone") || null,
    website: str(data, "website") || null,
    address: str(data, "address") || null,
    city: str(data, "city") || null,
    country: str(data, "country") || null,
    denomination: str(data, "denomination") || null,
    founded_date: str(data, "founded_date") || null,
    about: str(data, "about") || null,
  };

  const result = await api<Church>(`/churches/${id}`, { method: "PATCH", body, churchId: id });
  if (!result.ok) {
    return { error: result.error.detail, fieldErrors: result.error.fieldErrors };
  }

  revalidatePath("/app/church");
  revalidatePath("/app", "layout");
  return { message: "Saved." };
}

export async function createBranch(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const name = str(data, "name");
  if (!name) return { error: "Give the branch a name.", fieldErrors: { name: "Required" } };

  const result = await api<unknown>("/branches/", {
    method: "POST",
    body: {
      name,
      code: toCode(str(data, "code"), name),
      location: str(data, "location") || null,
      address: str(data, "address") || null,
      capacity: str(data, "capacity") ? Number(str(data, "capacity")) : null,
    },
  });

  if (!result.ok) {
    if (result.error.status === 409) {
      return { error: "That branch code is already used here.", fieldErrors: { code: "Already taken" } };
    }
    return { error: result.error.detail, fieldErrors: result.error.fieldErrors };
  }

  revalidatePath("/app/church");
  return { message: `${name} added.` };
}

/* --- invitations ---------------------------------------------------- */

export async function inviteMember(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const email = str(data, "email");
  const branch_id = str(data, "branch_id");
  if (!email) return { error: "Enter an email address.", fieldErrors: { email: "Required" } };
  if (!branch_id) return { error: "Choose a branch.", fieldErrors: { branch_id: "Required" } };

  const role = str(data, "role");
  const cell_id = str(data, "cell_id");

  const result = await api<{ token: string; email: string; email_queued: boolean; invite_url: string }>("/invitations/", {
    method: "POST",
    body: {
      email,
      full_name: str(data, "full_name") || null,
      branch_id,
      cell_id: cell_id || null,
      role: role || null,
    },
  });

  if (!result.ok) {
    if (result.error.status === 409) {
      return { error: "That person already belongs to this church." };
    }
    return { error: result.error.detail, fieldErrors: result.error.fieldErrors };
  }

  revalidatePath("/app/church");
  // The API's accept_url points at its own route; the page that renders an
  // invitation lives in this app, so build that link instead.
  //
  // Delivery runs in the backend queue; preserve a shareable fallback.
  return {
    message: result.data.email_queued ? `Invitation queued for ${result.data.email}.` : "Invitation created. Email is unavailable; share the link below.",
    link: result.data.invite_url,
  };
}

export async function acceptInvitation(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const token = str(data, "token");
  const password = String(data.get("password") ?? "");
  const confirm = String(data.get("confirm") ?? "");
  const needsAccount = str(data, "needs_account") === "1";

  if (needsAccount) {
    if (password.length < 8) {
      return { fieldErrors: { password: "At least 8 characters" }, error: "Password too short." };
    }
    if (password !== confirm) {
      return { fieldErrors: { confirm: "Passwords do not match" }, error: "Passwords do not match." };
    }
  }

  const result = await api<Token>("/invitations/accept", {
    method: "POST",
    auth: !needsAccount, // a signed-in person joins with their own account
    body: {
      token,
      full_name: str(data, "full_name") || null,
      password: needsAccount ? password : null,
    },
  });

  if (!result.ok) {
    return { error: result.error.detail };
  }

  const { access_token, user } = result.data;
  await import("@/lib/session").then(({ startSession }) => startSession(access_token));
  if (result.data.church_id) await setChurch(result.data.church_id);
  else if (user.churches?.length === 1) await setChurch(user.churches[0].id);

  revalidatePath("/app", "layout");
  redirect("/app?welcome=1");
}

/* ------------------------------------------------------------------ */
/* verification                                                        */
/* ------------------------------------------------------------------ */

/**
 * Approve or turn down a church registration.
 *
 * Rejection marks rather than deletes, and the note is the whole point
 * of it: somebody registered a church and is owed a reason. The API
 * tells the owner by notification and email either way.
 */
export async function decideChurch(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const id = String(data.get("id") ?? "");
  const status = String(data.get("status") ?? "");
  const note = String(data.get("note") ?? "").trim();

  if (!id) return { error: "No church named." };
  if (status !== "active" && status !== "rejected" && status !== "suspended") {
    return { error: "Choose approve or decline." };
  }
  if (status !== "active" && !note) {
    return {
      error: "Say why. Somebody registered this and is owed a reason.",
      fieldErrors: { note: "Required when declining" },
    };
  }

  const result = await api<Church>(`/churches/${id}/verify`, {
    method: "POST",
    body: { status, note: note || null },
  });
  if (!result.ok) return { error: result.error.detail };

  revalidatePath("/app/platform");
  revalidatePath("/app/church");
  return {
    message:
      status === "active"
        ? `${result.data.name} is verified.`
        : `${result.data.name} was ${status}.`,
  };
}

/** Hand a church to somebody else. */
export async function handOverChurch(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const id = String(data.get("id") ?? "");
  const user_id = String(data.get("user_id") ?? "");
  if (!user_id) {
    return { error: "Choose who it goes to.", fieldErrors: { user_id: "Required" } };
  }

  const result = await api<Church>(`/churches/${id}/owner`, {
    method: "POST",
    body: { user_id },
  });
  if (!result.ok) return { error: result.error.detail };

  revalidatePath("/app/church");
  revalidatePath("/app/platform");
  return { message: "Ownership handed over." };
}


export async function resubmitChurch(_prev: FormState, data: FormData): Promise<FormState> {
  const result = await api<Church>(`/churches/${str(data, "id")}/resubmit`, { method: "POST" });
  if (!result.ok) return { error: result.error.detail };
  revalidatePath("/app", "layout");
  return { message: "Submitted for review." };
}
