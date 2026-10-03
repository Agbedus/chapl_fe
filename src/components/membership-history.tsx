import { Panel } from "@/components/panels";
import type { Schemas } from "@/lib/generated/api";
import type { Branch, Cell } from "@/lib/types";

export function MembershipHistory({ changes, branches, cells }: {
  changes: Schemas["MembershipHistoryRead"][];
  branches: Branch[];
  cells: Cell[];
}) {
  if (!changes.length) return null;
  const branchNames = new Map(branches.map(b => [b.id, b.name]));
  const cellNames = new Map(cells.map(c => [c.id, c.name]));
  return <Panel title="Membership history" accent="var(--gold)">
    <ul className="space-y-2 text-[12px]">
      {changes.map(change => <li key={change.id}>
        {new Date(change.created_at).toLocaleDateString()} · {branchNames.get(String(change.after.branch_id)) ?? "Branch"}
        {change.after.cell_id ? ` / ${cellNames.get(String(change.after.cell_id)) ?? "Cell"}` : ""} · {String(change.after.status)}
      </li>)}
    </ul>
  </Panel>;
}
