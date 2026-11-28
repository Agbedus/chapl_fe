<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Chapl

Client-side front end for a church management system. Two audiences share one
app: church/branch administration, and members. Data will come from an external
API — nothing here talks to a backend yet, and `src/lib/congregation.ts` is
seeded sample data, not a fixture layer to build on.

Domain hierarchy, which the UI is organised around: **church → branch → cell →
person.** Counts roll up that tree; access rolls down it.

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind v4 ·
`lucide-react` for icons · `next-themes` for the light/dark class.

## Design system

All tokens live in `src/app/globals.css`. Use them; don't reach for raw
Tailwind palette colours (`blue-600`, `gray-100`, …) anywhere in this app.

**Surfaces and text** — `paper` `mist` `sunk` `line` `line-strong`, and
`ink` / `ink-2` / `ink-3`. Light is the default theme; `.dark` on `<html>`
flips every token. A section that stays dark in *both* themes (currently only
the media room) takes the `.on-dark` class, which re-declares the tokens
locally so the jewel tones stay legible against near-black.

**The six brights** are a stained-glass palette, and each hue is bound to one
domain — don't reassign them:

| token | domain |
| --- | --- |
| `cobalt` | people, brand |
| `violet` | branches, video |
| `teal` | cells, audio |
| `emerald` | giving |
| `gold` | attendance, birthdays |
| `ruby` | care, notifications |

`accent` / `accent-ink` is the button pair — always use both together, because
cobalt inverts to a light blue in dark mode and needs dark text on it.

**Type** — `.display` (hero), `.head` (section headings), `.eyebrow` (kickers,
needs an explicit colour class), `.tnum` (tabular figures for any number).
Bricolage Grotesque for display, Instrument Sans for everything else.

**The dot** is the atomic unit of the visual language: `.dot` is one person,
`.dot-hollow` is one person who wasn't there. The congregation field, the
landing story, the closing block, and the logo are all built from it. Keep
it that way — a new chart type should be asked about before it's added.

**The hero is the app's mark, drawn in the congregation.** A round arch
of dots with the cross cut out of it and one ringed dot where the arms
meet: the phone app's `CrossShape` (traced from the film's last frame),
on the same grid, sampled finer until it holds every member of the sample
church (`lib/dot-scenes.ts`, `doorScene`). The four lights the cross
makes and the sill below take the jewel hues as panes of glass. The arch
is the circle the phone's stepped table approximates (centre row 10,
radius 10.3), so it stays round at any density.

**Christian elements** are drawn from the system's own parts rather than
imported as clip-art. `components/dot-cross.tsx` builds a Latin cross out
of `.dot` — the same atom as the congregation field and the logo — so it
belongs to the page instead of sitting on it; `CrossRule` is that cross
between two hairlines, used where a section break should say something.
The `Scripture` section carries Romans 12:5 in the **King James Version**,
chosen for cadence and because it is public domain — a modern translation
would read more plainly and would also be somebody's copyright. The hero's
arch and rose are redrawn behind it as a single hairline at ~5% so the
section reads as part of the same building. The rule throughout is one
gesture per section and never two: a verse squeezed beside a feature grid
reads as a sticker.

## Motion

**The landing page is one story told in the product's own dots,** to
the person setting a church up. `components/landing/story.tsx` holds the
hero and seven chapters over a sticky WebGL stage (`dot-stage.tsx`,
three.js). The same ~800 points, one per person in `congregation.ts`,
move through eight scenes: the door; then everyone but one person
gathers into them and vanishes (*It starts with one*); their cell
gathers round them; their branch; the whole church; Sunday's hall filling
as people check in; a show of hands for *Ask the room*; and the payoff,
the whole church closing back into the door with the one still ringed,
the numbers counting up and the call to action beside it. Scenes are
pure functions in `lib/dot-scenes.ts`, so a resize just asks again.
The echo round the one person is a soft shaded disc (CSS, following
their projected position) scaled and faded by the stage on the same
beat as a ripple that pushes the faint field of everyone else aside as
it passes (`RIPPLE_SECONDS`). Anything computed with trig that reaches
an inline style or a prop is rounded: Node and the browser can disagree
on a sine's last digit, and React fails hydration on it.

- **Positions blend on the CPU**, each person on their own beat, which is
  what makes a morph read as people moving rather than a slide changing.
  The beat is **distance from the one ringed person**, not a random seed:
  a scene change is called in from them and spreads outward as one gesture
  (`journey()` in the tick, fed by per-scene distance arrays built in
  `layout()`). Each dot then travels on an arc, always curving the same way
  round, rising toward the viewer in flight, and lands on a damped spring
  (`spring()`, one small overshoot, pure in its input so scrolling back
  retraces it). Colour, fill and alpha use the spring's value *clamped*;
  position and size use it raw, which is the landing pop. The shader only draws: round dots, hollow rings, a
  slow breath. Colours are read off the CSS variables and re-read when the
  theme toggles, so the dots follow dark mode live.
- **Lit dots glow.** A second `Points` shares the geometry and every
  uniform and draws the same dots larger as a soft falloff, lit ones only
  (a hollow ring gives off nothing). Additive by night, a faint tint by
  day; the theme observer switches it.
- **The door has a Sunday.** The hero opens part-filled and the rest of
  the church arrives over the first eleven seconds, each on their own
  seed, popping as they land. The count under the door is those same
  arrivals, painted only when it changes. Reduced motion shows everyone in.
- **A dot is somebody, in every scene.** With a fine pointer the cursor
  leans on the dots a little and lights the ones it is over (it no longer
  scatters them: you cannot meet somebody who is running away), and the
  nearest drawn dot, found in screen space, gets a card with a name and
  their cell. `nameOf` gives all 798 a different name, fixed by index, and
  calls the ringed one **You**. The card carries a note for the scene it
  is met in: in the room or not here yet, here or missed last Sunday,
  raised a hand or stayed home.
- **Numbers are made of dots** (`dot-numeral.tsx`): a 5x7 matrix per digit,
  lit cells the figure, unlit cells faint hollow rings. `DotNumeral`
  renders every slot the number will ever need so it never changes width;
  `paintNumeral` rewrites which cells are lit on the nodes, so GSAP can
  count without React. The module is deliberately not a client module.
  **Every figure on the landing page is drawn this way**: counts, times,
  percentages and money (the font has `: . , %` as well as digits; a
  `template` such as `"00:00"` or `"0,000"` fixes the shape so punctuation
  stays put while the digits change). In a line of text use `.dm-inline`.
  What stays text on purpose: digits inside a sentence of prose, dates,
  and citations (`Acts 1:13`, `Romans 12:5`), which are words that happen
  to be numbered, not figures.
- **The dot count is the people.** 798 dots are 798 people and no scene
  adds one for decoration; anything decorative is drawn as a line.
- **ScrollTrigger drives it, React never sees it.** `stage-state.ts` is a
  plain object the scroll writes and the stage reads each frame; routing
  that through state would render the tree sixty times a second.
- **The stage sticks inside an absolute layer the height of the story.**
  A sticky element with a negative bottom margin hangs a full screen past
  its container; this one lets go exactly where the story ends.
- **Sunday counts with the scroll, and holds.** The count starts as the
  chapter comes up from the bottom of the screen. On a wide screen, if
  its words reach the middle (level with the room) before everyone is in,
  the page holds there: Lenis is stopped through `chapl:scroll-lock`,
  pinned with `chapl:scroll-to`, and the wheel, touch and keys feed the
  count instead of moving the page, until the room is full and the story
  goes on. Scrolling up while held counts down and then lets go; a link
  out (`a[href^='#']`) lets go at once. A phone and reduced motion keep a
  plain scroll-driven fill, because pinning a thumb is worse. The bar
  under the count fills with it.
- **Chapters are numbered in dots** (`01`–`07`), and the cell, branch and
  church chapters carry their figures in a card beside the words.
- three.js loads with `next/dynamic` and `ssr: false`, after the words
  have painted. No WebGL means an empty stage and copy that stands alone.

**The page has three habits, and they are the same in every section.**
Every heading ends on the ringed dot (`components/landing/stop.tsx`: `Stop`,
or `Stopped` for a string) where its full stop would be: the story's "one
person" at the size of a punctuation mark. Use it on a heading and
nowhere else. Sections are **bands** ruled across the page (`.band`), not
panels: one hairline that carries a ringed dot at the content's left edge,
content between two faint verticals (`.frame`), and grids drawn as a
`.ledger` (one-pixel gaps over a line-coloured ground, so cells share their
edges; `.tile` is a cell, with a short rule of its domain's hue and
nothing else). Members' six doors are ruled rows with a hue rule that
grows down the active one. **There is no shadow anywhere on this page**:
depth is a line and a change of surface. The only `box-shadow`s left are
zero-blur rings (a hollow dot, the phone's bezel, an avatar's outline),
which are drawn that way and are not shadows. Reveal a ledger cell's
*contents*, not the cell, or the ground shows through grey while it waits.

The header is an **island** (`nav-island.tsx`) with three shapes on one
curve (`--ease-drawer`): wide at the top; a compact pill (logo mark, the
section you are in, the way in) on the way down, open again on the way up
or when pointed at; and an open menu that grows out of the bar over a dimmed,
blurred page, each section a row with a drawing in the page's dots that
changes as you move over it (`dot-art.tsx`). Shape is written to
attributes, not state; only "menu open" and the hovered row are state. The
page stops scrolling while it is open, through a `chapl:scroll-lock` event
that `smooth-scroll.tsx` answers, because Lenis owns the wheel. A page with
no sections gets the plain `.site-bar` instead. One trap: `.btn` sets its
own `display`, and an unlayered rule beats Tailwind's `hidden` on the same
node, so hide a button with a wrapper, not a class on it.

Below the story, GSAP does the rest, each with a reason. The light
sections carry `.quiet-dots`: a faint dot grid that breathes, and a
brighter patch of it following the pointer (`quiet-dots.tsx`, one
listener for the page). **Try Sunday** (`try-sunday.tsx`, `#try`, between the week and the media
room) lets a visitor do what a member does: the screen at the front
shows the code in dots, the phone takes six characters (or "Type it for
me"), and the right code seats you, ringed, in a room of 120 whose count
the screen and phone share, then puts the question up with your hand in
your answer. Nothing leaves the page. The media room's waveform is
columns of dots that the scroll plays until somebody touches it; after
that, play runs in real time and a click, drag or arrow key seeks. The
week's tiles and the members' doors are drawn in `DotArt` too, in
`currentColor`, so each takes its own hue. The member section's phone shows each of the six
doors as it passes the middle of the screen or is pointed at. Its header
and body share one template (`.members-grid`: the doors' column and the
phone's 300px), so the title sits over the doors and the intro over the
phone; the doors split the phone's height in six equal rows, so the two
columns start and end together. On wide screens the story's copy keeps a
column of its own (`.story-gutter`), stopping 6vw short of the stage. The FAQ
opens answers on a `grid-template-rows` transition. the bento's
tiles arrive in batches, the giving months rise into their heights, the
media room's waveform is played by the scroll, the cross gathers out of
scattered dots before the verse is read, and the congregation gathers
into one block for the last ask. Hover effects are gated on a fine
pointer. `Magnetic` leans a CTA toward the cursor on a spring.

**Lenis** smooths the wheel on the home page only and feeds
`ScrollTrigger.update` from the same GSAP ticker, so scrubbed scenes move
with the page instead of a frame behind it. Touch keeps native momentum.
In development `window.__lenis` is the instance, for driving the page
from the console.

`prefers-reduced-motion` is honoured throughout: no Lenis, no breathing,
no cursor, scenes snap instead of morphing, reveals fade without moving,
and the gatherings start already gathered.

The packages are pinned exactly: `gsap` 3.15.0, `@gsap/react` 2.1.2,
`three` 0.186.1, `lenis` 1.3.27.

## The app half

Everything under `/app` is the signed-in product; `/` is still the
marketing page.

**Auth is server-side only.** The access token lives in an httpOnly cookie
this app sets — never `localStorage`, never client JS. Every backend call
goes through `src/lib/api.ts` from a Server Action or Server Component, so
the browser only ever talks to its own origin and there is no CORS or
cookie-domain problem to solve. `CHAPL_API_URL` has no `NEXT_PUBLIC_`
prefix for the same reason.

`src/lib/session.ts` owns the cookies. `getMe()` asks the API rather than
decoding the token, so a revoked assignment or changed password takes
effect on the next request instead of at expiry.

**Tenant scope** rides in a second cookie and is sent as `X-Church-Id`.
Platform staff with none selected get every church; `?church_id=all` keeps
that scope while navigating.

## Charts

TanStack Charts (`@tanstack/charts`), wrapped in `src/components/charts.tsx`.
Five things to know:

- Scales are d3 factories from subpath imports — `@tanstack/charts/scales/linear`,
  `/band`, `/ordinal`, `/point`. Not strings.
- There is **no time scale** shipped. Time series plot on a point scale over
  pre-formatted labels rather than pulling in `d3-scale`.
- Capabilities live behind subpaths: `/polar` (donut, radial bars), `/waffle`,
  `/geo` (the branch map), `/tooltip`. Only the cartesian marks come from the
  root entry point.
- Colours are `var(--…)`, so charts follow the theme toggle without
  rebuilding their definition. The palette itself lives in
  `src/lib/palette.ts`, **not** in `charts.tsx` — every export of a
  `"use client"` module is a client reference, and the server-rendered lists
  beside the charts have to agree with them on a colour.
- Every wrapper carries `tooltip`. Time series focus `nearest-x`, stacked
  columns `group-x`, so a hover reads the whole week rather than one bar.

The package is **pre-alpha** (0.9.0) and says its API may change between
releases. Pin it, and re-read `node_modules/@tanstack/charts/docs/` after
any upgrade rather than trusting these wrappers to still compile.

## The dashboard

`/app` is one page for two audiences. `GET /dashboard` answers both: a
leader gets their tenant, platform staff with no church selected get
`platform: true` and the same fields computed across every church, plus a
`churches` league table. The backend's Jinja admin screen is a different
thing — telemetry, integrity probes, table shortcuts — and none of it
belongs here.

The dashboard reads top to bottom in the order a leader's Monday goes:
the **pulse** (people, turnout, cells at risk, giving: one ruled strip,
two by two on a phone, each figure counting up once and each cell the
way into its page), then **Needs you** beside **Turnout**, then the
congregation, then branch by branch and cell by cell, then giving, then
who the church is (new people, care, ages). No page kicker, no line of
prose under a panel title: a panel's explanation is an `Info` "i" beside
it (`Panel`'s `lede`), and its way out is one arrow in the corner
(`href`). Each panel opens on its figure (`Headline`) and the chart under
it is the why.

The chart types are varied because the questions are, and each is the
form its question has:

| panel | form | why |
| --- | --- | --- |
| Turnout | line against a dashed 70% rule, no fill | a share that moves a few points; the fill would pin the axis to zero |
| Branches | bullet bars out of 100, one shared tick at the church-wide figure | "behind the rest of us" reads off the tick |
| Cells | one segmented bar, then the weakest four | three bands of one whole; then where to start |
| Giving | monthly columns, dashed average, this month pale | each month is a total; the current one is not over |
| By type | donut with the total in the hole | the one real "whole in parts" |
| New people | columns of joins per month | the cumulative roll only ever rises |
| Care | stages on a rail, in order | it is a pipeline, so where work piles up is the point |
| Ages | histogram with values printed, gender as a thin split bar | ordered bins, few enough to label |

**The same rules hold on every screen.** The chart wrappers carry the
dashboard's behaviour themselves (`.chart-quiet` with draw-in or rise),
so a chart anywhere gets it without asking. Attendance, giving and the
church page follow the dashboard's choices too: branch turnout as
bullets against the service's figure, cell health and gender as split
bars, ages as a histogram, care as stages, giving by month as columns
with an average. A ring's hole holds its figure alone, never a caption.

The bars, bullets, stages and histogram are server-rendered HTML in
`panels.tsx` (`Pulse`, `Headline`, `Delta`, `Bullets`, `SegmentBar`,
`Stages`, `Histogram`); lines, columns and the donut are TanStack in
`charts.tsx`. Every bar grows from its start and every column from its
floor, once, on CSS; TanStack charts are revealed with a clip
(`.chart-draw` left to right, `.chart-rise` bottom up), because its own
motion renderer skips server-rendered SVG. Pointing at a part dims the
rest. A change is always `Delta`: signed, with an arrow, so it reads
without its colour.

**Headline figures are in the landing page's dots** (`DotFigure`,
`components/dot-figure.tsx`): the pulse, panel headlines, every
`StatCard` in the product, and the hole of a ring. The part the dot font
can draw (digits, `, . : %`, a trailing K or M) is a `DotNumeral`; a
currency before it is small text. It renders the finished figure on the
server and counts up once after mount through `paintNumeral`, with a
timer that lands it if a background tab throttles the frames.

**Dashboard charts carry no axes until asked.** `.chart-quiet` hides
ticks, tick labels and the grid on a fine pointer until the chart is
hovered or focused; the target and average rules stay, and the tooltip
gives exact values. The ages histogram prints its counts the same way.
The library focuses its SVG on click, so `.ts-chart` has no focus
outline anywhere; keyboard focus shows inside the chart instead.

**The map** is `geoShape` over a `geoMercator` fitted to the pins — no tile
server, no third-party script. Branches carry `latitude`/`longitude` on the
API; a branch without them is counted in the caption rather than dropped
silently. Circle area is the roll, fill is turnout, and `turnoutColour()`
in `src/lib/palette.ts` keeps the map and the list beside it in agreement.

## The signed-in visual language

**The side nav collapses without re-flowing the page.** Its width is a
transition, and everything beside it used to re-lay out on every frame of
it: each TanStack chart rebuilt its SVG on resize, the map resized its
canvas. `AppNav`'s toggle pins the content column (`[data-app-main]`) at
the width it will end at, so it lays out and draws once and then only
slides beside the rail, the shell clipping the overhang
(`overflow-x-clip`), and unpins when the rail lands. The active marker's
position is written to its node, not state, for the same reason.

The marketing page and the product had drifted into two design systems —
the home page breathing at 17px with display type and pill buttons, the
admin screens at 12.5px in a grid of boxes. These are the rules that put
them back together, and they live at the bottom of `globals.css`.

**Compact by default.** These screens are worked in, not read through.
`.sheet` is the one container — hairline, 12px radius, 14/16px inset —
and the shell has almost no horizontal gutter, because a capped reading
column on a wide monitor just moves the work into a scroll. Air belongs
*inside* a panel, between a label and its number, not around the window.
Nesting sheets is how an admin UI ends up looking like a spreadsheet in a
costume; a panel inside a panel is `.sheet-mist` or nothing.

**One type scale.** Panel titles at 13px semibold, body at 12–12.5px,
11px for metadata. `.figure` puts headline numbers in the display face
with tabular figures, so a column of them lines up and a changing one
does not reflow.

**The congregation field is the signature.** `components/congregation.tsx`
draws one dot per member, grouped into cells and branches, filled if that
person was in a seat at the last service. It is the marketing page's
signature moved into the product, and it earns its place for a reason no
chart can: it is not a summary of the church, it *is* the church at one
to one. A branch with three hollow columns tells an administrator which
cells, how many, and how they sit next to each other — none of which a
percentage says. Cells carry a turnout percentage rather than a head
count, so the count is derived rather than asking the API for a number it
can already produce.

**Pages are built around what needs doing.** The dashboard opens with the
congregation and then a work queue — people needing a call, cells at
risk, invitations unanswered, birthdays this week — each a link to the
place the work happens. Giving leads with the figures and the shape of
the months, and the ledger comes last: an administrator wants to know
whether giving is holding up before they want row 47.

**Rings carry composition, and their middles are not empty.** A donut
with a hollow centre spent its middle on nothing — `Ring` puts the total
there as HTML. Only data that is genuinely *one whole in a handful of
parts* goes in a ring, and on the dashboard that is giving by type and
nothing else: three bands or two genders are a `SegmentBar`, which says
the same in a third of the height, and a pipeline is `Stages`. More
slices than about six and it is a bar chart wearing a circle. Every
`DonutChart` is a **split ring**: slices cut apart by `pie`'s
`gapAngle` (not a stroke, which read as a hard rule in dark mode), a
band a third of the radius thick, and a corner radius of half the band
so each slice is a rounded bar. The giving ring's hole holds the figure
alone, in dots; the currency and the amounts are in the key.

**Colour is for the six domains and for status.** A `.dot` beside a label
carries the hue; the number beside it stays ink. A wall of coloured
figures is a wall where none of them means anything.

**`.btn` is a rounded square** (12px, 10px for `.btn-sm`), the same
corner as a form field, on the marketing site too. A pill beside a
rounded field reads as two design systems.

**`.page-in` is the one orchestrated moment**, staggered by depth — the
heading, then the numbers, then the detail, and everything past the third
child arrives together. A cascade that runs for a second is a page you
wait for. `prefers-reduced-motion` turns it off.

`components/panels.tsx` holds the furniture every page is built from:
`Page`, `PageHead`, `Panel`, `Stat`, `StatCard`, `Detail`, `Empty`,
`Meter`, `Action`, and the instruments above. A page that reaches past these for its own layout is
a page that will drift.

**Two endpoints exist because this front end needed them** and the API
could not answer the question at all:

- `GET /users/{id}/profile` — one member, measured: attendance history,
  turnout, streak, their cell's rate to compare against, check-ups,
  departments and giving. `/attendance` and `/checkups` filter by branch
  and cell, never by the member. Giving is gated inside the endpoint —
  yourself, or the donation read across the church — and comes back
  `null` rather than 403, so the page omits a panel instead of showing a
  misleading zero.
- `GET /attendance/service` — one service, whole, plus the list of
  service dates the stepper needs.

Both live in `app/services/insight.py` beside the church-level analytics,
because they are the same questions asked at a different scope.

## The management half

Everything a church administrator writes goes through
`src/app/actions/manage.ts` — branches, cells, invitations, people,
placements and role grants. Every action returns a `FormState` rather
than throwing, so a rejected write comes back into the form it came from
with the reason attached and the typed values still on screen.

`src/components/editors.tsx` holds the forms, and it is one client module
for a reason worth knowing: **a function cannot be passed from a Server
Component to a Client Component.** The first version took its fields as a
render prop (`children: (state) => ReactNode`), which type-checked, built
cleanly, and failed at request time with "Functions are not valid as a
child of Client Components". Each form now owns its fields outright and
receives only things that serialise — the record, the select options, and
the Server Action. Server Actions cross the boundary by design.

Pages under `/app` that manage the tree:

| route | what it does |
| --- | --- |
| `/app/church` | Church settings, all of them |
| `/app/branches` | Sites, with counts and turnout, create and edit |
| `/app/cells` | Groups inside branches, grouped by branch |
| `/app/people` | Searchable directory (`?q=` hits the database, not a fetched page) |
| `/app/people/[id]` | One person: record, placement, authority |
| `/app/invitations` | Send, resend, revoke — the whole lifecycle |
| `/app/team` | Who holds which role, over what |
| `/app/departments` | Ministry teams; `[id]` is one team and its roster |
| `/app/audit` | The trail — read-only, all the way down |

## Four things that could be read and not written

The API could do all of this; nothing in the product called it.

**`/app/attendance/register`** is the sheet — the one thing a church
does every week, and the reason every attendance figure exists.
`POST /attendance/bulk` was already there: one request, one permission
pass, `replace_existing` so marking twice is a correction rather than a
doubling. Three decisions in `components/register.tsx`: present is the
default (a roll call records who came, and starting from all-absent is
forty taps for a normal Tuesday); it posts once; and **an unchecked box
sends nothing**, so the whole roster rides along in hidden inputs and
`takeRegister` takes the difference — otherwise the absent would vanish
rather than be recorded as absent.

**Giving** can be entered. `recordGift` always files a gift against its
giver, even an anonymous one: `DonationCreate.user_id` defaults to the
*caller*, so omitting it would file the offering against whichever
administrator counted it and put it in their own giving history.
Anonymous means the name is off the report, not that the money came
from nobody. The button is gated on `canWrite(me, "donation")` — a
senior pastor reads giving and cannot record it, and a control that
always 403s is worse than no control.

**Departments** can be created, edited, and staffed. The roster writes
did not exist on the API at all; `POST /departments/{id}/members` and
its delete are new. Rejoining reactivates the row that is there rather
than writing a second one, and leaving is dated rather than deleted —
"who served in the choir in 2024" is a question a church asks.

**The audit log** has a page. It names its own actors, because the
front end cannot: `/users/` lists a church's *roll*, and the accounts
that appear in a trail are disproportionately staff ones with no
membership, so joining the two rendered almost every row as "Unknown".
`AuditLogRead.user_name` is filled by one join in the endpoint.


`/app/attendance` is built around **one service at a time**, stepped
through with `ServiceStepper`. `GET /attendance/service` answers the
questions a leader actually has on a Monday — how did yesterday go, which
sites and cells were thin, and who was missing — where paging the
attendance table only ever answered "what is in row 47".

The absentee list is the reason the page exists, so it is the largest
thing on it: `components/absentees.tsx`, grouped by branch, ordered by how
long each person has been gone rather than alphabetically. Someone who
missed one Sunday and someone unseen for a month are different problems.

Stepping is a **repeated** action, so `Page` takes `quiet` and the
entrance cascade runs on arrival only. A control pressed ten times in a
row must not make you watch the page assemble itself ten times.


Mail **is** wired up now — the API emails the invitation — but the link
still comes back in the response and `LinkResult` still renders it with
a copy button. Delivery is not a guarantee: the transport may be
unconfigured, or the address may bounce an hour later, and nobody
should have to re-issue an invitation because they could not tell
whether the first one was sent.

`SiteNav` asks who is reading. Signed in, "Sign in · Get started"
becomes one **Dashboard** button and their first name — "Get started"
in particular offers somebody a thing they finished doing. It calls
`getMe()` rather than looking at the cookie, because a cookie says a
token was issued and not that it still works; that makes `/` dynamic,
which is the price of a header that is right.

## Form controls

`src/components/ui/form.tsx` holds the plain ones — `Field`, `Select`,
`Area`, `Fieldset`, `Wide` — and the placeholder does the work of a label
(`Branch name · e.g. Adenta`), so a form is not twice as tall as it needs
to be saying every name twice.

**`src/components/ui/pickers.tsx` replaces every native date and time
input in the app.** There are none left: `grep 'type="date"'` should
return only that file's own doc comment. The native controls render
differently in every browser, ignore the design system completely, and in
Firefox amount to a text box wanting a format nobody guesses right.

| control | replaces | why it exists |
| --- | --- | --- |
| `DateField` | `type="date"` | A month stepper made *date of birth* unusable — opening on this month asks a seventy-year-old to press "previous" 840 times. It carries a 110-year select, and `startYear` points it the right way first. |
| `TimeField` | `type="time"` | 96 quarter hours, opened onto the current value. A church meets on the quarter and types the same six service times forever. |
| `DateTimeField` | `type="datetime-local"` | Event start and end. Two controls, one shadow input, writing the `YYYY-MM-DDTHH:MM` the API already wanted. |
| `ComboField` | `<select>` past ~12 options | Cells (81) and notice/event audiences (88). A select that long is a scroll, not a choice. Search, arrow keys, Enter. |
| `SelectField` / `Listbox` | every other `<select>` | The product's own dropdown, so no grey OS menu lands on a page with its own type and palette. `Select` renders it (and a "None" first when not required); `size="sm"` for a filter, `submitOnChange` for a GET filter form, `form=` for a table row's out-of-form input, and the controlled `Listbox` with `variant="ghost"` for the date picker's month and year. A real listbox: arrows, Home/End, type-ahead, Enter/Space, Escape/Tab. `grep '<select'` should find only comments. |

Three rules hold across all of them:

- **Each keeps a shadow input** (`Value`) carrying the machine value, so
  the forms above them still post ordinary `FormData` to a Server
  Action. Nothing in `editors.tsx` had to learn a new shape. It is a
  real input laid invisibly over the control, *not* `type="hidden"`:
  hidden inputs are barred from constraint validation, so `required` on
  a picker was decoration until a stepped form needed "Next" to know
  whether the step had been answered. `.picker-value` must stay
  rendered — `display: none` bars it again.
- **`DateShell` and `TimeShell` are the controlled cores**; `DateField`
  and `TimeField` are those plus state and the shadow input.
  `DateTimeField` composes the shells directly — two inputs fighting
  over one `name` was the bug that forced the split.
- **They post through `Popover`** (`ui/popover.tsx`), which portals to
  the body. Every one of these opens inside `.modal-body`, which scrolls
  and therefore clips; a date picker cut in half by its own form is worse
  than the native one it replaced. The portal escapes the DOM but not
  React, so `Popover` stops click and Escape from propagating: without
  that, choosing an option travelled up the React tree into the modal
  scrim's click-outside and closed the form the value had just gone
  into.

`Popover` writes its position **straight to the node**, never through
state. The obvious version measures into `useState` and costs a render on
open and another on every scroll frame — the React Compiler rejects it
outright as a cascading render. Position is not data the tree needs; it
is four numbers the browser needs.

`Popover` keeps a stack of the ones open, and only the top one answers
Escape and an outside press, so a dropdown inside the date picker closes
itself and leaves the calendar open.

Escape closes **one** thing. The popover's handler calls
`stopPropagation`, so pressing it with a picker open closes the picker
and leaves the form — and everything typed into it — alone.

## Long forms

A form past about ten fields is a wall, and grouping it into `Fieldset`
sections only turns one wall into a stack of them. `Editor` takes
`steps` instead of `children` for those: Church, Branch, Cell, Person,
Self, Event and Grant. The sections each already had become the steps,
and the rail at the top says how many there are and which one you are
on — the question a long form otherwise refuses to answer.

- **Every step stays mounted**, hidden rather than unmounted. There is
  one `<form>` and one submission, so a field on step 1 has to still be
  in the document when step 4 posts. Unmounting would also discard
  anything typed the moment somebody stepped back to check a spelling.
- **The form carries `noValidate` and checks itself.** A required field
  two steps back is `display: none` at submit time, and Chrome answers
  that with "An invalid form control is not focusable" and no way
  forward. `guard()` finds the first failing control, opens the step it
  lives on, and only then asks the browser to report it.
- **Enter means Next, not Save**, anywhere but the last step.
- **A rejected write opens the step that was rejected**, which is what
  each step's `fields` list is for. Both that and the close-on-success
  are render-phase state adjustments, not effects — the compiler's
  `set-state-in-effect` rule refuses the effect version, and an effect
  would paint the wrong step first anyway.

**Granting a role is dynamic.** `ROLE_SCOPE` is the same table the API
validates against, so choosing *cell leader* is choosing "over a cell",
and the last step asks only for the thing that can follow: cells for
cell roles, branches for branch roles, departments for a department
head, and nothing at all for a church role beyond naming the church.
The old form offered one flat list of every branch and cell for every
role. It also never sent `scope_type`, which the API's schema requires,
so **every grant had come back 422 and the form had never once worked**;
`grantRole` derives it from the role rather than taking it from the
form, because a client copy of that table is a client that can disagree
with it.

## Waiting

`src/app/app/loading.tsx` covers the whole signed-in segment; Next shows
it for any nested route that has not declared its own. Before it existed,
clicking the sidenav left the previous page on screen with no spinner and
no change until the entire next page had rendered on the server. The app
looked broken and felt slow, and only one of those was true.

`components/skeleton.tsx` mirrors the real layout — heading, figures,
panels — so the arrival is a swap rather than a jump. The sweep is a
`translateX` on a pseudo-element rather than an animated
`background-position`, because thirty skeletons repainting every frame is
a page that stutters before it has even loaded.

## Reaching people

`components/contact.tsx` exports `PhoneLink`, which renders a phone
number as two targets: **call** and **WhatsApp**. Pass `actionLabel`
where sending *is* the point of the row — a birthday greeting — and an
unlabelled 13px glyph would otherwise ask the reader to guess which of
two icons does the thing they came for. Everywhere a number appears in this product somebody is
looking at it because they intend to ring, and printing it as text asks
them to read it, hold it in their head and type it somewhere else — which
is how a name in a follow-up queue is still in the follow-up queue next
week.

Both are ordinary links. Nothing is sent from here; the prefilled message
only leaves after the user presses send in their own WhatsApp. The brand
green appears on hover only — a permanent green in a dense table would
outrank the church's own six hues, which are the ones carrying meaning.

## The work queue

The dashboard's queue rows open a modal listing the actual people rather
than linking to a page where you start looking. Two things it got wrong,
both worth remembering:

- **It counted the rows it had been handed.** The API capped
  `needs_followup` at ten and the frontend called that the total, so a
  backlog of twenty-seven announced itself as ten. A work queue that
  under-reports work is worse than no queue: it tells an overloaded
  pastor they are on top of it. `followup_total` is measured in SQL now,
  and the modal says "showing the 25 longest waiting".
- **There was no way to finish.** The modal prompted a call and had no
  way to record that it happened, so somebody rung on Monday still looked
  untouched on Friday. `settleCheckup` closes one off from inside the
  modal; the row goes quiet in place rather than vanishing under the
  cursor, because a list that reorders itself as you press it loses your
  place.

Links out of the queue filter on **ids, not names** — `?branch=<uuid>`.
`/app/cells` reads it and says so in its heading, with a way back out. It
was ignoring the parameter entirely, so "open this cell at risk" landed
on all eighty-one, unfiltered.

## Sunday

**A service is a check-in session**, and everything live hangs off it.
The session already says whose it is — one branch's, or the whole
church's when `branch_id` is empty — so a member is in their branch's
service when it has one open and in the main one otherwise. Nobody
chooses; membership decides. `GET /attendance/live` answers "what am I
in right now" with the room (`present` of `expected`), the sermon dated
for the service, and the question on the screen.

`SundayPanel` (`components/live-service.tsx`) is that answer on the
dashboard: check in, the room as dots filling as people arrive, today's
message, and the question with its answers as dots — one per person, so
it reads like a show of hands. It replaced the old check-in prompt. The
leader's half is the board for each open session on `/app/live`:
the same room, the answers coming in, **Ask the room** and **Close
answers**. Who answered what is never sent anywhere; the room sees
counts.

**The live board is designed apart from the rest of the app.**
`components/live-board.tsx` is used for the member's dashboard panel and
for each open service on `/app/live`, because a live thing is
watched, not worked through. The first line is the service and its code
(a leader sees the code as six large boxes and Close check-in; a member
sees where to type it, or that they are in). Then the room: the headline
figure and a turnout bar, the hall
(`lib/theatre.ts`, the phone's `SeatingLayout` ported): about 120 seats
up to 120 members and 300 beyond (`hallFor`), every row whole, one person
a seat until there are more people than seats and then a seat for a few.
It is drawn as a **fan** of rows round the front split into four blocks
by three aisles, the edges and aisles straight lines with seats running
edge to edge in each row, the first two rows left out so the count sits
in an open point where the pulpit would be, or as **rows** in four blocks
with the count above the front. The reader picks; the choice lives in
`localStorage` and is read with `useSyncExternalStore`, so the server
and first paint say "fan" without a state change in an effect. Seats
wait as rings until the room is scrolled into view, then light in a
scattered order (people do not arrive in rows) on CSS transition delays, and the congregation **by cell**, each cell a small grid of the
same dots. Explanations sit behind an `Info` "i" (`components/info.tsx`,
pure CSS) rather than printed under the figures. Then **every question asked
as a poll**: bars as long as their share, the open one marked Live, a
leader's Close answers on it, and Ask the room beneath. A member taps
their answer on the open question only (`PromptAnswers`) and reads the
rest as results. `LiveService.prompts` and `.cells` (API 1.9) feed it;
`prompt` stays the newest, for screens that show one at a time.

**`/app/live` is Live service, not "Check in"** — it is the room's
control surface, and the name said one of the things it does. The old
route redirects. It opens on a dark control room (`.live-room`): on air
or not, the service, who is here, the code, and the controls — **Present**,
Ask question, Open check-in. The page reads each open service's live
data once and gives it to both the board and the presenter.

**Live service has its own button in the top bar** (`live-service-link.tsx`),
near-black like the control room, turning ruby with a pulsing dot and
"On air" while a service is open, ringed while you are on the page. The
layout reads the on-air count (a leader's open sessions, or for a member
the ones they can check in to) beside the church, and the button
re-reads the page only on `service.opened` / `service.closed`. It and the
side-nav entry (`needsChurch`) show only with one church in scope:
platform staff on All churches see neither, and `/app/live` there says to
choose a church.

**Today and coming up** on `/app/live` lists the next fortnight of
published events from the start of today in the church's own time zone,
today's highlighted. A whole-church or branch event today carries **Go
live**: `openCheckIn` for that branch (or the church), dated today, telling
its members, after a confirmation; one already open shows **On air** and
links to its board. Cell and department events are listed, not startable,
because check-in is a branch's or the church's and a cell meets on the
register. The countdown's start is empty until set, and until then
follows today's next event (`defaultStart`). With nothing on air a leader
sees no empty panels; the control room says so once.

**The run of service** (`components/service-deck.tsx`) is what goes on
the screen at the front, in order, under the control room: a welcome, a
countdown to the start, the check-in code, the room filling, **New here?**
(the code again and a word about cells), today's message, the readings
and songs, each question asked; then **each notice on a slide of its
own** (pinned first, six at most), **Coming up** (the next fortnight's
events), **Birthdays this week** (first names only: no age, no surname,
nothing a wall should not show), **Giving** (the church's own phone,
website and email), and **Go in peace** with the next service that has
not started. Each row switches on or off and can be
presented from; the start time is a dropdown. Those settings are kept on
the device (`localStorage`, read with `useSyncExternalStore` as the raw
string so the snapshot is stable). With nothing on air the deck still has
its welcome, countdown, notices and events, so **Present** (in the
header, which dispatches `chapl:present`) always works.

Presenting is full screen in the same browser, slides sized to the
screen: the code in the dot matrix (the dot font has the whole alphabet
for this), seats sized to the room, the countdown painted onto a
`DotNumeral` from a timer (minutes and seconds, or hours and minutes past
an hour, the caption saying which). The page's live refresh re-renders it
with new figures while the slide index, as state, stays put. Arrows,
Space, Page Up/Down, Home/End and 1–9 move; B blanks; F toggles full
screen; Escape ends. Controls fade when the mouse is still; a wake lock
keeps the screen on. **Something new for the screen is a new kind of
slide**: an entry in `slides` and a component at the bottom of the file.

**Live without a second socket.** The bell's connection announces every
message as a `chapl:live` window event; `LiveRefresh` listens for a
prefix (`service.`) and calls `router.refresh()`, coalescing a burst of
forty answers into one refresh, with a slow poll for a dropped socket.
The messages only say *what changed* — the page reads it again. On the
API, a branch's service goes to `congregation:{branch}` (the people in
its seats) and `branch:` (its leaders); members never hear `branch:`.

**Sermons have pages now** — `/app/sermons/[id]`, with **Save** and
**Share** — because a shared link has to land somewhere. Saved sermons
live on the account (`/sermons/saved`), so the phone and the web agree.
`ShareButton` uses the system share sheet where there is one, else
copies the link. **Your church** (`/app/about`, `GET
/churches/{id}/about`) is for every member: where each branch meets,
when, and directions — their own branch first. It opens on the church's
mark (logo or monogram), a line of who it is, its own words, and its size
in dot figures, with the office's phone, email, site and address as one
row of links. Branches with coordinates sit on a **real map**
(`components/church-map.tsx`): MapLibre GL (BSD, pinned `6.19.0`) over
OpenFreeMap's vector tiles, free and keyless — Liberty by day, Dark by
night, switched live with the theme — with HTML pins in the product's
dot, the reader's own ringed, a click opening times and directions. A pin
and its row in the list light each other (`data-branch`). The wheel
scrolls the page; ctrl/⌘ + wheel zooms. Three traps: MapLibre starts its
worker from a file beside its module, which the bundler does not emit,
so `scripts/copy-map-worker.mjs` copies it to `public/vendor/` (on
install, dev and build; gitignored) and the component calls
`setWorkerUrl`; MapLibre's sheet sets `.maplibregl-map` to `position:
relative`, which collapsed the canvas, so its box is styled two classes
deep; and the effect is keyed on the pins' JSON, because every live
refresh hands in a new array and tore the map down. Until it draws, the
server-rendered dot field stands in, and it stays if tiles or WebGL never
arrive. The privacy policy names OpenFreeMap. Each branch's
`service_times` is parsed into a seven-day strip with its meeting days
lit; a lit day's times are its tooltip (hover, focus or tap), not text
beside it. Unreadable times show as typed.

## Presentation studio and audience output

`Present` opens `/app/live?screen=audience` in a named audience window.
The main live-service page and `/app/live/remote` remain operator surfaces.
The palette icon in the main header opens the studio, preview and remote
controls as a modal overlay. The phone remote keeps its full-page controls.
The first service’s code and close control are merged into the main header;
its board renders room and polls directly, without a second service heading.
Project or share the audience window, rather than mirroring the controller.
The output contains no settings controls; F or double-click enters full
screen. Ending presentation keeps the output blank rather than revealing
church administration underneath.

`presentation-settings.tsx` is shared by desktop and phone. Six local landscape
Pexels photos (credits in `public/presentation/CREDITS.md`) and a token-coloured
SVG dot window are selectable. Both motion-off and reduced-motion disable
animations. The room slide reuses the live board's theatre seating without
showing its interactive controls to the audience.

Decks are saved on the presentation computer under `chaplDeck:<church>:<session>`.
Slide order, readings, songs, appearance, slide-specific text and the last
slide ID are isolated per service. An older unscoped deck becomes the initial
template until the scoped deck is saved. Run of service has move-up/down
controls; checkpoints use stable slide IDs rather than positions.

**A service's screens and remotes share the service's channel.** A deck
with a service behind it posts through `/api/deck` to `POST
/attendance/check-in/sessions/{id}/deck`, which the API allows only to
someone who could run that service (the same check as Ask the room) and
publishes to its leaders: `branch:` for a branch's service, `leaders:`
(whole-church authority only) for the church's. So a branch pastor's
phone finds and drives the screen the media desk presents from, for their
branch and no other, and no member hears or moves anything. A deck with
no service, or a sender the service refuses, stays on the sender's own
`user:` channel. The remote page lists the open services its holder can
run and says hello on each.

The phone is controller-only. Desktops announce a named screen, but only
when asked: a controller says hello
every four seconds while it is on screen, and each screen answers that or
reports a real change to what it shows (deduplicated, since the effect
re-runs on every live refresh; and one answer a second, since a remote
says hello on two channels). There is no standing heartbeat, because
every open Live service tab is a screen, and three of them beating every
three seconds was a request a second with nobody listening. Registered receivers keep their
connection open while the page is mounted, even when its tab is hidden. Commands carry both `screenId`
and `serviceKey`, and a receiver ignores commands for a different target.
The separate audience window inherits its operator's logical screen ID;
the operator stops advertising while that window is open. A controller pairs
with one screen, remembers that choice for the tab session, and marks it
disconnected after twelve seconds without a screen report. Multiple screens
can be chosen from the collapsed screen picker, where the name can be edited.

Resume returns to the saved slide; Start over deliberately chooses the first.
Style edits keep a bounded ten-entry undo stack on the receiver. These messages
are relayed without server persistence. Ending from the dedicated remote returns
to `/app/live` after the command is accepted; the projector remains blank.
Mobile starts can activate the desktop's already-open Live service page, but
native browser fullscreen still requires a local gesture on the computer.

## The notifications inbox

`/app/notifications` is laid out like an inbox: topics down the left
(Sunday and check-in, Notices, Events, Sermons, Prayer and care, People
and teams, Church, Giving) with a count each and a badge for how many
are unread, the list beside them grouped by day, a search above it. On a
phone the topics become a row of chips. The filters are the URL
(`?topic=&unread=1&q=&page=`), so a view can be linked to. The page reads
the latest 200 once and derives the counts, the filtered list and the
pages from that one set, so they always agree; it says so when you have
more. A kind maps to a topic in `TOPICS` (a kind like `care.prayer`
matches `care` by prefix), and an unknown kind lands in Other rather than
disappearing. New notifications re-read the page through `LiveRefresh`.

## Shared links

A shared sermon or event goes to **`/s/{id}`** or **`/e/{id}`**, not to
the page inside `/app`. Whoever taps a link in a chat is usually not
signed in and often not a member, and a sign-in wall is where a shared
link goes to die. The pages read `GET /public/sermons/{id}` and
`/public/events/{id}` with `auth: false`; the API decides what is open
(published, church- or branch-wide, active church) and answers `404` for
the rest, so nothing here has to.

`generateMetadata` gives each page its link preview — title, a line, and
the sermon's cover (its YouTube thumbnail when it has none) or the
event's picture. `metadataBase` in the root layout makes those absolute:
`SITE_URL`, else Vercel's production host. The way in comes *after* the
content: Sign in carries `?next=` back to the same thing inside the
product, and someone already signed in gets **Open in Chapl** instead.
`/signin` honours `next` for a visitor who turns out to be signed in.

`ShareButton` takes the public path. `SiteNav` takes `sections={false}`
on pages that are not the home page, because its links are anchors into
it.

## The legal pages

`/privacy`, `/terms` and `/eula` are what the App Store and Google Play
listings link to (the phone app's `PRIVACY_POLICY_URL` is the first), so
they are public, read nothing from the API beyond the header's
`getMe()`, and are linked from the footer and, through `AuthShell`, from
every signed-out page. They share one frame and one set of facts in
`components/legal.tsx`: `LEGAL` names the operator, address, contact,
email provider, backup period, minimum age and governing law once, so
the three cannot disagree. Some of those are working defaults the owner
chose to publish and revisit. The privacy policy is written from what
the API, the phone app and this site actually collect; a change that
collects something new changes it too. The EULA carries the terms Apple
requires of a custom licence agreement — keep them if it is rewritten.
None of the three has had a legal read yet.

## Live, reliably

The socket is not trusted to have heard everything. `use-realtime.ts`
announces **`resync`** on every open after the first, and `LiveRefresh`
re-reads on it, so a page that lost its connection catches up the moment
it is back rather than at the next poll. A socket that has heard nothing
for 70 seconds is closed and redialled (the server pings every 25), and
coming back `online` redials at once.

On the API, cron sweeps announce their notifications with Postgres
`NOTIFY` and the web service listens, so a birthday or a reminder
arrives live rather than on the next load.

## Caching

Reads are stale-while-revalidate on the server, decided in one place:
`cacheSeconds()` in `src/lib/api.ts`. What changes a few times a week —
sermons, notices, events, households, branches, cells, departments,
churches — is cached for five minutes; the dashboard, the directory,
service detail and giving for one. Anything worked through as it changes
(notifications, care, check-ups, check-in, invitations, audit, who you
are) is never cached. Next keys a cached fetch on its headers too, so the
token and `X-Church-Id` keep one person's answers from anyone else.

Every cached read carries `chapl:church:<id>`, and **every successful
write through `api()` expires its church's tag** (and "all churches"), so
the page after a save shows the save, for everyone in that church. Writes
made elsewhere — the phone, another tool — show here within the cache
window. In the browser, `staleTimes.dynamic` keeps a visited page for
thirty seconds, so back and forward between two screens is instant.

## Checks

`npm run lint` and `npx tsc --noEmit` both need to be clean; `npm run build`
is the real gate. **None of those catch a server component calling a client
export** — that fails at request time with "not possible to invoke a client
function from the server". Render the page: `curl` `/app` with a
`chapl_token` cookie and grep the response for `\"message\"`.

**Never format a date or time by locale in a Client Component.**
`toLocaleTimeString(undefined, …)` runs once in Node and again in the
browser and the two disagree — Node had no locale and produced `18:30`,
the browser produced `06:30 PM`, and React threw away the whole calendar
subtree to re-render it. Write the format out longhand instead; the
product has already decided it says `6:30 pm`, and that should not depend
on what a server has in `LANG`. Same rule for `new Date()` and
`Math.random()` anywhere a Client Component renders.

The backend must be running for any `/app` page to render — they fetch on
the server, so a dead API is a failed page, not an empty one.
