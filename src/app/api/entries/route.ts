import { NextRequest, NextResponse } from "next/server";
import { getEntries, addEntry } from "@/lib/db";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? undefined;
  return NextResponse.json(getEntries(date));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { date, description, duration_minutes, category_id } = body;
  if (!date || !duration_minutes || !category_id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const entry = addEntry(date, description ?? "", duration_minutes, category_id);
  return NextResponse.json(entry, { status: 201 });
}
