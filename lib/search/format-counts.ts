import { panelCounts } from "./filter-panels";
import type { SearchCountPart } from "./types";

export function searchCountParts(
  counts: ReturnType<typeof panelCounts>,
  options?: { hasChartHistory?: boolean },
): SearchCountPart[] {
  if (counts.total === 0 && !options?.hasChartHistory) return [];
  const parts: SearchCountPart[] = [];
  if (counts.albums > 0) {
    parts.push({
      value: counts.albums,
      label: `ALBUM${counts.albums === 1 ? "" : "S"}`,
    });
  }
  if (counts.songs > 0) {
    parts.push({
      value: counts.songs,
      label: `SONG${counts.songs === 1 ? "" : "S"}`,
    });
  }
  if (counts.artists > 0) {
    parts.push({
      value: counts.artists,
      label: `ARTIST${counts.artists === 1 ? "" : "S"}`,
    });
  }
  if (counts.charts > 0) {
    parts.push({
      value: counts.charts,
      label: `CHART APPEARANCE${counts.charts === 1 ? "" : "S"}`,
    });
  }
  if (options?.hasChartHistory) {
    parts.push({ value: 1, label: "RV HISTORY" });
  }
  return parts;
}
