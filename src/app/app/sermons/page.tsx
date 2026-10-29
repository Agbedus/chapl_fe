import Link from "next/link";

import { saveSermon, toggleSavedSermon } from "@/app/actions/manage";
import { SaveSermonButton, SermonEditor } from "@/components/editors";
import { RecordTable } from "@/components/record-table";
import { canWrite } from "@/lib/access";
import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import type { Branch, Paged } from "@/lib/types";

type Row = {
  id: string;
  title: string;
  series: string | null;
  part: number | null;
  preacher_name: string | null;
  sermon_date: string;
  scripture_reference: string | null;
  description: string | null;
  branch_id: string | null;
  video_url: string | null;
  audio_url: string | null;
  is_published: boolean;
};

export const metadata = { title: "Sermons — Chapl" };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function SermonsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; saved?: string }>;
}) {
  const me = await requireMe("/app/sermons");
  const writer = canWrite(me, "sermon");
  const onlySaved = (await searchParams).saved === "1";
  const [branchList, savedIds] = await Promise.all([
    writer ? api<Paged<Branch>>("/branches/?limit=200&sort=name&order=asc") : Promise.resolve(null),
    api<{ items: string[] }>("/sermons/saved/ids"),
  ]);
  const branches = (branchList?.ok ? branchList.data.items : []).map((b) => ({ value: b.id, label: b.name }));
  const saved = new Set(savedIds.ok ? savedIds.data.items : []);

  // All of them, or the ones you kept: two links rather than a filter
  // form, because it is one question with two answers.
  const views = (
    <div className="flex items-center gap-1 text-[12px]" role="tablist" aria-label="Which sermons">
      {[
        { href: "/app/sermons", label: "All", on: !onlySaved },
        { href: "/app/sermons?saved=1", label: `Saved${saved.size ? ` · ${saved.size}` : ""}`, on: onlySaved },
      ].map((view) => (
        <Link key={view.href} href={view.href} role="tab" aria-selected={view.on}
              className={`btn btn-sm ${view.on ? "btn-quiet font-semibold" : "text-ink-3 hover:text-ink"}`}>
          {view.label}
        </Link>
      ))}
    </div>
  );

  return (
    <RecordTable<Row>
      eyebrow="Worship"
      title="Sermons"
      path={onlySaved ? "/sermons/saved" : "/sermons/?sort=sermon_date&order=desc"}
      searchParams={searchParams}
      empty={
        onlySaved
          ? "Nothing saved yet. Save a sermon to come back to it."
          : writer ? "No sermons yet. Add the last one preached." : "No sermons yet."
      }
      action={
        <div className="flex flex-wrap items-center gap-2">
          {views}
          {writer && <SermonEditor action={saveSermon} branches={branches} />}
        </div>
      }
      columns={[
        {
          key: "title",
          label: "Title",
          render: (r) => (
            <span className="flex items-center gap-1.5">
              <SaveSermonButton action={toggleSavedSermon} id={r.id} saved={saved.has(r.id)} compact />
              <Link href={`/app/sermons/${r.id}`} className="font-medium text-ink hover:underline">
                {r.title}
              </Link>
            </span>
          ),
        },
        { key: "series", label: "Series" },
        { key: "part", label: "Part", align: "right" },
        { key: "preacher_name", label: "Preacher" },
        {
          key: "sermon_date",
          label: "Date",
          align: "right",
          render: (r) => {
            const d = new Date(`${r.sermon_date.slice(0, 10)}T12:00:00`);
            return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
          },
        },
        ...(writer
          ? [{ key: "is_published" as const, label: "Published", render: (r: Row) => (r.is_published ? "yes" : "draft") }]
          : []),

        ...(writer
          ? [{
              key: "id" as const,
              label: "",
              render: (r: Row) => <SermonEditor action={saveSermon} branches={branches} sermon={r} />,
            }]
          : []),
      ]}
    />
  );
}
