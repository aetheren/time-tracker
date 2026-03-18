"use client";
import { useState } from "react";
import type { Category } from "@/types";
import { parseDuration } from "@/lib/utils";

interface Props {
  categories: Category[];
  selectedDate: string;
  onAdded: () => void;
}

export function EntryForm({ categories, selectedDate, onAdded }: Props) {
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState("");
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id ?? 0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const minutes = parseDuration(duration);
    if (!minutes || minutes <= 0) {
      setError('Invalid duration. Try "2h", "90m", "1h 30m", or "45".');
      return;
    }
    if (!categoryId) {
      setError("Please select a category.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selectedDate,
          description: description.trim(),
          duration_minutes: minutes,
          category_id: categoryId,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setDescription("");
      setDuration("");
      onAdded();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-3">
      <h2 className="font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide">Log Time</h2>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="What did you work on? (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <input
          type="text"
          placeholder='Duration (e.g. "2h 30m")'
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          required
          className="w-40 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={categoryId}
          onChange={(e) => setCategoryId(Number(e.target.value))}
          className="w-40 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Adding…" : "Add"}
        </button>
      </div>

      {error && <p className="text-red-500 text-xs">{error}</p>}
      <p className="text-gray-400 text-xs">Duration examples: "2h", "90m", "1h 30m", "45" (minutes)</p>
    </form>
  );
}
