"use client";
import type { Entry } from "@/types";
import { formatDuration } from "@/lib/utils";

interface Props {
  entries: Entry[];
  totalMinutes: number;
  onDelete: (id: number) => void;
}

export function EntryList({ entries, totalMinutes, onDelete }: Props) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 dark:text-gray-600">
        <p className="text-4xl mb-2">📋</p>
        <p>No entries yet. Add your first time entry above!</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
          Entries ({entries.length})
        </h2>
        <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
          Total: {formatDuration(totalMinutes)}
        </span>
      </div>

      <div className="space-y-1.5">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-2.5 group"
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: entry.category_color }}
            />
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: entry.category_color + "22",
                color: entry.category_color,
              }}
            >
              {entry.category_name}
            </span>
            <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
              {entry.description || <span className="italic text-gray-400">(no description)</span>}
            </span>
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-shrink-0">
              {formatDuration(entry.duration_minutes)}
            </span>
            <button
              onClick={() => onDelete(entry.id)}
              className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-lg leading-none flex-shrink-0"
              title="Delete"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
