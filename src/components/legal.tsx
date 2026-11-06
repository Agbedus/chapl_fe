import Link from "next/link";
import { Children, isValidElement, type ReactNode } from "react";

import { CrossRule } from "@/components/dot-cross";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

/**
 * Who stands behind Chapl's legal pages, in one place, so the privacy
 * policy, the terms and the licence agreement cannot name three
 * different operators. Some of these are working defaults the owner
 * chose to publish now and revisit with a lawyer: the operator's name,
 * the email provider, backup retention and the governing law.
 */
export const LEGAL = {
  operator: "Iris Studios",
  address: "P.O. Box LG 67, Legon, Accra, Ghana",
  contact: "info.irisstudios@gmail.com",
  emailProvider: "Google (Gmail)",
  backups: "up to 30 days",
  minimumAge: 16,
  law: "the laws of the Republic of Ghana",
  dataLaw: "Ghana's Data Protection Act, 2012 (Act 843)",
  regulator: "the Data Protection Commission of Ghana (dataprotection.org.gh)",
  courts: "the courts of Accra, Ghana",
  updated: "6 November 2026",
} as const;

/** The support address as a link. */
export function Contact() {
  return (
    <a href={`mailto:${LEGAL.contact}`} className="font-medium text-ink underline-offset-2 hover:underline">
      {LEGAL.contact}
    </a>
  );
}

/** The three legal pages, for the cross-links at the foot of each. */
const PAGES = [
  { href: "/privacy", label: "Privacy policy" },
  { href: "/terms", label: "Terms of service" },
  { href: "/eula", label: "Licence agreement" },
];

/**
 * The frame every legal page sits in: the site's header at the landing
 * pages' width, a contents rail that follows the reader, one reading
 * column, and the other two documents at the foot. The rail is built
 * from the `Section`s among the children, so a page lists its sections
 * once. Public, because the store listings link here and whoever opens
 * them has no account yet.
 */
export function LegalPage({
  eyebrow,
  title,
  path,
  children,
}: {
  eyebrow: string;
  title: string;
  path: string;
  children: ReactNode;
}) {
  const toc = Children.toArray(children).flatMap((child) =>
    isValidElement<{ id?: string; title?: string }>(child) && child.type === Section && child.props.id
      ? [{ id: child.props.id, title: child.props.title ?? "" }]
      : [],
  );
  return (
    <>
      <SiteNav sections={false} />
      <main className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-6 pb-20 pt-10 sm:pt-14">
          <header className="max-w-3xl">
            <p className="eyebrow text-cobalt">{eyebrow}</p>
            <h1 className="head mt-3 text-[clamp(2rem,5vw,3rem)] text-ink">{title}</h1>
            <p className="mt-3 text-[13.5px] text-ink-3">Last updated {LEGAL.updated}</p>
          </header>

          <div className="mt-10 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-16">
            <nav aria-label="On this page" className="hidden lg:block">
              <div className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto pr-2">
                <p className="eyebrow text-ink-3">On this page</p>
                <ol className="mt-4 space-y-2 border-l border-line pl-4 text-[13.5px] leading-[1.45]">
                  {toc.map((item) => (
                    <li key={item.id}>
                      <a href={`#${item.id}`} className="text-ink-3 transition-colors hover:text-ink">
                        {item.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            </nav>

            <article className="min-w-0 max-w-3xl space-y-4 text-[16px] leading-[1.7] text-ink-2 lg:max-w-none">
              {children}
            </article>
          </div>

          <div className="my-14">
            <CrossRule />
          </div>
          <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[14px]">
            {PAGES.filter((page) => page.href !== path).map((page) => (
              <Link key={page.href} href={page.href} className="font-medium text-ink hover:underline">
                {page.label}
              </Link>
            ))}
            <Link href="/" className="text-ink-3 hover:text-ink hover:underline">
              Back to Chapl
            </Link>
          </nav>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="head mt-12 text-[24px] text-ink">{title}</h2>
      <div className="mt-4 space-y-4 text-[15px] leading-[1.7] text-ink-2">{children}</div>
    </section>
  );
}

/** One row of a definition list: the thing, then what it means. */
export function Item({ what, children }: { what: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-line py-3.5 sm:grid-cols-[14rem_1fr] sm:gap-8">
      <dt className="text-[14px] font-semibold text-ink">{what}</dt>
      <dd className="text-[14.5px] leading-[1.65] text-ink-2">{children}</dd>
    </div>
  );
}

export function Bullets({ children }: { children: ReactNode }) {
  return <ul className="list-disc space-y-2 pl-5">{children}</ul>;
}

/** Capitals where the law expects a disclaimer to be conspicuous. */
export function Loud({ children }: { children: ReactNode }) {
  return <p className="text-[14px] uppercase leading-[1.65] tracking-[0.01em] text-ink">{children}</p>;
}

export function B({ children }: { children: ReactNode }) {
  return <strong className="text-ink">{children}</strong>;
}
