import Link from "next/link";
import { BookOpen, ExternalLink } from "lucide-react";

import { toggleSavedSermon } from "@/app/actions/manage";
import { SaveSermonButton } from "@/components/editors";
import { Page, PageHead, Panel } from "@/components/panels";
import { ShareButton } from "@/components/share-button";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";
import { requireMe } from "@/lib/session";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const metadata = { title: "Sermon — Chapl" };

/**
 * One sermon: watch or listen, the passage, the notes, keep it, pass it
 * on. It is also where a shared link lands — from the phone or from here
 * — so it has to stand on its own without the list beside it.
 */
export default async function SermonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireMe(`/app/sermons/${id}`);
  const [result, savedIds] = await Promise.all([
    api<Schemas["SermonRead"]>(`/sermons/${encodeURIComponent(id)}`),
    api<{ items: string[] }>("/sermons/saved/ids"),
  ]);
  if (!result.ok) {
    return (
      <Page>
        <PageHead eyebrow="Worship" title="Sermon unavailable" lede={result.error.detail} />
      </Page>
    );
  }
  const s = result.data;
  const saved = savedIds.ok && savedIds.data.items.includes(s.id);
  const d = new Date(`${s.sermon_date.slice(0, 10)}T12:00:00`);
  const when = `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  const byline = [s.preacher_name, when, s.series ? `${s.series}${s.part ? ` · Part ${s.part}` : ""}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <Page>
      <Link href="/app/sermons" className="text-[12px] text-ink-3 hover:underline">All sermons</Link>
      <PageHead
        eyebrow="Worship"
        title={s.title}
        lede={byline}
        action={
          <div className="flex items-center gap-2">
            <SaveSermonButton action={toggleSavedSermon} id={s.id} saved={saved} />
            <ShareButton title={s.title} text={byline} path={`/app/sermons/${s.id}`} />
          </div>
        }
      />

      {(s.youtube_video_id || s.audio_url || s.video_url) && (
        <Panel accent="var(--ruby)">
          <div className="grid gap-3">
            {s.youtube_video_id && (
              <div className="aspect-video overflow-hidden rounded-[10px] bg-[var(--sunk)]">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(s.youtube_video_id)}`}
                  title={s.title}
                  allow="encrypted-media; picture-in-picture; fullscreen"
                  loading="lazy"
                />
              </div>
            )}
            {s.audio_url && (
              // Native controls: the one media control every browser
              // already makes keyboard- and screen-reader-ready.
              <audio controls preload="none" src={s.audio_url} className="w-full" />
            )}
            {!s.youtube_video_id && s.video_url && (
              <a href={s.video_url} target="_blank" rel="noreferrer" className="btn btn-sm self-start">
                <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Watch
              </a>
            )}
          </div>
        </Panel>
      )}

      {(s.scripture_reference || s.description || s.notes_url) && (
        <Panel title="The message" accent="var(--ruby)">
          {s.scripture_reference && (
            <p className="flex items-center gap-1.5 text-[12.5px] text-ink-2">
              <BookOpen className="h-3.5 w-3.5" aria-hidden /> {s.scripture_reference}
            </p>
          )}
          {s.description && (
            <p className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-ink">{s.description}</p>
          )}
          {s.notes_url && (
            <a href={s.notes_url} target="_blank" rel="noreferrer" className="btn btn-sm btn-quiet mt-3">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Open the notes
            </a>
          )}
        </Panel>
      )}
    </Page>
  );
}
