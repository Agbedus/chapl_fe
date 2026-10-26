import { NextResponse, type NextRequest } from "next/server";

import { api } from "@/lib/api";

/**
 * Open one notification: mark it read, then go where it leads.
 *
 * A route rather than a client call so the link works as a link —
 * middle-click, open in a new tab — and the read happens on the server
 * with the session cookie like every other call.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await api(`/communication/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
  const to = request.nextUrl.searchParams.get("to");
  // Only ever somewhere inside the app.
  const safe = to && to.startsWith("/app") && !to.startsWith("//") ? to : "/app/notifications";
  return NextResponse.redirect(new URL(safe, request.url));
}
