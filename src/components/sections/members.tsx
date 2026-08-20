import {
  HandCoins,
  MapPin,
  PlayCircle,
  UserRoundCog,
  type LucideIcon,
} from "lucide-react";

const items: { icon: LucideIcon; color: string; title: string; body: string }[] =
  [
    {
      icon: UserRoundCog,
      color: "var(--cobalt)",
      title: "Keep your own details right",
      body: "New phone number, new address, a child added — the member changes it, the office doesn't retype it.",
    },
    {
      icon: MapPin,
      color: "var(--teal)",
      title: "Find your cell",
      body: "Which group, whose house, which night, and who to tell when you can't make it.",
    },
    {
      icon: PlayCircle,
      color: "var(--violet)",
      title: "Catch the one you missed",
      body: "The whole sermon library, video or audio, on the same login.",
    },
    {
      icon: HandCoins,
      color: "var(--emerald)",
      title: "Give, and keep the receipt",
      body: "Tithes, pledges, and project gifts, with a statement the member can pull up themselves.",
    },
  ];

export function Members() {
  return (
    <section id="members" className="border-b border-line bg-mist">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div>
            <p className="eyebrow text-ink-3">For members</p>
            <h2 className="head mt-4 max-w-[14ch] text-[clamp(2rem,4vw,3rem)]">
              Everyone gets their own door in.
            </h2>
            <p className="mt-6 max-w-md text-[17px] leading-[1.6] text-ink-2">
              The record the office keeps is the account a member signs into.
              One church, one truth, no Monday morning phone calls to correct a
              spelling.
            </p>
          </div>

          <ul className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2">
            {items.map(({ icon: Icon, color, title, body }) => (
              <li key={title} className="bg-paper p-6">
                <Icon
                  className="h-[22px] w-[22px]"
                  strokeWidth={1.8}
                  style={{ color }}
                />
                <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-ink">
                  {title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-ink-2">
                  {body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
