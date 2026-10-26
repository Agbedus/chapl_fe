import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { importPeople } from "@/app/actions/people-import";
import { Page, PageHead, Panel } from "@/components/panels";
import { PeopleImport } from "@/components/people-import";
import { Notice } from "@/components/ui/form";
import { canWrite } from "@/lib/access";
import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import type { Branch, Paged } from "@/lib/types";

export const metadata = { title: "Import people — Chapl" };

/** Bringing an existing roll in from a spreadsheet. */
export default async function ImportPage() {
  const me = await requireMe("/app/people/import");
  const branches = await api<Paged<Branch>>("/branches/?limit=200&sort=name&order=asc");

  return (
    <Page>
      <PageHead
        eyebrow="People"
        title="Import people"
        action={
          <Link href="/app/people" className="btn btn-quiet btn-sm">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Everyone
          </Link>
        }
      />
      {!canWrite(me, "user") ? (
        <Notice kind="info">Importing people needs a church administrator.</Notice>
      ) : (
        <>
          <Panel
            title="Your spreadsheet"
            lede="Save it as CSV. Each row needs a name and an email; branch and cell are matched by name."
            accent="var(--cobalt)"
          >
            <PeopleImport
              action={importPeople}
              branches={(branches.ok ? branches.data.items : []).map((b) => ({ value: b.id, label: b.name }))}
            />
          </Panel>
          <Panel title="Good to know" accent="var(--ink-3)" quiet>
            <ul className="list-disc space-y-1 pl-5 text-[12.5px] leading-[1.6] text-ink-2">
              <li>Dates can be written 25/12/1980 or 1980-12-25.</li>
              <li>Rows with the same <strong>household</strong> become one family; use <strong>household_role</strong> for head, spouse or child.</li>
              <li>Someone already in the church is matched by email. Only their empty details are filled in, so importing twice is safe.</li>
              <li>New people cannot sign in until they set a password. Tick the email option, or send invitations later.</li>
            </ul>
          </Panel>
        </>
      )}
    </Page>
  );
}
