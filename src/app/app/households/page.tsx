import Link from "next/link";

import { saveHousehold } from "@/app/actions/manage";
import { HouseholdEditor } from "@/components/editors";
import { Empty, Page, PageHead, Panel, StatCard } from "@/components/panels";
import { Notice } from "@/components/ui/form";
import { canWrite } from "@/lib/access";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";
import { requireMe } from "@/lib/session";
import type { Paged, Person } from "@/lib/types";

export const metadata = { title: "Households — Chapl" };

/**
 * Families.
 *
 * Off the branch and cell tree on purpose: a husband in one cell and a
 * wife in another are one household. `?q=` searches the family name and
 * the names of everyone in it, on the server.
 */
export default async function HouseholdsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const me = await requireMe("/app/households");
  const { q = "" } = await searchParams;
  const writer = canWrite(me, "user");

  const [list, people] = await Promise.all([
    api<Schemas["HouseholdList"]>(`/households/?limit=200${q ? `&q=${encodeURIComponent(q)}` : ""}`),
    writer ? api<Paged<Person>>("/users/?limit=2000&sort=full_name&order=asc") : Promise.resolve(null),
  ]);

  const items = list.ok ? list.data.items : [];
  const housed = items.reduce((n, h) => n + (h.members?.length ?? 0), 0);
  const options = (people?.ok ? people.data.items : []).map((p) => ({
    value: p.id,
    label: `${p.full_name} · ${p.email}`,
  }));

  return (
    <Page>
      <PageHead
        eyebrow="People"
        title="Households"
        action={writer ? <HouseholdEditor action={saveHousehold} people={options} /> : undefined}
      />

      {!list.ok && <Notice kind="error">{list.error.detail}</Notice>}

      <section className="grid gap-2 sm:grid-cols-3">
        <StatCard label="Households" value={String(list.ok ? list.data.total : 0)} colour="var(--cobalt)" footnote={q ? `matching “${q}”` : "on the books"} />
        <StatCard label="People in them" value={String(housed)} colour="var(--teal)" footnote="across those shown" />
        <StatCard
          label="Average size"
          value={items.length ? (housed / items.length).toFixed(1) : "—"}
          colour="var(--violet)"
          footnote="people per household"
        />
      </section>

      <Panel
        title="Every household"
        accent="var(--cobalt)"
        aside={
          <form className="flex items-center gap-2" action="/app/households">
            <input
              name="q"
              defaultValue={q}
              placeholder="Search a family or a name"
              className="h-8 rounded-full border border-line bg-paper px-3 text-[12px] text-ink placeholder:text-ink-3"
              aria-label="Search households"
            />
          </form>
        }
      >
        {items.length === 0 ? (
          <Empty>
            {q
              ? "No household matches that."
              : writer
                ? "No households yet. Add one, or import a spreadsheet with a household column from Everyone → Import."
                : "No households yet."}
          </Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((h) => (
              <li key={h.id}>
                <Link href={`/app/households/${h.id}`} className="sheet sheet-mist block transition-colors hover:bg-sunk">
                  <p className="text-[13px] font-semibold text-ink">{h.name}</p>
                  <p className="mt-0.5 text-[11.5px] text-ink-3">
                    {(h.members?.length ?? 0)} {(h.members?.length ?? 0) === 1 ? "person" : "people"}
                    {h.address ? ` · ${h.address}` : ""}
                  </p>
                  <p className="mt-1.5 truncate text-[12px] text-ink-2">
                    {(h.members ?? []).map((m) => m.full_name.split(" ")[0]).join(", ") || "Nobody yet"}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </Page>
  );
}
