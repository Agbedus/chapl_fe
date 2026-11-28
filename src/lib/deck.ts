import type { PresentationStyle } from "@/lib/presentation";

/**
 * One message between a leader's own devices while a service is
 * presented: the phone remote's commands to the screen, and the screen's
 * position back to the remote. Posted to this app's `/api/deck`, which
 * passes it to the API on the leader's own channel.
 */
export type DeckSignal = {
  action: "next" | "prev" | "first" | "last" | "goto" | "blank" | "end" | "state" | "hello" | "style" | "screen" | "rename" | "resume" | "undo";
  slide?: number;
  blank?: boolean;
  titles?: string[];
  style?: Partial<PresentationStyle>;
  screenId?: string;
  serviceKey?: string;
  name?: string;
  presenting?: boolean;
  resumeSlide?: number;
  canUndo?: boolean;
};

export type DeckMessage = Omit<DeckSignal, "action"> & { type?: `deck.${DeckSignal["action"]}` | "connected" | "ready" | "resync" | "disconnected" };

export async function sendDeck(signal: DeckSignal): Promise<boolean> {
  try {
    const response = await fetch("/api/deck", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(signal),
      keepalive: true,
    });
    return response.ok;
  } catch {
    return false;
  }
}
