# Time Tracker

A personal, local-first web app for logging daily time usage and generating reports.

## Features

- **Log time entries** by duration, category, and optional description
- **Flexible duration input** — `2h 30m`, `1.5h`, `90m`, `45` (plain = minutes)
- **Category tagging** with color coding — 5 built-in + unlimited custom
- **Daily summary bar** showing time distribution at a glance
- **Daily & monthly reports** with pie and bar charts
- **Export** reports to CSV or PDF
- **Dark / light theme** toggle
- **No database setup** — data is stored as JSON files locally

## Prerequisites

- [Node.js](https://nodejs.org) v18 or later
- npm v9 or later (bundled with Node.js)

No native addons or external database required.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

### Logging time

1. Navigate to **Today** (the home page)
2. Pick a date (defaults to today; use the arrows or date picker to go back)
3. Enter a duration, select a category, and optionally add a description
4. Click **Add**

Duration formats accepted:

| Input | Interpreted as |
|---|---|
| `2h 30m` | 2 hours 30 minutes |
| `1.5h` | 1 hour 30 minutes |
| `90m` | 90 minutes |
| `45` | 45 minutes |

### Reports

- **Daily Report** (`/reports/daily`) — pie chart and full entry list for any single day
- **Monthly Report** (`/reports/monthly`) — daily bar chart, category breakdown, and stats for any month

Both pages have **Export CSV** and **Export PDF** buttons.

### Categories

Go to **Categories** (`/categories`) to add custom categories with a color picker. The five built-in categories (Work, Personal, Health, Learning, Other) cannot be deleted. Deleting a custom category reassigns its entries to Other.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server at http://localhost:3000 |
| `npm run build` | Production build |
| `npm run start` | Start production server |

## Data

All data is stored in the `data/` directory at the project root:

```
data/
  entries.json       # time log entries
  categories.json    # category definitions
```

Back up this directory to preserve your data. It is excluded from version control via `.gitignore`.

## Tech Stack

- [Next.js 15](https://nextjs.org) — React framework (App Router)
- [Tailwind CSS](https://tailwindcss.com) — styling
- [recharts](https://recharts.org) — charts
- [jsPDF](https://github.com/parallax/jsPDF) — PDF export
- [date-fns](https://date-fns.org) — date formatting
- [next-themes](https://github.com/pacocoursey/next-themes) — dark/light mode

## Project Structure

```
src/
  app/
    page.tsx                   # Daily log
    categories/page.tsx        # Category manager
    reports/daily/page.tsx     # Daily report
    reports/monthly/page.tsx   # Monthly report
    api/                       # REST API routes
  components/                  # Shared UI components
  lib/
    db.ts                      # Server-only data access (JSON file store)
    utils.ts                   # Shared utilities (parseDuration, formatDuration)
  types/index.ts               # TypeScript interfaces
```

See [SPEC.md](./SPEC.md) for the full technical specification.
