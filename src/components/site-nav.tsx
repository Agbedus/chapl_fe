import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { getMe } from "@/lib/session";

const links = [
  { href: "#structure", label: "Structure" },
  { href: "#run", label: "What you run" },
  { href: "#media", label: "Media" },
  { href: "#members", label: "For members" },
];

/**
 * The marketing header.
 *
 * It asks who is reading, because "Sign in · Get started" to somebody
 * who is already signed in is a page that has not noticed them — and
 * "Get started" in particular offers a thing they finished doing. One
 * button replaces both: the way back into the product.
 *
 * `getMe()` rather than a look at the cookie, for the reason it exists:
 * a cookie says a token was issued, not that it still works. A revoked
 * account would otherwise be shown a dashboard link that bounces it
 * straight back to sign-in.
 *
 * This does make `/` dynamic — it was prerendered before. That is the
 * price of a header that is right, and the page's own content is all
 * static, so the cost is one request-time fetch and no waterfall.
 */
export async function SiteNav() {
  const me = await getMe();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-6">
        <Link href="/" aria-label="Chapl home">
          <Logo />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[14px] text-ink-2 transition-colors hover:text-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />

          {me ? (
            <>
              {/* Their name is the proof it worked, so it is worth the
                  room on a wide screen and the first thing to go on a
                  narrow one. */}
              <span className="hidden text-[14px] text-ink-3 lg:inline">
                {me.full_name.split(" ")[0]}
              </span>
              <Link
                href="/app"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-4 py-2 text-[14px]
                           font-medium text-paper transition-opacity hover:opacity-88"
              >
                <LayoutDashboard className="h-4 w-4" aria-hidden />
                Dashboard
              </Link>
            </>
          ) : (
            <>
              <a
                href="/signin"
                className="hidden rounded-full px-3.5 py-2 text-[14px] font-medium text-ink-2
                           transition-colors hover:text-ink sm:inline-block"
              >
                Sign in
              </a>
              <a
                href="/register"
                className="rounded-full bg-ink px-4 py-2 text-[14px] font-medium text-paper
                           transition-opacity hover:opacity-88"
              >
                Get started
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
