import { CTA } from "@/components/sections/cta";
import { Media } from "@/components/sections/media";
import { Scripture } from "@/components/sections/scripture";
import { Members } from "@/components/landing/members";
import { SmoothScroll } from "@/components/landing/smooth-scroll";
import { Story } from "@/components/landing/story";
import { Week } from "@/components/landing/week";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

/**
 * The marketing page, told in the product's own dots.
 *
 * The story at the top is the argument: the congregation drawn one dot
 * per person, moved by the scroll through the church, its branches, its
 * cells, Sunday's room and one name (`components/landing/story.tsx`).
 * What follows is the week the product runs, the media room, the
 * member's side, the verse and the ask.
 */
export default function Home() {
  return (
    <>
      <SmoothScroll />
      <SiteNav />
      <main className="flex-1">
        <Story />
        <Week />
        <Media />
        <Members />
        {/* The verse sits between the argument and the ask: the last
            thing read before being asked to decide. */}
        <Scripture />
        <CTA />
      </main>
      <SiteFooter />
    </>
  );
}
