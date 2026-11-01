import { Info as InfoIcon } from "lucide-react";

/**
 * A small "i" beside a figure or a heading: the explanation a page would
 * otherwise print under it, shown on hover, on focus, or on a tap (which
 * focuses it). Pure CSS, so it works in a server component.
 */
export function Info({ text }: { text: string }) {
  return (
    <span className="info" tabIndex={0} role="button" aria-label={`More about this: ${text}`}>
      <InfoIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      <span className="info-tip" role="tooltip" aria-hidden>
        {text}
      </span>
    </span>
  );
}
