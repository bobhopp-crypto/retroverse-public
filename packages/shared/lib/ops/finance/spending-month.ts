/** Parse chart month label from SQL `to_char(..., 'Mon YY')` e.g. "May 26" → May 2026. */
export function spendingMonthDateRange(monthLabel: string): {
  from: string;
  to: string;
  display: string;
} | null {
  const parts = monthLabel.trim().split(/\s+/);
  if (parts.length !== 2) return null;
  const d = new Date(`1 ${parts[0]} 20${parts[1]}`);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = d.getMonth();
  const from = `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m + 1, 0).getDate();
  const to = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const display = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { from, to, display };
}
