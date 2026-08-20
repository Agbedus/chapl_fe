"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // Which face shows is decided by the `dark` class in CSS, not by React
  // state — the server has no way to know the stored preference, and gating
  // on a mount flag would just make the button flicker.
  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle dark mode"
      className="grid h-9 w-9 place-items-center rounded-full border border-line text-ink-2 transition-colors hover:border-line-strong hover:text-ink"
    >
      <Moon className="h-[17px] w-[17px] dark:hidden" strokeWidth={1.9} />
      <Sun
        className="hidden h-[17px] w-[17px] text-gold dark:block"
        strokeWidth={1.9}
      />
    </button>
  );
}
