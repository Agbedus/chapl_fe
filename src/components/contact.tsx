import { Phone } from "lucide-react";

/**
 * A number you can act on.
 *
 * Everywhere a phone number appears in this product, somebody is looking
 * at it because they intend to ring. Printing it as text asks them to
 * read it, hold it in their head, and type it into another app — which is
 * how a name in a follow-up queue becomes a name still in the follow-up
 * queue next week.
 *
 * Two targets rather than a menu: **call** and **WhatsApp**. A menu would
 * hide one behind a click to save a few pixels, and these are the whole
 * point of the row. Both are ordinary links, so they open the phone's own
 * dialler and the user's own WhatsApp — nothing is sent from here, and
 * the message only ever leaves after they press send themselves.
 */

/** WhatsApp wants digits: no plus, no spaces, no dashes. */
function wa(number: string): string {
  return number.replace(/[^\d]/g, "");
}

/**
 * The brand glyph, inline.
 *
 * `lucide-react` has no WhatsApp icon — it ships no brand marks at all —
 * and a generic speech bubble beside a phone reads as "send an SMS",
 * which is a different app and a different cost to the person tapping it.
 */
export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 18.15h-.01a8.23 8.23 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 2.2 0 4.27.86 5.83 2.42a8.19 8.19 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.17c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.53.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.15.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.4-.42-.56-.43h-.47c-.17 0-.43.06-.66.31-.23.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.14-1.18-.06-.11-.22-.17-.47-.29Z" />
    </svg>
  );
}

export function PhoneLink({
  number,
  /** Prefilled for WhatsApp. The sender still presses send themselves. */
  message,
  /**
   * Name the WhatsApp action where it *is* the action.
   *
   * A bare icon is right beside a number somebody is reading anyway. It
   * is wrong on a birthday row, where sending the greeting is the entire
   * reason the row is on screen — an unlabelled 13px glyph asks the
   * reader to guess which of the two icons does the thing they came for.
   */
  actionLabel,
  /** Hide the digits and show only the two buttons — for a dense table. */
  compact,
  className = "",
}: {
  number: string | null;
  message?: string;
  actionLabel?: string;
  compact?: boolean;
  className?: string;
}) {
  if (!number) {
    return <span className="text-[11.5px] text-ink-3">—</span>;
  }

  const text = message ? `?text=${encodeURIComponent(message)}` : "";

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <a
        href={`tel:${number}`}
        title={`Call ${number}`}
        className="tnum inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-[11.5px]
                   text-ink-3 transition-colors duration-150 hover:bg-sunk hover:text-ink"
      >
        <Phone className="h-3 w-3 shrink-0" aria-hidden />
        {compact ? <span className="sr-only">Call {number}</span> : number}
      </a>

      {actionLabel ? (
        <a
          href={`https://wa.me/${wa(number)}${text}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm gap-1.5 border text-[11.5px] font-medium
                     transition-[transform,background-color,border-color] duration-150"
          style={{
            borderColor: "color-mix(in oklab, #25D366 35%, transparent)",
            background: "color-mix(in oklab, #25D366 10%, transparent)",
            color: "#128C4A",
          }}
        >
          <WhatsAppIcon className="h-[13px] w-[13px]" />
          {actionLabel}
        </a>
      ) : (
        <a
          href={`https://wa.me/${wa(number)}${text}`}
          target="_blank"
          rel="noopener noreferrer"
          title={`WhatsApp ${number}`}
          /* WhatsApp green only on hover — a brand colour sitting in a
             dense table permanently would pull rank on the church's own
             six hues, which are the ones carrying meaning here. */
          className="grid h-[22px] w-[22px] place-items-center rounded-md text-ink-3
                     transition-[color,background-color,transform] duration-150
                     hover:bg-sunk hover:text-[#25D366] active:scale-95"
        >
          <WhatsAppIcon className="h-[13px] w-[13px]" />
          <span className="sr-only">WhatsApp {number}</span>
        </a>
      )}
    </span>
  );
}
