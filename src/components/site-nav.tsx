import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const links = [
  { href: "#structure", label: "Structure" },
  { href: "#run", label: "What you run" },
  { href: "#media", label: "Media" },
  { href: "#members", label: "For members" },
];

export function SiteNav() {
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
          <a
            href="/signin"
            className="hidden rounded-full px-3.5 py-2 text-[14px] font-medium text-ink-2 transition-colors hover:text-ink sm:inline-block"
          >
            Sign in
          </a>
          <a
            href="/register"
            className="rounded-full bg-ink px-4 py-2 text-[14px] font-medium text-paper transition-opacity hover:opacity-88"
          >
            Get started
          </a>
        </div>
      </div>
    </header>
  );
}
