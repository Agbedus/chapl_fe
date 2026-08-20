"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { api } from "@/lib/api";
import { endSession, setChurch, startSession } from "@/lib/session";
import type { Me, Token } from "@/lib/types";

/**
 * Every action returns the same shape so a form can render one way.
 * `fieldErrors` maps a field name to its message, which is how FastAPI's
 * 422 payloads reach the input they belong to.
 */
export type FormState = {
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Set when the next step needs it, e.g. the address awaiting a code. */
  email?: string;
  /**
   * A one-time link the caller has to hand over themselves — an
   * invitation, today. It is separate from `message` because it needs to
   * be selectable and copyable, not read.
   */
  link?: string;
};

const str = (data: FormData, key: string) => String(data.get(key) ?? "").trim();

/** Where to land after signing in, given what this person can reach. */
function landingFor(me: Me): string {
  if (me.is_platform_staff) return "/app";
  if (me.memberships.length > 0) return "/app";
  // An identity with no church yet: the only useful next step is to make
  // one, or to accept an invitation.
  return "/app/start";
}

export async function signIn(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const email = str(data, "email");
  const password = String(data.get("password") ?? "");
  const next = str(data, "next");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  // The API's login is form-encoded and calls the field `username`.
  const result = await api<Token>("/auth/login", {
    method: "POST",
    auth: false,
    form: { username: email, password },
  });

  if (!result.ok) {
    if (result.error.status === 429) {
      return { error: result.error.detail };
    }
    return { error: "Incorrect email or password." };
  }

  await startSession(result.data.access_token);

  const me = result.data.user;
  if (me.memberships.length === 1) {
    await setChurch(me.memberships[0].church_id);
  }

  redirect(next || landingFor(me));
}

export async function register(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const email = str(data, "email");
  const full_name = str(data, "full_name");
  const password = String(data.get("password") ?? "");

  if (password.length < 8) {
    return {
      error: "Passwords need at least 8 characters.",
      fieldErrors: { password: "At least 8 characters" },
      email,
    };
  }

  const result = await api<{ msg: string }>("/auth/register", {
    method: "POST",
    auth: false,
    body: { email, full_name, password },
  });

  if (!result.ok) {
    return { error: result.error.detail, fieldErrors: result.error.fieldErrors, email };
  }

  // Registration deliberately returns no session — the account is
  // unverified until a code is entered.
  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

export async function verifyOtp(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const email = str(data, "email");
  const otp = str(data, "otp");
  const purpose = str(data, "purpose") || "activation";

  if (otp.length < 4) {
    return { error: "Enter the code from your email.", email };
  }

  const result = await api<{ msg: string }>("/auth/verify-otp", {
    method: "POST",
    auth: false,
    form: { email, otp, purpose },
  });

  if (!result.ok) {
    return { error: "That code is not valid, or it has expired.", email };
  }

  redirect("/signin?verified=1");
}

export async function resendOtp(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const email = str(data, "email");
  const purpose = str(data, "purpose") || "activation";

  const result = await api<{ msg: string }>("/auth/resend-otp", {
    method: "POST",
    auth: false,
    form: { email, purpose },
  });

  if (!result.ok) {
    // 429 carries the remaining cooldown, which is worth showing verbatim.
    return { error: result.error.detail, email };
  }
  return { message: "If that address needs a code, another is on its way.", email };
}

export async function requestReset(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const email = str(data, "email");
  if (!email) return { error: "Enter your email address." };

  await api<{ msg: string }>(`/auth/password-recovery/${encodeURIComponent(email)}`, {
    method: "POST",
    auth: false,
  });

  // Always the same answer, whether or not the address exists — the API
  // behaves this way too, and the UI must not undo it.
  return {
    message:
      "If that address matches an account, a reset link is on its way.",
    email,
  };
}

export async function resetPassword(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const token = str(data, "token");
  const password = String(data.get("password") ?? "");
  const confirm = String(data.get("confirm") ?? "");

  if (password.length < 8) {
    return { fieldErrors: { password: "At least 8 characters" }, error: "Password too short." };
  }
  if (password !== confirm) {
    return { fieldErrors: { confirm: "Passwords do not match" }, error: "Passwords do not match." };
  }

  const result = await api<{ msg: string }>("/auth/reset-password", {
    method: "POST",
    auth: false,
    form: { token, new_password: password },
  });

  if (!result.ok) {
    return { error: "That reset link is no longer valid. Request a new one." };
  }

  // The API ends every existing session on reset, so there is nothing to
  // carry forward — sign in again.
  await endSession();
  redirect("/signin?reset=1");
}

export async function changePassword(
  _prev: FormState,
  data: FormData,
): Promise<FormState> {
  const old_password = String(data.get("current") ?? "");
  const new_password = String(data.get("password") ?? "");
  const confirm = String(data.get("confirm") ?? "");

  if (new_password.length < 8) {
    return { fieldErrors: { password: "At least 8 characters" }, error: "Password too short." };
  }
  if (new_password !== confirm) {
    return { fieldErrors: { confirm: "Passwords do not match" }, error: "Passwords do not match." };
  }

  const result = await api<{ msg: string }>("/auth/change-password", {
    method: "POST",
    body: { old_password, new_password },
  });

  if (!result.ok) {
    return {
      error:
        result.error.status === 400
          ? "Your current password is not right."
          : result.error.detail,
      fieldErrors: result.error.status === 400 ? { current: "Incorrect" } : undefined,
    };
  }

  // Changing the password invalidates this session too, by design.
  await endSession();
  redirect("/signin?changed=1");
}

export async function signOut() {
  await api<{ msg: string }>("/auth/logout", { method: "POST" });
  await endSession();
  revalidatePath("/", "layout");
  redirect("/signin");
}

export async function chooseChurch(churchId: string) {
  await setChurch(churchId);
  revalidatePath("/app", "layout");
  redirect("/app");
}
