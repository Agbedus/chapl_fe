import type { ReactNode } from "react";

import { signOut } from "@/app/actions/auth";
import { search } from "@/app/actions/search";
import { markAllRead, realtimeTicket, unreadCount } from "@/app/actions/manage";
import { ProfileCompletionPrompt } from "@/components/profile-completion";
import { AppNav } from "@/components/app-nav";
import { MobileNav } from "@/components/mobile-nav";
import { AppTopbar } from "@/components/app-topbar";
import { Toaster } from "@/components/toaster";
import { canRead, readable } from "@/lib/access";
import { api } from "@/lib/api";
import { currentChurchId, requireMe } from "@/lib/session";
import type { Schemas } from "@/lib/generated/api";
import type { Church, Dashboard, Role } from "@/lib/types";
import { ROLE_LABEL } from "@/lib/types";

/** A session's closing time (UTC from the API) is still ahead. Server-only, so the clock is safe. */
function stillOpen(closesAt: string): boolean {
  return new Date(closesAt.endsWith("Z") ? closesAt : `${closesAt}Z`).getTime() > Date.now();
}

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await requireMe();
  const churchId = await currentChurchId();

  // Which tenant the shell is labelled with. Platform staff with nothing
  // selected are working across all of them, and it says so.
  let churchName: string | null = null;
  // The one role that says the most about them here: their highest grant
  // in this church, or their platform role. Nothing at all is a member.
  const order = Object.keys(ROLE_LABEL) as Role[];
  const held = (me.assignments ?? [])
    .filter((a) => order.indexOf(a.role) < 2 || !churchId || a.church_id === churchId)
    .map((a) => a.role)
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const roleLabel = held.length ? ROLE_LABEL[held[0]] : "Member";

  const canSwitch = (me.churches?.length ?? 0) > 1 || me.is_platform_staff;

  /*
   * Live service is a church's, so its button needs one church in scope:
   * none for platform staff across all churches. Whether anything is on
   * air is read beside the church: a leader's open sessions, or for a
   * member the ones they can check in to.
   */
  const scoped = !(me.is_platform_staff && !churchId) && Boolean(churchId || (me.churches?.length ?? 0) > 0);
  const [churchRead, airRead] = await Promise.all([
    churchId ? api<Church>(`/churches/${churchId}`) : Promise.resolve(null),
    !scoped
      ? Promise.resolve(null)
      : canRead(me, "attendance")
        ? api<Schemas["CheckInSessionList"]>("/attendance/check-in/sessions")
        : api<Schemas["CheckInAvailable"][]>("/attendance/check-in/open"),
  ]);
  if (churchRead?.ok) churchName = churchRead.data.name;
  else if (!churchId && !me.is_platform_staff && me.churches?.length === 1) churchName = me.churches[0].name;
  const onAir = !airRead?.ok
    ? 0
    : Array.isArray(airRead.data)
      ? airRead.data.length
      : airRead.data.items.filter((s) => s.is_open && stillOpen(s.closes_at)).length;

  // Platform staff get live system state in the bar. A church admin has no
  // business seeing infrastructure, so it is fetched only for them.
  let health: "ok" | "warn" | "down" | null = null;
  let environment: string | null = null;
  let runtime: string | null = null;
  // Churches waiting on the platform, for the badge on the phone's tab bar.
  let waiting = 0;

  if (me.is_platform_staff) {
    const dash = await api<Dashboard>("/dashboard?church_id=all");
    if (dash.ok) {
      health = dash.data.health ?? null;
      waiting = dash.data.staff?.church_status.pending ?? 0;
      environment = dash.data.runtime?.app_env ?? null;
      runtime = dash.data.runtime
        ? `${dash.data.runtime.dialect} · up ${dash.data.runtime.uptime}`
        : null;
    }
  }

  return (
    // Below `lg` the tab bar is fixed to the bottom, so the page keeps clear of it.
    <div className="app-ambient flex min-h-screen w-full gap-2 overflow-x-clip px-2 pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
      <AppNav
        churchName={churchName}
        userName={me.full_name}
        userEmail={me.email}
        signOutAction={signOut}
        allowed={[...readable(me)]}
        isPlatform={me.is_platform_staff}
        profileIncomplete={!me.profile_completion.complete}
        canSwitch={canSwitch}
        userAvatar={me.avatar_url}
        roleLabel={roleLabel}
        churchId={churchId}
      />

      <MobileNav
        allowed={[...readable(me)]}
        isPlatform={me.is_platform_staff}
        churchName={churchName}
        userName={me.full_name}
        userEmail={me.email}
        signOutAction={signOut}
        profileIncomplete={!me.profile_completion.complete}
        canSwitch={canSwitch}
        churchId={churchId}
        badges={waiting > 0 ? { "/app/platform": waiting } : {}}
      />

      <div data-app-main className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          churchName={churchName}
          canSwitch={canSwitch}
          churchId={churchId}
          environment={environment}
          health={health}
          runtime={runtime}
          searchAction={search}
        live={scoped ? { onAir } : null}
        getTicket={realtimeTicket}
        getUnread={unreadCount}
        markRead={markAllRead}
        />
        {/* No capped reading column — everything here is scanned rather than
            read, and a measure on a wide monitor just moves the work into a
            scroll. The inset is equal on every side so a page reads as a
            sheet of paper rather than a panel bolted to a rail. */}
        <div className="page-pad min-w-0 flex-1"><ProfileCompletionPrompt profile={me.profile_completion} />{children}</div>
      </div>
      <Toaster />
    </div>
  );
}
