import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CHURCH_COOKIE, TOKEN_COOKIE, api } from "@/lib/api";
import type { Me } from "@/lib/types";

const TWO_DAYS = 60 * 60 * 24 * 2; // matches the API's token lifetime

export async function startSession(token: string) {
  const jar = await cookies();
  jar.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TWO_DAYS,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(TOKEN_COOKIE);
  jar.delete(CHURCH_COOKIE);
}

export async function setChurch(churchId: string) {
  const jar = await cookies();
  jar.set(CHURCH_COOKIE, churchId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TWO_DAYS,
  });
}

export async function currentChurchId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(CHURCH_COOKIE)?.value ?? null;
}

/**
 * Who is signed in, or null. Asks the API rather than decoding the token
 * locally: authority is read from the database on every request, so a
 * revoked assignment or a changed password takes effect here immediately
 * instead of when the token expires.
 */
export async function getMe(): Promise<Me | null> {
  const jar = await cookies();
  if (!jar.get(TOKEN_COOKIE)) return null;

  const result = await api<Me>("/auth/me");
  if (!result.ok) return null;
  return result.data;
}

/** For pages that require a session. Sends you to sign-in otherwise. */
export async function requireMe(next?: string): Promise<Me> {
  const me = await getMe();
  if (!me) {
    redirect(next ? `/signin?next=${encodeURIComponent(next)}` : "/signin");
  }
  return me;
}

/** Does this person hold any platform-level grant? */
export function isPlatformStaff(me: Me): boolean {
  return me.is_platform_staff;
}

/** Can they administer the given church (or any, if none named)? */
export function canAdminChurch(me: Me, churchId?: string | null): boolean {
  if (me.is_platform_staff) return true;
  return me.assignments.some(
    (a) =>
      (a.role === "church_admin" || a.role === "senior_pastor") &&
      (!churchId || a.scope_id === churchId),
  );
}
