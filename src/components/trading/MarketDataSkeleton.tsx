import React from "react";

interface MarketDataSkeletonProps {
  type?: "card" | "list" | "widget" | "ticker";
  count?: number;
}

export const MarketDataSkeleton: React.FC<MarketDataSkeletonProps> = ({
  type = "list",
  count = 3
}) => {
  if (type === "ticker") {
    return (
      <div className="flex items-center gap-3 overflow-hidden py-2 animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl shrink-0 border border-slate-200/60 dark:border-slate-700/50">
            <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="w-12 h-3 bg-slate-300 dark:bg-slate-600 rounded" />
            <div className="w-8 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "widget") {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 animate-pulse">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700" />
            <div className="w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <div className="w-20 h-6 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2 border border-slate-100 dark:border-slate-800">
              <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="w-24 h-5 bg-slate-300 dark:bg-slate-600 rounded" />
            </div>
          ))}
        </div>

        {/* Allocation Bar Skeleton */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between">
            <div className="w-28 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
            <div className="w-12 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
          </div>
          <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex gap-1">
            <div className="w-2/5 h-full bg-blue-300 dark:bg-blue-800 rounded" />
            <div className="w-1/4 h-full bg-emerald-300 dark:bg-emerald-800 rounded" />
            <div className="w-1/5 h-full bg-amber-300 dark:bg-amber-800 rounded" />
            <div className="w-1/10 h-full bg-purple-300 dark:bg-purple-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (type === "card") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <div className="w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded" />
                <div className="w-16 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
              <div className="w-12 h-6 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>
            <div className="w-32 h-6 bg-slate-300 dark:bg-slate-600 rounded" />
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="w-20 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="w-16 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Default List Skeleton
  return (
    <div className="space-y-2 animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
            <div className="space-y-1.5">
              <div className="w-28 h-3.5 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="w-16 h-3 bg-slate-100 dark:bg-slate-800 rounded" />
            </div>
          </div>
          <div className="text-right space-y-1.5">
            <div className="w-20 h-4 bg-slate-300 dark:bg-slate-600 rounded ml-auto" />
            <div className="w-14 h-3 bg-slate-200 dark:bg-slate-700 rounded ml-auto" />
          </div>
        </div>
      ))}
    </div>
  );
};
