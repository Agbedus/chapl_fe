/**
 * One message between a leader's own devices while a service is
 * presented: the phone remote's commands to the screen, and the screen's
 * position back to the remote. Posted to this app's `/api/deck`, which
 * passes it to the API on the leader's own channel.
 */
export type DeckSignal = {
  action: "next" | "prev" | "first" | "last" | "goto" | "blank" | "end" | "state" | "hello";
  slide?: number;
  blank?: boolean;
  titles?: string[];
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
