import { saveSermon } from "@/app/actions/manage";
import { SermonEditor } from "@/components/editors";
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
  searchParams: Promise<{ page?: string }>;
}) {
  const me = await requireMe("/app/sermons");
  const writer = canWrite(me, "sermon");
  const branchList = writer ? await api<Paged<Branch>>("/branches/?limit=200&sort=name&order=asc") : null;
  const branches = (branchList?.ok ? branchList.data.items : []).map((b) => ({ value: b.id, label: b.name }));

  return (
    <RecordTable<Row>
      eyebrow="Worship"
      title="Sermons"
      lede="The library, video and audio."
      path="/sermons/?sort=sermon_date&order=desc"
      searchParams={searchParams}
      empty={writer ? "No sermons yet. Add the last one preached." : "No sermons yet."}
      action={writer ? <SermonEditor action={saveSermon} branches={branches} /> : undefined}
      columns={[
        {
          key: "title",
          label: "Title",
          render: (r) => {
            const link = r.video_url ?? r.audio_url;
            return link ? (
              <a href={link} target="_blank" rel="noreferrer" className="font-medium text-ink hover:underline">
                {r.title}
              </a>
            ) : (
              r.title
            );
          },
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
        { key: "is_published", label: "Published", render: (r) => (r.is_published ? "yes" : "draft") },
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
