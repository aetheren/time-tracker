/** Parse duration strings like "2h 30m", "1.5h", "90m", "2h", "45" (minutes) */
export function parseDuration(input: string): number | null {
  const s = input.trim().toLowerCase();
  if (!s) return null;

  const combined = s.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?\s*(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?$/);
  if (combined) return Math.round(parseFloat(combined[1]) * 60 + parseFloat(combined[2]));

  const hours = s.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?$/);
  if (hours) return Math.round(parseFloat(hours[1]) * 60);

  const mins = s.match(/^(\d+(?:\.\d+)?)\s*m(?:in(?:utes?)?)?$/);
  if (mins) return Math.round(parseFloat(mins[1]));

  const plain = s.match(/^(\d+(?:\.\d+)?)$/);
  if (plain) return Math.round(parseFloat(plain[1]));

  return null;
}

/** Format minutes as "Xh Ym" */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
