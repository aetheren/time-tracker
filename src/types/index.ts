export interface Category {
  id: number;
  name: string;
  color: string;
  is_default: number;
}

export interface Entry {
  id: number;
  date: string; // YYYY-MM-DD
  description: string;
  duration_minutes: number;
  category_id: number;
  created_at: string;
  category_name?: string;
  category_color?: string;
}

export interface DailyReport {
  date: string;
  total_minutes: number;
  by_category: { category: string; color: string; minutes: number; percentage: number }[];
  entries: Entry[];
}

export interface MonthlyReport {
  year: number;
  month: number;
  total_minutes: number;
  by_category: { category: string; color: string; minutes: number; percentage: number }[];
  by_day: { date: string; minutes: number; [key: string]: string | number }[];
}
