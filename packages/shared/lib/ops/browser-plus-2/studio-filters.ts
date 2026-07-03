import type { Bp2Row, Bp2StudioFilterId } from "./types";

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export const BP2_STUDIO_FILTERS: Array<{ id: Bp2StudioFilterId; label: string }> = [
  { id: "needs-collector", label: "Needs Collector" },
  { id: "needs-editor", label: "Needs Editor" },
  { id: "needs-director", label: "Needs Director" },
  { id: "ready-to-publish", label: "Ready to Publish" },
  { id: "multiple-performances", label: "Multiple Performances" },
  { id: "low-patron-value", label: "Low Patron Value" },
  { id: "low-confidence", label: "Low Confidence" },
  { id: "missing-assets", label: "Missing Assets" },
  { id: "never-played", label: "Never Played" },
  { id: "updated-today", label: "Updated Today" },
  { id: "sunday-night-ready", label: "Sunday Night Ready" },
];

export function matchesStudioFilter(row: Bp2Row, filter: Bp2StudioFilterId): boolean {
  const studio = row.studio;

  switch (filter) {
    case "needs-collector":
      return Boolean(row.rvtr && studio.needsCollector);
    case "needs-editor":
      return Boolean(row.rvtr && studio.needsEditor);
    case "needs-director":
      return Boolean(row.rvtr && studio.needsDirector);
    case "ready-to-publish":
      return studio.readyToPublish;
    case "multiple-performances":
      return studio.performanceCount >= 2;
    case "low-patron-value":
      return studio.patronValue !== null && studio.patronValue < 7;
    case "low-confidence":
      return studio.confidenceLabel === "Early" || studio.confidenceLabel === "Developing";
    case "missing-assets":
      return studio.missingItems.length > 0 && row.rvtr !== null;
    case "never-played":
      return (row.playCount ?? 0) === 0;
    case "updated-today":
      return isToday(studio.lastUpdated);
    case "sunday-night-ready":
      return row.inSundayCohort && (studio.readyToPublish || row.workQueues.experienceReady);
    default:
      return true;
  }
}

export function matchesAllStudioFilters(row: Bp2Row, filters: Bp2StudioFilterId[]): boolean {
  if (filters.length === 0) return true;
  return filters.every((f) => matchesStudioFilter(row, f));
}

export function studioFilterCounts(rows: Bp2Row[]): Record<Bp2StudioFilterId, number> {
  const counts = {} as Record<Bp2StudioFilterId, number>;
  for (const item of BP2_STUDIO_FILTERS) {
    counts[item.id] = rows.filter((row) => matchesStudioFilter(row, item.id)).length;
  }
  return counts;
}

export type Bp2OvernightPresetId =
  | "top-100-played"
  | "top-500-cohort"
  | "missing-packages"
  | "low-patron-value"
  | "multiple-performances"
  | "entire-library";

export const OVERNIGHT_PRESETS: Array<{
  id: Bp2OvernightPresetId;
  label: string;
  department: "run-collector" | "run-editor" | "run-director";
  /** Rough minutes per song for runtime estimate */
  minutesPerSong: number;
}> = [
  { id: "top-100-played", label: "Top 100 Most Played", department: "run-collector", minutesPerSong: 3 },
  { id: "top-500-cohort", label: "Top 500 Chart Cohort", department: "run-collector", minutesPerSong: 3 },
  { id: "missing-packages", label: "Songs Missing Packages", department: "run-collector", minutesPerSong: 3 },
  { id: "low-patron-value", label: "Songs Below Patron Value 7", department: "run-editor", minutesPerSong: 4 },
  { id: "multiple-performances", label: "Songs With Multiple Performances", department: "run-collector", minutesPerSong: 3 },
  { id: "entire-library", label: "Entire Video Library", department: "run-collector", minutesPerSong: 3 },
];

export function rowsForOvernightPreset(rows: Bp2Row[], preset: Bp2OvernightPresetId): Bp2Row[] {
  const videos = rows.filter((r) => r.rvtr);
  switch (preset) {
    case "top-100-played":
      return [...videos].sort((a, b) => (b.playCount ?? 0) - (a.playCount ?? 0)).slice(0, 100);
    case "top-500-cohort":
      return videos.filter((r) => r.inTop500Cohort);
    case "missing-packages":
      return videos.filter((r) => r.studio.needsCollector);
    case "low-patron-value":
      return videos.filter(
        (r) => r.studio.patronValue !== null && r.studio.patronValue < 7,
      );
    case "multiple-performances":
      return videos.filter((r) => r.studio.performanceCount >= 2);
    case "entire-library":
      return videos;
    default:
      return [];
  }
}
