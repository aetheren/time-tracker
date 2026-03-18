# Time Tracker — Specification

> Reference document for keeping changes consistent. Update this file when behaviour, data shapes, or conventions change.

---

## 1. Purpose

A single-user, local-first web app for logging daily time entries by duration and category, with daily and monthly reports, charts, and CSV/PDF export. No authentication. No external database.

---

## 2. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | `serverExternalPackages` not needed (no native modules) |
| Language | TypeScript (strict) | `tsconfig.json` `strict: true` |
| Styling | Tailwind CSS v3 + `next-themes` | Dark/light toggle via `class` strategy |
| Charts | recharts 2 | Client components only |
| PDF export | jspdf + jspdf-autotable | Dynamic import inside event handlers |
| CSV export | Native `Blob` + `URL.createObjectURL` | No library needed; papaparse available if needed |
| Date utils | date-fns v3 | `format`, `parse` |
| Storage | JSON files in `data/` | `data/entries.json`, `data/categories.json` |

**Node constraint:** `better-sqlite3` does not build on Node v24 without Xcode. Do not introduce native addons.

---

## 3. Project Structure

```
time-tracker/
├── data/                        # Runtime data (gitignored)
│   ├── entries.json
│   └── categories.json
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Root layout: ThemeProvider + NavBar + <main>
│   │   ├── globals.css          # Tailwind base + CSS custom properties
│   │   ├── page.tsx             # / — Daily Log
│   │   ├── categories/
│   │   │   └── page.tsx         # /categories — Category manager
│   │   ├── reports/
│   │   │   ├── daily/page.tsx   # /reports/daily
│   │   │   └── monthly/page.tsx # /reports/monthly
│   │   └── api/
│   │       ├── entries/
│   │       │   ├── route.ts         # GET /api/entries, POST /api/entries
│   │       │   └── [id]/route.ts    # DELETE /api/entries/:id
│   │       ├── categories/
│   │       │   ├── route.ts         # GET /api/categories, POST /api/categories
│   │       │   └── [id]/route.ts    # DELETE /api/categories/:id, PATCH /api/categories/:id
│   │       └── reports/
│   │           └── route.ts         # GET /api/reports?scope=daily|monthly&...
│   ├── components/
│   │   ├── ThemeProvider.tsx    # Thin wrapper around next-themes
│   │   ├── NavBar.tsx           # Top nav + theme toggle button
│   │   ├── EntryForm.tsx        # Duration + category + description form
│   │   ├── EntryList.tsx        # List of entries for the selected day
│   │   └── DailySummaryBar.tsx  # Stacked bar + legend for the day's totals
│   ├── lib/
│   │   ├── db.ts                # Server-only: all file I/O and CRUD logic
│   │   └── utils.ts             # Isomorphic: parseDuration, formatDuration
│   └── types/
│       └── index.ts             # Shared TypeScript interfaces
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Data Model

### 4.1 `Category`

```ts
interface Category {
  id: number;        // auto-incremented integer (max existing id + 1)
  name: string;      // unique, case-insensitive uniqueness enforced in addCategory()
  color: string;     // hex color e.g. "#3B82F6"
  is_default: number; // 1 = built-in (cannot be deleted), 0 = user-created
}
```

**Default categories (ids 1–5, is_default=1):**

| id | name | color |
|---|---|---|
| 1 | Work | `#3B82F6` |
| 2 | Personal | `#8B5CF6` |
| 3 | Health | `#10B981` |
| 4 | Learning | `#F59E0B` |
| 5 | Other | `#6B7280` |

Deleting a custom category reassigns its entries to **Other (id=5)**.

### 4.2 `Entry` (stored as `RawEntry` in JSON)

```ts
// Stored shape in entries.json:
interface RawEntry {
  id: number;               // auto-incremented integer
  date: string;             // "YYYY-MM-DD"
  description: string;      // free text, may be empty string
  duration_minutes: number; // positive integer
  category_id: number;      // references Category.id
  created_at: string;       // ISO 8601 UTC e.g. "2026-03-18T10:33:55.723Z"
}

// Returned shape from API (category fields joined at read time):
interface Entry extends RawEntry {
  category_name?: string;
  category_color?: string;
}
```

### 4.3 Report shapes

```ts
interface DailyReport {
  date: string;
  total_minutes: number;
  by_category: { category: string; color: string; minutes: number; percentage: number }[];
  entries: Entry[];
}

interface MonthlyReport {
  year: number;
  month: number;             // 1–12
  total_minutes: number;
  by_category: { category: string; color: string; minutes: number; percentage: number }[];
  by_day: { date: string; minutes: number; [categoryName: string]: string | number }[];
}
```

`percentage` values are rounded integers that may not sum to exactly 100 due to rounding.

---

## 5. Storage Layer (`src/lib/db.ts`)

**Server-only.** Never import this file in a client component (`"use client"`).

All data lives in `<cwd>/data/`. The directory is created automatically.

### Read/write pattern
- `readJson<T>(file, default)` — reads `data/<file>`, returns `default` on missing or parse error.
- `writeJson<T>(file, data)` — atomic synchronous write via `fs.writeFileSync`.
- Both ensure the `data/` directory exists before operating.

### Exported functions

| Function | Signature | Notes |
|---|---|---|
| `getCategories` | `() → Category[]` | Seeds defaults if file is empty |
| `addCategory` | `(name, color) → Category` | Throws if name already exists (case-insensitive) |
| `deleteCategory` | `(id) → boolean` | Throws if `is_default=1`; reassigns entries to id=5 |
| `updateCategory` | `(id, name?, color?) → Category \| null` | Partial update |
| `getEntries` | `(date?) → Entry[]` | All entries or filtered by date; sorted by `created_at DESC` |
| `addEntry` | `(date, description, duration_minutes, category_id) → Entry` | Appends to JSON array |
| `deleteEntry` | `(id) → boolean` | Returns false if not found |
| `getEntriesForMonth` | `(year, month) → Entry[]` | Prefix-filters `date` as `"YYYY-MM"` |

---

## 6. Utility Functions (`src/lib/utils.ts`)

**Isomorphic** — safe to import in both server and client components.

### `parseDuration(input: string): number | null`

Converts a human-readable duration string to **integer minutes**. Returns `null` on invalid input.

| Input example | Result |
|---|---|
| `"2h 30m"` | `150` |
| `"2h30m"` | `150` |
| `"1.5h"` | `90` |
| `"90m"` or `"90min"` | `90` |
| `"45"` (plain number) | `45` |
| `""` or garbage | `null` |

### `formatDuration(minutes: number): string`

Formats an integer minute count as a compact string.

| Input | Output |
|---|---|
| `90` | `"1h 30m"` |
| `60` | `"1h"` |
| `45` | `"45m"` |
| `0` | `"0m"` |

---

## 7. API Reference

All routes return `application/json`. Error responses use `{ "error": "..." }`.

### `GET /api/entries`

| Param | Type | Required | Description |
|---|---|---|---|
| `date` | `string` | No | Filter to `YYYY-MM-DD`; omit for last 200 entries |

Returns `Entry[]`.

### `POST /api/entries`

Body:
```json
{ "date": "2026-03-18", "description": "...", "duration_minutes": 90, "category_id": 1 }
```
`description` defaults to `""`. Returns `Entry` with status `201`.

### `DELETE /api/entries/:id`

Returns `{ "success": true }` or `404`.

### `GET /api/categories`

Returns `Category[]` sorted by `is_default DESC, name ASC`.

### `POST /api/categories`

Body: `{ "name": "...", "color": "#hex" }`. Returns `Category` with status `201` or `409` if name exists.

### `DELETE /api/categories/:id`

Returns `{ "success": true }`, `404`, or `400` if deleting a default.

### `PATCH /api/categories/:id`

Body: `{ "name"?: "...", "color"?: "#hex" }` (partial). Returns updated `Category`.

### `GET /api/reports`

| Param | Type | Required | Description |
|---|---|---|---|
| `scope` | `"daily" \| "monthly"` | Yes | Report type |
| `date` | `string` | For daily | `YYYY-MM-DD` |
| `year` | `number` | For monthly | Full year e.g. `2026` |
| `month` | `number` | For monthly | `1`–`12` |

Returns `DailyReport` or `MonthlyReport`.

---

## 8. UI Conventions

### Tailwind patterns

| Purpose | Classes |
|---|---|
| Card / panel | `bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4` |
| Section heading | `font-semibold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wide` |
| Primary button | `px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg` |
| Ghost button | `px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800` |
| Text input | `px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500` |
| Disabled state | `disabled:opacity-40` |
| Empty state | `text-center py-12 text-gray-400` with a large emoji |
| Loading state | `text-center py-8 text-gray-400` with "Loading…" |

### Category color chips

```tsx
// Badge
<span style={{ backgroundColor: color + "22", color }}>Name</span>
// Dot
<span style={{ backgroundColor: color }} className="w-2.5 h-2.5 rounded-full" />
```

### Dark mode

`next-themes` with `attribute="class"`. Theme toggle lives in `NavBar`. The `<html>` tag uses `suppressHydrationWarning`. Theme-reading components must guard with `const [mounted, setMounted] = useState(false)` and `useEffect(() => setMounted(true), [])`.

### Date handling

- Dates are always stored and passed as `"YYYY-MM-DD"` strings.
- `date-fns/format` with `"yyyy-MM-dd"` is the canonical formatter.
- The date picker uses `<input type="date">` with a `max={today}` constraint to prevent future entries.
- Navigation arrows step one day/month at a time.

---

## 9. Export Behaviour

### CSV

Built inline with native `Blob`. No library required. Always triggers a browser download via a temporary `<a>` element.

Filename convention:
- Daily: `time-tracker-daily-YYYY-MM-DD.csv`
- Monthly: `time-tracker-monthly-YYYY-MM.csv`

### PDF

`jspdf` + `jspdf-autotable` are **dynamically imported** inside the click handler to avoid bundling them into the initial JS chunk:

```ts
const { default: jsPDF } = await import("jspdf");
const { default: autoTable } = await import("jspdf-autotable");
```

`autoTable` mutates the `doc` instance. Access the final Y position via `(doc as any).lastAutoTable.finalY`.

Filename convention mirrors CSV.

---

## 10. Adding New Features — Checklist

1. **New data field on Entry** → update `RawEntry` in `db.ts`, `Entry` in `types/index.ts`, `addEntry()` signature, and the relevant API route body parsing.
2. **New page** → create `src/app/<path>/page.tsx` (client component), add nav link in `NavBar.tsx`.
3. **New API route** → create under `src/app/api/`, import only from `@/lib/db` (never from client-only libs).
4. **New component** → if it reads `theme`, guard with `mounted` check. Import duration/format helpers from `@/lib/utils`, not `@/lib/db`.
5. **New dependency with native bindings** → check compatibility with Node v24 on macOS arm64 without Xcode before adding.
6. **Report aggregation change** → the aggregation logic lives entirely in `src/app/api/reports/route.ts`; the pages are display-only.
