# Time Tracker — Specification

> Update this file when behaviour, data shapes, or conventions change.

---

## 1. Purpose

Single-user, local-first web app for logging daily time by duration and category, with daily/monthly reports, charts, and CSV/PDF export. No authentication. No external database.

---

## 2. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript strict |
| Styling | Tailwind CSS v3 + `next-themes` (dark/light via `class`) |
| Charts | recharts (client components only) |
| Export | jsPDF + jspdf-autotable (PDF), native Blob (CSV) |
| Date utils | date-fns v3 |
| Storage | JSON files in `data/` — no native addons |

---

## 3. Project Structure

```
src/
  app/
    page.tsx                   # / — Daily log
    categories/page.tsx        # /categories — Category manager
    reports/daily/page.tsx     # /reports/daily
    reports/monthly/page.tsx   # /reports/monthly
    api/entries/               # GET, POST, DELETE /:id
    api/categories/            # GET, POST, DELETE /:id, PATCH /:id
    api/reports/               # GET ?scope=daily|monthly
  components/                  # NavBar, EntryForm, EntryList, DailySummaryBar
  lib/
    db.ts                      # Server-only: all file I/O and CRUD
    utils.ts                   # Isomorphic: parseDuration, formatDuration
  types/index.ts               # Shared interfaces
data/                          # Runtime JSON files (gitignored)
```

---

## 4. Data Model

### Category
- `id` — auto-incremented integer
- `name` — unique (case-insensitive)
- `color` — hex string e.g. `"#3B82F6"`
- `is_default` — `1` = built-in (undeletable), `0` = user-created

Default categories: **Work, Personal, Health, Learning, Other** (ids 1–5). Deleting a custom category reassigns its entries to Other.

### Entry
- `id`, `date` (`YYYY-MM-DD`), `description`, `duration_minutes`, `category_id`, `created_at` (ISO 8601 UTC)
- API responses include joined `category_name` and `category_color`

### Reports
- **DailyReport** — `date`, `total_minutes`, `by_category[]`, `entries[]`
- **MonthlyReport** — `year`, `month`, `total_minutes`, `by_category[]`, `by_day[]`
- `by_category` items include `category`, `color`, `minutes`, `percentage` (rounded integer)

---

## 5. Key Conventions

**Imports:** `db.ts` is server-only — never import it in a `"use client"` component. Duration/format helpers live in `utils.ts` and are safe anywhere.

**Dates:** Always `YYYY-MM-DD` strings. Use `date-fns format(..., "yyyy-MM-dd")`. Date picker enforces `max={today}` to prevent future entries.

**Duration input:** `parseDuration` accepts `"2h 30m"`, `"1.5h"`, `"90m"`, `"45"` (plain = minutes). `formatDuration` outputs `"1h 30m"`, `"1h"`, `"45m"`.

**Dark mode:** Components that read `theme` must guard with a `mounted` state to avoid hydration mismatch.

**PDF export:** Dynamically import `jspdf` and `jspdf-autotable` inside click handlers to avoid bloating the initial bundle.

**Export filenames:** `time-tracker-daily-YYYY-MM-DD.csv/.pdf`, `time-tracker-monthly-YYYY-MM.csv/.pdf`

---

## 6. Adding Features

| Task | Where to change |
|---|---|
| New field on Entry | `db.ts` (RawEntry + addEntry), `types/index.ts`, affected API route |
| New page | `src/app/<path>/page.tsx` + nav link in `NavBar.tsx` |
| New API route | Under `src/app/api/`, import from `@/lib/db` only |
| Report aggregation | `src/app/api/reports/route.ts` — pages are display-only |
| New dependency | Verify no native bindings (no Xcode available) |
