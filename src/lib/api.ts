/**
 * The one door to the Chapl API.
 *
 * Every call is made **server side**. The access token lives in an
 * httpOnly cookie that browser JavaScript cannot read, so a script
 * injected into the page has nothing to steal — which is the whole reason
 * not to keep it in localStorage. It also sidesteps cross-origin cookies
 * entirely: the browser only ever talks to this app's own origin.
 */
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
    cache = "no-store",
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

  if (auth) {
    const jar = await cookies();
    const token = jar.get(TOKEN_COOKIE)?.value;
    if (token) headers.Authorization = `Bearer ${token}`;

    const church = churchId === undefined ? jar.get(CHURCH_COOKIE)?.value : churchId;
    if (church) headers["X-Church-Id"] = church;
  } else if (churchId) {
    headers["X-Church-Id"] = churchId;
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: payload,
      cache,
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    return {
      ok: false,
      error: { status: 0, detail: "Could not reach the Chapl API." },
    };
  }

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
