import { RecordTable } from "@/components/record-table";
import { requireMe } from "@/lib/session";

type Row = {
  id: string;
  title: string;
  series: string | null;
  part: number | null;
  preacher_name: string | null;
  sermon_date: string;
  is_published: boolean;
};

export const metadata = { title: "Sermons — Chapl" };

export default async function SermonsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireMe("/app/sermons");
  return (
    <RecordTable<Row>
      eyebrow="Activity"
      title="Sermons"
      lede="The library, video and audio."
      path="/sermons/"
      searchParams={searchParams}
      empty="No sermons yet."
      columns={[
        { key: "title", label: "Title" },
        { key: "series", label: "Series" },
        { key: "part", label: "Part", align: "right" },
        { key: "preacher_name", label: "Preacher" },
        {
          key: "sermon_date",
          label: "Date",
          align: "right",
          render: (r) =>
            new Date(r.sermon_date).toLocaleDateString(undefined, {
              day: "2-digit", month: "short", year: "numeric",
            }),
        },
        { key: "is_published", label: "Published", render: (r) => (r.is_published ? "yes" : "no") },
      ]}
    />
  );
}
