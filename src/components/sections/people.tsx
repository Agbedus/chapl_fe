import { Bell, Cake, HeartHandshake } from "lucide-react";

const birthdays = [
  { name: "Ama Boateng", when: "Tue", note: "turns 34 · Central" },
  { name: "Kwame Mensah", when: "Thu", note: "turns 61 · Adenta" },
  { name: "Efua Owusu", when: "Sat", note: "turns 19 · Tema" },
];

const unseen = [
  { name: "Yaw Darko", when: "12 Jul", note: "Wellspring 3 · Adenta" },
  { name: "Naa Ayikailey", when: "19 Jul", note: "Anchor 1 · Tema" },
  { name: "Sedem Kudjo", when: "19 Jul", note: "Ridge 4 · Kasoa" },
];

export function People() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="eyebrow text-ink-3">People, not rows</p>
          <h2 className="head mt-4 text-[clamp(2rem,4vw,3rem)]">
            The point of a good record is that someone gets a call.
          </h2>
          <p className="mt-6 max-w-lg text-[17px] leading-[1.6] text-ink-2">
            Chapl puts the week&apos;s names in front of you before you go
            looking for them.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {/* Birthdays */}
          <div className="rounded-2xl border border-line p-6">
            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 place-items-center rounded-full"
                style={{
                  background: "color-mix(in oklab, var(--gold) 14%, transparent)",
                  color: "var(--gold)",
                }}
              >
                <Cake className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <h3 className="text-[15px] font-semibold tracking-tight text-ink">
                Birthdays this week
              </h3>
            </div>

            <ul className="mt-5 divide-y divide-line border-t border-line">
              {birthdays.map((p) => (
                <li key={p.name} className="flex items-baseline gap-3 py-3.5">
                  <span className="tnum w-9 shrink-0 text-[12.5px] text-ink-3">
                    {p.when}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-medium text-ink">
                      {p.name}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-ink-3">
                      {p.note}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Care */}
          <div className="rounded-2xl border border-line p-6">
            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 place-items-center rounded-full"
                style={{
                  background: "color-mix(in oklab, var(--ruby) 14%, transparent)",
                  color: "var(--ruby)",
                }}
              >
                <HeartHandshake className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <h3 className="text-[15px] font-semibold tracking-tight text-ink">
                Not seen in three weeks
              </h3>
            </div>

            <ul className="mt-5 divide-y divide-line border-t border-line">
              {unseen.map((p) => (
                <li key={p.name} className="flex items-baseline gap-3 py-3.5">
                  <span className="tnum w-9 shrink-0 text-[12.5px] text-ink-3">
                    {p.when}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-medium text-ink">
                      {p.name}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-ink-3">
                      {p.note}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Notification */}
          <div className="rounded-2xl border border-line p-6">
            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 place-items-center rounded-full"
                style={{
                  background:
                    "color-mix(in oklab, var(--cobalt) 14%, transparent)",
                  color: "var(--cobalt)",
                }}
              >
                <Bell className="h-[18px] w-[18px]" strokeWidth={1.8} />
              </span>
              <h3 className="text-[15px] font-semibold tracking-tight text-ink">
                Going out Thursday
              </h3>
            </div>

            <div className="mt-5 border-t border-line pt-5">
              <div className="rounded-xl bg-mist p-4">
                <p className="text-[14.5px] leading-[1.55] text-ink">
                  Midweek service moves to 6:30pm from this week.
                </p>
              </div>

              <dl className="mt-5 space-y-3 text-[13px]">
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-3">To</dt>
                  <dd className="text-right text-ink-2">Adenta, Tema</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-3">Reaches</dt>
                  <dd className="tnum text-right text-ink-2">284 members</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-ink-3">Channels</dt>
                  <dd className="text-right text-ink-2">SMS, push, email</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
