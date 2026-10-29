/**
 * The one door to the Chapl API.
 *
 * Every call is made **server side**. The access token lives in an
 * httpOnly cookie that browser JavaScript cannot read, so a script
 * injected into the page has nothing to steal — which is the whole reason
 * not to keep it in localStorage. It also sidesteps cross-origin cookies
 * entirely: the browser only ever talks to this app's own origin.
 */
import { revalidateTag, updateTag } from "next/cache";
import { cookies } from "next/headers";

export const API_URL =
  (process.env.CHAPL_API_URL ?? "http://localhost:8000/api/v1").replace(/\/+$/, "");

export const TOKEN_COOKIE = "chapl_token";
export const CHURCH_COOKIE = "chapl_church";

export type ApiError = {
  status: number;
  detail: string;
  fieldErrors?: Record<string, string>;
};

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/** FastAPI puts validation failures in a shape worth unpacking for a form. */
function parseDetail(status: number, body: unknown): ApiError {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;

    if (typeof detail === "string") return { status, detail };

    if (Array.isArray(detail)) {
      const fieldErrors: Record<string, string> = {};
      for (const item of detail) {
        const loc = item?.loc;
        const field = Array.isArray(loc) ? String(loc[loc.length - 1]) : "form";
        fieldErrors[field] = String(item?.msg ?? "Invalid value");
      }
      return {
        status,
        detail: Object.values(fieldErrors)[0] ?? "Please check the form",
        fieldErrors,
      };
    }
  }
  return { status, detail: `Request failed (${status})` };
}

type RequestOptions = {
  method?: string;
  /** JSON body. */
  body?: unknown;
  /** Form-encoded body — the login and OTP endpoints take these. */
  form?: Record<string, string>;
  /** Send the caller's token. Off for sign-in, registration, invitations. */
  auth?: boolean;
  /** Act in a specific tenant instead of the remembered one. */
  churchId?: string | null;
  cache?: RequestCache;
};

/**
 * How long a read may be served from Next's data cache before it is
 * fetched again in the background — stale-while-revalidate on the server.
 *
 * Only what changes a few times a week is cached. Anything somebody is
 * working through as it changes — notifications, care, check-in, the
 * audit trail, who you are — is always asked for, so a queue never shows
 * work that was already done. The cache key includes the Authorization
 * and X-Church-Id headers (Next keys fetches on URL, method, headers and
 * body), so one person never sees another's answer.
 */
function cacheSeconds(path: string): number | null {
  const live = [
    "/auth/",
    "/users/me",
    "/communication/notifications",
    "/care/",
    "/checkups",
    "/attendance/check-in",
    "/attendance/live",
    "/sermons/saved",
    "/audit_logs",
    "/system/",
    "/realtime/",
    "/invitations",
    "/registrations",
    "/reminders",
  ];
  if (live.some((p) => path.includes(p))) return null;
  const slow = [
    "/sermons",
    "/communication/notices",
    "/events",
    "/households",
    "/departments",
    "/branches",
    "/cells",
    "/churches",
    "/assignments/roles",
    "/memberships",
  ];
  if (slow.some((p) => path.startsWith(p))) return 300;
  const warm = ["/dashboard", "/users/", "/attendance/service", "/donations"];
  if (warm.some((p) => path.startsWith(p))) return 60;
  return null;
}

/** The tag a church's cached reads carry, so a write can clear them. */
export function churchTag(church: string | null | undefined): string {
  return `chapl:church:${church || "none"}`;
}

/**
 * After a write, the church's cached reads are expired so the next page
 * shows the change — for the person who made it and everyone else in that
 * church. "All churches" reads are cleared too, because platform staff see
 * every church at once. `updateTag` waits for fresh data and only works in
 * a Server Action; anywhere else `revalidateTag` with no grace does.
 */
function clearChurch(church: string | null | undefined) {
  const tags = church && church !== "all" ? [churchTag(church), churchTag("all")] : ["chapl"];
  for (const tag of tags) {
    try {
      updateTag(tag);
    } catch {
      try {
        revalidateTag(tag, { expire: 0 });
      } catch {
        // Rendering, not acting: nothing to clear.
      }
    }
  }
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const {
    method = "GET",
    body,
    form,
    auth = true,
    churchId,
    cache,
  } = options;

  const headers: Record<string, string> = { Accept: "application/json" };
  let payload: BodyInit | undefined;

  if (form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    payload = new URLSearchParams(form).toString();
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let church: string | null | undefined = churchId;
  if (auth) {
    const jar = await cookies();
    const token = jar.get(TOKEN_COOKIE)?.value;
    if (token) headers.Authorization = `Bearer ${token}`;

    // No choice made yet means "all". Left out, the API falls back to the
    // caller's sole membership — so platform staff who belong to one
    // church saw that church while the header said "All churches". A
    // church member sending "all" simply gets their own church back.
    church = churchId === undefined ? (jar.get(CHURCH_COOKIE)?.value ?? "all") : churchId;
    if (church) headers["X-Church-Id"] = church;
  } else if (churchId) {
    headers["X-Church-Id"] = churchId;
  }

  const reading = method.toUpperCase() === "GET";
  const seconds = reading && auth && cache === undefined ? cacheSeconds(path) : null;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: payload,
      ...(seconds === null
        ? { cache: cache ?? "no-store" }
        : { next: { revalidate: seconds, tags: ["chapl", churchTag(church)] } }),
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    return {
      ok: false,
      error: { status: 0, detail: "Could not reach the Chapl API." },
    };
  }

  if (!reading && response.ok) clearChurch(church);

  if (response.status === 204) return { ok: true, data: undefined as T };

  const text = await response.text();
  let parsed: unknown = null;
  if (text) {
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = null;
    }
  }

  if (!response.ok) return { ok: false, error: parseDetail(response.status, parsed) };
  return { ok: true, data: parsed as T };
}
