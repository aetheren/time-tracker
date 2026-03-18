import { NextRequest, NextResponse } from "next/server";
import { getEntries, getEntriesForMonth } from "@/lib/db";
import type { DailyReport, MonthlyReport, Entry } from "@/types";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const scope = searchParams.get("scope") ?? "daily";

  if (scope === "daily") {
    const date = searchParams.get("date");
    if (!date) return NextResponse.json({ error: "date required" }, { status: 400 });

    const entries = getEntries(date);
    const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0);

    const catMap = new Map<string, { category: string; color: string; minutes: number }>();
    for (const e of entries) {
      const key = e.category_name!;
      if (!catMap.has(key)) catMap.set(key, { category: key, color: e.category_color!, minutes: 0 });
      catMap.get(key)!.minutes += e.duration_minutes;
    }
    const by_category = [...catMap.values()].map((c) => ({
      ...c,
      percentage: totalMinutes > 0 ? Math.round((c.minutes / totalMinutes) * 100) : 0,
    }));

    const report: DailyReport = { date, total_minutes: totalMinutes, by_category, entries };
    return NextResponse.json(report);
  }

  if (scope === "monthly") {
    const year = parseInt(searchParams.get("year") ?? "");
    const month = parseInt(searchParams.get("month") ?? "");
    if (!year || !month) return NextResponse.json({ error: "year and month required" }, { status: 400 });

    const entries: Entry[] = getEntriesForMonth(year, month);
    const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0);

    const catMap = new Map<string, { category: string; color: string; minutes: number }>();
    const dayMap = new Map<string, { date: string; minutes: number; [k: string]: string | number }>();

    for (const e of entries) {
      const key = e.category_name!;
      if (!catMap.has(key)) catMap.set(key, { category: key, color: e.category_color!, minutes: 0 });
      catMap.get(key)!.minutes += e.duration_minutes;

      if (!dayMap.has(e.date)) dayMap.set(e.date, { date: e.date, minutes: 0 });
      const dayEntry = dayMap.get(e.date)!;
      dayEntry.minutes += e.duration_minutes;
      dayEntry[key] = ((dayEntry[key] as number) || 0) + e.duration_minutes;
    }

    const by_category = [...catMap.values()].map((c) => ({
      ...c,
      percentage: totalMinutes > 0 ? Math.round((c.minutes / totalMinutes) * 100) : 0,
    }));
    const by_day = [...dayMap.values()].sort((a, b) => a.date.localeCompare(b.date));

    const report: MonthlyReport = { year, month, total_minutes: totalMinutes, by_category, by_day };
    return NextResponse.json(report);
  }

  return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
}
