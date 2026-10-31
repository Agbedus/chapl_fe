import Link from "next/link";
import type { ReactNode } from "react";

import { CrossRule } from "@/components/dot-cross";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { getMe } from "@/lib/session";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** `12 Oct 2026`, written out rather than left to a server's locale. */
export function day(iso: string): string {
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/** `Sun 2 Nov, 9:00 am` from an API time, which is UTC. */
export function moment(iso: string): string {
  const d = new Date(iso.endsWith("Z") ? iso : `${iso}Z`);
  const h = d.getUTCHours() % 12 || 12;
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${h}:${String(d.getUTCMinutes()).padStart(2, "0")} ${d.getUTCHours() < 12 ? "am" : "pm"}`;
}

/** A line cut to a preview's length on a word, for descriptions. */
export function clip(text: string | null | undefined, length = 180): string | undefined {
  if (!text) return undefined;
  const flat = text.replace(/\s+/g, " ").trim();
  if (flat.length <= length) return flat;
  return `${flat.slice(0, flat.lastIndexOf(" ", length) > 0 ? flat.lastIndexOf(" ", length) : length)}…`;
}

/**
 * The frame of a shared link: the site's own header, one column of the
 * thing that was shared, and the way in. Whoever opens it is usually not
 * signed in, often not a member, and arrived from a chat — so it reads on
 * its own, and the invitation comes after the content rather than in
 * front of it.
 */
export async function SharedPage({
  church,
  inApp,
  children,
}: {
  church: string;
  /** The same thing inside the product, for anyone who can open it. */
  inApp: string;
  children: ReactNode;
}) {
  const me = await getMe();
  return (
    <>
      <SiteNav sections={false} next={inApp} />
      <main className="flex-1">
        <article className="mx-auto max-w-2xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
          {children}
          <div className="my-12">
            <CrossRule />
          </div>
          <JoinIn church={church} inApp={inApp} signedIn={Boolean(me)} />
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

function JoinIn({ church, inApp, signedIn }: { church: string; inApp: string; signedIn: boolean }) {
  if (signedIn) {
    return (
      <section className="text-center">
        <p className="text-[15px] text-ink-2">Open it in Chapl to keep it, set a reminder and see the rest.</p>
        <Link href={inApp} className="btn btn-primary mt-5">Open in Chapl</Link>
      </section>
    );
  }
  return (
    <section className="text-center">
      <p className="eyebrow text-cobalt">{church} uses Chapl</p>
      <h2 className="head mt-3 text-[clamp(1.5rem,3vw,2rem)] text-ink">Part of the church?</h2>
      <p className="mx-auto mt-3 max-w-md text-[15px] text-ink-2">
        Sign in to keep this, set a reminder, check in on Sunday and hear what is happening across your branch.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Link href={`/signin?next=${encodeURIComponent(inApp)}`} className="btn btn-primary">Sign in</Link>
        <Link href="/register" className="btn">Get started</Link>
      </div>
    </section>
  );
}
