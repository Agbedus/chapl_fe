import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, UserMinus } from "lucide-react";

import {
  addToHousehold, deleteHousehold, removeFromHousehold, saveHousehold,
} from "@/app/actions/manage";
import { PhoneLink } from "@/components/contact";
import {
  ActionButton, HouseholdEditor, HouseholdMemberEditor,
} from "@/components/editors";
import { Detail, Empty, Page, PageHead, Panel } from "@/components/panels";
import { Notice } from "@/components/ui/form";
import { canWrite } from "@/lib/access";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";
import { requireMe } from "@/lib/session";
import type { Paged, Person } from "@/lib/types";
import { PersonLink } from "@/components/person";

export const metadata = { title: "Household — Chapl" };

const ROLE: Record<string, string> = {
  head: "Head of household",
  spouse: "Spouse",
  child: "Child",
  relative: "Relative",
  other: "Other",
};

function ageOf(dob: string | null | undefined): string | null {
  if (!dob) return null;
  const born = new Date(`${dob}T12:00:00`);
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) years -= 1;
  return `${years}`;
}

/** One household, and the controls to change who is in it. */
export default async function HouseholdPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireMe("/app/households");
  const { id } = await params;
  const writer = canWrite(me, "user");

  const [result, people] = await Promise.all([
    api<Schemas["HouseholdRead"]>(`/households/${id}`),
    writer ? api<Paged<Person>>("/users/?limit=2000&sort=full_name&order=asc") : Promise.resolve(null),
  ]);

  if (!result.ok) {
    if (result.error.status === 404) notFound();
    return (
      <Page>
        <PageHead eyebrow="Household" title="Not available" />
        <Notice kind="error">{result.error.detail}</Notice>
      </Page>
    );
  }

  const household = result.data;
  const members = household.members ?? [];
  const here = new Set(members.map((m) => m.user_id));
  const candidates = (people?.ok ? people.data.items : [])
    .filter((p) => !here.has(p.id))
    .map((p) => ({ value: p.id, label: `${p.full_name} · ${p.email}` }));

  return (
    <Page>
      <PageHead
        eyebrow="Household"
        title={household.name}
        lede={`${members.length} ${members.length === 1 ? "person" : "people"}`}
        action={
          <span className="flex flex-wrap items-center gap-2">
            <Link href="/app/households" className="btn btn-quiet btn-sm">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              All households
            </Link>
            {writer && (
              <>
                <HouseholdMemberEditor action={addToHousehold} householdId={household.id} candidates={candidates} />
                <HouseholdEditor
                  action={saveHousehold}
                  household={{
                    id: household.id,
                    name: household.name,
                    address: household.address ?? null,
                    phone_number: household.phone_number ?? null,
                    notes: household.notes ?? null,
                  }}
                />
              </>
            )}
          </span>
        }
      />

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <Panel title="Who lives here" accent="var(--cobalt)">
          {members.length === 0 ? (
            <Empty>Nobody yet. Add the people who live here.</Empty>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {members.map((m) => (
                <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                  <span className="min-w-0">
                    <PersonLink id={m.user_id} name={m.full_name} avatar={m.avatar_url}
                                className="text-[13px] font-medium text-ink hover:underline" />
                    <span className="ml-2 text-[11.5px] text-ink-3">
                      {ROLE[m.role] ?? m.role}
                      {ageOf(m.date_of_birth) ? ` · ${ageOf(m.date_of_birth)}` : ""}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    {m.phone_number && <PhoneLink number={m.phone_number} compact />}
                    {writer && (
                      <ActionButton
                        action={removeFromHousehold}
                        fields={{ household_id: household.id, user_id: m.user_id }}
                        label=""
                        icon={<UserMinus className="h-3 w-3" aria-hidden />}
                        tone="danger"
                        confirm={`Take ${m.full_name} out of ${household.name}?`}
                      />
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Home" accent="var(--teal)" quiet>
          <Detail label="Address" value={household.address || "—"} />
          <Detail label="Home phone" value={household.phone_number || "—"} />
          {household.notes && <p className="mt-2 text-[12px] leading-[1.6] text-ink-2">{household.notes}</p>}
          {writer && (
            <div className="mt-3">
              <ActionButton
                action={deleteHousehold}
                fields={{ id: household.id }}
                label="Dissolve household"
                icon={<Trash2 className="h-3 w-3" aria-hidden />}
                tone="danger"
                confirm={`Dissolve ${household.name}? The people stay on the roll.`}
              />
            </div>
          )}
        </Panel>
      </div>
    </Page>
  );
}
