import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { NavIsland } from "@/components/landing/nav-island";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getMe } from "@/lib/session";

/**
 * The marketing header: a floating bar, not a strip across the top.
 *
 * It sits inside the page like the product's own top bar does, a rounded
 * plate on the canvas, translucent so the story's dots drift under it.
 * The header keeps its 4rem of flow height so the story can still be
 * pulled up beneath it; only the plate inside is inset.
 *
 * It asks who is reading, because "Sign in · Get started" to somebody
 * who is already signed in is a page that has not noticed them, and
 * "Get started" in particular offers a thing they finished doing. One
 * button replaces both: the way back into the product.
 *
 * `getMe()` rather than a look at the cookie, for the reason it exists:
 * a cookie says a token was issued, not that it still works. A revoked
 * account would otherwise be shown a dashboard link that bounces it
 * straight back to sign-in.
 *
 * This does make `/` dynamic, which it was not before. That is the
 * price of a header that is right, and the page's own content is all
 * static, so the cost is one request-time fetch and no waterfall.
 */
export async function SiteNav({
  sections = true,
  next,
}: {
  /** The home page's section links; off on a page that has none of them. */
  sections?: boolean;
  /** Where signing in should land, when it is not the dashboard. */
  next?: string;
} = {}) {
  const me = await getMe();
  const signIn = next ? `/signin?next=${encodeURIComponent(next)}` : "/signin";

  // The home page's header is the island; a page without the home page's
  // sections gets a plain bar, since there is nothing to jump to.
  if (sections) {
    return <NavIsland signedIn={Boolean(me)} firstName={me?.full_name.split(" ")[0]} signInHref={signIn} />;
  }

  return (
    <header className="sticky top-0 z-50 h-16">
      <div className="mx-auto flex h-full max-w-6xl items-center px-3 sm:px-6">
        <div className="site-bar flex h-12 w-full items-center justify-between gap-4 pl-4 pr-1.5">
          <Link href="/" aria-label="Chapl home" className="shrink-0">
            <Logo />
          </Link>

          <div className="flex items-center gap-1.5">
            <ThemeToggle className="rounded-[10px]" />
            {me ? (
              <Link href="/app" className="btn btn-primary btn-sm">
                <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
                Dashboard
              </Link>
            ) : (
              <>
                <span className="hidden sm:inline-flex">
                  <a href={signIn} className="btn btn-sm text-ink-2 hover:text-ink">
                    Sign in
                  </a>
                </span>
                <a href="/register" className="btn btn-primary btn-sm">
                  Get started
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
