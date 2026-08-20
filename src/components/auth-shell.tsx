import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "@/components/logo";
import { branches } from "@/lib/congregation";

/**
 * The frame every signed-out page sits in.
 *
 * The right half is the congregation field from the marketing site, shown
 * once at rest rather than animating — the same motif, without asking
 * someone mid-sign-in to watch it assemble.
 */
export function AuthShell({
  eyebrow,
  title,
  lede,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  lede?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-14">
        <div className="w-full max-w-[380px]">
          <Link href="/" className="inline-flex" aria-label="Chapl home">
            <Logo />
          </Link>

          <p className="eyebrow mt-11 text-ink-3">{eyebrow}</p>
          <h1 className="head mt-3 text-[26px]">{title}</h1>
          {lede && <p className="mt-3 text-[14px] leading-[1.6] text-ink-2">{lede}</p>}

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-8 text-[13px] text-ink-3">{footer}</div>}
        </div>
      </div>

      <aside className="hidden lg:flex items-center justify-center border-l border-line bg-mist p-16">
        <div className="max-w-[400px]">
          <p className="eyebrow text-ink-3">Church management</p>
          <p className="head mt-4 text-[22px] leading-snug">
            One church. Every branch, every cell, every name.
          </p>

          <div className="mt-9 flex flex-wrap gap-[5px] max-w-[340px]" aria-hidden>
            {branches.flatMap((branch) =>
              branch.cells.slice(0, 7).flatMap((cell) =>
                Array.from({ length: cell.members }, (_, i) => (
                  <span
                    key={`${cell.id}-${i}`}
                    className={i < cell.present ? "dot" : "dot-hollow"}
                    style={{ color: branch.color }}
                  />
                )),
              ),
            )}
          </div>

          <p className="mt-6 text-[12.5px] text-ink-3">
            One dot is one person. Filled means they were in a seat.
          </p>
        </div>
      </aside>
    </div>
  );
}
