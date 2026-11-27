"use client";

import {
  Calendar as CalendarIcon, Check, ChevronDown, ChevronLeft, ChevronRight, Clock, Search, X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { cleanPrompt } from "@/components/ui/form";
import { Popover } from "@/components/ui/popover";

/**
 * Date, time and long lists — picked rather than typed.
 *
 * All three replace a native control that was quietly costing people
 * time:
 *
 * - `<input type="date">` renders differently in every browser, ignores
 *   the app's type and colour entirely, and on Firefox/desktop Safari is
 *   a text box with a format nobody guesses right first time.
 * - `<input type="time">` is worse, and a church types the same six
 *   service times over and over.
 * - `<select>` with eighty-one cells in it is a scroll, not a choice.
 *
 * Each keeps a **shadow input** carrying the machine value, so the forms
 * around them still post ordinary `FormData` to a Server Action and
 * nothing above them had to change. It is a real input rather than a
 * hidden one so that `required` means something — see `Value`.
 */

/* ------------------------------------------------------------------ */
/* shared trigger                                                      */
/* ------------------------------------------------------------------ */

function Trigger({
  id,
  label,
  value,
  placeholder,
  icon,
  error,
  open,
  onToggle,
  onClear,
  triggerRef,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  icon: ReactNode;
  error?: string;
  open: boolean;
  onToggle: () => void;
  onClear?: () => void;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <span className="has-icon relative block">
      <span className="field-icon" aria-hidden>{icon}</span>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        onClick={onToggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={label}
        className="w-full rounded-xl border bg-paper py-2.5 pl-10 pr-9 text-left text-[14.5px]
                   transition-[border-color,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)]
                   hover:border-line-strong focus:border-transparent focus:outline-none
                   focus:ring-2 focus:ring-[var(--accent)] active:scale-[0.995]"
        style={{
          borderColor: error ? "var(--ruby)" : open ? "var(--accent)" : "var(--line)",
          color: value ? "var(--ink)" : "var(--ink-3)",
        }}
      >
        {value || cleanPrompt(placeholder)}
      </button>

      {/* Clearing is one press, not "open the thing and find the button".
          Only there when there is something to clear. */}
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear ${label}`}
          className="absolute right-2.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center
                     rounded-md text-ink-3 transition-colors duration-150 hover:bg-sunk hover:text-ink"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </span>
  );
}

/**
 * The machine value each of these controls posts.
 *
 * It used to be `type="hidden"`, which posts correctly and validates
 * never: the constraint API skips hidden inputs outright, so `required`
 * on a picker was decoration and an empty one went to the server to be
 * refused there. That was survivable while every form was one page and
 * one submit. It is not survivable in a stepped form, where "Next" has
 * to know whether this step was answered.
 *
 * So it is an ordinary input the browser will check, laid over the
 * control it belongs to and made invisible. `pointer-events: none`
 * lets every click through to the real control underneath, and
 * `tabIndex={-1}` keeps it out of the tab order — the only thing that
 * ever focuses it is `reportValidity()`, which is exactly when you want
 * the message to appear over this field.
 */
function Value({
  name,
  value,
  required,
  form,
}: {
  name: string;
  value: string;
  required?: boolean;
  /** The id of a form this input belongs to when it sits outside it (a table row). */
  form?: string;
}) {
  return (
    <input
      form={form}
      name={name}
      value={value}
      required={required}
      onChange={() => {}}
      tabIndex={-1}
      aria-hidden
      className="picker-value"
    />
  );
}

function Message({ error, hint }: { error?: string; hint?: string }) {
  if (error) {
    return <p className="mt-1.5 text-[12px]" style={{ color: "var(--ruby)" }}>{error}</p>;
  }
  if (hint) return <p className="mt-1.5 text-[12px] text-ink-3">{hint}</p>;
  return null;
}

/* ------------------------------------------------------------------ */
/* date                                                                */
/* ------------------------------------------------------------------ */

const DAY_NAMES = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Local `YYYY-MM-DD`. `toISOString` would shift the day in half the world. */
function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function parseISO(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * The calendar itself, controlled.
 *
 * Split out so `DateTimeField` can reuse it without a second hidden
 * input fighting the first over the same name. `DateField` is this plus
 * the state and the hidden input; nothing else differs.
 */
function DateShell({
  label,
  value,
  onChange,
  error,
  startYear,
  /**
   * Opens on a sensible year instead of this one.
   *
   * A date of birth picker that starts in the current month asks a
   * seventy-year-old to press "previous" eight hundred and forty times.
   * The year select fixes that properly, and this points the thing in
   * roughly the right direction before they touch it.
   */
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
  startYear?: number;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  const selected = parseISO(value);
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => {
    const base = parseISO(value);
    if (base) return { y: base.getFullYear(), m: base.getMonth() };
    return { y: startYear ?? today.getFullYear(), m: today.getMonth() };
  });

  const grid = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1);
    // Monday-first, matching the calendar on the events page. Two
    // calendars in one product that disagree about where a week starts
    // is a bug people feel without being able to name.
    const lead = (first.getDay() + 6) % 7;
    const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
    const cells: (Date | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= days; d++) cells.push(new Date(cursor.y, cursor.m, d));
    return cells;
  }, [cursor]);

  const years = useMemo(() => {
    const end = today.getFullYear() + 5;
    return Array.from({ length: 110 }, (_, i) => end - i);
  }, [today]);

  const commit = (d: Date) => {
    onChange(iso(d));
    setOpen(false);
    trigger.current?.focus();
  };

  const shown = selected
    ? selected.toLocaleDateString(undefined, {
        day: "numeric", month: "long", year: "numeric",
      })
    : "";

  return (
    <div className="relative">
      <Trigger
        id={label}
        label={label}
        value={shown}
        placeholder={label}
        icon={<CalendarIcon className="h-full w-full" />}
        error={error}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        onClear={() => onChange("")}
        triggerRef={trigger}
      />

      <Popover open={open} onClose={() => setOpen(false)} anchor={trigger} width={288}>
        <div className="p-2.5">
          {/* Month steps with arrows; the year is a select, because
              stepping to 1954 is not a thing anyone should do by hand. */}
          <div className="mb-2 flex items-center gap-1">
            <StepButton
              onClick={() =>
                setCursor((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { ...c, m: c.m - 1 }))
              }
              label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </StepButton>

            <span className="min-w-0 flex-1">
              <Listbox
                variant="ghost"
                label="Month"
                value={String(cursor.m)}
                onChange={(v) => setCursor((c) => ({ ...c, m: Number(v) }))}
                options={MONTHS.map((m, i) => ({ value: String(i), label: m }))}
              />
            </span>
            <Listbox
              variant="ghost"
              label="Year"
              value={String(cursor.y)}
              onChange={(v) => setCursor((c) => ({ ...c, y: Number(v) }))}
              options={years.map((y) => ({ value: String(y), label: String(y) }))}
            />

            <StepButton
              onClick={() =>
                setCursor((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { ...c, m: c.m + 1 }))
              }
              label="Next month"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </StepButton>
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {DAY_NAMES.map((d, i) => (
              <span
                key={i}
                className="grid h-6 place-items-center text-[10px] font-semibold text-ink-3"
                aria-hidden
              >
                {d}
              </span>
            ))}

            {grid.map((d, i) =>
              d === null ? (
                <span key={`pad-${i}`} />
              ) : (
                <button
                  key={iso(d)}
                  type="button"
                  onClick={() => commit(d)}
                  aria-current={selected && iso(d) === iso(selected) ? "date" : undefined}
                  className="tnum grid h-8 place-items-center rounded-lg text-[12.5px]
                             transition-colors duration-100 hover:bg-sunk"
                  style={
                    selected && iso(d) === iso(selected)
                      ? { background: "var(--accent)", color: "var(--accent-ink)" }
                      : iso(d) === iso(today)
                        ? { color: "var(--accent)", fontWeight: 700 }
                        : undefined
                  }
                >
                  {d.getDate()}
                </button>
              ),
            )}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
            <button
              type="button"
              onClick={() => commit(today)}
              className="rounded-lg px-2 py-1 text-[11.5px] font-medium text-ink-2
                         transition-colors duration-150 hover:bg-sunk hover:text-ink"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="rounded-lg px-2 py-1 text-[11.5px] text-ink-3
                           transition-colors duration-150 hover:bg-sunk hover:text-ink"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </Popover>
    </div>
  );
}

/** The calendar as a form field: state, hidden input, message. */
export function DateField({
  label,
  name,
  defaultValue = "",
  required,
  error,
  hint,
  startYear,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  startYear?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <div className="relative">
      <Value name={name} value={value} required={required} />
      <DateShell
        label={label}
        value={value}
        onChange={setValue}
        required={required}
        error={error}
        startYear={startYear}
      />
      <Message error={error} hint={hint} />
    </div>
  );
}

function StepButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-ink-3
                 transition-[background-color,color,transform] duration-150
                 hover:bg-sunk hover:text-ink active:scale-95"
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* time                                                                */
/* ------------------------------------------------------------------ */

/** Every quarter hour. A church meets on the quarter, not at 09:07. */
function quarterHours(): string[] {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
}

function pretty(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h)) return hhmm;
  const period = h < 12 ? "am" : "pm";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/** The time list, controlled. See `DateShell` for why it is split out. */
function TimeShell({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const times = useMemo(() => quarterHours(), []);

  // Open onto the current choice rather than at midnight. A list that
  // always starts at 00:00 makes 18:30 a scroll every single time.
  useEffect(() => {
    if (!open) return;
    const target = list.current?.querySelector<HTMLElement>("[data-selected]")
      ?? list.current?.querySelector<HTMLElement>('[data-value="09:00"]');
    target?.scrollIntoView({ block: "center" });
  }, [open]);

  return (
    <div className="relative">
      <Trigger
        id={label}
        label={label}
        value={value ? pretty(value) : ""}
        placeholder={label}
        icon={<Clock className="h-full w-full" />}
        error={error}
        open={open}
        onToggle={() => setOpen((o) => !o)}
        onClear={() => onChange("")}
        triggerRef={trigger}
      />

      <Popover open={open} onClose={() => setOpen(false)} anchor={trigger}>
        <div ref={list} className="max-h-[15rem] overflow-y-auto p-1.5">
          {times.map((t) => {
            const on = t === value;
            return (
              <button
                key={t}
                type="button"
                data-value={t}
                data-selected={on ? "" : undefined}
                onClick={() => {
                  onChange(t);
                  setOpen(false);
                  trigger.current?.focus();
                }}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5
                           text-left text-[12.5px] transition-colors duration-100 hover:bg-sunk"
                style={on ? { color: "var(--accent)", fontWeight: 600 } : undefined}
              >
                {pretty(t)}
                {on && <Check className="h-3.5 w-3.5" aria-hidden />}
              </button>
            );
          })}
        </div>
      </Popover>
    </div>
  );
}

/** The time list as a form field. `HH:MM:SS` in, `HH:MM` out. */
export function TimeField({
  label,
  name,
  defaultValue = "",
  required,
  error,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  // The API sends `HH:MM:SS`; the control works in `HH:MM`.
  const [value, setValue] = useState(defaultValue.slice(0, 5));
  return (
    <div className="relative">
      <Value name={name} value={value} required={required} />
      <TimeShell
        label={label}
        value={value}
        onChange={setValue}
        required={required}
        error={error}
      />
      <Message error={error} hint={hint} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* combobox                                                            */
/* ------------------------------------------------------------------ */

export function ComboField({
  label,
  name,
  options,
  defaultValue = "",
  required,
  error,
  hint,
  placeholder,
  icon,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
  icon?: ReactNode;
}) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const chosen = options.find((o) => o.value === value);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  // Opening is an event, so the state it sets belongs in the handler.
  // Doing it in an effect means rendering the list once with the cursor
  // in the wrong place and then again with it right.
  const openList = () => {
    setQuery("");
    setCursor(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    // The keyboard lands in the search box, because typing is what this
    // control is for. Anything else means a reach for the mouse first.
    search.current?.focus();
  }, [open]);

  const pick = (v: string) => {
    setValue(v);
    setOpen(false);
    trigger.current?.focus();
  };

  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((c) => {
        const next = event.key === "ArrowDown"
          ? Math.min(matches.length - 1, c + 1)
          : Math.max(0, c - 1);
        listRef.current
          ?.querySelectorAll("[data-option]")
          [next]?.scrollIntoView({ block: "nearest" });
        return next;
      });
    } else if (event.key === "Enter") {
      event.preventDefault();
      const hit = matches[cursor];
      if (hit) pick(hit.value);
    }
  };

  return (
    <div className="relative">
      <Value name={name} value={value} required={required} />
      <Trigger
        id={name}
        label={label}
        value={chosen?.label ?? ""}
        placeholder={cleanPrompt(placeholder ?? label)}
        icon={icon ?? <Search className="h-full w-full" />}
        error={error}
        open={open}
        onToggle={() => (open ? setOpen(false) : openList())}
        onClear={required ? undefined : () => setValue("")}
        triggerRef={trigger}
      />
      <Message error={error} hint={hint} />

      <Popover open={open} onClose={() => setOpen(false)} anchor={trigger}>
        <div className="border-b border-line p-1.5">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-3"
              aria-hidden
            />
            <input
              ref={search}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              onKeyDown={onKey}
              placeholder={`Search ${options.length} ${label.toLowerCase()}`}
              aria-label={`Search ${label}`}
              className="w-full rounded-lg bg-mist py-1.5 pl-8 pr-2 text-[12.5px]
                         outline-none placeholder:text-ink-3 focus:bg-paper"
            />
          </div>
        </div>

        <div ref={listRef} className="max-h-[14rem] overflow-y-auto p-1.5">
          {matches.length === 0 ? (
            <p className="px-2.5 py-6 text-center text-[12px] text-ink-3">
              Nothing matches “{query}”.
            </p>
          ) : (
            matches.map((o, i) => {
              const on = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  data-option
                  onClick={() => pick(o.value)}
                  onPointerEnter={() => setCursor(i)}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5
                             text-left text-[12.5px]"
                  style={{
                    // The keyboard cursor and hover are the same highlight
                    // on purpose — two different ones in a list this long
                    // is two things to track.
                    background: i === cursor ? "var(--sunk)" : undefined,
                    color: on ? "var(--accent)" : undefined,
                    fontWeight: on ? 600 : undefined,
                  }}
                >
                  <span className="min-w-0 truncate">{o.label}</span>
                  {on && <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />}
                </button>
              );
            })
          )}
        </div>
      </Popover>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* date and time together                                              */
/* ------------------------------------------------------------------ */

/**
 * A moment: the day, and the time on it.
 *
 * `<input type="datetime-local">` is the worst of the native controls —
 * Firefox renders a bare text box wanting `YYYY-MM-DDTHH:MM`, and even
 * where it does render a picker the date and time halves get different
 * interaction models. An event start is the most important field on the
 * form and it was the least usable one.
 *
 * Two visible controls, one hidden input. The pair writes the combined
 * `YYYY-MM-DDTHH:MM` the API already expects, so nothing behind this
 * changed — and leaving the time empty is allowed, defaulting to the
 * start of the day, because "Saturday" is a real answer to when a
 * conference is.
 */
export function DateTimeField({
  label,
  name,
  defaultValue = "",
  required,
  error,
  hint,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  const [date, setDate] = useState(defaultValue.slice(0, 10));
  const [clock, setClock] = useState(defaultValue.slice(11, 16));

  // No date means no moment — an orphan time would post "T14:30", which
  // the API would reject with something unhelpful about parsing.
  const combined = date ? `${date}T${clock || "00:00"}` : "";

  return (
    <div className="relative">
      <Value name={name} value={combined} required={required} />
      <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-2">
        <DateShell label={`${label} · date`} value={date} onChange={setDate} error={error} />
        <TimeShell label={`${label} · time`} value={clock} onChange={setClock} />
      </div>
      <Message error={error} hint={hint ?? (required ? undefined : "Optional.")} />
    </div>
  );
}



/* ------------------------------------------------------------------ */
/* choose one                                                          */
/* ------------------------------------------------------------------ */

export type Choice = { value: string; label: string; hint?: string };

/**
 * One choice from a short list: the product's own dropdown.
 *
 * Every native `<select>` in the app was this, drawn by the browser: a
 * grey OS menu over a page that has a type scale, a palette and no
 * shadows, different on every machine. `Listbox` is the controlled core
 * (a trigger and a list in the portalled `Popover`), in three looks:
 *
 * - `field`: a form field, the height and corner of every other input.
 * - `sm`: a filter in a toolbar or a table row.
 * - `ghost`: bare text that opens a list, for a control set inside
 *   another (the month and year in the date picker's header).
 *
 * The list is a real `listbox`: the trigger opens it with a click, Enter,
 * Space or an arrow; inside, arrows move, Home and End jump, typing a
 * letter goes to the next option starting with it, Enter or Space
 * chooses, Escape and Tab close and hand focus back. The chosen option
 * carries a check; the one under the cursor or the keyboard is shaded,
 * and they are the same highlight on purpose. A long list opens scrolled
 * to its choice.
 */
export function Listbox({
  label,
  value,
  onChange,
  options,
  placeholder,
  icon,
  error,
  variant = "field",
  id,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Choice[];
  placeholder?: string;
  icon?: ReactNode;
  error?: string;
  variant?: "field" | "sm" | "ghost";
  id?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const typed = useRef({ text: "", at: 0 });
  const chosen = options.find((o) => o.value === value);
  const listId = `${id ?? label.replace(/\W+/g, "-").toLowerCase()}-list`;

  const show = () => {
    setCursor(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const close = (focusTrigger = true) => {
    setOpen(false);
    if (focusTrigger) trigger.current?.focus();
  };
  const pick = (v: string) => {
    if (v !== value) onChange(v);
    close();
  };

  // Opened: keyboard into the list, and the choice scrolled into view.
  useEffect(() => {
    if (!open) return;
    const node = list.current;
    node?.focus({ preventScroll: true });
    node?.querySelector<HTMLElement>(`[data-index="${cursor}"]`)?.scrollIntoView({ block: "center" });
    // Only on opening; moving the cursor scrolls itself below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const move = (next: number) => {
    const n = Math.max(0, Math.min(options.length - 1, next));
    setCursor(n);
    list.current?.querySelector<HTMLElement>(`[data-index="${n}"]`)?.scrollIntoView({ block: "nearest" });
  };

  const onListKey = (event: React.KeyboardEvent) => {
    const k = event.key;
    if (k === "ArrowDown") { event.preventDefault(); move(cursor + 1); }
    else if (k === "ArrowUp") { event.preventDefault(); move(cursor - 1); }
    else if (k === "Home") { event.preventDefault(); move(0); }
    else if (k === "End") { event.preventDefault(); move(options.length - 1); }
    else if (k === "PageDown") { event.preventDefault(); move(cursor + 8); }
    else if (k === "PageUp") { event.preventDefault(); move(cursor - 8); }
    else if (k === "Enter" || k === " ") {
      event.preventDefault();
      const hit = options[cursor];
      if (hit) pick(hit.value);
    } else if (k === "Tab") {
      close(false);
    } else if (k.length === 1 && /\S/.test(k)) {
      // Type-ahead: letters typed within half a second build a prefix.
      const now = event.timeStamp;
      const t = typed.current;
      t.text = now - t.at < 500 ? t.text + k.toLowerCase() : k.toLowerCase();
      t.at = now;
      const from = t.text.length === 1 ? cursor + 1 : cursor;
      const order = [...options.slice(from), ...options.slice(0, from)];
      const hit = order.find((o) => o.label.toLowerCase().startsWith(t.text));
      if (hit) move(options.indexOf(hit));
    }
  };

  const onTriggerKey = (event: React.KeyboardEvent) => {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      show();
    }
  };

  const text = chosen?.label ?? "";
  return (
    <>
      <button
        ref={trigger}
        id={id}
        type="button"
        onClick={() => (open ? close() : show())}
        onKeyDown={onTriggerKey}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${label}${text ? `: ${text}` : ""}`}
        data-variant={variant}
        data-open={open ? "" : undefined}
        data-error={error ? "" : undefined}
        data-icon={icon ? "" : undefined}
        className={`lb-trigger ${className}`}
      >
        {icon && <span className="lb-icon" aria-hidden>{icon}</span>}
        <span className={`lb-text ${text ? "" : "lb-placeholder"}`}>
          {text || cleanPrompt(placeholder ?? label)}
        </span>
        <ChevronDown className="lb-chevron" aria-hidden />
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchor={trigger}
        className={`lb-pop lb-pop-${variant}`}
      >
        <div
          ref={list}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={label}
          aria-activedescendant={`${listId}-${cursor}`}
          onKeyDown={onListKey}
          className="lb-list"
        >
          {options.map((o, i) => {
            const on = o.value === value;
            return (
              <div
                key={o.value}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={on}
                data-index={i}
                data-active={i === cursor ? "" : undefined}
                onPointerEnter={() => setCursor(i)}
                onClick={() => pick(o.value)}
                className="lb-option"
              >
                <span className="min-w-0 flex-1">
                  <span className="lb-option-label">{o.label}</span>
                  {o.hint && <span className="lb-option-hint">{o.hint}</span>}
                </span>
                {on && <Check className="lb-check" strokeWidth={2.5} aria-hidden />}
              </div>
            );
          })}
        </div>
      </Popover>
    </>
  );
}

/**
 * `Listbox` as a form field: its own state and a shadow input, so it posts
 * like the `<select>` it replaced, and `required` still means something.
 *
 * `submitOnChange` sends the form it sits in as soon as a choice is made:
 * for a GET filter (a branch, a cell), where a separate "Show" button was
 * a second press for nothing. It waits for the shadow input to hold the
 * new value first, or the form would post the old one. `onValueChange` is
 * for a client caller that wants to know.
 */
export function SelectField({
  label,
  name,
  options,
  defaultValue = "",
  required,
  error,
  hint,
  placeholder,
  icon,
  size = "field",
  form,
  submitOnChange,
  onValueChange,
}: {
  label: string;
  name: string;
  options: Choice[];
  defaultValue?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
  icon?: ReactNode;
  size?: "field" | "sm";
  form?: string;
  submitOnChange?: boolean;
  onValueChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const holder = useRef<HTMLDivElement>(null);
  const pending = useRef(false);

  useEffect(() => {
    if (!pending.current) return;
    pending.current = false;
    const input = holder.current?.querySelector<HTMLInputElement>("input.picker-value");
    input?.form?.requestSubmit();
  }, [value]);

  return (
    <div ref={holder} className={size === "sm" ? "relative inline-block" : "relative"}>
      <Value name={name} value={value} required={required} form={form} />
      <Listbox
        id={name}
        label={label}
        value={value}
        onChange={(v) => {
          setValue(v);
          onValueChange?.(v);
          if (submitOnChange) pending.current = true;
        }}
        options={options}
        placeholder={placeholder}
        icon={icon}
        error={error}
        variant={size}
      />
      {size === "field" && <Message error={error} hint={hint} />}
    </div>
  );
}
