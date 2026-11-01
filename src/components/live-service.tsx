import { LiveBoard } from "@/components/live-board";
import { LiveRefresh } from "@/components/live-refresh";
import { api } from "@/lib/api";
import type { Schemas } from "@/lib/generated/api";

type Live = Schemas["LiveService"];

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
 * A member's Sunday: on the dashboard while their service is open, their
 * branch's or the whole church's. It is the live board (`live-board.tsx`),
 * designed apart from the rest of the app because it is watched, not
 * worked through. When nothing is open it renders nothing but still
 * listens, so the board appears the moment a service opens.
 */
export async function SundayPanel() {
  const result = await api<Live | null>("/attendance/live");
  const live = result.ok ? result.data : null;
  if (!live) return <LiveRefresh prefix="service." fallback={300} />;
  return <LiveBoard live={live} leader={false} />;
}

/** One open service as the person running it sees it: the live board. */
export async function LeaderLive({ sessionId, canRun }: { sessionId: string; canRun: boolean }) {
  const result = await api<Live>(`/attendance/check-in/sessions/${sessionId}/live`);
  if (!result.ok) return null;
  return <LiveBoard live={result.data} leader canRun={canRun} sessionId={sessionId} />;
}
