"use client";

import { useRef, useState } from "react";
import {
  Bookmark,
  Share2,
} from "lucide-react";

import { gsap, ScrollTrigger, useGSAP } from "@/components/landing/motion";
import { DotArt } from "@/components/landing/dot-art";
import { DotNumeral } from "@/components/landing/dot-numeral";
import { Stopped } from "@/components/landing/stop";

/** A roll of forty-eight, eight not ticked: what a Tuesday looks like. */
const ROLL = 48;
const MISSING = new Set([5, 11, 17, 26, 30, 38, 41, 46]);

/** Twelve months of giving, as columns of dots (each dot a share of the month). */
const MONTHS = [5, 6, 5, 7, 6, 8, 7, 7, 9, 8, 9, 11];
const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

const TEAMS = [
  { name: "Choir", size: 14 },
  { name: "Ushers", size: 9 },
  { name: "Media", size: 6 },
  { name: "The Mensahs", size: 4 },
];

function Teams() {
  return (
    <div className="flex flex-wrap items-end gap-x-7 gap-y-4" aria-hidden>
      {TEAMS.map((team) => (
        <div key={team.name} className="team">
          <div className="grid grid-cols-5 gap-[5px]" style={{ color: "var(--teal)" }}>
            {Array.from({ length: team.size }, (_, i) => (
              <span key={i} className="dot" />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-ink-3">{team.name}</p>
        </div>
      ))}
    </div>
  );
}

/** Authority rolls down: a cell leader's part, inside a branch, inside the church. */
function Scope() {
  return (
    <div className="scope" aria-hidden>
      <span className="scope-label">Church</span>
      <div className="scope">
        <span className="scope-label">Branch</span>
        <div className="scope scope-on">
          <span className="scope-label">Their cell</span>
          <div className="mt-2 grid w-max grid-cols-6 gap-[5px]" style={{ color: "var(--teal)" }}>
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="dot" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Register() {
  const [absent, setAbsent] = useState<Set<number>>(() => new Set(MISSING));
  const here = ROLL - absent.size;
  return (
    <div>
      <div className="grid grid-cols-12 gap-[7px]" role="group" aria-label="A register to try">
        {Array.from({ length: ROLL }, (_, i) => {
          const away = absent.has(i);
          return (
            <button
              key={i}
              type="button"
              aria-pressed={!away}
              aria-label={`Person ${i + 1}, ${away ? "absent" : "present"}`}
              onClick={() =>
                setAbsent((prev) => {
                  const next = new Set(prev);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  return next;
                })
              }
              className="roll-dot"
              data-away={away ? "" : undefined}
            />
          );
        })}
      </div>
      <p className="mt-5 flex items-end gap-3.5">
        <DotNumeral value={String(here)} slots={2} label={`${here} here`} cell="4px" />
        <span className="pb-px text-[13px] text-ink-3">
          here,{" "}
          <DotNumeral className="dm-inline" value={String(absent.size)} slots={1} label={`${absent.size}`} cell="2px" /> recorded
          absent. Tap a dot.
        </span>
      </p>
    </div>
  );
}

function Saved() {
  const [saved, setSaved] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        aria-pressed={saved}
        onClick={() => setSaved((s) => !s)}
        className="tile-action"
        data-on={saved ? "" : undefined}
      >
        <Bookmark className="h-3.5 w-3.5" strokeWidth={2} fill={saved ? "currentColor" : "none"} />
        {saved ? "Saved" : "Save"}
      </button>
      <span className="tile-action" aria-hidden>
        <Share2 className="h-3.5 w-3.5" strokeWidth={2} /> Share
      </span>
    </div>
  );
}

type Tile = {
  id: string;
  hue: string;
  title: string;
  body: string;
  span?: string;
  /** A small drawing: on a phone it sits beside the words, not above them. */
  small?: boolean;
  visual?: React.ReactNode;
};

/**
 * The rest of the week: what a church office does between Sundays,
 * each with a small piece of the product to touch rather than a picture
 * of it. The register is the real interaction in miniature: everyone
 * starts present, and a tap records an absence.
 */
export function Week() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // What arrives is each cell's contents, not the cell: the ledger's
      // ruled grid is there from the start, and the cells fill in.
      const contents = (tiles: Element[]) => tiles.flatMap((tile) => Array.from(tile.children));
      gsap.set(contents(gsap.utils.toArray("[data-tile]")), { autoAlpha: 0, y: reduce ? 0 : 24 });
      ScrollTrigger.batch("[data-tile]", {
        start: "top 88%",
        onEnter: (batch) =>
          gsap.to(contents(batch), { autoAlpha: 1, y: 0, duration: 0.7, ease: "expo.out", stagger: 0.05, overwrite: true }),
      });
      if (!reduce) {
        // The months rise into their heights as the tile arrives.
        gsap.from(".month-dot", {
          scale: 0,
          transformOrigin: "50% 100%",
          duration: 0.5,
          ease: "back.out(2.4)",
          stagger: { each: 0.012, from: "start" },
          scrollTrigger: { trigger: ".months", start: "top 85%" },
        });
      }
    },
    { scope: root },
  );

  const tiles: Tile[] = [
    {
      id: "register",
      hue: "var(--gold)",
      title: "Take the register in one pass.",
      body: "Everyone starts present. Tick off who is missing, save once, and the absent are recorded as absent, not forgotten.",
      span: "md:col-span-2",
      visual: <Register />,
    },
    {
      id: "giving",
      hue: "var(--emerald)",
      title: "Giving, and whether it is holding up.",
      body: "Tithes, offerings and pledges against the giver. Anonymous takes a name off the report, never off their own record.",
      span: "md:col-span-2",
      visual: (
        <div className="months flex items-end gap-[9px]" aria-hidden>
          {MONTHS.map((height, m) => (
            <div key={m} className="month flex flex-col items-center gap-[5px]">
              <div className="flex flex-col-reverse gap-[4px]">
                {Array.from({ length: height }, (_, d) => (
                  <span key={d} className="month-dot dot" style={{ color: "var(--emerald)" }} />
                ))}
              </div>
              <span className="text-[10px] text-ink-3">{MONTH_LABELS[m]}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "care",
      small: true,
      hue: "var(--ruby)",
      title: "Prayer and care.",
      body: "Members ask for prayer or a call from the app. Leaders see it the same hour.",
      visual: (
        <span className="tile-icon beat">
          <DotArt art="heart" cell="4.5px" gap="2px" still />
        </span>
      ),
    },
    {
      id: "events",
      small: true,
      hue: "var(--gold)",
      title: "Events that remind people.",
      body: "Register, get a reminder the day before, and let a weekly service repeat itself.",
      visual: (
        <span className="tile-icon ring-bell">
          <DotArt art="calendar" cell="4px" gap="2px" still />
        </span>
      ),
    },
    {
      id: "sermons",
      hue: "var(--violet)",
      title: "Sermons to keep.",
      body: "Save one for later. Share a link anyone can open, preview and all.",
      visual: <Saved />,
    },
    {
      id: "notices",
      small: true,
      hue: "var(--cobalt)",
      title: "Notices, live.",
      body: "Posted once, on every phone in that branch the moment it goes out.",
      visual: (
        <span className="ripple" aria-hidden>
          <span className="tile-icon">
            <DotArt art="broadcast" cell="4.5px" gap="2px" still />
          </span>
        </span>
      ),
    },
    {
      id: "teams",
      hue: "var(--teal)",
      span: "md:col-span-2",
      title: "Teams and households.",
      body: "The choir, the ushers and every family, as they really are. Bring a whole roll in from a spreadsheet.",
      visual: <Teams />,
    },
    {
      id: "roles",
      hue: "var(--ink-2)",
      span: "md:col-span-2",
      title: "Each leader, their part.",
      body: "A cell leader sees their twelve, a pastor their branch. Every change stays on the record.",
      visual: <Scope />,
    },
  ];

  return (
    <section ref={root} id="week" className="band quiet-dots">
      <div className="frame px-4 py-20 sm:px-10 sm:py-28">
        <h2 className="head max-w-[16ch] text-[clamp(2.2rem,4.6vw,3.5rem)] text-ink">
          <Stopped>The rest of the week.</Stopped>
        </h2>
        <p className="mt-5 max-w-[34rem] text-[17px] leading-[1.6] text-ink-2">
          Everything a church office does between Sundays, beside the people it is for.
        </p>

        <ul className="ledger mt-14 md:grid-cols-2 lg:grid-cols-4">
          {tiles.map((tile) => (
            <li
              key={tile.id}
              data-tile
              className={`tile group ${tile.small ? "tile-small" : ""} ${tile.span ?? ""}`}
              style={{ "--hue": tile.hue } as React.CSSProperties}
            >
              {tile.visual && <div className="tile-visual">{tile.visual}</div>}
              <div className="mt-auto">
                <h3 className="text-[16px] font-semibold tracking-tight text-ink">{tile.title}</h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-ink-2">{tile.body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
