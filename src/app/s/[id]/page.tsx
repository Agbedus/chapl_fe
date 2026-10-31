import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { BookOpen, ExternalLink } from "lucide-react";

import { SharedPage, clip, day } from "@/components/shared-page";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";

type Sermon = Schemas["PublicSermon"];

/** One read for the page and its preview. */
const load = cache(async (id: string): Promise<Sermon | null> => {
  const result = await api<Sermon>(`/public/sermons/${encodeURIComponent(id)}`, { auth: false });
  return result.ok ? result.data : null;
});

function byline(s: Sermon): string {
  return [
    s.preacher_name,
    day(s.sermon_date),
    s.series ? `${s.series}${s.part ? ` · Part ${s.part}` : ""}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** The cover a chat app shows: the sermon's own, else its video's. */
function cover(s: Sermon): string | undefined {
  if (s.thumbnail_url) return s.thumbnail_url;
  if (s.youtube_video_id) return `https://i.ytimg.com/vi/${encodeURIComponent(s.youtube_video_id)}/hqdefault.jpg`;
  return undefined;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const s = await load((await params).id);
  if (!s) return { title: "Sermon — Chapl" };
  const description = clip(s.description) ?? byline(s);
  const image = cover(s);
  return {
    title: `${s.title} — ${s.church.name}`,
    description,
    openGraph: {
      type: "article",
      siteName: s.church.name,
      title: s.title,
      description,
      url: `/s/${s.id}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: s.title, description, images: image ? [image] : undefined },
  };
}

/**
 * A shared sermon, for whoever the link was sent to. Watch or listen
 * without an account; the way into the church comes after it.
 */
export default async function SharedSermon({ params }: { params: Promise<{ id: string }> }) {
  const s = await load((await params).id);
  if (!s) notFound();
  return (
    <SharedPage church={s.church.name} inApp={`/app/sermons/${s.id}`}>
      <p className="eyebrow text-ruby">{s.church.name} · Sermon</p>
      <h1 className="head mt-3 text-balance text-[clamp(1.9rem,4.4vw,2.9rem)] text-ink">{s.title}</h1>
      <p className="mt-2 text-[14px] text-ink-3">{byline(s)}</p>

      {(s.youtube_video_id || s.audio_url || s.video_url) && (
        <div className="mt-7 grid gap-3">
          {s.youtube_video_id && (
            <div className="aspect-video overflow-hidden rounded-[12px] bg-[var(--sunk)]">
              <iframe
                className="h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(s.youtube_video_id)}`}
                title={s.title}
                allow="encrypted-media; picture-in-picture; fullscreen"
                loading="lazy"
              />
            </div>
          )}
          {s.audio_url && <audio controls preload="none" src={s.audio_url} className="w-full" />}
          {!s.youtube_video_id && s.video_url && (
            <a href={s.video_url} target="_blank" rel="noreferrer" className="btn btn-sm self-start">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Watch
            </a>
          )}
        </div>
      )}

      {s.scripture_reference && (
        <p className="mt-7 flex items-center gap-2 text-[14px] text-ink-2">
          <BookOpen className="h-4 w-4" aria-hidden /> {s.scripture_reference}
        </p>
      )}
      {s.description && (
        <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-ink">{s.description}</p>
      )}
    </SharedPage>
  );
}
