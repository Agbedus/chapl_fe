import { NextResponse } from "next/server";

import { api } from "@/lib/api";

const ACTIONS = new Set(["next", "prev", "first", "last", "goto", "blank", "end", "state", "hello", "style", "screen", "rename", "resume", "undo"]);

/**
 * The deck's signals between a leader's own devices (the phone remote and
 * the presenting screen), passed to the API with the session cookie.
 *
 * A route handler, not a Server Action, on purpose: an action re-renders
 * the page it was called from, the screen reports its position after
 * every render, and the two fed each other four times a second.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ sent: false }, { status: 400 });
  }
  if (typeof body.action !== "string" || !ACTIONS.has(body.action)) {
    return NextResponse.json({ sent: false }, { status: 400 });
  }
  const signal = {
    action: body.action,
    ...(typeof body.screenId === "string" ? { screenId: body.screenId } : {}),
    ...(typeof body.serviceKey === "string" ? { serviceKey: body.serviceKey } : {}),
    ...(typeof body.name === "string" ? { name: body.name } : {}),
    ...(typeof body.presenting === "boolean" ? { presenting: body.presenting } : {}),
    ...(typeof body.resumeSlide === "number" ? { resumeSlide: body.resumeSlide } : {}),
    ...(typeof body.canUndo === "boolean" ? { canUndo: body.canUndo } : {}),
    ...(body.style && typeof body.style === "object" && !Array.isArray(body.style) ? { style: body.style } : {}),
    ...(typeof body.slide === "number" ? { slide: body.slide } : {}),
    ...(typeof body.blank === "boolean" ? { blank: body.blank } : {}),
    ...(Array.isArray(body.titles) ? { titles: body.titles.slice(0, 200).map(String) } : {}),
  };
  const result = await api<{ sent: boolean }>("/attendance/live/deck", { method: "POST", body: signal, quiet: true });
  return NextResponse.json({ sent: result.ok }, { status: result.ok ? 202 : result.error.status || 502 });
}
