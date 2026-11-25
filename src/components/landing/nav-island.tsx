"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, LayoutDashboard } from "lucide-react";

import { DotArt, type ArtName } from "@/components/landing/dot-art";
import { ScrollTrigger } from "@/components/landing/motion";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS: { href: string; label: string; key: string; blurb: string; art: ArtName }[] = [
  { href: "#one", label: "How it works", key: "story", blurb: "From one person to the whole church", art: "one" },
  { href: "#week", label: "The week", key: "week", blurb: "Everything between Sundays", art: "week" },
  { href: "#try", label: "Try Sunday", key: "try", blurb: "Check in the way a member does", art: "try" },
  { href: "#media", label: "Media", key: "media", blurb: "Sermons, kept and shared", art: "media" },
  { href: "#members", label: "For members", key: "members", blurb: "A door in for every person", art: "members" },
  { href: "#questions", label: "Questions", key: "questions", blurb: "What leaders ask first", art: "questions" },
];

/**
 * The header, as an island.
 *
 * It has three shapes and moves between them on one curve:
 *
 * - **Wide**, at the top of the page: the logo, the section tabs, the way in.
 * - **Compact**, once you have scrolled down: a pill holding the logo's mark,
 *   the section you are in, and the way in. Scrolling up, or pointing at it,
 *   opens it again, so it is never further than a gesture away but is out of
 *   the way while you read.
 * - **Open**: the menu grows out of the bar, the page behind it dims, and
 *   each section is a row with a small drawing in the page's own dots that
 *   changes as you move over it.
 *
 * Which shape it is in is written straight to attributes on the node (the
 * scroll is far too fast for React), and CSS does all of the moving. Only
 * whether the menu is open, and which row is hovered, are state: both change
 * a few times in a visit, not sixty times a second.
 */
export function NavIsland({
  signedIn,
  firstName,
  signInHref,
}: {
  signedIn: boolean;
  firstName?: string;
  signInHref: string;
}) {
  const wrap = useRef<HTMLElement>(null);
  const track = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(0);

  // Which section is being read, from a band across the middle of the screen.
  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-chapter], #week, #try, #media, #members, #questions"),
    );
    if (targets.length === 0) return;
    const keyOf = (el: Element) => (el.hasAttribute("data-chapter") ? "story" : el.id);
    const inBand = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const key = keyOf(entry.target);
          inBand.set(key, Math.max(0, (inBand.get(key) ?? 0) + (entry.isIntersecting ? 1 : -1)));
        }
        const live = LINKS.filter((link) => (inBand.get(link.key) ?? 0) > 0).at(-1);
        setActive(live?.key ?? null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // The tab plate slides to the active section.
  useLayoutEffect(() => {
    const node = track.current;
    if (!node) return;
    const on = node.querySelector<HTMLElement>("[data-on]");
    if (!on) {
      delete node.dataset.has;
      return;
    }
    if (!node.dataset.has) {
      node.dataset.snap = "";
      requestAnimationFrame(() => delete node.dataset.snap);
    }
    node.style.setProperty("--x", `${on.offsetLeft}px`);
    node.style.setProperty("--w", `${on.offsetWidth}px`);
    node.dataset.has = "";
  }, [active]);

  // Compact on the way down, open again on the way up. Reduced motion keeps
  // the bar wide: a header that rearranges itself is motion, not a gesture.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const trigger = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const el = wrap.current;
        if (!el) return;
        const y = self.scroll();
        if (y < 140 || self.direction === -1) el.removeAttribute("data-compact");
        else if (self.direction === 1) el.setAttribute("data-compact", "");
      },
    });
    return () => trigger.kill();
  }, []);

  // The menu: Escape closes it and gives focus back to the button; the page
  // behind it stops scrolling while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    window.dispatchEvent(new CustomEvent("chapl:scroll-lock", { detail: true }));
    return () => {
      window.removeEventListener("keydown", onKey);
      window.dispatchEvent(new CustomEvent("chapl:scroll-lock", { detail: false }));
    };
  }, [open]);

  const where = LINKS.find((l) => l.key === active)?.label ?? "Chapl";
  const close = () => setOpen(false);

  return (
    <header ref={wrap} className="island-wrap" data-menu={open ? "" : undefined}>
      <div className="island-scrim" onClick={close} aria-hidden />

      <div className="island">
        <div className="island-bar">
          <Link href="/" aria-label="Chapl home" className="island-logo shrink-0">
            <Logo />
          </Link>

          <nav ref={track} className="nav-track island-track hidden md:flex" aria-label="Sections">
            <span className="nav-thumb" aria-hidden />
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="nav-link"
                data-on={active === link.key ? "" : undefined}
                aria-current={active === link.key ? "location" : undefined}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <span className="island-where" aria-hidden>
            <span className="stop stop-sm" />
            {where}
          </span>

          <div className="island-actions">
            <span className="island-opt inline-flex">
              <ThemeToggle className="rounded-[10px]" />
            </span>
            {signedIn ? (
              <>
                {firstName && <span className="island-opt hidden px-1 text-[13px] text-ink-3 lg:inline-flex">{firstName}</span>}
                <Link href="/app" className="btn btn-primary btn-sm">
                  <LayoutDashboard className="h-3.5 w-3.5" aria-hidden />
                  Dashboard
                </Link>
              </>
            ) : (
              <>
                {/* The wrapper hides it: `.btn` sets its own display, and a rule
                    outside Tailwind's layer beats `hidden` on the same node. */}
                <span className="island-opt hidden min-[440px]:inline-flex">
                  <a href={signInHref} className="btn btn-sm text-ink-2 hover:text-ink">
                    Sign in
                  </a>
                </span>
                <a href="/register" className="btn btn-primary btn-sm">
                  Get started
                </a>
              </>
            )}
            <button
              ref={toggle}
              type="button"
              className="island-menu"
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((v) => !v)}
            >
              <span className="island-burger" aria-hidden>
                <i />
                <i />
              </span>
            </button>
          </div>
        </div>

        <div id="site-menu" className="island-panel" inert={!open}>
          <div className="island-panel-inner">
            <div className="island-panel-grid">
              <ul className="island-links">
                {LINKS.map((link, i) => (
                  <li key={link.href} className="island-item" style={{ "--i": i } as React.CSSProperties}>
                    <a
                      href={link.href}
                      className="island-row"
                      onClick={close}
                      onPointerEnter={() => setHover(i)}
                      onFocus={() => setHover(i)}
                    >
                      <span className="island-row-title">{link.label}</span>
                      <span className="island-row-blurb">{link.blurb}</span>
                      <ArrowRight className="island-row-arrow" strokeWidth={1.8} aria-hidden />
                    </a>
                  </li>
                ))}
              </ul>

              <div className="island-side island-item" style={{ "--i": LINKS.length } as React.CSSProperties}>
                <div className="island-art" aria-hidden>
                  <DotArt key={hover} art={LINKS[hover].art} />
                </div>
                <div className="island-cta">
                  {signedIn ? (
                    <Link href="/app" className="btn btn-primary" onClick={close}>
                      <LayoutDashboard className="h-4 w-4" aria-hidden />
                      Open your dashboard
                    </Link>
                  ) : (
                    <>
                      <a href="/register" className="btn btn-primary" onClick={close}>
                        Get started
                        <ArrowRight className="h-4 w-4" strokeWidth={2.1} aria-hidden />
                      </a>
                      <a href={signInHref} className="btn btn-quiet" onClick={close}>
                        Sign in
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
