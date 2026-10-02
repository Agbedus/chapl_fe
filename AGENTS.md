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
structure diagram, the closing block, and the logo are all built from it. Keep
it that way — a new chart type should be asked about before it's added.

**The hero picture** is `public/hero-glass.svg`, generated rather than
photographed — the palette is derived from stained glass, so the window is
the palette drawn at full size. It is a placeholder in the sense that
matters: `DotPhoto` takes any `src`, so dropping a real photograph of the
church in its place needs no other change. A portrait crop around 4:5 with
a bright subject and dark edges is what the dissolve flatters — the mask
fades the picture out at the frame, so an image that is busy at its corners
loses nothing worth keeping.

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

One orchestrated moment, on page load: the congregation field settles into
place (`.settle`) under the hero copy (`.rise`), and the picture arrives
last and slowest — it is the largest thing moving, and matching it to the
timing of a line of type makes it read as heavier than the rest rather than
as part of the same gesture.

Below the fold, `components/reveal.tsx` fades each section up eight pixels
**once**, on an `IntersectionObserver` that disconnects after it fires.
Scrolling back up finds the page where you left it. It is a CSS transition
rather than a keyframe, so crossing a threshold mid-flight retargets instead
of restarting.

The hero picture carries the only per-frame animation on the site: a
cursor-tracked spotlight that opens a clear window through the dots. It is
spring-damped in a rAF loop that stops itself once settled, and it moves a
masked *layer* with `translate3d` rather than moving a mask — see the note
in `components/dot-photo.tsx`. Coarse pointers never start it, and
`prefers-reduced-motion` leaves it resting in the centre.

`prefers-reduced-motion` is honoured throughout `globals.css`.

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

The chart types are deliberately varied because the questions are:
stacked columns for attendance volume with a turnout line under the same
axis, radial bars for turnout by branch, a projected map for where the
branches are, area for growth and giving, a donut for what giving was
given for, a waffle for age, horizontal bars for the pastoral queue.

**The map** is `geoShape` over a `geoMercator` fitted to the pins — no tile
server, no third-party script. Branches carry `latitude`/`longitude` on the
API; a branch without them is counted in the caption rather than dropped
silently. Circle area is the roll, fill is turnout, and `turnoutColour()`
in `src/lib/palette.ts` keeps the map and the list beside it in agreement.

## The signed-in visual language

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
there as HTML, because that is the figure people came for and the slices
are the answer to "made up of what". Only data that is genuinely *one
whole in a handful of parts* goes in a ring: giving by type, cell health
bands, the care queue, age, gender, and turnout as a two-slice gauge.
More slices than about six and it is a bar chart wearing a circle.

**Colour is for the six domains and for status.** A `.dot` beside a label
carries the hue; the number beside it stays ink. A wall of coloured
figures is a wall where none of them means anything.

**`.btn` is a pill**, as on the home page. A rounded rectangle in the
product and a pill on the marketing site reads as two products.

**`.page-in` is the one orchestrated moment**, staggered by depth — the
heading, then the numbers, then the detail, and everything past the third
child arrives together. A cascade that runs for a second is a page you
wait for. `prefers-reduced-motion` turns it off.

`components/panels.tsx` holds the furniture every page is built from:
`Page`, `PageHead`, `Panel`, `Stat`, `Detail`, `Empty`, `Meter`,
`Legend`, `Action`. A page that reaches past these for its own layout is
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
