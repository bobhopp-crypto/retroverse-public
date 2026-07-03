/** Client-only RV History explorer position (artist + search chart modules). */

export type ChartHistorySessionState = {
  decade: number | null;
  year: number | null;
  month: number | null;
};

function storageKey(artistKey: string): string {
  return `retroverse:rv-history:${artistKey.trim().toLowerCase()}`;
}

export function readChartHistorySession(artistKey: string): ChartHistorySessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(artistKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChartHistorySessionState;
    if (parsed == null || typeof parsed !== "object") return null;
    return {
      decade: typeof parsed.decade === "number" ? parsed.decade : null,
      year: typeof parsed.year === "number" ? parsed.year : null,
      month: typeof parsed.month === "number" ? parsed.month : null,
    };
  } catch {
    return null;
  }
}

export function writeChartHistorySession(
  artistKey: string,
  state: ChartHistorySessionState,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(artistKey), JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}
