import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { CHURCH_COOKIE, TOKEN_COOKIE, api } from "@/lib/api";
import type { Me } from "@/lib/types";

const TWO_DAYS = 60 * 60 * 24 * 2; // matches the API's token lifetime

export async function startSession(token: string) {
  const jar = await cookies();
  jar.delete(CHURCH_COOKIE);
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
  const raw = jar.get(CHURCH_COOKIE)?.value;
  const me = await getMe();
  if (raw === "all" && me?.is_platform_staff) return null;
  if (raw && (me?.is_platform_staff || me?.churches?.some((c) => c.id === raw))) return raw;
  return !me?.is_platform_staff && me?.churches?.length === 1 ? me.churches[0].id : null;
}

/**
 * Who is signed in, or null. Asks the API rather than decoding the token
 * locally: authority is read from the database on every request, so a
 * revoked assignment or a changed password takes effect here immediately
 * instead of when the token expires.
 */
export const getMe = cache(async (): Promise<Me | null> => {
  const jar = await cookies();
  if (!jar.get(TOKEN_COOKIE)) return null;

  const result = await api<Me>("/auth/me");
  if (!result.ok) return null;
  return result.data;
});

/** For pages that require a session. Sends you to sign-in otherwise. */
export async function requireMe(next?: string): Promise<Me> {
  const me = await getMe();
  if (!me) {
    redirect(next ? `/signin?next=${encodeURIComponent(next)}` : "/signin");
  }
  if (!me.is_platform_staff) {
    const selected = await currentChurchId();
    const church = me.churches?.find((c) => c.id === selected);
    if (next && !["/app/start", "/app/church/new", "/app/select", "/app/church", "/app/account"].includes(next)) {
      if (!me.churches?.length) redirect("/app/start");
      if (!church) redirect("/app/select");
      if (church.status !== "active" || !church.is_active) redirect(`/app/church?id=${church.id}`);
    }
    if (selected) return { ...me, assignments: me.assignments.filter((a) => a.church_id === selected) };
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
