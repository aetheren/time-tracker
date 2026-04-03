"use client";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import type { Category, Entry } from "@/types";
import { EntryForm } from "@/components/EntryForm";
import { EntryList } from "@/components/EntryList";
import { DailySummaryBar } from "@/components/DailySummaryBar";
import { DurationBarInput } from "@/components/DurationBarInput";

export default function HomePage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [entriesRes, catsRes] = await Promise.all([
      fetch(`/api/entries?date=${selectedDate}`),
      fetch("/api/categories"),
    ]);
    setEntries(await entriesRes.json());
    setCategories(await catsRes.json());
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: number) => {
    await fetch(`/api/entries/${id}`, { method: "DELETE" });
    setEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Daily Log</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track your time for the day</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(format(d, "yyyy-MM-dd"));
            }}
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ‹
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={today}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              const next = format(d, "yyyy-MM-dd");
              if (next <= today) setSelectedDate(next);
            }}
            disabled={selectedDate >= today}
            className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
          >
            ›
          </button>
          {selectedDate !== today && (
            <button
              onClick={() => setSelectedDate(today)}
              className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {categories.length > 0 && (
        <EntryForm categories={categories} selectedDate={selectedDate} onAdded={fetchData} />
      )}

      {categories.length > 0 && (
        <DurationBarInput
          categories={categories}
          entries={entries}
          selectedDate={selectedDate}
          onSaved={fetchData}
        />
      )}

      {totalMinutes > 0 && <DailySummaryBar entries={entries} totalMinutes={totalMinutes} />}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading…</div>
      ) : (
        <EntryList entries={entries} totalMinutes={totalMinutes} onDelete={handleDelete} />
      )}
    </div>
  );
}
