/**
 * What a password says about itself.
 *
 * Pure and deterministic: the same string always produces the same
 * report, with no randomness, no network, no scoring library and no
 * dependency on the clock. Every message points at one specific rule,
 * which is what makes feedback feel fair rather than arbitrary — and
 * what makes it testable without a browser.
 *
 * **There are exactly two rules that can stop a submit**, and they are
 * the API's own: at least 8 characters, at most 72 (`UserRegister`,
 * `ChangePassword` and `InvitationAccept` all declare
 * `min_length=8, max_length=72`). Everything else here is advice. The
 * server stays the authority — a client check is for answering sooner,
 * and for not wiping the form: React resets uncontrolled inputs after a
 * server action returns, so a round trip to be told "too short" also
 * costs you both password fields.
 *
 * Deliberately not here: forced composition ("one upper, one digit, one
 * symbol"). NIST 800-63B recommends against it — it teaches people
 * `Password1!` — and length does more work than any class rule. Class
 * variety only feeds the strength estimate, never a requirement.
 *
 * Kept free of path aliases and enums so Node can run this file
 * directly; see the check in the PR that added it.
 */

export const MIN_LENGTH = 8;
/** What the API counts. Python's `len`, so code points, not UTF-16 units. */
export const MAX_CHARS = 72;
/**
 * What bcrypt actually reads. It silently ignores everything past 72
 * *bytes*, so forty emoji pass the character limit and are cut to
 * eighteen — two different passwords sharing a prefix become the same
 * password, with no error anywhere.
 */
export const MAX_BYTES = 72;

export type Level = 0 | 1 | 2 | 3 | 4;

export type Report = {
  /** Length in code points — the unit the API's limit is written in. */
  length: number;
  bytes: number;
  /** 0 until it is acceptable at all; then 1 (weak) to 4 (strong). */
  level: Level;
  label: string;
  /** Why the API would refuse it, or null. The only thing that blocks. */
  blocking: string | null;
  /** The single most useful next step, or null when there is none. */
  advice: string | null;
  flags: {
    common: boolean;
    personal: boolean;
    pattern: boolean;
    truncated: boolean;
  };
};

const LABELS = ["", "Weak", "Fair", "Good", "Strong"] as const;

/**
 * Passwords people actually choose, lower-cased. Short bases are here too
 * ("letmein", "welcome") because the check also strips trailing digits
 * and symbols, so `Welcome2024!` is caught as `welcome`.
 *
 * Advisory only. A list this short cannot be a defence, only a nudge —
 * the real defence is length, which the strength estimate rewards.
 */
const COMMON = new Set([
  "password", "passw0rd", "p@ssword", "p@ssw0rd", "passpass", "pass1234",
  "mypassword", "letmein", "welcome", "admin", "administrator", "changeme",
  "default", "secret", "login", "master", "access", "trustno1", "whatever",
  "iloveyou", "sunshine", "princess", "football", "baseball", "basketball",
  "superman", "batman", "spiderman", "starwars", "monkey", "dragon", "shadow",
  "michael", "jennifer", "computer", "internet", "freedom", "hello", "hellohello",
  "qwerty", "qwertyui", "qwertyuiop", "qwerty123", "asdfghjk", "asdfghjkl",
  "zxcvbnm", "1q2w3e4r", "1qaz2wsx", "q1w2e3r4", "abcd1234", "abc12345",
  "abcdefgh", "abcdefg1", "test1234", "testtest", "12345678", "123456789",
  "1234567890", "123123123", "12341234", "11111111", "00000000", "987654321",
  "87654321", "11223344", "12121212", "tr0ub4dor&3",
  // The ones a congregation picks.
  "jesus", "jesus123", "jesus1234", "jesuschrist", "godisgood", "godislove",
  "blessed", "blessed123", "hallelujah", "amenamen", "faithful", "church",
  "church123", "emmanuel", "praisegod", "ghana123", "accra123", "chapl123",
]);

/** Keyboard rows, for runs like `qwertyui` that are not alphabetical. */
const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890"];

const LEET: Record<string, string> = {
  "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t",
  "@": "a", "$": "s", "!": "i",
};

const unleet = (s: string) => Array.from(s, (c) => LEET[c] ?? c).join("");
const stripTail = (s: string) => s.replace(/[\d\p{P}\p{S}]+$/u, "");

/**
 * Whether it is a known weak password, and *how* it matched.
 *
 * "exact" is the whole string, substitutions undone: `P@ssw0rd`.
 * "built" is a common base with numbers or symbols added on the end:
 * `Welcome2024!`. They deserve different sentences — calling the second
 * "a very common password" is not quite true, and people notice when a
 * message overclaims.
 */
function commonKind(lower: string): "exact" | "built" | null {
  if ([lower, unleet(lower)].some((c) => COMMON.has(c))) return "exact";
  const base = stripTail(lower);
  if (base !== lower && [base, unleet(base)].some((c) => c.length > 0 && COMMON.has(c))) {
    return "built";
  }
  return null;
}

/** A run of consecutive code points, up or down: `12345678`, `hgfedcba`. */
function isRun(chars: string[]): boolean {
  if (chars.length < 6) return false;
  const step = chars[1].codePointAt(0)! - chars[0].codePointAt(0)!;
  if (step !== 1 && step !== -1) return false;
  return chars.every(
    (c, i) => i === 0 || c.codePointAt(0)! - chars[i - 1].codePointAt(0)! === step,
  );
}

function isRowRun(lower: string): boolean {
  if (lower.length < 6) return false;
  return ROWS.some((row) => row.includes(lower) || [...row].reverse().join("").includes(lower));
}

/** One short unit repeated: `aaaaaaaa`, `abababab`, `12121212`. */
function isRepeat(chars: string[]): boolean {
  const n = chars.length;
  for (let period = 1; period <= n / 2; period++) {
    if (n % period !== 0) continue;
    if (chars.every((c, i) => c === chars[i % period])) return true;
  }
  return false;
}

/**
 * Bits per character for the pool a password draws from. Precomputed as
 * integers (tenths of a bit) so the estimate involves no floating point
 * at all — nothing for two engines to disagree about.
 */
function poolTenths(pw: string): number {
  const lower = /\p{Ll}/u.test(pw);
  const upper = /\p{Lu}/u.test(pw);
  const digit = /\d/.test(pw);
  const other = /[^\p{L}\d]/u.test(pw);
  // 26, 52, 10, 62, 36, 62+33 … log2 of the pool, ×10, rounded.
  if (!lower && !upper && !other && digit) return 33; // 10
  const pool = (lower ? 26 : 0) + (upper ? 26 : 0) + (digit ? 10 : 0) + (other ? 33 : 0);
  if (pool <= 26) return 47;
  if (pool <= 36) return 52;
  if (pool <= 52) return 57;
  if (pool <= 62) return 60;
  if (pool <= 69) return 61;
  if (pool <= 88) return 64;
  return 66;
}

/** Name and email fragments worth refusing to find inside a password. */
function personalTokens(avoid: readonly string[]): string[] {
  const out = new Set<string>();
  for (const raw of avoid) {
    const local = raw.includes("@") ? raw.split("@")[0] : raw;
    const lowered = local.toLowerCase();
    for (const token of lowered.split(/[^\p{L}\p{N}]+/u)) {
      // Three letters is "Ama", "Yaw", "Eve" — found inside far too many
      // unrelated words to be worth flagging.
      if (token.length >= 4) out.add(token);
    }
    const joined = lowered.replace(/[^\p{L}\p{N}]/gu, "");
    if (joined.length >= 4) out.add(joined);
  }
  return [...out];
}

function utf8Length(s: string): number {
  // `TextEncoder` is in every browser and in Node; the manual fallback
  // exists so a stripped-down runtime degrades to "close enough" instead
  // of throwing in the middle of someone typing.
  if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(s).length;
  let n = 0;
  for (const c of s) {
    const cp = c.codePointAt(0)!;
    n += cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
  }
  return n;
}

/**
 * Judge a password. `avoid` is anything the person would be wrong to
 * build it from — their name, their email — and is only ever compared,
 * never stored or sent anywhere.
 */
export function checkPassword(password: string, avoid: readonly string[] = []): Report {
  const chars = Array.from(password);
  const length = chars.length;
  const bytes = utf8Length(password);

  const flags = { common: false, personal: false, pattern: false, truncated: false };
  const base: Report = {
    length, bytes, level: 0, label: "", blocking: null, advice: null, flags,
  };

  if (length === 0) return base;

  if (length < MIN_LENGTH) {
    const more = MIN_LENGTH - length;
    return {
      ...base,
      blocking: `Use at least ${MIN_LENGTH} characters.`,
      advice: `${more} more character${more === 1 ? "" : "s"}`,
    };
  }
  if (length > MAX_CHARS) {
    return {
      ...base,
      blocking: `Use ${MAX_CHARS} characters or fewer.`,
      advice: `${length - MAX_CHARS} over the ${MAX_CHARS}-character limit`,
    };
  }

  const lower = password.toLowerCase();
  flags.truncated = bytes > MAX_BYTES;
  const kind = commonKind(lower);
  flags.common = kind !== null;

  const normalised = unleet(lower);
  flags.personal = personalTokens(avoid).some(
    (t) => lower.includes(t) || normalised.includes(t),
  );

  const unique = new Set(chars).size;
  flags.pattern =
    unique <= 2 || isRepeat(chars) || isRun(chars) || isRowRun(lower);

  // Repeats add little: a character past its second appearance counts
  // for a third of a fresh one. Integer arithmetic, in thirds.
  const effectiveThirds = unique * 3 + (length - unique);
  const bitsTenths = (effectiveThirds * poolTenths(password)) / 3;
  let level: Level = bitsTenths < 300 ? 1 : bitsTenths < 420 ? 2 : bitsTenths < 640 ? 3 : 4;

  // Caps. Each is a shape that a raw entropy figure flatters.
  const digitsOnly = /^\d+$/.test(password);
  const lettersOnlyLower = /^\p{Ll}+$/u.test(password);
  // A short word followed by a few digits and maybe a symbol: `Summer2024`,
  // `Ama1985!`. The shape is the first thing anyone tries.
  const wordThenNumber = /^\p{L}{1,10}\d{1,4}[^\p{L}\d]?$/u.test(password);

  if (flags.common || flags.pattern) level = 1;
  else if (digitsOnly && length < 14) level = 1;
  else if (flags.personal) level = Math.min(level, 2) as Level;
  else if (wordThenNumber) level = Math.min(level, 2) as Level;
  else if (lettersOnlyLower && length < 12) level = Math.min(level, 2) as Level;

  // One piece of advice, the most useful first.
  let advice: string | null = null;
  if (kind === "exact") advice = "That's a very common password.";
  else if (kind === "built") advice = "It's built on a very common password.";
  else if (flags.personal) advice = "It includes part of your name or email.";
  else if (flags.pattern) advice = "Patterns and repeats are easy to guess.";
  else if (flags.truncated)
    advice = `Only the first ${MAX_BYTES} bytes count — accents and emoji take more than one.`;
  else if (wordThenNumber) advice = "A word followed by numbers is a familiar shape.";
  else if (level <= 2) advice = "Longer is stronger — a few words together work well.";

  return { ...base, level, label: LABELS[level], advice };
}

export type Match = "empty" | "match" | "differs";

/** Whether a confirmation agrees. Empty is its own answer, not a mismatch. */
export function matchState(password: string, confirm: string): Match {
  if (confirm.length === 0) return "empty";
  return password === confirm ? "match" : "differs";
}

/**
 * What the browser should be told is wrong, for `setCustomValidity`.
 * An empty string means valid. Only the hard rules appear here.
 */
export function validity(
  variant: "current" | "new" | "confirm",
  value: string,
  other: string,
  avoid: readonly string[] = [],
): string {
  if (variant === "current" || value.length === 0) return "";
  if (variant === "new") return checkPassword(value, avoid).blocking ?? "";
  return matchState(other, value) === "differs" ? "The two passwords don't match." : "";
}
