"use client";

import { LogOut, MoreHorizontal, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { permittedSections, type Item } from "@/components/app-nav";
import { ProfileDot } from "@/components/profile-completion";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Resource } from "@/lib/access";

/**
 * The phone's navigation: four tabs and a sheet.
 *
 * Below `lg` the side nav is not drawn at all, which left a signed-in phone
 * with no way to go anywhere. A tab bar is the answer because the things
 * done on a phone — check the dashboard, find a person, mark attendance —
 * are thumb tasks, and a drawer puts every one of them behind a corner
 * tap and a second tap.
 *
 * Eighteen destinations do not fit in a bar, so the fifth tab is *More*,
 * which opens the whole grouped menu as a sheet. It reads from the same
 * `permittedSections` as the side nav, so nobody is offered a page the API
 * would refuse.
 *
 * Which four go on the bar depends on who is looking: a leader's week is
 * people, attendance and giving; platform staff's is verification, the
 * churches and the trail. A member, who is permitted only a handful of
 * pages, gets all of them on the bar and no *More* at all.
 */

const LEADER_TABS = [
  "/app", "/app/people", "/app/attendance", "/app/giving",
  "/app/cells", "/app/events", "/app/notices", "/app/account",
];
const STAFF_TABS = ["/app", "/app/platform", "/app/select", "/app/audit"];

/** The bar has room for a word, not a phrase. */
const SHORT: Record<string, string> = {
  "/app": "Home",
  "/app/select": "Churches",
  "/app/platform": "Verify",
  "/app/audit": "Activity",
  "/app/attendance": "Attendance",
  "/app/people": "People",
};

const BAR_SLOTS = 5;

export function MobileNav({
  allowed,
  isPlatform,
  churchName,
  userName,
  userEmail,
  signOutAction,
  profileIncomplete = false,
  badges = {},
}: {
  allowed: Resource[];
  isPlatform: boolean;
  churchName: string | null;
  userName: string;
  userEmail: string;
  signOutAction: () => Promise<void>;
  profileIncomplete?: boolean;
  /** Counts to show on a destination, keyed by href. */
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  // The sheet is open only on the page it was opened from. Remembering the
  // path rather than a boolean means navigating closes it with no effect
  // and no state set during render.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const sheet = useRef<HTMLDivElement>(null);

  const sections = permittedSections(allowed, isPlatform);
  const everything = sections.flatMap((s) => s.items);
  const byHref = new Map(everything.map((item) => [item.href, item]));

  const wanted = isPlatform ? STAFF_TABS : LEADER_TABS;
  const needsMore = everything.length > BAR_SLOTS;
  const tabs: Item[] = (needsMore ? wanted : everything.map((i) => i.href))
    .map((href) => byHref.get(href))
    .filter((item): item is Item => Boolean(item))
    .slice(0, needsMore ? BAR_SLOTS - 1 : BAR_SLOTS);

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`);
  // A page that lives only in the sheet lights *More*, so the bar never
  // shows nothing selected.
  const inSheetOnly = needsMore && everything.some((i) => isActive(i.href)) && !tabs.some((t) => isActive(t.href));

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenOn(null);
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    sheet.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line-soft bg-mist/92 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="mx-auto flex max-w-xl items-stretch justify-around px-1">
          {tabs.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            const count = badges[item.href] ?? 0;
            return (
              <li key={item.href} className="min-w-0 flex-1">
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className="tab"
                  data-active={active || undefined}
                  style={{ ["--tab-tone" as string]: item.tone }}
                >
                  <span className="relative">
                    <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                    {count > 0 && (
                      <span className="tab-badge" aria-label={`${count} waiting`}>
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                    {item.href === "/app/account" && profileIncomplete && (
                      <span className="absolute -right-1 -top-0.5"><ProfileDot incomplete /></span>
                    )}
                  </span>
                  <span className="truncate">{SHORT[item.href] ?? item.label}</span>
                </Link>
              </li>
            );
          })}
          {needsMore && (
            <li className="min-w-0 flex-1">
              <button
                type="button"
                className="tab w-full"
                data-active={inSheetOnly || open || undefined}
                aria-haspopup="dialog"
                aria-expanded={open}
                onClick={() => setOpenOn(open ? null : pathname)}
                style={{ ["--tab-tone" as string]: "var(--ink)" }}
              >
                <span className="relative">
                  <MoreHorizontal className="h-[21px] w-[21px]" strokeWidth={1.8} aria-hidden />
                  {profileIncomplete && (
                    <span className="absolute -right-1 -top-0.5"><ProfileDot incomplete /></span>
                  )}
                </span>
                <span>More</span>
              </button>
            </li>
          )}
        </ul>
      </nav>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="All sections">
          <button
            type="button"
            aria-label="Close menu"
            className="sheet-scrim absolute inset-0 h-full w-full bg-black/40"
            onClick={() => setOpenOn(null)}
          />
          <div
            ref={sheet}
            tabIndex={-1}
            className="sheet-rise absolute inset-x-0 bottom-0 flex max-h-[86dvh] flex-col rounded-t-3xl border-t border-line bg-paper outline-none"
            // The sheet takes focus so Escape and the screen reader land in it;
            // it is a container, not a control, so it wears no ring.
            style={{ paddingBottom: "env(safe-area-inset-bottom)", outline: "none" }}
          >
            <div className="flex items-center gap-3 px-5 pb-2 pt-4">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14px] font-semibold text-ink">{userName}</span>
                <span className="block truncate text-[11.5px] text-ink-3">
                  {churchName ?? "All churches"} · {userEmail}
                </span>
              </span>
              <ThemeToggle />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setOpenOn(null)}
                className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-2"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="overflow-y-auto px-3 pb-3">
              {sections.map((section) => (
                <div key={section.heading} className="pt-3">
                  <p className="eyebrow px-2 pb-1 text-ink-3">{section.heading}</p>
                  <ul className="grid grid-cols-2 gap-1.5">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      const count = badges[item.href] ?? 0;
                      return (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className="flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px]
                                       transition-colors active:bg-sunk"
                            style={{
                              background: active ? "var(--sunk)" : undefined,
                              fontWeight: active ? 600 : 500,
                            }}
                          >
                            <Icon
                              className="h-[17px] w-[17px] shrink-0"
                              style={{ color: item.tone }}
                              strokeWidth={1.9}
                              aria-hidden
                            />
                            <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            {count > 0 && <span className="tab-badge tab-badge-inline">{count}</span>}
                            {item.href === "/app/account" && <ProfileDot incomplete={profileIncomplete} />}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}

              <form action={signOutAction} className="px-1 pb-2 pt-4">
                <button
                  type="submit"
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line
                             text-[13px] font-medium text-ink-2 active:bg-sunk"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
