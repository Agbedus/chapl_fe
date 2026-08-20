import { DotCross } from "@/components/dot-cross";

/**
 * The verse the whole product is an argument for.
 *
 * "One body, and every one members one of another" is not decoration
 * bolted onto a church CRM — it is the thesis of the software. The
 * hierarchy is church → branch → cell → person precisely because the
 * whole and the individual are both supposed to be legible at once, and
 * that is what this sentence says.
 *
 * **Romans 12:5, King James Version** — chosen for the cadence, and
 * because it is public domain. A modern translation would read more
 * plainly and would also be somebody's copyright.
 *
 * It gets a section to itself and nothing else in it. A verse squeezed
 * into a corner of a feature grid reads as a sticker; given room and
 * silence, it reads as the reason the page exists.
 */
export function Scripture() {
  return (
    <section className="relative overflow-hidden border-b border-line bg-mist">
      {/*
        The window again, at the scale of the page.

        The hero's arch, drawn once more as a single hairline behind the
        verse — the same silhouette the picture sits in, so the section
        is recognisably part of the same building. It is one line at four
        per cent, which is the most it can be without becoming a graphic
        that competes with the words.
      */}
      <svg
        className="pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-auto -translate-x-1/2 -translate-y-1/2 text-ink"
        viewBox="0 0 900 1150"
        fill="none"
        aria-hidden
      >
        <path
          d="M0 450 A450 450 0 0 1 900 450 L900 1150 L0 1150 Z"
          stroke="currentColor"
          strokeOpacity="0.055"
          strokeWidth="2"
        />
        <circle
          cx="450"
          cy="360"
          r="198"
          stroke="currentColor"
          strokeOpacity="0.055"
          strokeWidth="2"
        />
      </svg>

      <div className="relative mx-auto max-w-3xl px-6 py-24 text-center sm:py-32">
        <DotCross tone="var(--gold)" gap={4} />

        <blockquote className="mt-8">
          <p className="head text-balance text-[clamp(1.6rem,3.6vw,2.6rem)] leading-[1.22] text-ink">
            &ldquo;So we, being many, are one body in Christ, and every one
            members one of another.&rdquo;
          </p>
          <cite className="eyebrow mt-7 block not-italic text-ink-3">
            Romans 12<span className="opacity-50">:</span>5
          </cite>
        </blockquote>

        <p className="mx-auto mt-9 max-w-md text-[15px] leading-[1.65] text-ink-2">
          One body and every one of them a name. That is the whole reason
          Chapl counts the way it does — the church entire on one screen, and
          not one person rounded away inside it.
        </p>
      </div>
    </section>
  );
}
