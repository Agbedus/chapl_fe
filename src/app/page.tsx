import { Reveal } from "@/components/reveal";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Hero } from "@/components/sections/hero";
import { Structure } from "@/components/sections/structure";
import { Features } from "@/components/sections/features";
import { Media } from "@/components/sections/media";
import { People } from "@/components/sections/people";
import { Members } from "@/components/sections/members";
import { Scripture } from "@/components/sections/scripture";
import { CTA } from "@/components/sections/cta";

export default function Home() {
  return (
    <>
      <SiteNav />
      <main className="flex-1">
        {/*
          The hero runs its own orchestration on load — it is above the
          fold, so there is nothing to wait for.

          Everything below arrives as it is first reached, once. The page
          was entirely static below the fold before, which was the right
          instinct against the usual alternative: sections that re-animate
          every time you scroll past turn a page into something you fight.
          `Reveal` keeps that and softens only the first appearance.
        */}
        <Hero />

        <Reveal>
          <Structure />
        </Reveal>
        <Reveal>
          <Features />
        </Reveal>
        <Reveal>
          <Media />
        </Reveal>
        <Reveal>
          <People />
        </Reveal>
        <Reveal>
          <Members />
        </Reveal>

        {/* The verse sits between the argument and the ask — the last
            thing read before being asked to decide. */}
        <Reveal>
          <Scripture />
        </Reveal>
        <Reveal>
          <CTA />
        </Reveal>
      </main>
      <SiteFooter />
    </>
  );
}
