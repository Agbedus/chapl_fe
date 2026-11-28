import type { PresentationStyle } from "@/lib/presentation";

/**
 * One message between a service's screens and remotes while it is
 * presented: the remote's commands to the screen, and the screen's
 * position back to the remote. Posted to this app's `/api/deck`, which
 * passes it to the API on the service's channel (or, with no service,
 * the sender's own).
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
  /**
   * The service the deck belongs to. Given, the signal goes on that
   * service's channel — every screen and remote of the people who could
   * run it — and the API refuses anyone who could not. Left out, it stays
   * on the sender's own devices.
   */
  sessionId?: string;
};

export type DeckMessage = Omit<DeckSignal, "action" | "sessionId"> & {
  type?: `deck.${DeckSignal["action"]}` | "connected" | "ready" | "resync" | "disconnected";
  /** Set by the API on a service's channel: which service, and who sent it. */
  session_id?: string;
  sender_id?: string;
};

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
