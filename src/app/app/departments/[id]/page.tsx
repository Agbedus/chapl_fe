import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, UserMinus } from "lucide-react";

import { addToRoster, removeFromRoster, saveDepartment } from "@/app/actions/manage";
import { PhoneLink } from "@/components/contact";
import { DataTable, type TableColumn, type TableRow } from "@/components/data-table";
import {
  ActionButton, DepartmentEditor, RosterEditor,
} from "@/components/editors";
import { Detail, DotRow, Page, PageHead, Panel, StatCard } from "@/components/panels";
import { Notice } from "@/components/ui/form";
import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import type { Branch, Department, Paged, Person } from "@/lib/types";

type Server = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role_in_department: string | null;
  joined_date: string | null;
};

export const metadata = { title: "Department — Chapl" };

/**
 * One team, and who is on it.
 *
 * The roster was the half of departments that could be counted and read
 * and never changed — `department_memberships` had a route to list it,
 * a route to count it, and no way to add the next person. So this page
 * is mostly the two controls that were missing.
 */
export default async function DepartmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireMe("/app/departments");
  const { id } = await params;

  const [department, roster, branches, people] = await Promise.all([
    api<Department>(`/departments/${id}`),
    api<Paged<Server>>(`/departments/${id}/members?limit=300`),
    api<Paged<Branch>>("/branches/?limit=200&sort=name&order=asc"),
    api<Paged<Person>>("/users/?limit=2000&sort=full_name&order=asc"),
  ]);

  if (!department.ok) {
    if (department.error.status === 404) notFound();
    return (
      <Page>
        <PageHead eyebrow="Church" title="Department" />
        <Notice kind="error">{department.error.detail}</Notice>
      </Page>
    );
  }

  const team = department.data;
  const serving = roster.ok ? roster.data.items : [];
  const onTeam = new Set(serving.map((s) => s.user_id));
  const branchName = new Map(
    branches.ok ? branches.data.items.map((b) => [b.id, b.name]) : [],
  );
  const contact = new Map(
    people.ok ? people.data.items.map((p) => [p.id, p.phone_number]) : [],
  );

  // Only people not already serving. Offering the whole directory means
  // offering forty names the API will answer with a 409.
  const candidates = (people.ok ? people.data.items : [])
    .filter((p) => !onTeam.has(p.id))
    .map((p) => ({ value: p.id, label: `${p.full_name} · ${p.email}` }));

  const branchOptions = (branches.ok ? branches.data.items : []).map((b) => ({
    value: b.id,
    label: b.name,
  }));

  const columns: TableColumn[] = [
    { key: "name", label: "Person" },
    { key: "role", label: "What they do" },
    { key: "phone", label: "Reach them" },
    { key: "since", label: "Since", align: "right" },
    { key: "remove", label: "", align: "right", width: "1%" },
  ];

  const rows: TableRow[] = serving.map((person) => ({
    id: person.id,
    cells: [
      <Link
        key="n"
        href={`/app/people/${person.user_id}`}
        className="font-medium text-ink hover:underline"
      >
        {person.full_name}
      </Link>,
      person.role_in_department ? (
        <span key="r" className="chip capitalize" style={{ color: "var(--emerald)" }}>
          {person.role_in_department}
        </span>
      ) : (
        <span key="r" className="text-ink-3">—</span>
      ),
      contact.get(person.user_id) ? (
        <PhoneLink key="p" number={contact.get(person.user_id) as string} compact />
      ) : (
        <span key="p" className="text-[11.5px] text-ink-3">{person.email}</span>
      ),
      person.joined_date ? (
        <span key="s" className="text-[11.5px] tabular-nums text-ink-2">
          {new Date(person.joined_date).toLocaleDateString("en-GB", {
            month: "short", year: "numeric",
          })}
        </span>
      ) : (
        <span key="s" className="text-ink-3">—</span>
      ),
      <ActionButton
        key="x"
        action={removeFromRoster}
        fields={{ department_id: id, user_id: person.user_id }}
        label=""
        icon={<UserMinus className="h-3 w-3" aria-hidden />}
        tone="danger"
        confirm={`Take ${person.full_name} off ${team.name}?`}
      />,
    ],
  }));

  const leads = serving.filter((s) => s.role_in_department === "lead").length;

  return (
    <Page>
      <PageHead
        eyebrow="Department"
        title={team.name}
        lede={team.description ?? "No description yet."}
        action={
          <span className="flex items-center gap-2">
            <Link href="/app/departments" className="btn btn-quiet btn-sm">
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              All teams
            </Link>
            <DepartmentEditor
              action={saveDepartment}
              department={{
                id: team.id,
                name: team.name,
                description: team.description,
                branch_id: team.branch_id,
                meeting_day: team.meeting_day,
                meeting_time: team.meeting_time,
                is_active: team.is_active,
              }}
              branches={branchOptions}
            />
            <RosterEditor action={addToRoster} departmentId={id} candidates={candidates} />
          </span>
        }
      />

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Serving" value={String(serving.length)} colour="var(--emerald)"
                  footnote={leads ? `${leads} leading` : "nobody named as lead"} />
        <StatCard
          label="Scope"
          value={team.branch_id ? (branchName.get(team.branch_id) ?? "One branch") : "Church"}
          colour="var(--violet)"
          footnote={team.branch_id ? "one site" : "draws from every branch"}
        />
        <StatCard
          label="Meets"
          value={team.meeting_day ? team.meeting_day.slice(0, 3) : "—"}
          colour="var(--teal)"
          footnote={team.meeting_time?.slice(0, 5) ?? "no time set"}
        />
        <StatCard label="Status" value={team.is_active ? "Active" : "Disbanded"}
                  colour={team.is_active ? "var(--emerald)" : "var(--ruby)"}
                  footnote={team.is_active ? "serving now" : "no longer meeting"} />
      </section>

      <div className="grid gap-2 lg:grid-cols-[1fr_320px]">
        <Panel
          title="The roster"
          lede={`${serving.length} ${serving.length === 1 ? "person" : "people"} · one dot is one of them`}
          accent="var(--emerald)"
          aside={<DotRow total={serving.length} colour="var(--emerald)" cap={24} />}
        >
          <DataTable
            columns={columns}
            rows={rows}
            empty="Nobody on this team yet. Add someone to start the roster."
          />
        </Panel>

        <Panel title="The team" accent="var(--emerald)">
          <dl>
            <Detail label="Name" value={team.name} />
            <Detail
              label="Branch"
              value={team.branch_id ? branchName.get(team.branch_id) : "Whole church"}
            />
            <Detail
              label="Meets on"
              value={
                team.meeting_day ? (
                  <span className="flex items-center justify-end gap-1.5 capitalize">
                    <CalendarDays className="h-3 w-3 text-ink-3" aria-hidden />
                    {team.meeting_day}
                  </span>
                ) : null
              }
            />
            <Detail
              label="Time"
              value={
                team.meeting_time ? (
                  <span className="flex items-center justify-end gap-1.5">
                    <Clock className="h-3 w-3 text-ink-3" aria-hidden />
                    {team.meeting_time.slice(0, 5)}
                  </span>
                ) : null
              }
            />
            <Detail label="Description" value={team.description} />
          </dl>
        </Panel>
      </div>
    </Page>
  );
}
