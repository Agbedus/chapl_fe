export function Logo({ className = "" }: { className?: string }) {
  // Five dots, one cross. Built from the same atom as the congregation field.
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 20 20"
        className="h-[18px] w-[18px]"
        aria-hidden
        fill="none"
      >
        <circle cx="10" cy="4" r="1.7" fill="var(--ink-3)" />
        <circle cx="4" cy="9" r="1.7" fill="var(--ink-3)" />
        <circle cx="16" cy="9" r="1.7" fill="var(--ink-3)" />
        <circle cx="10" cy="16" r="1.7" fill="var(--ink-3)" />
        <circle cx="10" cy="9" r="2.9" fill="var(--cobalt)" />
      </svg>
      <span className="font-display text-[17px] font-semibold tracking-tight text-ink">
        Chapl
      </span>
    </span>
  );
}
