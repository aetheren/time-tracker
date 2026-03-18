"use client";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import type { DailyReport } from "@/types";
import { formatDuration } from "@/lib/utils";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function DailyReportPage() {
  const today = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(today);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports?scope=daily&date=${selectedDate}`);
    setReport(await res.json());
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const exportCSV = () => {
    if (!report) return;
    const rows = [
      ["Date", "Description", "Category", "Duration (min)", "Duration"],
      ...report.entries.map((e) => [
        e.date,
        e.description,
        e.category_name ?? "",
        e.duration_minutes,
        formatDuration(e.duration_minutes),
      ]),
      [],
      ["Summary by Category"],
      ["Category", "Minutes", "Percentage"],
      ...report.by_category.map((c) => [c.category, c.minutes, `${c.percentage}%`]),
      [],
      ["Total", report.total_minutes, formatDuration(report.total_minutes)],
    ];
    const csv = rows.map((r) => r.map(String).map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `time-tracker-daily-${selectedDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    if (!report) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Daily Time Report — ${selectedDate}`, 14, 20);
    doc.setFontSize(11);
    doc.text(`Total time: ${formatDuration(report.total_minutes)}`, 14, 30);

    autoTable(doc, {
      startY: 38,
      head: [["Category", "Duration", "%"]],
      body: report.by_category.map((c) => [c.category, formatDuration(c.minutes), `${c.percentage}%`]),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    autoTable(doc, {
      startY: finalY,
      head: [["Description", "Category", "Duration"]],
      body: report.entries.map((e) => [
        e.description || "(no description)",
        e.category_name ?? "",
        formatDuration(e.duration_minutes),
      ]),
    });
    doc.save(`time-tracker-daily-${selectedDate}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Daily Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Breakdown for a single day</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={today}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={exportCSV}
            disabled={!report || report.total_minutes === 0}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
          >
            Export CSV
          </button>
          <button
            onClick={exportPDF}
            disabled={!report || report.total_minutes === 0}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
          >
            Export PDF
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : !report || report.total_minutes === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📭</p>
          <p>No entries for {selectedDate}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Pie chart */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="font-semibold mb-3 text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">Time by Category</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={report.by_category}
                  dataKey="minutes"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {report.by_category.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => formatDuration(v)} />
                <Legend formatter={(v) => v} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Summary table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="font-semibold mb-3 text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">
              Summary — {formatDuration(report.total_minutes)} total
            </h2>
            <div className="space-y-2">
              {report.by_category.map((cat) => (
                <div key={cat.category} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1 text-sm">{cat.category}</span>
                  <span className="text-sm font-medium">{formatDuration(cat.minutes)}</span>
                  <span className="text-xs text-gray-400 w-10 text-right">{cat.percentage}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Entries list */}
          <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="font-semibold mb-3 text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">All Entries</h2>
            <div className="space-y-1.5">
              {report.entries.map((e) => (
                <div key={e.id} className="flex items-center gap-3 py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.category_color }} />
                  <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.category_color + "22", color: e.category_color }}>
                    {e.category_name}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">{e.description || <span className="italic text-gray-400">(no description)</span>}</span>
                  <span className="text-sm font-medium">{formatDuration(e.duration_minutes)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
