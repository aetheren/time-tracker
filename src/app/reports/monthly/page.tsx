"use client";
import { useState, useEffect, useCallback } from "react";
import type { MonthlyReport } from "@/types";
import { formatDuration } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell,
  PieChart, Pie
} from "recharts";
import { format } from "date-fns";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

export default function MonthlyReportPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports?scope=monthly&year=${year}&month=${month}`);
    setReport(await res.json());
    setLoading(false);
  }, [year, month]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const nextMonth = () => {
    const nextM = month === 12 ? 1 : month + 1;
    const nextY = month === 12 ? year + 1 : year;
    if (nextY > now.getFullYear() || (nextY === now.getFullYear() && nextM > now.getMonth() + 1)) return;
    setMonth(nextM);
    setYear(nextY);
  };

  const exportCSV = () => {
    if (!report) return;
    const rows = [
      [`Monthly Report — ${MONTH_NAMES[month - 1]} ${year}`],
      ["Total", `${report.total_minutes} min`, formatDuration(report.total_minutes)],
      [],
      ["By Category"],
      ["Category", "Minutes", "%"],
      ...report.by_category.map((c) => [c.category, c.minutes, `${c.percentage}%`]),
      [],
      ["By Day"],
      ["Date", "Total Minutes", "Total"],
      ...report.by_day.map((d) => [d.date, d.minutes, formatDuration(d.minutes as number)]),
    ];
    const csv = rows.map((r) => r.map(String).map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `time-tracker-monthly-${year}-${String(month).padStart(2, "0")}.csv`;
    a.click();
  };

  const exportPDF = async () => {
    if (!report) return;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Monthly Time Report — ${MONTH_NAMES[month - 1]} ${year}`, 14, 20);
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
      head: [["Date", "Total"]],
      body: report.by_day.map((d) => [d.date, formatDuration(d.minutes as number)]),
    });
    doc.save(`time-tracker-monthly-${year}-${String(month).padStart(2, "0")}.pdf`);
  };

  // bar chart: convert minutes to hours for readability
  const barData = report?.by_day.map((d) => ({
    ...d,
    date: format(new Date(d.date + "T00:00:00"), "MMM d"),
    hours: Math.round((d.minutes as number) / 6) / 10, // 1 decimal
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Monthly Report</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Time breakdown for the month</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={prevMonth} className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-800">‹</button>
          <span className="text-sm font-medium px-2">{MONTH_NAMES[month - 1]} {year}</span>
          <button onClick={nextMonth} className="px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40">›</button>
          <button onClick={exportCSV} disabled={!report || report.total_minutes === 0} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40">Export CSV</button>
          <button onClick={exportPDF} disabled={!report || report.total_minutes === 0} className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40">Export PDF</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading…</div>
      ) : !report || report.total_minutes === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-2">📭</p>
          <p>No entries for {MONTH_NAMES[month - 1]} {year}.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Total Time</p>
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatDuration(report.total_minutes)}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Active Days</p>
              <p className="text-xl font-bold">{report.by_day.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Avg / Day</p>
              <p className="text-xl font-bold">
                {report.by_day.length > 0 ? formatDuration(Math.round(report.total_minutes / report.by_day.length)) : "—"}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Categories</p>
              <p className="text-xl font-bold">{report.by_category.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Bar chart */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="font-semibold mb-3 text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">Daily Hours</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => [`${v}h`, "Hours"]} />
                  <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                    {barData?.map((_, i) => (
                      <Cell key={i} fill="#3B82F6" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie chart */}
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h2 className="font-semibold mb-3 text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">By Category</h2>
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
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Category table */}
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <h2 className="font-semibold mb-3 text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wide">Category Breakdown</h2>
            <div className="space-y-2">
              {report.by_category.sort((a, b) => b.minutes - a.minutes).map((cat) => (
                <div key={cat.category} className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="flex-1 font-medium">{cat.category}</span>
                    <span className="font-medium">{formatDuration(cat.minutes)}</span>
                    <span className="text-gray-400 w-10 text-right">{cat.percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden ml-5">
                    <div className="h-full rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
