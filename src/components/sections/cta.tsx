import { ArrowRight } from "lucide-react";

import { CrossRule } from "@/components/dot-cross";
import { GatheringChurch } from "@/components/landing/gathering";
import { Magnetic } from "@/components/landing/magnetic";
import { Stopped } from "@/components/landing/stop";

export function CTA() {
  return (
    <section id="start" className="band quiet-dots">
      <div className="frame px-4 py-20 text-center sm:px-10 sm:py-28">
        <div className="mb-12">
          <CrossRule tone="var(--gold)" />
        </div>

        {/* The same congregation as the story above, gathered into one block. */}
        <GatheringChurch />

        <h2 className="head mx-auto mt-12 max-w-[17ch] text-[clamp(2.25rem,5vw,3.5rem)]">
          <Stopped>Bring the whole church into one place.</Stopped>
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
