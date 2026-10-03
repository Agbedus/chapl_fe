"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Resource } from "@/lib/access";

import { ProfileDot } from "@/components/profile-completion";
import { Tooltip } from "@/components/tooltip";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  Activity,
  CalendarDays,
  Building2,
  ChevronLeft,
  Church,
  CreditCard,
  Home,
  Layers,
  LogOut,
  Megaphone,
  Mic,
  PanelLeft,
  UserCircle,
  Users,
  Compass,
  MailPlus,
  ShieldCheck,
  History,
} from "lucide-react";

type Item = {
  href: string;
  label: string;
  icon: typeof Home;
  tone: string;
  /**
   * The resource this page reads. An item with none is for everybody —
   * the dashboard and the account page are the only two.
   *
   * Filtering on this is what stops a member being shown Branches,
   * Everyone and Team & roles and then being 403'd by the API on all
   * three. See `lib/access.ts` for why the table lives in the frontend
   * at all.
   */
  needs?: Resource;
  /** Shown only to platform staff, whatever roles they hold. */
  platformOnly?: boolean;
};

const SECTIONS: { heading: string; items: Item[] }[] = [
  {
    heading: "Overview",
    items: [{ href: "/app", label: "Dashboard", icon: Home, tone: "var(--cobalt)" }],
  },
  {
    // The tree, top down: the church, its sites, the groups inside them.
    heading: "Church",
    items: [
      { href: "/app/select", label: "Choose church", icon: Church, tone: "var(--violet)" },
      { href: "/app/church", label: "Church", icon: Church, tone: "var(--violet)", needs: "church" },
      { href: "/app/branches", label: "Branches", icon: Building2, tone: "var(--violet)", needs: "branch" },
      { href: "/app/cells", label: "Cells", icon: Compass, tone: "var(--teal)", needs: "cell" },
      { href: "/app/departments", label: "Departments", icon: Layers, tone: "var(--emerald)", needs: "department" },
    ],
  },
  {
    heading: "People",
    items: [
      { href: "/app/people", label: "Everyone", icon: Users, tone: "var(--cobalt)", needs: "user" },
      { href: "/app/invitations", label: "Invitations", icon: MailPlus, tone: "var(--gold)", needs: "membership" },
      { href: "/app/team", label: "Team & roles", icon: ShieldCheck, tone: "var(--ruby)", needs: "assignment" },
    ],
  },
  {
    heading: "Activity",
    items: [
      { href: "/app/attendance", label: "Attendance", icon: Activity, tone: "var(--gold)", needs: "attendance" },
      { href: "/app/giving", label: "Giving", icon: CreditCard, tone: "var(--emerald)", needs: "donation" },
      { href: "/app/sermons", label: "Sermons", icon: Mic, tone: "var(--ruby)", needs: "sermon" },
      { href: "/app/events", label: "Events", icon: CalendarDays, tone: "var(--violet)", needs: "event" },
      { href: "/app/notices", label: "Notices", icon: Megaphone, tone: "var(--cobalt)", needs: "notice" },
    ],
  },
  {
    // Not "Activity": the trail is not something the church does, it is
    // the record of what was done to it. Gated on `audit_log`, so a
    // cell leader never sees a link they would be refused at.
    heading: "Oversight",
    items: [
      // Platform staff only, and gated on `platformOnly` rather than a
      // resource: "may I check other people's churches" is not
      // something a church role should ever imply.
      { href: "/app/platform", label: "Verification", icon: ShieldCheck, tone: "var(--gold)", platformOnly: true },
      { href: "/app/audit", label: "Audit log", icon: History, tone: "var(--ink-3)", needs: "audit_log" },
    ],
  },
  {
    heading: "You",
    items: [{ href: "/app/account", label: "Account", icon: UserCircle, tone: "var(--ink-3)" }],
  },
];

const COLLAPSE_KEY = "chapl-nav-collapsed";

/**
 * The collapsed preference lives in localStorage, which the server cannot
 * see. `useSyncExternalStore` is the sanctioned way to read it without a
 * hydration mismatch — the server renders the expanded default and the
 * client corrects it after hydration, with no setState in an effect.
 */
const collapseStore = {
  subscribe(onChange: () => void) {
    window.addEventListener("storage", onChange);
    window.addEventListener("chapl:nav", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("chapl:nav", onChange);
    };
  },
  get() {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  },
  set(value: boolean) {
    try {
      localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
    } catch {
      /* private mode — the session default is fine */
    }
    window.dispatchEvent(new Event("chapl:nav"));
  },
};

/**
 * A rail that hangs inside the viewport rather than sitting flush against
 * it — inset on every side, so the page reads as a surface the nav floats
 * over.
 *
 * The active marker is one element that slides between items rather than a
 * class toggled per link. Moving a single node is what makes the change
 * feel continuous instead of instantaneous, and it means only one thing
 * animates no matter how long the list grows.
 */
export function AppNav({
  churchName,
  userName,
  userEmail,
  signOutAction,
  allowed,
  isPlatform = false,
  profileIncomplete = false,
}: {
  churchName: string | null;
  userName: string;
  userEmail: string;
  signOutAction: () => Promise<void>;
  /** Platform staff see the verification queue; nobody else does. */
  isPlatform?: boolean;
  profileIncomplete?: boolean;
  /**
   * Resources this person can read, worked out on the server.
   *
   * A plain array rather than the `Me` record: only things that
   * serialise cross into a Client Component, and the nav has no business
   * with the rest of a person's identity anyway.
   */
  allowed: Resource[];
}) {
  const pathname = usePathname();

  // Sections whose every item was filtered out disappear with their
  // heading — a "People" heading over nothing reads as a loading bug.
  const permitted = new Set(allowed);
  const sections = SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter(
      (item) =>
        (!item.needs || permitted.has(item.needs)) &&
        (!item.platformOnly || isPlatform),
    ),
  })).filter((section) => section.items.length > 0);

  const collapsed = useSyncExternalStore(
    collapseStore.subscribe,
    collapseStore.get,
    () => false, // the server has no localStorage; expanded is the default
  );
  const toggle = useCallback(() => collapseStore.set(!collapsed), [collapsed]);
  const listRef = useRef<HTMLDivElement>(null);
  const [marker, setMarker] = useState<{ top: number; height: number } | null>(null);

  // Longest matching href wins, so a detail page keeps its section lit.
  const activeHref = SECTIONS.flatMap((s) => s.items)
    .map((i) => i.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];

  useEffect(() => {
    const list = listRef.current;
    if (!list || !activeHref) return setMarker(null);

    const measure = () => {
      const el = list.querySelector<HTMLElement>(`[data-href="${activeHref}"]`);
      if (!el) return setMarker(null);
      setMarker({ top: el.offsetTop, height: el.offsetHeight });
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeHref, collapsed]);

  return (
    <aside
      data-collapsed={collapsed || undefined}
      className="group/nav sticky top-4 z-30 hidden h-[calc(100vh-2rem)] shrink-0
                 flex-col rounded-2xl border border-line-soft bg-mist/85 backdrop-blur
                 transition-[width] duration-300 ease-out lg:flex
                 motion-reduce:transition-none"
      style={{ width: collapsed ? 76 : 248 }}
      aria-label="Sections"
    >
      {/*
        Church badge and the collapse control.

        Expanded, the toggle sits at the right of the row where a control
        acting on the panel belongs. Collapsed there is no right-hand side
        left — the rail is 76px and the badge fills it — so the toggle
        moves on top of the badge and waits for a hover. The badge is the
        only thing in that row, which makes it the one place the cursor
        will already be.
      */}
      <div className="group/brand relative flex items-center gap-2.5 px-4 py-4">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[11px] font-bold
                     transition-opacity duration-150 motion-reduce:transition-none"
          style={{
            background:
              "linear-gradient(135deg, var(--cobalt), color-mix(in oklab, var(--cobalt) 55%, var(--violet)))",
            color: "var(--accent-ink)",
          }}
          title={churchName ?? "All churches"}
        >
          {(churchName ?? "ALL").slice(0, 2).toUpperCase()}
        </span>

        <span
          className="min-w-0 flex-1 overflow-hidden transition-[opacity,width] duration-200
                     motion-reduce:transition-none"
          style={{ opacity: collapsed ? 0 : 1, width: collapsed ? 0 : "auto" }}
        >
          <span className="block truncate text-[13px] font-semibold text-ink">
            {churchName ?? "All churches"}
          </span>
          <span className="block truncate text-[11px] text-ink-3">Chapl</span>
        </span>

        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
          className={
            collapsed
              ? `absolute left-4 top-4 grid h-9 w-9 place-items-center rounded-xl
                 border border-line bg-paper text-ink opacity-0
                 transition-opacity duration-150
                 group-hover/brand:opacity-100 focus-visible:opacity-100
                 motion-reduce:transition-none`
              : `grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-3
                 transition-colors hover:bg-sunk hover:text-ink`
          }
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" strokeWidth={1.9} />
          ) : (
            <ChevronLeft className="h-4 w-4" strokeWidth={1.9} />
          )}
        </button>
      </div>

      {/* items */}
      <div ref={listRef} className="relative flex-1 overflow-y-auto px-3 pb-3">
        {marker && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 right-3 rounded-xl bg-sunk
                       transition-[top,height] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]
                       motion-reduce:transition-none"
            style={{
              top: marker.top,
              height: marker.height,
            }}
          />
        )}

        {sections.map((section) => (
          <div key={section.heading} className="mb-5">
            <p
              className="eyebrow px-3 pb-2 text-ink-3 transition-opacity duration-200
                         motion-reduce:transition-none"
              style={{ opacity: collapsed ? 0 : 1 }}
            >
              {section.heading}
            </p>

            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = item.href === activeHref;
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    {/* Collapsed, the item is an icon and nothing else, so
                        it needs a real label rather than the OS one. */}
                    <Tooltip label={item.label} disabled={!collapsed}>
                    <Link
                      href={item.href}
                      data-href={item.href}
                      aria-current={active ? "page" : undefined}
                      className="group/item relative flex items-center gap-3 rounded-xl px-3 py-2.5
                                 text-[13.5px] font-medium transition-[color,transform] duration-150
                                 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98]
                                 motion-reduce:transition-none"
                      style={{ color: active ? "var(--ink)" : "var(--ink-2)" }}
                    >
                      <Icon
                        className="h-[18px] w-[18px] shrink-0 transition-colors duration-150
                                   motion-reduce:transition-none"
                        strokeWidth={1.9}
                        style={{ color: active ? item.tone : undefined }}
                      />
                      <span
                        className="min-w-0 flex-1 truncate transition-[opacity,transform] duration-200
                                   motion-reduce:transition-none"
                        style={{
                          opacity: collapsed ? 0 : 1,
                          transform: collapsed ? "translateX(-4px)" : "none",
                        }}
                      >
                        {item.label} {item.href === "/app/account" && <ProfileDot incomplete={profileIncomplete} />}
                      </span>
                      <span
                        aria-hidden
                        className="h-1.5 w-1.5 shrink-0 rounded-full transition-opacity duration-200
                                   motion-reduce:transition-none"
                        style={{
                          background: item.tone,
                          opacity: active && !collapsed ? 1 : 0,
                        }}
                      />
                    </Link>
                    </Tooltip>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* who */}
      <div className="border-t border-line px-3 py-3">
        <Link href="/app/account#complete-profile" className="flex items-center gap-3 rounded-xl px-3 py-2" aria-label={profileIncomplete ? "Complete your profile" : "Your profile"}>
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-semibold"
            style={{
              background: "color-mix(in oklab, var(--violet) 14%, transparent)",
              color: "var(--violet)",
            }}
          >
            {userName.slice(0, 1).toUpperCase()}<ProfileDot incomplete={profileIncomplete} />
          </span>
          <span
            className="min-w-0 flex-1 overflow-hidden transition-opacity duration-200
                       motion-reduce:transition-none"
            style={{ opacity: collapsed ? 0 : 1 }}
          >
            <span className="block truncate text-[12.5px] font-medium text-ink">{userName}</span>
            <span className="block truncate text-[11px] text-ink-3">{userEmail}</span>
          </span>
        </Link>

        <form action={signOutAction}>
          <button
            type="submit"
            title={collapsed ? "Sign out" : undefined}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px]
                       font-medium text-ink-2 transition-colors hover:bg-sunk hover:text-ink"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
            <span
              className="truncate transition-opacity duration-200 motion-reduce:transition-none"
              style={{ opacity: collapsed ? 0 : 1 }}
            >
              Sign out
            </span>
          </button>
        </form>
      </div>
    </aside>
  );
}
