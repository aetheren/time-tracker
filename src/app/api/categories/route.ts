import { NextRequest, NextResponse } from "next/server";
import { getCategories, addCategory } from "@/lib/db";

export async function GET() {
  return NextResponse.json(getCategories());
}

export async function POST(req: NextRequest) {
  const { name, color } = await req.json();
  if (!name || !color) return NextResponse.json({ error: "Name and color required" }, { status: 400 });
  try {
    const cat = addCategory(name.trim(), color);
    return NextResponse.json(cat, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 409 });
  }
}
