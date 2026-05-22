import { cn } from "../lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="border-b px-4 py-3 bg-muted/30 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => <Skeleton key={i} className="h-3 w-20" />)}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3.5 border-b last:border-0 items-center">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-2.5 w-48" />
          </div>
          {Array.from({ length: cols - 2 }).map((_, j) => <Skeleton key={j} className="h-3 w-16" />)}
        </div>
      ))}
    </div>
  );
}
