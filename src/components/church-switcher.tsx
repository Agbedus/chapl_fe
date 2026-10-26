"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Loader2, Search } from "lucide-react";

import { chooseChurch } from "@/app/actions/auth";
import { listChurches, type ChurchOption } from "@/app/actions/churches";
import { Popover } from "@/components/ui/popover";

/**
 * Switching church, from wherever the church's name is shown.
 *
 * It replaced a page whose only job was listing churches to click. The
 * list loads when the switcher opens, is searchable as you type, and
 * takes arrow keys and Enter, because platform staff switch between
 * hundreds and nobody scrolls hundreds. A narrow, tall panel: names are
 * short, and a list is read downwards.
 */
export function ChurchSwitcher({
  current,
  className,
  children,
  side = "bottom",
  label = "Switch church",
}: {
  /** The church in effect, or null for every church. */
  current: string | null;
  className?: string;
  children: React.ReactNode;
  side?: "bottom" | "right";
  label?: string;
}) {
  const anchor = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<{ all: boolean; items: ChurchOption[] } | null>(null);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const [pending, startTransition] = useTransition();

  function toggle() {
    if (open) return setOpen(false);
    setOpen(true);
    setQ("");
    setCursor(0);
    if (!data) listChurches().then(setData);
  }

  const needle = q.trim().toLowerCase();
  const options: { id: string; name: string; status: string | null }[] = [
    ...(data?.all && (!needle || "all churches".includes(needle))
      ? [{ id: "all", name: "All churches", status: null }]
      : []),
    ...(data?.items ?? []).filter((c) => !needle || c.name.toLowerCase().includes(needle)),
  ];

  function pick(id: string) {
    startTransition(async () => {
      await chooseChurch(id);
    });
  }

  function onKey(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((c) => Math.min(c + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (event.key === "Enter" && options[cursor]) {
      event.preventDefault();
      pick(options[cursor].id);
    }
  }

  return (
    <>
      <button
        ref={anchor}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="dialog"
        title={label}
        className={className}
      >
        {children}
      </button>

      <Popover open={open} onClose={() => setOpen(false)} anchor={anchor} width={260} side={side}>
        <div className="p-1.5" onKeyDown={onKey}>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setCursor(0);
              }}
              placeholder="Find a church"
              aria-label="Find a church"
              className="w-full rounded-lg border border-line bg-mist py-2 pl-8 pr-2 text-[12.5px] text-ink outline-none placeholder:text-ink-3 focus:bg-paper"
            />
          </label>
          <ul role="listbox" aria-label="Churches" className="mt-1.5 max-h-[18rem] overflow-y-auto">
            {data === null ? (
              <li className="flex items-center gap-2 px-2.5 py-3 text-[12px] text-ink-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Loading
              </li>
            ) : options.length === 0 ? (
              <li className="px-2.5 py-3 text-[12px] text-ink-3">No church matches.</li>
            ) : (
              options.map((c, i) => {
                const here = c.id === "all" ? current === null : c.id === current;
                return (
                  <li key={c.id} role="option" aria-selected={i === cursor}>
                    <button
                      type="button"
                      disabled={pending}
                      onMouseEnter={() => setCursor(i)}
                      onClick={() => pick(c.id)}
                      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-[12.5px] ${
                        i === cursor ? "bg-sunk text-ink" : "text-ink-2"
                      } ${c.id === "all" ? "font-medium" : ""}`}
                    >
                      <span className="min-w-0 flex-1 truncate">{c.name}</span>
                      {c.status && c.status !== "active" && (
                        <span className="text-[10.5px] capitalize text-ink-3">{c.status}</span>
                      )}
                      {here && <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--emerald)" }} aria-hidden />}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      </Popover>
    </>
  );
}
