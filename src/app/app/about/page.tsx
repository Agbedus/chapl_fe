import { Clock, ExternalLink, Globe, Mail, MapPin, Navigation } from "lucide-react";

import { PhoneLink } from "@/components/contact";
import { Empty, Page, PageHead, Panel } from "@/components/panels";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";
import { currentChurchId, requireMe } from "@/lib/session";

export const metadata = { title: "Your church — Chapl" };

type Branch = Schemas["BranchAbout"];

/** A map search that opens the phone's maps app, by pin when there is one. */
function directions(branch: Branch): string | null {
  const query =
    branch.latitude != null && branch.longitude != null
      ? `${branch.latitude},${branch.longitude}`
      : branch.address ?? branch.location;
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : null;
}

/** `https://gracechapel.org/` → `gracechapel.org`. */
function host(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * The church, for the people in it: where each branch meets, when, and
 * how to reach it. Your own branch comes first, because it is the one
 * you are looking for; the rest are the family you belong to.
 */
export default async function AboutChurchPage() {
  await requireMe("/app/about");
  const churchId = await currentChurchId();
  if (!churchId) {
    return (
      <Page>
        <PageHead eyebrow="Your church" title="No church chosen" lede="Choose a church to see where it meets." />
      </Page>
    );
  }
  const result = await api<Schemas["ChurchAbout"]>(`/churches/${churchId}/about`);
  if (!result.ok) {
    return (
      <Page>
        <PageHead eyebrow="Your church" title="Not available" lede={result.error.detail} />
      </Page>
    );
  }
  const c = result.data;
  const all = c.branches ?? [];
  const branches = [...all].sort(
    (a, b) => Number(b.id === c.my_branch_id) - Number(a.id === c.my_branch_id),
  );
  const place = [c.city, c.country].filter(Boolean).join(", ");
  const founded = c.founded_date ? new Date(`${c.founded_date}T12:00:00`).getFullYear() : null;

  return (
    <Page>
      <PageHead
        eyebrow="Your church"
        title={c.name}
        lede={[c.denomination, place, founded ? `since ${founded}` : null].filter(Boolean).join(" · ") || undefined}
      />

      <Panel accent="var(--violet)">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <div>
            {c.about ? (
              <p className="whitespace-pre-line text-[13px] leading-relaxed text-ink">{c.about}</p>
            ) : (
              <p className="text-[13px] text-ink-2">{c.name} has not written about itself yet.</p>
            )}
            <p className="mt-3 flex items-baseline gap-2">
              <span className="figure text-[22px] leading-none text-ink">{c.members ?? 0}</span>
              <span className="text-[12px] text-ink-2">
                members in {all.length} {all.length === 1 ? "branch" : "branches"}
              </span>
            </p>
          </div>
          <ul className="grid content-start gap-2 text-[12.5px]">
            {c.contact_phone && (
              <li><PhoneLink number={c.contact_phone} /></li>
            )}
            {c.contact_email && (
              <li>
                <a href={`mailto:${c.contact_email}`} className="inline-flex items-center gap-1.5 text-ink hover:underline">
                  <Mail className="h-3.5 w-3.5 text-ink-3" aria-hidden /> {c.contact_email}
                </a>
              </li>
            )}
            {c.website && (
              <li>
                <a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-ink hover:underline">
                  <Globe className="h-3.5 w-3.5 text-ink-3" aria-hidden /> {host(c.website)}
                </a>
              </li>
            )}
            {c.address && (
              <li className="inline-flex items-start gap-1.5 text-ink-2">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" aria-hidden /> {c.address}
              </li>
            )}
          </ul>
        </div>
      </Panel>

      <Panel title="Where we meet" accent="var(--violet)">
        {branches.length === 0 ? (
          <Empty>No branches listed yet.</Empty>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {branches.map((b) => {
              const map = directions(b);
              const mine = b.id === c.my_branch_id;
              return (
                <li key={b.id} className={`sheet sheet-mist ${mine ? "ring-1 ring-[var(--violet)]" : ""}`}>
                  <p className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <span className="dot" style={{ color: "var(--violet)" }} aria-hidden />
                    {b.name}
                    {mine && <span className="text-[11px] font-normal text-ink-3">· your branch</span>}
                  </p>
                  {(b.address || b.location) && (
                    <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-ink-2">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-ink-3" aria-hidden />
                      {b.address ?? b.location}
                    </p>
                  )}
                  {b.service_times && (
                    <p className="mt-1 flex items-start gap-1.5 text-[12px] text-ink-2">
                      <Clock className="mt-0.5 h-3 w-3 shrink-0 text-ink-3" aria-hidden />
                      {b.service_times}
                    </p>
                  )}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {map && (
                      <a href={map} target="_blank" rel="noreferrer" className="btn btn-sm btn-quiet">
                        <Navigation className="h-3.5 w-3.5" aria-hidden /> Directions
                        <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
                      </a>
                    )}
                    {b.contact_phone && <PhoneLink number={b.contact_phone} compact />}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </Page>
  );
}
