import { ArrowUpRight, Globe, Mail, MapPin, Navigation, Phone } from "lucide-react";

import { PhoneLink } from "@/components/contact";
import { DotFigure } from "@/components/dot-figure";
import { Empty, Page, PageHead } from "@/components/panels";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";
import { currentChurchId, requireMe } from "@/lib/session";

export const metadata = { title: "Your church — Chapl" };

type Branch = Schemas["BranchAbout"];

/* ------------------------------------------------------------------ */
/* small helpers                                                       */
/* ------------------------------------------------------------------ */

/** A map search that opens the phone's maps app, by pin when there is one. */
function directions(place: { latitude?: number | null; longitude?: number | null; address?: string | null; location?: string | null }): string | null {
  const query =
    place.latitude != null && place.longitude != null
      ? `${place.latitude},${place.longitude}`
      : place.address ?? place.location;
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

/** "Grace Chapel" → "GC". */
function monogram(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^[A-Za-z]/.test(w))
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const DAY_NAMES: Record<string, (typeof DAYS)[number]> = {
  mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun",
};

/**
 * "Sun 8:00 & 10:30 · Wed 18:30" → { Sun: ["8:00", "10:30"], Wed: ["18:30"] }.
 *
 * Service times are typed by hand on the branch record, so this reads
 * what it can and gives up quietly: anything it cannot place is shown as
 * the text it was typed as.
 */
function week(text: string | null | undefined): { days: Map<string, string[]>; services: number } | null {
  if (!text) return null;
  const days = new Map<string, string[]>();
  for (const part of text.split(/\s*[·|;]\s*|\n/)) {
    const day = part.match(/^\s*(mon|tue|wed|thu|fri|sat|sun)[a-z]*\.?\s*/i);
    if (!day) return null;
    const key = DAY_NAMES[day[1].toLowerCase()];
    const times = part.slice(day[0].length).match(/\d{1,2}[:.]\d{2}\s*(?:am|pm)?|\d{1,2}\s*(?:am|pm)/gi) ?? [];
    days.set(key, [...(days.get(key) ?? []), ...times.map((t) => t.replace(".", ":").trim())]);
  }
  const services = [...days.values()].reduce((sum, t) => sum + Math.max(1, t.length), 0);
  return days.size ? { days, services } : null;
}

/** "18:30" → "6:30 pm"; a morning time stays as typed ("8:00" is not "8:00 pm"). */
function clock(time: string): string {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return time;
  const h = Number(m[1]);
  if (h < 12) return time;
  return `${h === 12 ? 12 : h - 12}:${m[2]} pm`;
}

/* ------------------------------------------------------------------ */
/* the page                                                            */
/* ------------------------------------------------------------------ */

/**
 * The church, for the people in it: who it is, where each branch meets
 * and when, and how to get there.
 *
 * It opens on the church itself (its mark, a line of who it is, what it
 * says about itself, and the size of it in the dots every figure here is
 * drawn in), then the ways to reach the office. Then where we meet: the
 * branches placed where they are, as dots on a field with the reader's
 * own ringed, beside one ruled list in the same order. Each branch's week
 * is drawn as seven days with the ones it meets on lit, so "is there a
 * midweek service near me" is answered by looking, not by reading six
 * lines of times.
 */
export default async function AboutChurchPage() {
  await requireMe("/app/about");
  const churchId = await currentChurchId();
  if (!churchId) {
    return (
      <Page>
        <PageHead title="No church chosen" lede="Choose a church to see where it meets." />
      </Page>
    );
  }
  const result = await api<Schemas["ChurchAbout"]>(`/churches/${churchId}/about`);
  if (!result.ok) {
    return (
      <Page>
        <PageHead title="Not available" lede={result.error.detail} />
      </Page>
    );
  }

  const c = result.data;
  const all = c.branches ?? [];
  const branches = [...all].sort(
    (a, b) => Number(b.id === c.my_branch_id) - Number(a.id === c.my_branch_id) || a.name.localeCompare(b.name),
  );
  const place = [c.city, c.country].filter(Boolean).join(", ");
  const founded = c.founded_date ? new Date(`${c.founded_date}T12:00:00`).getFullYear() : null;
  const services = branches.reduce((sum, b) => sum + (week(b.service_times)?.services ?? 0), 0);
  const office = directions(c);
  const pinned = branches.filter((b) => b.latitude != null && b.longitude != null);

  return (
    <Page>
      {/* ---------------- the church ---------------- */}
      <section className="sheet church-hero">
        <div className="church-id">
          {c.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element -- served by the API; no loader to configure
            <img src={c.logo_url} alt="" className="church-mark" />
          ) : (
            <span className="church-mark church-mark-letters" aria-hidden>
              {monogram(c.name)}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="head text-[26px] tracking-[-0.03em] sm:text-[30px]">{c.name}</h1>
            <p className="church-meta">
              {[c.denomination, place, founded ? `Since ${founded}` : null].filter(Boolean).map((bit) => (
                <span key={bit}>{bit}</span>
              ))}
            </p>
          </div>
        </div>

        <div className="church-body">
          <p className="church-about">
            {c.about ?? `${c.name} has not written about itself yet.`}
          </p>

          <dl className="church-stats">
            <div>
              <dd><DotFigure value={String(c.members ?? 0)} cell="3.2px" label={`${c.members ?? 0} members`} /></dd>
              <dt>members</dt>
            </div>
            <div>
              <dd><DotFigure value={String(all.length)} cell="3.2px" label={`${all.length} branches`} /></dd>
              <dt>{all.length === 1 ? "branch" : "branches"}</dt>
            </div>
            {services > 0 && (
              <div>
                <dd><DotFigure value={String(services)} cell="3.2px" label={`${services} services a week`} /></dd>
                <dt>services a week</dt>
              </div>
            )}
          </dl>
        </div>

        {(c.contact_phone || c.contact_email || c.website || c.address) && (
          <div className="church-reach">
            {c.contact_phone && (
              <a href={`tel:${c.contact_phone}`} className="church-link">
                <Phone className="h-3.5 w-3.5" aria-hidden />
                <span className="tnum">{c.contact_phone}</span>
              </a>
            )}
            {c.contact_email && (
              <a href={`mailto:${c.contact_email}`} className="church-link">
                <Mail className="h-3.5 w-3.5" aria-hidden />
                {c.contact_email}
              </a>
            )}
            {c.website && (
              <a href={c.website} target="_blank" rel="noreferrer" className="church-link">
                <Globe className="h-3.5 w-3.5" aria-hidden />
                {host(c.website)}
                <ArrowUpRight className="h-3 w-3 opacity-60" aria-hidden />
              </a>
            )}
            {c.address &&
              (office ? (
                <a href={office} target="_blank" rel="noreferrer" className="church-link">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {c.address}
                  <ArrowUpRight className="h-3 w-3 opacity-60" aria-hidden />
                </a>
              ) : (
                <span className="church-link">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {c.address}
                </span>
              ))}
          </div>
        )}
      </section>

      {/* ---------------- where we meet ---------------- */}
      <section className="sheet church-where">
        <div className="panel-head">
          <h2 className="panel-title">
            <span className="dot" style={{ color: "var(--violet)" }} aria-hidden />
            Where we meet
          </h2>
        </div>

        {branches.length === 0 ? (
          <Empty>No branches listed yet.</Empty>
        ) : (
          <div className={pinned.length >= 2 ? "church-split" : undefined}>
            {pinned.length >= 2 && <BranchField branches={pinned} mine={c.my_branch_id ?? null} />}

            <ul className="church-branches">
              {branches.map((b) => (
                <BranchRow key={b.id} branch={b} mine={b.id === c.my_branch_id} />
              ))}
            </ul>
          </div>
        )}
      </section>
    </Page>
  );
}

/* ------------------------------------------------------------------ */
/* the branches                                                        */
/* ------------------------------------------------------------------ */

function BranchRow({ branch: b, mine }: { branch: Branch; mine: boolean }) {
  const map = directions(b);
  const plan = week(b.service_times);
  return (
    <li className="church-branch" data-mine={mine ? "" : undefined}>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={`dot ${mine ? "church-ring" : ""}`} style={{ color: "var(--violet)" }} aria-hidden />
          <span className="text-[14px] font-semibold text-ink">{b.name}</span>
          {mine && <span className="church-chip">Your branch</span>}
        </p>
        {(b.address || b.location) && (
          <p className="mt-1 truncate pl-[15px] text-[12px] text-ink-3">{b.address ?? b.location}</p>
        )}
      </div>

      <div className="church-week">
        {plan ? (
          <>
            <span className="church-days" aria-hidden>
              {DAYS.map((d) => (
                <span key={d} data-on={plan.days.has(d) ? "" : undefined}>
                  {d[0]}
                </span>
              ))}
            </span>
            <span className="church-times">
              {[...plan.days.entries()]
                .sort((a, b) => DAYS.indexOf(a[0] as (typeof DAYS)[number]) - DAYS.indexOf(b[0] as (typeof DAYS)[number]))
                .map(([day, times]) => (
                  <span key={day}>
                    <span className="font-semibold text-ink">{day}</span> {times.map(clock).join(", ")}
                  </span>
                ))}
            </span>
          </>
        ) : (
          <span className="church-times">{b.service_times ?? "Times not listed"}</span>
        )}
      </div>

      <div className="church-actions">
        {b.contact_phone && <PhoneLink number={b.contact_phone} compact />}
        {map && (
          <a href={map} target="_blank" rel="noreferrer" className={`btn btn-sm ${mine ? "btn-primary" : "btn-quiet"}`}>
            <Navigation className="h-3.5 w-3.5" aria-hidden />
            Directions
          </a>
        )}
      </div>
    </li>
  );
}

/**
 * The branches where they are, drawn as the product's own dots.
 *
 * Not a map: a field the shape of the area the branches cover, each one a
 * dot at its place and named beside it, the reader's own ringed. Relative
 * position is the whole of what a member needs from it ("the one nearest
 * me"), and a tile map would be someone else's server on every visit for
 * streets nobody reads here. Each dot opens directions.
 */
function BranchField({ branches, mine }: { branches: Branch[]; mine: string | null }) {
  const lats = branches.map((b) => b.latitude!);
  const lngs = branches.map((b) => b.longitude!);
  const [minLat, maxLat] = [Math.min(...lats), Math.max(...lats)];
  const [minLng, maxLng] = [Math.min(...lngs), Math.max(...lngs)];
  const spanLat = maxLat - minLat || 0.01;
  const spanLng = maxLng - minLng || 0.01;
  // Rounded so the server and the browser write the same style.
  const at = (b: Branch) => ({
    left: `${Math.round((8 + ((b.longitude! - minLng) / spanLng) * 84) * 10) / 10}%`,
    top: `${Math.round((10 + (1 - (b.latitude! - minLat) / spanLat) * 78) * 10) / 10}%`,
  });
  return (
    <div className="church-field" role="img" aria-label={`Where the ${branches.length} branches are`}>
      {branches.map((b) => {
        const map = directions(b);
        const pos = at(b);
        const isMine = b.id === mine;
        const right = parseFloat(pos.left) > 70;
        return (
          <a
            key={b.id}
            href={map ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="church-pin"
            data-mine={isMine ? "" : undefined}
            data-right={right ? "" : undefined}
            style={pos}
            aria-label={`Directions to ${b.name}`}
          >
            <span className="church-pin-dot" aria-hidden />
            <span className="church-pin-name">{b.name}</span>
          </a>
        );
      })}
    </div>
  );
}
