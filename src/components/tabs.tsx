"use client";

import { Children, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

/**
 * One table at a time.
 *
 * A page that stacked four long tables made you scroll past three to
 * reach the fourth. Each tab is a view of the same page; all of them stay
 * mounted (hidden, not removed), so a half-typed search or form in one is
 * still there when you come back. The marker under the active tab slides
 * rather than jumping, and a `#id` in the address — the links the
 * dashboard and notifications already use — opens that tab.
 */
export function Tabs({
  tabs,
  children,
}: {
  tabs: { id: string; label: string; count?: number }[];
  children: ReactNode;
}) {
  const panels = Children.toArray(children);
  const [active, setActive] = useState(0);
  const bar = useRef<HTMLDivElement>(null);
  const marker = useRef<HTMLSpanElement>(null);

  // Open the tab the address names. Read after mount: the server has no
  // hash, and guessing would mismatch the markup it sent.
  useEffect(() => {
    const id = window.location.hash.slice(1);
    const index = tabs.findIndex((t) => t.id === id);
    if (index > 0) {
      const timer = setTimeout(() => setActive(index), 0);
      return () => clearTimeout(timer);
    }
  }, [tabs]);

  // The marker is moved by writing to the node — it is geometry, not state.
  useLayoutEffect(() => {
    const button = bar.current?.querySelectorAll<HTMLElement>("[role=tab]")[active];
    if (!button || !marker.current) return;
    marker.current.style.transform = `translateX(${button.offsetLeft}px)`;
    marker.current.style.width = `${button.offsetWidth}px`;
  }, [active, tabs.length]);

  return (
    <div className="space-y-3">
      <div ref={bar} role="tablist" className="relative flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            aria-controls={`panel-${tab.id}`}
            onClick={() => {
              setActive(i);
              history.replaceState(null, "", `#${tab.id}`);
            }}
            className={`relative flex shrink-0 items-center gap-1.5 px-3 pb-2.5 pt-1 text-[13px] font-medium ${
              i === active ? "text-ink" : "text-ink-3 hover:text-ink-2"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`tnum rounded-md px-1.5 text-[11px] ${i === active ? "bg-sunk text-ink-2" : "text-ink-3"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
        <span
          ref={marker}
          aria-hidden
          className="pointer-events-none absolute bottom-[-1px] left-0 h-[2px] rounded-full bg-ink
                     transition-[transform,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                     motion-reduce:transition-none"
        />
      </div>
      {panels.map((panel, i) => (
        <div
          key={tabs[i]?.id ?? i}
          id={`panel-${tabs[i]?.id ?? i}`}
          role="tabpanel"
          hidden={i !== active}
          className={i === active ? "tab-in" : undefined}
        >
          {panel}
        </div>
      ))}
    </div>
  );
}
