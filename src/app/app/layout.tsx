import type { ReactNode } from "react";

import { signOut } from "@/app/actions/auth";
import { search } from "@/app/actions/search";
import { markAllRead, realtimeTicket, unreadCount } from "@/app/actions/manage";
import { AppNav } from "@/components/app-nav";
import { AppTopbar } from "@/components/app-topbar";
import { readable } from "@/lib/access";
import { api } from "@/lib/api";
import { currentChurchId, requireMe } from "@/lib/session";
import type { Church, Dashboard } from "@/lib/types";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await requireMe();
  const churchId = await currentChurchId();

  // Which tenant the shell is labelled with. Platform staff with nothing
  // selected are working across all of them, and it says so.
  let churchName: string | null = null;
  if (churchId) {
    const result = await api<Church>(`/churches/${churchId}`);
    if (result.ok) churchName = result.data.name;
  } else if (me.churches?.length === 1) {
    churchName = me.churches[0].name;
  }

  // Platform staff get live system state in the bar. A church admin has no
  // business seeing infrastructure, so it is fetched only for them.
  let health: "ok" | "warn" | "down" | null = null;
  let environment: string | null = null;
  let runtime: string | null = null;

  if (me.is_platform_staff) {
    const dash = await api<Dashboard>("/dashboard?church_id=all");
    if (dash.ok) {
      health = dash.data.health ?? null;
      environment = dash.data.runtime?.app_env ?? null;
      runtime = dash.data.runtime
        ? `${dash.data.runtime.dialect} · up ${dash.data.runtime.uptime}`
        : null;
    }
  }

  return (
    <div className="app-ambient flex min-h-screen w-full gap-2 px-2">
      <AppNav
        churchName={churchName}
        userName={me.full_name}
        userEmail={me.email}
        signOutAction={signOut}
        allowed={[...readable(me)]}
        isPlatform={me.is_platform_staff}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          churchName={churchName}
          environment={environment}
          health={health}
          runtime={runtime}
          searchAction={search}
        getTicket={realtimeTicket}
        getUnread={unreadCount}
        markRead={markAllRead}
        />
        {/* No capped reading column — everything here is scanned rather than
            read, and a measure on a wide monitor just moves the work into a
            scroll. The inset is equal on every side so a page reads as a
            sheet of paper rather than a panel bolted to a rail. */}
        <div className="page-pad min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
