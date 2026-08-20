import {
  SkeletonPanel, SkeletonRows, SkeletonStat, Skeleton,
} from "@/components/skeleton";

/**
 * Every screen under `/app`, before it arrives.
 *
 * One file covers the whole segment: Next shows it for any nested route
 * that has not declared its own. The shape is the shape most of these
 * pages actually are — a heading, a row of figures, then panels — so the
 * real page lands roughly where the skeleton already was rather than
 * shoving everything down the screen.
 *
 * It is deliberately not a spinner. A spinner says "something is
 * happening"; this says "a page is coming and it looks like this", which
 * is the difference between waiting and waiting *for* something.
 */
export default function Loading() {
  return (
    <div className="space-y-3 pb-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Skeleton className="h-[9px] w-20" />
          <Skeleton className="mt-2.5 h-6 w-44" />
          <Skeleton className="mt-2 h-[10px] w-64" />
        </div>
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <SkeletonPanel />
        <SkeletonPanel />
      </section>

      <SkeletonRows />
    </div>
  );
}
