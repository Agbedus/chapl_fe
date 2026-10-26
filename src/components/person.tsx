"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Building2, Compass, Mail, Phone } from "lucide-react";

import { personCard, type PersonCard } from "@/app/actions/people";
import { Popover } from "@/components/ui/popover";

/**
 * A person's face: their photo where they have one, else their initial.
 *
 * One component so every list, table and card shows the same thing for
 * the same person — a photo in the directory and a letter in the
 * register for one man reads as two people.
 */
export function Avatar({
  name,
  src,
  size = 24,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const letter = (name || "?").trim()[0]?.toUpperCase() ?? "?";
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, Math.round(size * 0.42)),
        background: "color-mix(in oklab, var(--cobalt) 11%, transparent)",
        color: "var(--cobalt)",
      }}
      aria-hidden
    >
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element -- served by the API; no loader to configure
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} loading="lazy" />
      ) : (
        letter
      )}
    </span>
  );
}

// Fetched cards, kept for the life of the page so a second hover is instant.
const cards = new Map<string, Promise<PersonCard>>();

function ageOf(dob: string | null): number | null {
  if (!dob) return null;
  const born = new Date(`${dob}T12:00:00`);
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) years -= 1;
  return years;
}

/**
 * A person's name as a link, with a card that opens after a deliberate
 * hover.
 *
 * The delay is the point: a table is swept with the cursor all day, and
 * a card that jumped out under every name would be a table you could
 * not read. Holding still on a name for about a second and a half is
 * asking. What the card shows is whatever the API lets *you* see of
 * them — see `personCard`.
 */
export function PersonLink({
  id,
  name,
  avatar,
  showAvatar = true,
  className = "font-medium text-ink hover:underline",
}: {
  id: string;
  name: string;
  avatar?: string | null;
  showAvatar?: boolean;
  className?: string;
}) {
  const anchor = useRef<HTMLAnchorElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<PersonCard | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function start() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (!cards.has(id)) cards.set(id, personCard(id));
      cards.get(id)!.then(setCard);
      setOpen(true);
    }, 1500);
  }
  function stop() {
    if (timer.current) clearTimeout(timer.current);
    setOpen(false);
  }

  const age = card?.ok ? ageOf(card.dateOfBirth) : null;

  return (
    <>
      <Link
        ref={anchor}
        href={`/app/people/${id}`}
        onMouseEnter={start}
        onMouseLeave={stop}
        onFocus={stop}
        className={`inline-flex items-center gap-2 ${className}`}
      >
        {showAvatar && <Avatar name={name} src={avatar} size={22} />}
        <span className="truncate">{name}</span>
      </Link>

      <Popover open={open} onClose={stop} anchor={anchor} width={260}>
        <div className="p-3" onMouseEnter={() => timer.current && clearTimeout(timer.current)}>
          <div className="flex items-center gap-2.5">
            <Avatar name={name} src={card?.ok ? card.avatar : avatar} size={40} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-ink">{card?.ok ? card.name : name}</p>
              <p className="truncate text-[11.5px] text-ink-3">
                {card === null
                  ? "Loading…"
                  : !card.ok
                    ? "Outside what you can see"
                    : [card.gender, age != null ? `${age}` : null].filter(Boolean).join(" · ") || "Member"}
              </p>
            </div>
          </div>
          {card?.ok && (
            <ul className="mt-2.5 space-y-1.5 border-t border-line pt-2.5 text-[12px] text-ink-2">
              {(card.branch || card.cell) && (
                <li className="flex items-center gap-2">
                  {card.cell ? <Compass className="h-3.5 w-3.5 text-ink-3" aria-hidden /> : <Building2 className="h-3.5 w-3.5 text-ink-3" aria-hidden />}
                  <span className="truncate">{[card.branch, card.cell].filter(Boolean).join(" · ")}</span>
                </li>
              )}
              {card.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-ink-3" aria-hidden />
                  <a href={`tel:${card.phone}`} className="truncate hover:text-ink">{card.phone}</a>
                </li>
              )}
              {card.email && (
                <li className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-ink-3" aria-hidden />
                  <a href={`mailto:${card.email}`} className="truncate hover:text-ink">{card.email}</a>
                </li>
              )}
            </ul>
          )}
        </div>
      </Popover>
    </>
  );
}
