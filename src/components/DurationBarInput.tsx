"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import type { Category, Entry } from "@/types";
import { formatDuration } from "@/lib/utils";

const MAX_MINUTES = 480; // 8 hours
const SNAP = 15; // 15-minute increments

interface Props {
  categories: Category[];
  entries: Entry[];
  selectedDate: string;
  onSaved: () => void;
}

function snap(minutes: number): number {
  return Math.round(minutes / SNAP) * SNAP;
}

function sumByCategory(entries: Entry[]): Record<number, { minutes: number; entryIds: number[] }> {
  const map: Record<number, { minutes: number; entryIds: number[] }> = {};
  for (const e of entries) {
    if (!map[e.category_id]) map[e.category_id] = { minutes: 0, entryIds: [] };
    map[e.category_id].minutes += e.duration_minutes;
    map[e.category_id].entryIds.push(e.id);
  }
  return map;
}

export function DurationBarInput({ categories, entries, selectedDate, onSaved }: Props) {
  const categoryData = sumByCategory(entries);

  const [values, setValues] = useState<Record<number, number>>(() => {
    const init: Record<number, number> = {};
    for (const cat of categories) {
      init[cat.id] = categoryData[cat.id]?.minutes ?? 0;
    }
    return init;
  });

  // Reset values when entries or selectedDate change
  useEffect(() => {
    const data = sumByCategory(entries);
    const init: Record<number, number> = {};
    for (const cat of categories) {
      init[cat.id] = data[cat.id]?.minutes ?? 0;
    }
    setValues(init);
  }, [entries, categories, selectedDate]);

  const [dirtyIds, setDirtyIds] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);

  const handleDirty = useCallback((catId: number, minutes: number) => {
    setValues((prev) => ({ ...prev, [catId]: minutes }));
    setDirtyIds((prev) => {
      const next = new Set(prev);
      const original = categoryData[catId]?.minutes ?? 0;
      if (minutes === original) {
        next.delete(catId);
      } else {
        next.add(catId);
      }
      return next;
    });
  }, [categoryData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const promises: Promise<Response>[] = [];

      for (const catId of dirtyIds) {
        const newMinutes = values[catId];
        const existing = categoryData[catId];

        if (existing && newMinutes > 0) {
          // Update first entry, delete the rest, set first entry to new total
          const [firstId, ...restIds] = existing.entryIds;
          promises.push(
            fetch(`/api/entries/${firstId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ duration_minutes: newMinutes }),
            })
          );
          for (const id of restIds) {
            promises.push(fetch(`/api/entries/${id}`, { method: "DELETE" }));
          }
        } else if (existing && newMinutes === 0) {
          // Delete all entries for this category
          for (const id of existing.entryIds) {
            promises.push(fetch(`/api/entries/${id}`, { method: "DELETE" }));
          }
        } else if (!existing && newMinutes > 0) {
          // Create new entry
          promises.push(
            fetch("/api/entries", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                date: selectedDate,
                description: "",
                duration_minutes: newMinutes,
                category_id: catId,
              }),
            })
          );
        }
      }

      await Promise.all(promises);
      setDirtyIds(new Set());
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const totalMinutes = Object.values(values).reduce((s, v) => s + v, 0);

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">
          Quick Adjust
        </h2>
        <span className="text-sm text-gray-400">
          Total: {formatDuration(totalMinutes)}
        </span>
      </div>

      <div className="space-y-2">
        {categories.map((cat) => (
          <DraggableBar
            key={cat.id}
            category={cat}
            minutes={values[cat.id] ?? 0}
            isDirty={dirtyIds.has(cat.id)}
            onChange={(m) => handleDirty(cat.id, m)}
          />
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={dirtyIds.size === 0 || saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save All"}
        </button>
        {dirtyIds.size > 0 && (
          <span className="text-xs text-amber-500">
            {dirtyIds.size} unsaved {dirtyIds.size === 1 ? "change" : "changes"}
          </span>
        )}
        {savedMsg && (
          <span className="text-xs text-green-500 font-medium">Saved!</span>
        )}
      </div>
    </div>
  );
}

function DraggableBar({
  category,
  minutes,
  isDirty,
  onChange,
}: {
  category: Category;
  minutes: number;
  isDirty: boolean;
  onChange: (minutes: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const calcMinutes = useCallback((clientX: number) => {
    const track = trackRef.current;
    if (!track) return minutes;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return snap(Math.round(ratio * MAX_MINUTES));
  }, [minutes]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    onChange(calcMinutes(e.clientX));
  }, [calcMinutes, onChange]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    onChange(calcMinutes(e.clientX));
  }, [calcMinutes, onChange]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  const pct = (minutes / MAX_MINUTES) * 100;

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors ${
        isDirty ? "bg-amber-50 dark:bg-amber-950/30" : ""
      }`}
    >
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: category.color }}
      />
      <span className="w-[70px] text-sm font-medium text-gray-700 dark:text-gray-300 truncate flex-shrink-0">
        {category.name}
      </span>
      <div
        ref={trackRef}
        className="flex-1 h-7 bg-gray-100 dark:bg-gray-800 rounded-md relative cursor-pointer select-none touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="h-full rounded-md transition-[width] duration-75"
          style={{
            width: `${pct}%`,
            backgroundColor: category.color,
            opacity: 0.8,
          }}
        />
        {/* Drag handle */}
        {minutes > 0 && (
          <div
            className="absolute top-0 h-full w-3 cursor-ew-resize flex items-center justify-center"
            style={{ left: `calc(${pct}% - 6px)` }}
          >
            <div
              className="w-1 h-4 rounded-full"
              style={{ backgroundColor: category.color }}
            />
          </div>
        )}
      </div>
      <span className="w-[52px] text-right text-sm font-semibold text-gray-700 dark:text-gray-200 flex-shrink-0 tabular-nums">
        {minutes > 0 ? formatDuration(minutes) : "0m"}
      </span>
    </div>
  );
}
