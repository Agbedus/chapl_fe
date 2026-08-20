import { Headphones, Play, Video } from "lucide-react";

type Sermon = {
  title: string;
  speaker: string;
  date: string;
  length: string;
  formats: ("video" | "audio")[];
};

const sermons: Sermon[] = [
  {
    title: "What the Upper Room Was For",
    speaker: "Ps. Kwabena Asante",
    date: "4 Aug",
    length: "38:12",
    formats: ["video", "audio"],
  },
  {
    title: "House to House",
    speaker: "Ps. Adjoa Nyarko",
    date: "28 Jul",
    length: "41:05",
    formats: ["video", "audio"],
  },
  {
    title: "The Widow Named in Verse Nine",
    speaker: "Ps. Kwabena Asante",
    date: "21 Jul",
    length: "35:47",
    formats: ["audio"],
  },
  {
    title: "Barnabas Sold a Field",
    speaker: "Ev. Selorm Agbo",
    date: "14 Jul",
    length: "29:33",
    formats: ["video", "audio"],
  },
];

// Deterministic waveform — decoration that at least behaves like sound.
const bars = Array.from({ length: 68 }, (_, i) => {
  const v = Math.abs(Math.sin(i * 1.17) * 0.55 + Math.sin(i * 0.41) * 0.45);
  return 16 + v * 84;
});

const PLAYED = 24;

export function Media() {
  return (
    <section id="media" className="on-dark bg-[#090b10]">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div>
            <p className="eyebrow text-ink-3">Media room</p>
            <h2 className="head mt-4 max-w-[16ch] text-[clamp(2rem,4vw,3rem)] text-ink">
              Sunday keeps preaching all week.
            </h2>
          </div>
          <p className="max-w-sm text-[15px] leading-[1.6] text-ink-2">
            Upload once. Chapl publishes the video, splits the audio for the
            podcast feed, and files it under the right series and branch.
          </p>
        </div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl bg-line lg:grid-cols-[1.15fr_1fr]">
          {/* Featured */}
          <div className="min-w-0 bg-paper p-6 sm:p-9">
            <p className="eyebrow text-accent">Acts, slowly · Part 7</p>
            <h3 className="head mt-4 text-[clamp(1.5rem,2.6vw,2rem)] text-ink">
              {sermons[0].title}
            </h3>
            <p className="mt-3 text-[14px] text-ink-2">
              {sermons[0].speaker} · Central · {sermons[0].date}
            </p>

            <div className="mt-9 flex items-center gap-5">
              <button
                type="button"
                aria-label={`Play ${sermons[0].title}`}
                className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent text-accent-ink transition-transform hover:scale-105"
              >
                <Play className="h-5 w-5 translate-x-px fill-current" />
              </button>

              <div
                className="flex h-14 min-w-0 flex-1 items-end gap-[3px]"
                aria-hidden
              >
                {bars.map((h, i) => (
                  <span
                    key={i}
                    className={`w-full rounded-full ${
                      i < PLAYED ? "bg-accent" : "bg-line-strong"
                    }`}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="tnum mt-3 flex justify-between text-[12px] text-ink-3">
              <span>13:24</span>
              <span>{sermons[0].length}</span>
            </div>
          </div>

          {/* Recent */}
          <ul className="grid min-w-0 gap-px bg-line">
            {sermons.slice(1).map((sermon) => (
              <li
                key={sermon.title}
                className="group flex min-w-0 items-center gap-4 bg-paper px-6 py-5 transition-colors hover:bg-mist sm:px-7"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunk text-ink-2 transition-colors group-hover:bg-accent group-hover:text-accent-ink">
                  <Play className="h-3.5 w-3.5 translate-x-px fill-current" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14.5px] font-medium tracking-tight text-ink">
                    {sermon.title}
                  </p>
                  <p className="mt-1 truncate text-[12.5px] text-ink-3">
                    {sermon.speaker} · {sermon.date}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2.5">
                  {sermon.formats.includes("video") && (
                    <Video
                      className="h-4 w-4 text-violet"
                      strokeWidth={1.8}
                      aria-label="Video"
                    />
                  )}
                  {sermon.formats.includes("audio") && (
                    <Headphones
                      className="h-4 w-4 text-teal"
                      strokeWidth={1.8}
                      aria-label="Audio"
                    />
                  )}
                  <span className="tnum w-11 text-right text-[12.5px] text-ink-3">
                    {sermon.length}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
