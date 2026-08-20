import { ArrowRight } from "lucide-react";

import { CrossRule } from "@/components/dot-cross";
import { branches } from "@/lib/congregation";

export function CTA() {
  return (
    <section id="demo" className="border-b border-line">
      <div className="mx-auto max-w-6xl px-6 py-24 text-center sm:py-32">
        <div className="mb-12">
          <CrossRule tone="var(--gold)" />
        </div>

        {/* The same congregation as the hero, packed into one block. */}
        <div
          className="mx-auto flex max-w-lg flex-wrap justify-center gap-[5px]"
          aria-hidden
        >
          {branches.map((branch) =>
            Array.from({ length: branch.members }, (_, i) => (
              <span
                key={`${branch.id}-${i}`}
                className="dot"
                style={{ color: branch.color }}
              />
            )),
          )}
        </div>

        <h2 className="head mx-auto mt-10 max-w-[17ch] text-[clamp(2.25rem,5vw,3.5rem)]">
          Bring the whole church into one place.
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-[17px] leading-[1.6] text-ink-2">
          Thirty minutes with your own branch list on the screen. We&apos;ll
          bring in one branch first and you can decide from there.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <a
            href="/register"
            className="group inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-[15px] font-medium text-accent-ink transition-opacity hover:opacity-90"
          >
            Create an account
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              strokeWidth={2.1}
            />
          </a>
          <a
            href="/signin"
            className="inline-flex items-center rounded-full border border-line px-5 py-3 text-[15px] font-medium text-ink transition-colors hover:border-line-strong"
          >
            Sign in
          </a>
        </div>
      </div>
    </section>
  );
}
