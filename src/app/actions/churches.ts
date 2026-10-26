"use server";

import { api } from "@/lib/api";
import { getMe } from "@/lib/session";
import type { Church, Paged } from "@/lib/types";

export type ChurchOption = { id: string; name: string; status: string | null };

/**
 * The churches this person can switch to, for the switcher.
 *
 * Asked when the switcher opens rather than on every page render: for
 * platform staff it is every church on the platform, and the layout has
 * no business fetching five hundred names to draw a sidebar.
 */
export async function listChurches(): Promise<{ all: boolean; items: ChurchOption[] }> {
  const me = await getMe();
  if (!me) return { all: false, items: [] };
  if (me.is_platform_staff) {
    const result = await api<Paged<Church>>("/churches/?limit=1000&sort=name&order=asc", { churchId: "all" });
    return {
      all: true,
      items: result.ok
        ? result.data.items.map((c) => ({ id: c.id, name: c.name, status: c.status ?? null }))
        : [],
    };
  }
  return {
    all: false,
    items: (me.churches ?? []).map((c) => ({ id: c.id, name: c.name, status: c.status ?? null })),
  };
}
