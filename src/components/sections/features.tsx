import {
  CalendarDays,
  ClipboardCheck,
  HandCoins,
  Network,
  Church,
  Users,
  type LucideIcon,
} from "lucide-react";

type Feature = {
  icon: LucideIcon;
  color: string;
  title: string;
  body: string;
};

const features: Feature[] = [
  {
    icon: Users,
    color: "var(--cobalt)",
    title: "Members",
    body: "One record per person — family links, milestones, notes, and a clear rule about who is allowed to read them.",
  },
  {
    icon: Church,
    color: "var(--violet)",
    title: "Branches",
    body: "Every site gets its own dashboard, staff, service times, and reporting line, without leaving the church account.",
  },
  {
    icon: Network,
    color: "var(--teal)",
    title: "Cell groups",
    body: "Keep leaders, meeting nights, and rosters current. Chapl surfaces anyone a cell hasn't seen in three weeks.",
  },
  {
    icon: ClipboardCheck,
    color: "var(--gold)",
    title: "Attendance",
    body: "Count heads by service, branch, or cell from a phone at the door. Put any two Sundays side by side.",
  },
  {
    icon: HandCoins,
    color: "var(--emerald)",
    title: "Giving",
    body: "Record tithes, pledges, and building-fund gifts against the giver, and issue statements when the year closes.",
  },
  {
    icon: CalendarDays,
    color: "var(--ruby)",
    title: "Services and events",
    body: "Plan the order of service, assign the worship team and ushers, and let people confirm they're on before Sunday.",
  },
];

export function Features() {
  return (
    <section id="run" className="border-b border-line bg-mist">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div>
            <p className="eyebrow text-ink-3">What you run</p>
            <h2 className="head mt-4 max-w-[18ch] text-[clamp(2rem,4vw,3rem)]">
              The whole week, not just Sunday.
            </h2>
          </div>
          <p className="max-w-sm text-[15px] leading-[1.6] text-ink-2">
            Six things every branch office is already doing on paper, in
            WhatsApp, and in someone&apos;s spreadsheet.
          </p>
        </div>

        <ul className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, color, title, body }) => (
            <li
              key={title}
              className="group bg-paper p-7 transition-colors hover:bg-sunk"
            >
              <span
                className="grid h-11 w-11 place-items-center rounded-full"
                style={{
                  background: `color-mix(in oklab, ${color} 13%, transparent)`,
                  color,
                }}
              >
                <Icon className="h-[21px] w-[21px]" strokeWidth={1.8} />
              </span>
              <h3 className="mt-5 text-[16px] font-semibold tracking-tight text-ink">
                {title}
              </h3>
              <p className="mt-2.5 text-[14.5px] leading-[1.62] text-ink-2">
                {body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
