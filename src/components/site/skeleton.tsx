/**
 * Skeleton loader components — replace the old blinking-circle `.shimmer`
 * with proper skeleton loaders that mimic the actual content layout.
 *
 * Usage:
 *   <Skeleton className="h-4 w-3/4" />           // a single bar
 *   <SkeletonLines lines={3} />                  // multiple text lines
 *   <SkeletonCard />                             // a card-shaped block
 *   <SkeletonPageHeader />                       // page title + subtitle
 *
 * The pulse animation is defined in globals.css (.skeleton + .skeleton-shimmer).
 * Staggered delays (.skeleton-delay-1..5) prevent all elements from pulsing
 * in lockstep.
 */

export function Skeleton({ className = "", variant = "pulse" }: { className?: string; variant?: "pulse" | "shimmer" }) {
  const base = variant === "shimmer" ? "skeleton-shimmer" : "skeleton";
  return <div className={`${base} ${className}`} aria-hidden />;
}

/** A stack of horizontal bars mimicking text lines. */
export function SkeletonLines({
  lines = 3,
  className = "",
  lineHeight = "h-3",
  spacing = "space-y-2",
}: {
  lines?: number;
  className?: string;
  lineHeight?: string;
  spacing?: string;
}) {
  return (
    <div className={`${spacing} ${className}`} aria-hidden>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`skeleton ${lineHeight} skeleton-delay-${(i % 5) + 1}`}
          style={{ width: i === lines - 1 ? "70%" : "100%" }}
        />
      ))}
    </div>
  );
}

/** A card-shaped skeleton block — used for product cards, order cards, etc. */
export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${className}`}
      style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}
      aria-hidden
    >
      <div className="skeleton-shimmer h-32 w-full rounded-xl" />
      <div className="skeleton mt-3 h-4 w-3/4 skeleton-delay-1" />
      <div className="skeleton mt-2 h-3 w-1/2 skeleton-delay-2" />
      <div className="mt-3 flex items-center justify-between">
        <div className="skeleton h-6 w-20 rounded-full skeleton-delay-3" />
        <div className="skeleton h-8 w-16 rounded-full skeleton-delay-4" />
      </div>
    </div>
  );
}

/** A horizontal row skeleton — used for order rows, address rows, etc. */
export function SkeletonRow({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border p-4 ${className}`}
      style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}
      aria-hidden
    >
      <div className="skeleton h-10 w-10 rounded-full skeleton-delay-1" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3 w-1/2 skeleton-delay-2" />
        <div className="skeleton h-3 w-3/4 skeleton-delay-3" />
      </div>
      <div className="skeleton h-6 w-16 rounded-full skeleton-delay-4" />
    </div>
  );
}

/** A page header skeleton — title + subtitle bar. */
export function SkeletonPageHeader({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden>
      <div className="skeleton h-6 w-48 skeleton-delay-1" />
      <div className="skeleton h-3 w-72 skeleton-delay-2" />
    </div>
  );
}

/** Full-screen loading state for Suspense fallbacks and initial page loads. */
export function SkeletonFullScreen({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }} role="status" aria-label={label}>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 px-4 py-8">
        <SkeletonPageHeader />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
