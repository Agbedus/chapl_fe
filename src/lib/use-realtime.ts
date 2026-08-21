"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The live notification feed.
 *
 * The socket is the delivery mechanism, not the source of truth: the
 * unread count comes from the server on mount, and the socket only ever
 * *adds* to it. A tab that has been asleep for an hour reconnects and
 * re-reads the count rather than trying to replay what it missed.
 *
 * Things that took thinking, and are easy to get wrong:
 *
 * - **The ticket is minted per connection.** It lives sixty seconds and
 *   is single-use, so a reconnect asks for a new one. Caching it would
 *   guarantee a failed reconnect exactly when the network came back.
 *
 * - **Backoff, with a ceiling and jitter.** A server restart otherwise
 *   means every open tab reconnecting on the same beat forever.
 *
 * - **Nothing runs while the tab is hidden.** A backgrounded tab holding
 *   a socket open is a battery cost for messages nobody is looking at;
 *   it disconnects and re-reads the count when you come back, which is
 *   also how it catches up.
 *
 * - **It never renders what it cannot trust.** The socket carries a
 *   title, a kind and an href — that is all the tray shows. Anything
 *   richer is fetched.
 */

export type LiveNotification = {
  id: string;
  title: string;
  message: string;
  kind: string;
  href: string | null;
  created_at: string | null;
};

type Options = {
  /** Mints a fresh single-use ticket. A Server Action — the cookie is httpOnly. */
  getTicket: () => Promise<{ ticket: string } | null>;
  /** The count as the server knows it, read on mount and on wake. */
  getUnread: () => Promise<number>;
};

export function useRealtime({ getTicket, getUnread }: Options) {
  const [unread, setUnread] = useState(0);
  const [latest, setLatest] = useState<LiveNotification[]>([]);
  const [connected, setConnected] = useState(false);

  // Refs, not state: changing these must never cause a render.
  const socket = useRef<WebSocket | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attempts = useRef(0);
  const alive = useRef(true);
  /*
   * Claimed synchronously, before any `await`.
   *
   * `socket.current` is only assigned once the ticket comes back, so two
   * calls to `connect()` in the same tick both sailed past the guard,
   * both minted a ticket and both opened a socket. Two live sockets on
   * one user topic meant every notification counted twice — the badge
   * moved by two for one request.
   *
   * React's StrictMode double-mount makes this certain in development
   * and a flaky reconnect makes it likely in production.
   */
  const connecting = useRef(false);
  /*
   * Which run of the effect owns the socket.
   *
   * `alive` alone was not enough. React mounts, tears down and remounts
   * in StrictMode: the first run started a connect, the teardown reset
   * the flags while that connect was still awaiting its ticket, and the
   * second run started another. Both then resumed and opened a socket —
   * two live sockets on one user topic, so every notification counted
   * twice.
   *
   * A run id fixes it properly: a connect that resumes into a newer run
   * closes what it opened and leaves. Bumping the id is also what makes
   * the teardown final.
   */
  const run = useRef(0);

  useEffect(() => {
    alive.current = true;
    const myRun = ++run.current;
    const stale = () => !alive.current || run.current !== myRun;

    const clearTimer = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };

    const close = () => {
      clearTimer();
      connecting.current = false;
      const s = socket.current;
      socket.current = null;
      if (s) {
        /*
         * Detach before closing.
         *
         * `close()` fires `onclose`, and `onclose` schedules a reconnect —
         * so a deliberate teardown queued a fresh connection behind
         * itself. On StrictMode's mount/unmount/mount that left two live
         * sockets on one user topic, and every notification counted
         * twice. The handlers go first so a close we asked for stays
         * closed; only a close we did not ask for retries.
         */
        s.onclose = null;
        s.onerror = null;
        s.onmessage = null;
        s.onopen = null;
        if (s.readyState <= WebSocket.OPEN) s.close();
      }
      setConnected(false);
    };

    const connect = async () => {
      if (stale() || document.hidden) return;
      if (socket.current || connecting.current) return;
      connecting.current = true;

      // The count is authoritative; the socket only adds to it.
      try {
        setUnread(await getUnread());
      } catch {
        /* An unreachable API is the reconnect's problem, not the badge's. */
      }

      const minted = await getTicket();
      if (!minted || stale()) {
        connecting.current = false;
        // A run that has been superseded does not retry — the run that
        // replaced it is already connecting.
        if (!stale()) retry();
        return;
      }

      const url = new URL(
        process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000/api/v1/realtime/ws",
      );
      url.searchParams.set("ticket", minted.ticket);

      const ws = new WebSocket(url.toString());
      // Opened while a newer run was starting: close it and step aside,
      // rather than leaving an orphan nobody holds a reference to.
      if (stale()) {
        ws.close();
        connecting.current = false;
        return;
      }
      socket.current = ws;
      connecting.current = false;

      ws.onopen = () => {
        attempts.current = 0;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        let payload: LiveNotification & { type?: string };
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
        if (payload.type !== "notification") return;

        setUnread((n) => n + 1);
        setLatest((current) => {
          // Guard against a duplicate delivery — a reconnect can overlap
          // a message already in hand, and a tray that shows the same
          // thing twice looks broken in a way people remember.
          if (current.some((n) => n.id === payload.id)) return current;
          return [payload, ...current].slice(0, 12);
        });
      };

      ws.onclose = () => {
        socket.current = null;
        setConnected(false);
        retry();
      };

      // `onerror` always precedes `onclose`; letting close handle the
      // retry keeps one path rather than two racing.
      ws.onerror = () => ws.close();
    };

    const retry = () => {
      if (stale() || document.hidden) return;
      clearTimer();
      attempts.current = Math.min(attempts.current + 1, 6);
      const base = Math.min(1000 * 2 ** (attempts.current - 1), 30_000);
      // Jitter, so a restarted server is not met by every tab at once.
      timer.current = setTimeout(connect, base + Math.random() * 1000);
    };

    const onVisibility = () => {
      if (document.hidden) close();
      else {
        attempts.current = 0;
        void connect();
      }
    };

    void connect();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive.current = false;
      run.current += 1;
      document.removeEventListener("visibilitychange", onVisibility);
      close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    unread,
    latest,
    connected,
    /**
     * Mark the badge read, optimistically. The server is told separately.
     *
     * The rows deliberately stay. Emptying the list at the moment the
     * tray opens means the reader watches the thing they came to read
     * disappear — the count is what "read" refers to, not the contents.
     */
    clear: () => setUnread(0),
  };
}
