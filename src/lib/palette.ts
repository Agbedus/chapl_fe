/**
 * Colour decisions shared by the charts and the prose around them.
 *
 * This lives outside `components/charts.tsx` deliberately. That file is a
 * client module, and every export of a client module becomes a client
 * reference — a server component that calls one gets "not possible to
 * invoke a client function from the server" at render time rather than at
 * build time. A branch's turnout colour has to agree between the map and
 * the list beside it, and the list is server-rendered.
 */

/** The stained-glass palette, in the order categorical charts cycle it. */
export const PALETTE = [
  "var(--cobalt)",
  "var(--violet)",
  "var(--teal)",
  "var(--emerald)",
  "var(--gold)",
  "var(--ruby)",
];

/** Good, watch it, call someone. The thresholds are the same everywhere. */
export function turnoutColour(turnout: number): string {
  if (turnout >= 70) return "var(--emerald)";
  if (turnout >= 50) return "var(--gold)";
  return "var(--ruby)";
}
