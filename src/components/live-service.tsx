import Link from "next/link";
import { X } from "lucide-react";

import { answerPrompt, askRoom, checkIn, closePrompt } from "@/app/actions/manage";
import { ActionButton, AskRoomBox, CheckInBox, PromptAnswers } from "@/components/editors";
import { LiveRefresh } from "@/components/live-refresh";
import { Panel } from "@/components/panels";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";

type Live = Schemas["LiveService"];

/** `sunday` → `Sunday`. */
function weekday(day: string): string {
  return day.charAt(0).toUpperCase() + day.slice(1);
}

/**
 * The room, one dot a person: filled for everyone marked present, hollow
 * for everyone who belongs to this service and is not here yet. The
 * congregation field, live — it fills as people check in.
 */
export function RoomField({ present, expected }: { present: number; expected: number }) {
  const seats = Math.max(expected, present);
  // Past four hundred a dot stands for a few people, so the field stays
  // a field rather than a page of dust.
  const unit = Math.max(1, Math.ceil(seats / 400));
  const filled = Math.round(present / unit);
  const all = Math.round(seats / unit);
  return (
    <div>
      <p className="flex items-baseline gap-2">
        <span className="figure text-[28px] leading-none text-ink">{present}</span>
        <span className="text-[12px] text-ink-2">
          here{expected > 0 ? ` of ${expected}` : ""}
          {unit > 1 ? ` · one dot is ${unit}` : ""}
        </span>
      </p>
      <div
        className="mt-2 flex flex-wrap gap-[3px]"
        role="img"
        aria-label={`${present} of ${expected} in the room`}
        style={{ color: "var(--gold)" }}
      >
        {Array.from({ length: all }, (_, i) => (
          <span key={i} className={i < filled ? "dot" : "dot-hollow"} />
        ))}
      </div>
    </div>
  );
}

/**
 * A member's Sunday: on the dashboard while their service is open — their
 * branch's, or the whole church's when that is the one running. Check in,
 * watch the room fill, see the sermon, answer the question on the screen.
 * When nothing is open it renders nothing but still listens, so the panel
 * appears the moment a service opens.
 */
export async function SundayPanel() {
  const result = await api<Live | null>("/attendance/live");
  const live = result.ok ? result.data : null;
  if (!live) return <LiveRefresh prefix="service." fallback={300} />;
  const where = live.branch_name ?? "The whole church";
  return (
    <Panel
      title={`${weekday(live.service_day)} service · ${where}`}
      lede={live.checked_in ? "You are checked in. Welcome!" : "Type the code shown at church to check in."}
      accent="var(--gold)"
      aside={<Link href="/app/check-in" className="text-[11.5px] text-ink-3 hover:underline">More</Link>}
    >
      <LiveRefresh prefix="service." />
      <div className="grid gap-4">
        {!live.checked_in && <CheckInBox action={checkIn} />}
        <RoomField present={live.present ?? 0} expected={live.expected ?? 0} />
        {live.sermon && (
          <Link href={`/app/sermons/${live.sermon.id}`} className="sheet sheet-mist block hover:bg-[var(--sunk)]">
            <p className="eyebrow text-ruby">Today&rsquo;s message</p>
            <p className="mt-1 text-[13px] font-semibold text-ink">{live.sermon.title}</p>
            <p className="text-[12px] text-ink-2">
              {[live.sermon.scripture_reference, live.sermon.preacher_name].filter(Boolean).join(" · ")}
            </p>
          </Link>
        )}
        {live.prompt && <PromptAnswers action={answerPrompt} prompt={live.prompt} answering />}
      </div>
    </Panel>
  );
}

/**
 * One open service as the person running it sees it: the room filling,
 * the question to ask, and the answers coming in.
 */
export async function LeaderLive({ sessionId, canRun }: { sessionId: string; canRun: boolean }) {
  const result = await api<Live>(`/attendance/check-in/sessions/${sessionId}/live`);
  if (!result.ok) return null;
  const live = result.data;
  const prompt = live.prompt;
  return (
    <div className="mt-3 grid gap-4 border-t border-[var(--line)] pt-3">
      <RoomField present={live.present ?? 0} expected={live.expected ?? 0} />
      {prompt && (
        <div>
          <PromptAnswers action={answerPrompt} prompt={prompt} answering={false} />
          {canRun && prompt.is_open && (
            <div className="mt-2 flex justify-end">
              <ActionButton action={closePrompt} fields={{ id: prompt.id }} label="Close answers"
                            icon={<X className="h-3 w-3" aria-hidden />} />
            </div>
          )}
        </div>
      )}
      {canRun && live.is_open && <AskRoomBox action={askRoom} sessionId={live.session_id} />}
    </div>
  );
}
