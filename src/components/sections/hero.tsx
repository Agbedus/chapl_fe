import { ArrowRight } from "lucide-react";

import { CongregationField } from "@/components/congregation-field";
import { DotPhoto } from "@/components/dot-photo";
import { churchName, totals } from "@/lib/congregation";

const stats = [
  { value: totals.members.toLocaleString(), label: "members" },
  { value: totals.branches, label: "branches" },
  { value: totals.cells, label: "cell groups" },
  { value: totals.present.toLocaleString(), label: "in a seat last Sunday" },
];

export function Hero() {
  return (
    <section className="border-b border-line">
      {/*
        Copy left, picture right.

        The page opened on a single column of type with the congregation
        field a scroll below it, which meant the first screen said what
        the product is without ever showing it. The picture is not
        decoration beside the words: it is the argument, because it is
        made of the same dots the product is.
      */}
      <div className="mx-auto grid max-w-6xl items-center gap-x-14 gap-y-12 px-6 pt-20 pb-14 sm:pt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <div className="min-w-0">
          <p className="eyebrow rise text-ink-3" style={{ animationDelay: "40ms" }}>
            Church management, whole to one
          </p>

          <h1
            className="display rise mt-5 max-w-[15ch] text-[clamp(2.75rem,6.6vw,4.75rem)]"
            style={{ animationDelay: "90ms" }}
          >
            One church.
            <br />
            Every branch,
            <br />
            <span className="text-cobalt">every name.</span>
          </h1>

          <p
            className="rise mt-8 max-w-md text-[17px] leading-[1.6] text-ink-2"
            style={{ animationDelay: "150ms" }}
          >
            Chapl holds a multi-site church in one place — branches and cell
            groups, attendance and sermons, birthdays and follow-ups. Members
            get their own way in.
          </p>

          <div
            className="rise mt-9 flex flex-wrap items-center gap-3"
            style={{ animationDelay: "200ms" }}
          >
            <a
              href="/register"
              /* `active:scale-[0.97]` on both: the press is answered before
                 the navigation has begun, which is the only moment the
                 interface can prove it heard you. */
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-[15px]
                         font-medium text-accent-ink transition-[opacity,transform] duration-150
                         ease-[cubic-bezier(0.22,1,0.36,1)] hover:opacity-90 active:scale-[0.97]"
            >
              Get started
              <ArrowRight
                className="h-4 w-4 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5"
                strokeWidth={2.1}
              />
            </a>
            <a
              href="#structure"
              className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-3 text-[15px]
                         font-medium text-ink transition-[border-color,transform] duration-150
                         ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-line-strong active:scale-[0.97]"
            >
              Walk through a real church
            </a>
          </div>
        </div>

        {/*
          The picture arrives last and slowest of the four.
          It is the largest thing moving, and a big element on the same
          timing as a line of type reads as heavier than everything else
          rather than as part of the same gesture.
        */}
        <div className="rise" style={{ animationDelay: "260ms", animationDuration: "0.9s" }}>
          <DotPhoto
            src="/hero-glass.svg"
            alt="Light through a stained glass window"
            className="aspect-[4/5] w-full"
          />
          <p className="mt-3 text-[12px] leading-[1.5] text-ink-3">
            Move across the glass. The picture is drawn in the same dots as
            the product.
          </p>
        </div>
      </div>

      {/* --- the congregation field --------------------------------- */}
      <div className="border-t border-line bg-mist">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="mb-9 flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
            <h2 className="text-[13px] font-semibold tracking-tight text-ink">
              {churchName}, last Sunday
            </h2>
            <p className="text-[13px] text-ink-3">
              One dot is one person. Filled means they were in a seat.
            </p>
          </div>

          <CongregationField />

          <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line pt-8 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="sr-only">{stat.label}</dt>
                <dd className="head tnum text-[clamp(1.75rem,3.4vw,2.5rem)] text-ink">
                  {stat.value}
                </dd>
                <p className="mt-1.5 text-[13px] text-ink-3">{stat.label}</p>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
