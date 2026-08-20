import { Logo } from "@/components/logo";

const columns = [
  {
    title: "Platform",
    links: ["Members", "Branches", "Cell groups", "Attendance", "Giving"],
  },
  {
    title: "Media",
    links: ["Sermon library", "Podcast feed", "Live stream", "Series"],
  },
  {
    title: "Church",
    links: ["Pricing", "Migrating your records", "Security", "Support"],
  },
];

export function SiteFooter() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-6 py-14">
      <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Logo />
          <p className="mt-4 max-w-[26ch] text-[13.5px] leading-[1.6] text-ink-3">
            Church management for congregations that meet in more than one
            place.
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="text-[13px] font-semibold tracking-tight text-ink">
              {column.title}
            </h3>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-[13.5px] text-ink-3 transition-colors hover:text-ink"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-7">
        <p className="text-[13px] text-ink-3">
          © {new Date().getFullYear()} Chapl
        </p>
        <div className="flex gap-5 text-[13px] text-ink-3">
          <a href="#" className="transition-colors hover:text-ink">
            Privacy
          </a>
          <a href="#" className="transition-colors hover:text-ink">
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}
