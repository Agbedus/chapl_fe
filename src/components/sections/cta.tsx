import { ArrowRight } from "lucide-react";

import { CrossRule } from "@/components/dot-cross";
import { GatheringChurch } from "@/components/landing/gathering";
import { Magnetic } from "@/components/landing/magnetic";

export function CTA() {
  return (
    <section id="start" className="quiet-dots border-b border-line">
      <div className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
        <div className="mb-12">
          <CrossRule tone="var(--gold)" />
        </div>

        {/* The same congregation as the story above, gathered into one block. */}
        <GatheringChurch />

        <h2 className="head mx-auto mt-12 max-w-[17ch] text-[clamp(2.25rem,5vw,3.5rem)]">
          Bring the whole church into one place.
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-[17px] leading-[1.6] text-ink-2">
          Start with one branch. Bring in the rest when it is working the way you want.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Magnetic>
            <a href="/register" className="btn btn-primary btn-lg group">
              Get started
              <ArrowRight className="nudge h-4 w-4" strokeWidth={2.1} aria-hidden />
            </a>
          </Magnetic>
          <a href="/signin" className="btn btn-quiet btn-lg">
            Sign in
          </a>
        </div>
      </div>
    </section>
  );
}
