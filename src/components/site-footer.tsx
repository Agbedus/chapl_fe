import Link from "next/link";

import { Logo } from "@/components/logo";

/**
 * Every link here goes somewhere. The first version listed "Pricing",
 * "Podcast feed" and "Live stream" against `href="#"`: pages that do not
 * exist, promised in the one place people look to see what a product is.
 * These are the sections of the home page, the ways in, and the legal
 * pages, which is everything that is actually there.
 */
const columns = [
  {
    title: "The product",
    links: [
      { href: "/#one", label: "How it works" },
      { href: "/#week", label: "The week" },
      { href: "/#media", label: "Media room" },
      { href: "/#members", label: "For members" },
      { href: "/#questions", label: "Questions" },
    ],
  },
  {
    title: "Your account",
    links: [
      { href: "/register", label: "Get started" },
      { href: "/signin", label: "Sign in" },
      { href: "/forgot-password", label: "Forgot password" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy policy" },
      { href: "/terms", label: "Terms of service" },
      { href: "/eula", label: "Licence agreement" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="band">
      <div className="frame px-6 pb-10 pt-16 sm:px-10">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-[28ch] text-[14px] leading-[1.6] text-ink-3">
            Church management for congregations that meet in more than one place.
          </p>
          {/* The page's one habit, once more at the end of it. */}
          <p className="mt-6 text-[13px] text-ink-3">
            Every one of them a name<span className="stop stop-sm" aria-hidden />
          </p>
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h3 className="text-[13px] font-semibold tracking-tight text-ink">{column.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-[14px] text-ink-3 transition-colors hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mt-14 border-t border-line pt-6">
        <p className="text-[13px] text-ink-3">© {new Date().getFullYear()} Chapl</p>
      </div>
      </div>
    </footer>
  );
}
