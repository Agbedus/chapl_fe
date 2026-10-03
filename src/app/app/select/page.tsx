import { chooseChurch } from "@/app/actions/auth";
import { api } from "@/lib/api";
import { requireMe } from "@/lib/session";
import type { Church, Paged } from "@/lib/types";
import { Page, PageHead } from "@/components/panels";

export default async function SelectPage() {
  const me = await requireMe("/app/select");
  const result = await api<Paged<Church>>("/churches/?limit=500");
  return <Page><PageHead title="Choose a church" eyebrow="Church" />
    <div className="sheet space-y-2">
      {me.is_platform_staff && <form action={chooseChurch.bind(null, "all")}><button className="btn btn-quiet">All churches</button></form>}
      {result.ok ? result.data.items.map((church) => <form key={church.id} action={chooseChurch.bind(null, church.id)}><button className="btn btn-quiet">{church.name} · {church.status}</button></form>) : <p>{result.error.detail}</p>}
    </div>
  </Page>;
}
