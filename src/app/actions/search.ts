"use server";

import { api } from "@/lib/api";
import type { Branch, Church, Paged } from "@/lib/types";

export type Hit = {
  id: string;
  kind: "church" | "branch" | "cell" | "person";
  title: string;
  subtitle: string;
  href: string;
  tone: string;
};

type Cell = { id: string; name: string; code: string; branch_id: string };
type Person = { id: string; full_name: string; email: string };

/**
 * Search across the things a person can reach.
 *
 * The API has no search endpoint, so this pulls a bounded page of each
 * resource and filters here. That is honest for a few thousand rows and
 * wrong beyond it — a `q` parameter on the list endpoints is the fix when
 * this starts to feel slow, not a bigger limit.
 */
export async function search(term: string): Promise<Hit[]> {
  const needle = term.trim().toLowerCase();
  if (needle.length < 2) return [];

  const [churches, branches, cells, people] = await Promise.all([
    api<Paged<Church>>("/churches/?limit=50"),
    api<Paged<Branch>>("/branches/?limit=200"),
    api<Paged<Cell>>("/cells/?limit=300"),
    api<Paged<Person>>("/users/?limit=300"),
  ]);

  const hits: Hit[] = [];
  const matches = (...fields: (string | null | undefined)[]) =>
    fields.some((f) => f?.toLowerCase().includes(needle));

  if (churches.ok) {
    for (const c of churches.data.items) {
      if (matches(c.name, c.code, c.legal_name)) {
        hits.push({
          id: c.id,
          kind: "church",
          title: c.name,
          subtitle: `Church · ${c.code}`,
          href: `/app/church?id=${c.id}`,
          tone: "var(--cobalt)",
        });
      }
    }
  }

  if (branches.ok) {
    for (const b of branches.data.items) {
      if (matches(b.name, b.code, b.location)) {
        hits.push({
          id: b.id,
          kind: "branch",
          title: b.name,
          subtitle: `Branch · ${b.location ?? b.code}`,
          href: `/app/church`,
          tone: "var(--violet)",
        });
      }
    }
  }

  if (cells.ok) {
    for (const c of cells.data.items) {
      if (matches(c.name, c.code)) {
        hits.push({
          id: c.id,
          kind: "cell",
          title: c.name,
          subtitle: `Cell · ${c.code}`,
          href: `/app/church`,
          tone: "var(--teal)",
        });
      }
    }
  }

  if (people.ok) {
    for (const p of people.data.items) {
      if (matches(p.full_name, p.email)) {
        hits.push({
          id: p.id,
          kind: "person",
          title: p.full_name,
          subtitle: p.email,
          href: `/app/people`,
          tone: "var(--emerald)",
        });
      }
    }
  }

  // Whole-word starts first — "Grace" should beat "Disgraceful".
  return hits
    .sort((a, b) => {
      const aStarts = a.title.toLowerCase().startsWith(needle) ? 0 : 1;
      const bStarts = b.title.toLowerCase().startsWith(needle) ? 0 : 1;
      return aStarts - bStarts || a.title.localeCompare(b.title);
    })
    .slice(0, 24);
}
