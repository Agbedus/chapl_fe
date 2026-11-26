/**
 * The full stop, as a person.
 *
 * The page's one signature: wherever a heading would end on a period, it
 * ends on the product's own mark instead, a single dot with a ring round
 * it, the same "one person" the story starts with and the logo's cross
 * rests on. It is the same glyph in every heading, so it reads as a
 * habit of the page and not as decoration on any one of them.
 *
 * It replaces the period rather than following it, and is hidden from
 * assistive tech, so a heading reads as the sentence it is.
 */
export function Stop() {
  return <span className="stop" aria-hidden />;
}

/**
 * A sentence whose closing full stop is drawn as `Stop`. The last word and
 * the stop are kept on one line: a ring wrapped onto a line of its own, on
 * a phone, reads as a stray mark rather than an ending.
 */
export function Stopped({ children }: { children: string }) {
  if (!children.endsWith(".")) return <>{children}</>;
  const body = children.slice(0, -1);
  const cut = body.lastIndexOf(" ") + 1;
  return (
    <>
      {body.slice(0, cut)}
      <span className="whitespace-nowrap">
        {body.slice(cut)}
        <Stop />
      </span>
    </>
  );
}
