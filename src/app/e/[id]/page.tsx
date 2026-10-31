import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CalendarDays, MapPin } from "lucide-react";

import { SharedPage, clip, moment } from "@/components/shared-page";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";

type ChurchEvent = Schemas["PublicEvent"];

/** One read for the page and its preview. */
const load = cache(async (id: string): Promise<ChurchEvent | null> => {
  const result = await api<ChurchEvent>(`/public/events/${encodeURIComponent(id)}`, { auth: false });
  return result.ok ? result.data : null;
});

function when(e: ChurchEvent): string {
  if (e.is_all_day) return moment(e.start_date).replace(/,.*$/, "");
  const end = e.end_date ? moment(e.end_date) : null;
  // Same day: the end is only a time.
  if (end && end.split(",")[0] === moment(e.start_date).split(",")[0]) {
    return `${moment(e.start_date)} – ${end.split(", ")[1]}`;
  }
  return end ? `${moment(e.start_date)} – ${end}` : moment(e.start_date);
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const e = await load((await params).id);
  if (!e) return { title: "Event — Chapl" };
  const line = [when(e), e.location].filter(Boolean).join(" · ");
  const description = clip(e.description) ? `${line}. ${clip(e.description, 140)}` : line;
  return {
    title: `${e.title} — ${e.church.name}`,
    description,
    openGraph: {
      type: "website",
      siteName: e.church.name,
      title: e.title,
      description,
      url: `/e/${e.id}`,
      images: e.image_url ? [{ url: e.image_url }] : undefined,
    },
    twitter: { card: e.image_url ? "summary_large_image" : "summary", title: e.title, description, images: e.image_url ? [e.image_url] : undefined },
  };
}

/**
 * A shared event: what, when and where, for someone who may not have an
 * account. Registering and reminders are inside the product, so they are
 * what the way in offers.
 */
export default async function SharedEvent({ params }: { params: Promise<{ id: string }> }) {
  const e = await load((await params).id);
  if (!e) notFound();
  return (
    <SharedPage church={e.church.name} inApp={`/app/events/${e.id}`}>
      <p className="eyebrow text-violet">{e.church.name} · Event</p>
      <h1 className="head mt-3 text-balance text-[clamp(1.9rem,4.4vw,2.9rem)] text-ink">{e.title}</h1>

      {e.image_url && (
        // A church's own picture from wherever they keep it; not ours to optimise.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={e.image_url} alt="" className="mt-7 aspect-video w-full rounded-[12px] object-cover" />
      )}

      <dl className="mt-7 grid gap-3 text-[15px]">
        <div className="flex items-start gap-2.5">
          <dt className="sr-only">When</dt>
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden />
          <dd className="tnum text-ink">{when(e)}</dd>
        </div>
        {e.location && (
          <div className="flex items-start gap-2.5">
            <dt className="sr-only">Where</dt>
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-3" aria-hidden />
            <dd className="text-ink">{e.location}</dd>
          </div>
        )}
      </dl>
      {e.registration_required && (
        <p className="mt-4 text-[13px] text-ink-3">Registration is required. Sign in to register.</p>
      )}
      {e.description && (
        <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-ink">{e.description}</p>
      )}
    </SharedPage>
  );
}
