"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Search, X } from "lucide-react";

import type { Hit } from "@/app/actions/search";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

/**
 * The bar across the top: where you are, what the system is doing, and a
 * way to find anything.
 *
 * Search opens on ⌘K / Ctrl-K, queries on a debounce so a fast typist
 * doesn't fire a request per keystroke, and drops results that arrive out
 * of order — without that, a slow response for "gr" can overwrite the
 * results for "grace".
 */
export function AppTopbar({
  churchName,
  environment,
  health,
  runtime,
  searchAction,
  getTicket,
  getUnread,
  markRead,
}: {
  churchName: string | null;
  environment: string | null;
  health: "ok" | "warn" | "down" | null;
  runtime: string | null;
  searchAction: (term: string) => Promise<Hit[]>;
  /** Server Actions for the bell — the session cookie is httpOnly. */
  getTicket: () => Promise<{ ticket: string } | null>;
  getUnread: () => Promise<number>;
  markRead: () => Promise<void>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [cursor, setCursor] = useState(0);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestId = useRef(0);

  // Clearing happens on the way out rather than in an effect watching
  // `open` — an effect that resets state in response to state is a
  // cascading render, and the close paths are the only ones that need it.
  const close = useCallback(() => {
    setOpen(false);
    setTerm("");
    setHits([]);
    setCursor(0);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => {
          if (v) {
            setTerm("");
            setHits([]);
            setCursor(0);
          }
          return !v;
        });
      }
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Focus only — no state written here.
  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      startTransition(async () => {
        const results = await searchAction(term);
        // A slower earlier request must not clobber a newer one.
        if (id === requestId.current) {
          setHits(results);
          setCursor(0);
        }
      });
    }, 180);
    return () => clearTimeout(timer);
  }, [term, open, searchAction]);

  const go = useCallback(
    (hit: Hit) => {
      close();
      router.push(hit.href);
    },
    [router, close],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, Math.max(0, hits.length - 1)));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (event.key === "Enter" && hits[cursor]) {
      event.preventDefault();
      go(hits[cursor]);
    }
  };

  const tone =
    health === "ok" ? "var(--emerald)" : health === "warn" ? "var(--gold)" : "var(--ruby)";

  return (
    <>
      {/*
        A floating card, like the sidenav beside it.

        It was a full-bleed bar with a bottom rule, which made the shell
        read as two different systems: a rounded panel on the left and a
        flat strip across the top. Now it starts at the same `top-4` the
        sidenav does, carries the same radius and hairline, and its
        `mx-7` matches `page-pad` — so its edges line up with the content
        underneath rather than running past it.
      */}
      <header
        className="sticky top-2 z-30 mx-4 mt-2 flex h-14 items-center gap-2 rounded-2xl
                   border border-line-soft bg-paper/70 px-3 backdrop-blur-xl
                   sm:top-4 sm:mx-7 sm:mt-4 sm:gap-4 sm:px-4"
      >
        <div className="flex min-w-0 items-center gap-3">
          <span className="truncate text-[14px] font-semibold text-ink">
            {churchName ?? "All churches"}
          </span>
          {environment && (
            <span
              className="hidden shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-wider sm:inline-block"
              style={{
                background: "color-mix(in oklab, var(--violet) 12%, transparent)",
                color: "var(--violet)",
              }}
            >
              {environment}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Search"
          // A phone has no room for a search *box*: it is a 36px button
          // that opens the same palette, and the box returns from `sm` up.
          className="ml-auto flex h-9 w-9 shrink-0 items-center justify-center gap-2.5 rounded-full border border-line
                     bg-mist/80 text-left text-[13px] text-ink-3
                     sm:h-auto sm:w-full sm:max-w-[420px] sm:justify-start sm:rounded-2xl sm:px-3.5 sm:py-2
                     transition-all hover:border-line-strong hover:bg-mist hover:text-ink-2
                     focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
        >
          <Search className="h-4 w-4 shrink-0" strokeWidth={1.9} />
          <span className="hidden min-w-0 flex-1 truncate sm:block">Search churches, branches, people…</span>
          <kbd className="hidden shrink-0 rounded border border-line px-1.5 py-0.5 font-mono text-[10px] sm:block">
            ⌘K
          </kbd>
        </button>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {health && (
            <span
              className="hidden items-center gap-2 text-[12px] text-ink-3 md:flex"
              title={runtime ?? undefined}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone }} />
              {health === "ok" ? "Operational" : health === "warn" ? "Warnings" : "Down"}
            </span>
          )}
          <NotificationBell
            getTicket={getTicket}
            getUnread={getUnread}
            onOpen={markRead}
          />
          <ThemeToggle />
        </div>
      </header>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]"
          role="dialog"
          aria-modal="true"
          aria-label="Search"
        >
          <button
            type="button"
            aria-label="Close search"
            className="absolute inset-0 bg-ink/25 backdrop-blur-sm"
            onClick={close}
          />

          <div className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-line bg-paper">
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 shrink-0 text-ink-3" strokeWidth={1.9} />
              <input
                ref={inputRef}
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search churches, branches, cells, people…"
                aria-label="Search"
                className="min-w-0 flex-1 bg-transparent py-3.5 text-[14px] text-ink outline-none placeholder:text-ink-3"
              />
              {pending && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-ink-3" />}
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="shrink-0 rounded-md p-1 text-ink-3 hover:bg-sunk hover:text-ink"
              >
                <X className="h-4 w-4" strokeWidth={1.9} />
              </button>
            </div>

            <div className="max-h-[52vh] overflow-y-auto">
              {term.trim().length < 2 ? (
                <p className="px-4 py-8 text-center text-[13px] text-ink-3">
                  Type at least two characters.
                </p>
              ) : hits.length === 0 && !pending ? (
                <p className="px-4 py-8 text-center text-[13px] text-ink-3">
                  Nothing matches “{term}”.
                </p>
              ) : (
                <ul>
                  {hits.map((hit, index) => (
                    <li key={`${hit.kind}-${hit.id}`}>
                      <button
                        type="button"
                        onClick={() => go(hit)}
                        onMouseEnter={() => setCursor(index)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
                        style={{ background: index === cursor ? "var(--mist)" : undefined }}
                      >
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: hit.tone }}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13.5px] font-medium text-ink">
                            {hit.title}
                          </span>
                          <span className="block truncate text-[12px] text-ink-3">
                            {hit.subtitle}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[11px] text-ink-3">
              <span>↑↓ move</span>
              <span>↵ open</span>
              <span>esc close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
