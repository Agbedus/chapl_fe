import { branches, churchName, totals } from "@/lib/congregation";

const branch = branches[1];
const shownCells = branch.cells.slice(2, 4);

const notes = [
  {
    title: "Counts roll up",
    body: "A head counted in a cell is counted in its branch and in the church, the same Sunday, without anyone re-entering it.",
  },
  {
    title: "Access rolls down",
    body: "A branch pastor sees their branch. A cell leader sees their twelve. Nobody has to be trusted with more than their job needs.",
  },
  {
    title: "People move, history stays",
    body: "Move someone from Madina to Tema and their attendance, giving, and notes move with them. The record is the person, not the seat.",
  },
];

function Layer({
  label,
  title,
  meta,
  color,
  children,
}: {
  label: string;
  title: string;
  meta: string;
  color: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-line bg-paper p-3.5 sm:p-4">
      <div className="flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <span className="dot shrink-0" style={{ color }} aria-hidden />
          <span className="truncate text-[14px] font-semibold tracking-tight text-ink">
            {title}
          </span>
          <span className="eyebrow shrink-0 text-ink-3">{label}</span>
        </div>
        <span className="tnum shrink-0 text-[13px] text-ink-3">{meta}</span>
      </div>
      {children ? <div className="mt-3.5">{children}</div> : null}
    </div>
  );
}

export function Structure() {
  return (
    <section id="structure" className="border-b border-line">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="grid gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20">
          <div>
            <p className="eyebrow text-ink-3">Structure</p>
            <h2 className="head mt-4 max-w-[16ch] text-[clamp(2rem,4vw,3rem)]">
              A church is not a flat list of people.
            </h2>
            <p className="mt-6 max-w-md text-[17px] leading-[1.6] text-ink-2">
              Chapl models what you already have. One church, its branches, the
              cells inside them, and a person at the bottom of it all.
            </p>

            <div className="mt-10 rounded-2xl border border-line bg-mist p-3.5 sm:p-4">
              <Layer
                label="Church"
                title={churchName}
                meta={`${totals.members.toLocaleString()} people`}
                color="var(--ink-3)"
              >
                <Layer
                  label="Branch"
                  title={branch.name}
                  meta={`${branch.members} people`}
                  color={branch.color}
                >
                  <div className="space-y-2.5">
                    {shownCells.map((cell) => (
                      <Layer
                        key={cell.id}
                        label="Cell"
                        title={cell.name}
                        meta={`${cell.members} people`}
                        color={branch.color}
                      >
                        <div
                          className="flex flex-wrap gap-[5px]"
                          style={{ color: branch.color }}
                          aria-hidden
                        >
                          {Array.from({ length: cell.members }, (_, i) => (
                            <span
                              key={i}
                              className={i < cell.present ? "dot" : "dot-hollow"}
                            />
                          ))}
                        </div>
                      </Layer>
                    ))}
                  </div>
                  <p className="mt-3 pl-1 text-[12.5px] text-ink-3">
                    + {branch.cells.length - shownCells.length} more cells in{" "}
                    {branch.name}
                  </p>
                </Layer>
                <p className="mt-3 pl-1 text-[12.5px] text-ink-3">
                  + {totals.branches - 1} more branches
                </p>
              </Layer>
            </div>
          </div>

          <div className="lg:pt-40">
            <ul className="divide-y divide-line border-t border-line">
              {notes.map((note) => (
                <li key={note.title} className="py-7">
                  <h3 className="text-[15px] font-semibold tracking-tight text-ink">
                    {note.title}
                  </h3>
                  <p className="mt-2.5 text-[15px] leading-[1.6] text-ink-2">
                    {note.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
