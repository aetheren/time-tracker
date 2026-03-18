"use client";
import type { Entry } from "@/types";
import { formatDuration } from "@/lib/utils";

interface Props {
  entries: Entry[];
  totalMinutes: number;
}

export function DailySummaryBar({ entries, totalMinutes }: Props) {
  const catMap = new Map<string, { color: string; minutes: number }>();
  for (const e of entries) {
    if (!catMap.has(e.category_name!)) catMap.set(e.category_name!, { color: e.category_color!, minutes: 0 });
    catMap.get(e.category_name!)!.minutes += e.duration_minutes;
  }
  const cats = [...catMap.entries()];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Today&apos;s Summary</span>
        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatDuration(totalMinutes)}</span>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        {cats.map(([name, { color, minutes }]) => (
          <div
            key={name}
            style={{ width: `${(minutes / totalMinutes) * 100}%`, backgroundColor: color }}
            title={`${name}: ${formatDuration(minutes)}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {cats.map(([name, { color, minutes }]) => (
          <div key={name} className="flex items-center gap-1.5 text-xs">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-gray-600 dark:text-gray-400">{name}</span>
            <span className="font-medium text-gray-800 dark:text-gray-200">{formatDuration(minutes)}</span>
            <span className="text-gray-400">({Math.round((minutes / totalMinutes) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
