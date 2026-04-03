import fs from "fs";
import path from "path";
import type { Category, Entry } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(file: string, defaultValue: T): T {
  ensureDir();
  const p = path.join(DATA_DIR, file);
  if (!fs.existsSync(p)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8")) as T;
  } catch {
    return defaultValue;
  }
}

function writeJson<T>(file: string, data: T) {
  ensureDir();
  fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2));
}

// ── Categories ────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES: Category[] = [
  { id: 1, name: "Work",     color: "#3B82F6", is_default: 1 },
  { id: 2, name: "Personal", color: "#8B5CF6", is_default: 1 },
  { id: 3, name: "Health",   color: "#10B981", is_default: 1 },
  { id: 4, name: "Learning", color: "#F59E0B", is_default: 1 },
  { id: 5, name: "Other",    color: "#6B7280", is_default: 1 },
];

export function getCategories(): Category[] {
  const cats = readJson<Category[]>("categories.json", DEFAULT_CATEGORIES);
  if (cats.length === 0) {
    writeJson("categories.json", DEFAULT_CATEGORIES);
    return DEFAULT_CATEGORIES;
  }
  return cats;
}

export function addCategory(name: string, color: string): Category {
  const cats = getCategories();
  if (cats.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
    throw new Error("Category name already exists");
  }
  const id = cats.length > 0 ? Math.max(...cats.map((c) => c.id)) + 1 : 1;
  const cat: Category = { id, name, color, is_default: 0 };
  cats.push(cat);
  writeJson("categories.json", cats);
  return cat;
}

export function deleteCategory(id: number): boolean {
  const cats = getCategories();
  const cat = cats.find((c) => c.id === id);
  if (!cat) return false;
  if (cat.is_default) throw new Error("Cannot delete default categories");
  writeJson("categories.json", cats.filter((c) => c.id !== id));
  // Reassign entries to "Other" (id=5)
  const entries = getEntries();
  const updated = entries.map((e) => e.category_id === id ? { ...e, category_id: 5 } : e);
  writeJson("entries.json", updated);
  return true;
}

export function updateCategory(id: number, name?: string, color?: string): Category | null {
  const cats = getCategories();
  const cat = cats.find((c) => c.id === id);
  if (!cat) return null;
  if (name) cat.name = name.trim();
  if (color) cat.color = color;
  writeJson("categories.json", cats);
  return cat;
}

// ── Entries ───────────────────────────────────────────────────────────────────

interface RawEntry {
  id: number;
  date: string;
  description: string;
  duration_minutes: number;
  category_id: number;
  created_at: string;
}

export function getEntries(date?: string): Entry[] {
  const raw = readJson<RawEntry[]>("entries.json", []);
  const cats = getCategories();
  const catMap = new Map(cats.map((c) => [c.id, c]));

  const filtered = date ? raw.filter((e) => e.date === date) : raw;
  return filtered
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .map((e) => {
      const cat = catMap.get(e.category_id);
      return { ...e, category_name: cat?.name, category_color: cat?.color };
    });
}

export function addEntry(
  date: string,
  description: string,
  duration_minutes: number,
  category_id: number
): Entry {
  const raw = readJson<RawEntry[]>("entries.json", []);
  const id = raw.length > 0 ? Math.max(...raw.map((e) => e.id)) + 1 : 1;
  const entry: RawEntry = {
    id,
    date,
    description,
    duration_minutes,
    category_id,
    created_at: new Date().toISOString(),
  };
  raw.push(entry);
  writeJson("entries.json", raw);
  const cats = getCategories();
  const cat = cats.find((c) => c.id === category_id);
  return { ...entry, category_name: cat?.name, category_color: cat?.color };
}

export function updateEntry(id: number, duration_minutes: number): Entry | null {
  const raw = readJson<RawEntry[]>("entries.json", []);
  const entry = raw.find((e) => e.id === id);
  if (!entry) return null;
  entry.duration_minutes = duration_minutes;
  writeJson("entries.json", raw);
  const cats = getCategories();
  const cat = cats.find((c) => c.id === entry.category_id);
  return { ...entry, category_name: cat?.name, category_color: cat?.color };
}

export function deleteEntry(id: number): boolean {
  const raw = readJson<RawEntry[]>("entries.json", []);
  const next = raw.filter((e) => e.id !== id);
  if (next.length === raw.length) return false;
  writeJson("entries.json", next);
  return true;
}

export function getEntriesForMonth(year: number, month: number): Entry[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const raw = readJson<RawEntry[]>("entries.json", []);
  const cats = getCategories();
  const catMap = new Map(cats.map((c) => [c.id, c]));
  return raw
    .filter((e) => e.date.startsWith(prefix))
    .map((e) => {
      const cat = catMap.get(e.category_id);
      return { ...e, category_name: cat?.name, category_color: cat?.color };
    });
}

