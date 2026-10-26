"use server";

import { api } from "@/lib/api";
import type { Branch, Cell, Membership, Person } from "@/lib/types";

export type PersonCard =
  | {
      ok: true;
      name: string;
      avatar: string | null;
      email: string | null;
      phone: string | null;
      gender: string | null;
      dateOfBirth: string | null;
      branch: string | null;
      cell: string | null;
    }
  | { ok: false };

/**
 * The few facts a hover card shows about someone.
 *
 * Asked of the API as the viewer, so the API's scope decides what comes
 * back: a cell leader hovering over someone outside their cell gets the
 * same 403 they would get opening the page, and the card says nothing
 * more than the name the table already showed. Nothing here widens what
 * anybody can see.
 */
export async function personCard(id: string): Promise<PersonCard> {
  const person = await api<Person>(`/users/${encodeURIComponent(id)}`);
  if (!person.ok) return { ok: false };
  const p = person.data;

  const placement = await api<Membership>(`/users/${encodeURIComponent(id)}/membership`);
  const m = placement.ok ? placement.data : null;
  const [branch, cell] = await Promise.all([
    m?.branch_id ? api<Branch>(`/branches/${m.branch_id}`) : Promise.resolve(null),
    m?.cell_id ? api<Cell>(`/cells/${m.cell_id}`) : Promise.resolve(null),
  ]);

  return {
    ok: true,
    name: p.full_name,
    avatar: p.avatar_url ?? null,
    email: p.email ?? null,
    phone: p.phone_number ?? null,
    gender: p.gender ?? null,
    dateOfBirth: p.date_of_birth ?? null,
    branch: branch?.ok ? branch.data.name : null,
    cell: cell?.ok ? cell.data.name : null,
  };
}
