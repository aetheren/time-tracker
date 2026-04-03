import { NextRequest, NextResponse } from "next/server";
import { deleteEntry, updateEntry } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const deleted = deleteEntry(Number(id));
  if (!deleted) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { duration_minutes } = await req.json();
  if (typeof duration_minutes !== "number" || duration_minutes <= 0) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }
  const entry = updateEntry(Number(id), duration_minutes);
  if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  return NextResponse.json(entry);
}
