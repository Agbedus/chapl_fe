import { cookies } from "next/headers";
import WebSocket from "ws";

import { API_URL, TOKEN_COOKIE } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Relay the private development API's live channel through the frontend. */
export async function GET(request: Request) {
  if (!(await cookies()).get(TOKEN_COOKIE)?.value) {
    return new Response(null, { status: 401 });
  }
  const ticket = new URL(request.url).searchParams.get("ticket");
  if (!ticket || !/^[A-Za-z0-9_-]{32,128}$/.test(ticket)) {
    return new Response(null, { status: 400 });
  }

  // The destination is server configuration, never a URL from the caller.
  const url = new URL(`${API_URL.replace(/^http/, "ws")}/realtime/ws`);
  url.searchParams.set("ticket", ticket);
  const socket = new WebSocket(url, { handshakeTimeout: 10_000, maxPayload: 1024 * 1024 });
  const encoder = new TextEncoder();
  let finish = () => {};
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      finish = () => {
        if (closed) return;
        closed = true;
        request.signal.removeEventListener("abort", finish);
        socket.terminate();
        if (!cancelled) controller.close();
      };
      request.signal.addEventListener("abort", finish, { once: true });
      // Do not open the browser stream until the backend is subscribed:
      // the remote's first hello must reach the presenting screen.
      socket.on("open", () => {
        if (!closed) controller.enqueue(encoder.encode(": connected\n\n"));
      });
      socket.on("message", (data) => {
        if (closed) return;
        try {
          const message = JSON.stringify(JSON.parse(data.toString()));
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        } catch {
          // Ignore malformed messages, as the direct browser socket does.
        }
      });
      socket.on("close", finish);
      socket.on("error", finish);
      if (request.signal.aborted) finish();
    },
    cancel() {
      cancelled = true;
      finish();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
