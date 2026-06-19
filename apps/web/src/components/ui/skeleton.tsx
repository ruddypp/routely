import type { ComponentPropsWithoutRef } from "react";

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export type SkeletonProps = ComponentPropsWithoutRef<"span">;

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <span
      className={cn("block animate-pulse rounded-md bg-white/[0.07]", className)}
      {...props}
    />
  );
}

export function SkeletonRows({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2 p-3 sm:p-4">
      {Array.from({ length: count }).map((_, item) => (
        <div key={item} className="grid h-[104px] gap-3 rounded-md bg-white/[0.025] p-3 sm:h-[76px] sm:grid-cols-[minmax(210px,1fr)_100px_1fr]">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <span className="space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-2 w-44" />
            </span>
          </div>
          <Skeleton className="h-7" />
          <Skeleton className="h-7" />
        </div>
      ))}
    </div>
  );
}
