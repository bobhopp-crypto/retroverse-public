import { buildYouTubeSearchUrl } from "@/lib/ops/youtube-search";
import type { MatchStatus, YearMatchRow } from "@/lib/ops/reconciliation-model";

export type AcquisitionFilter =
  | "all"
  | "missing"
  | "possible"
  | "matched"
  | "acquisition";

export type AcquisitionExportRow = {
  rank: number | null;
  artist: string;
  title: string;
  peak: number | null;
  weeks: number;
  matchStatus: MatchStatus;
  bestMatch: string | null;
  youtubeSearch: string;
};

export function yearMatchToExportRow(row: YearMatchRow): AcquisitionExportRow {
  return {
    rank: row.displayRank,
    artist: row.artist,
    title: row.title,
    peak: row.peak,
    weeks: row.weeks,
    matchStatus: row.matchStatus,
    bestMatch: row.bestMatch,
    youtubeSearch: buildYouTubeSearchUrl(row.artist, row.title),
  };
}

export function filterYearMatchRows(
  rows: YearMatchRow[],
  filter: AcquisitionFilter,
): YearMatchRow[] {
  switch (filter) {
    case "missing":
      return rows.filter((r) => r.matchStatus === "missing");
    case "possible":
      return rows.filter(
        (r) =>
          r.matchStatus === "possible_match" || r.matchStatus === "needs_review",
      );
    case "matched":
      return rows.filter((r) => r.matchStatus === "matched");
    case "acquisition":
      return rows.filter(
        (r) =>
          r.matchStatus === "missing" ||
          r.matchStatus === "possible_match" ||
          r.matchStatus === "needs_review",
      );
    default:
      return rows;
  }
}

export function acquisitionStats(rows: YearMatchRow[]) {
  const matched = rows.filter((r) => r.matchStatus === "matched").length;
  const missing = rows.filter((r) => r.matchStatus === "missing").length;
  const possible = rows.filter(
    (r) => r.matchStatus === "possible_match" || r.matchStatus === "needs_review",
  ).length;
  const acquisition = filterYearMatchRows(rows, "acquisition").length;
  return {
    chartRows: rows.length,
    matched,
    missing,
    possible,
    acquisition,
  };
}

export function rowsToExportPayload(rows: YearMatchRow[]): AcquisitionExportRow[] {
  return rows.map(yearMatchToExportRow);
}

export function exportJson(rows: AcquisitionExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}

export function exportCsv(rows: AcquisitionExportRow[]): string {
  const header = "rank,artist,title,peak,weeks,status,youtube_search";
  const lines = rows.map((r) => {
    const esc = (v: string | number | null) => {
      const s = v == null ? "" : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    return [
      esc(r.rank),
      esc(r.artist),
      esc(r.title),
      esc(r.peak),
      esc(r.weeks),
      esc(r.matchStatus),
      esc(r.youtubeSearch),
    ].join(",");
  });
  return [header, ...lines].join("\n");
}

export function exportUrlList(rows: AcquisitionExportRow[]): string {
  return rows.map((r) => r.youtubeSearch).join("\n");
}

export function exportTitleList(rows: AcquisitionExportRow[]): string {
  return rows.map((r) => `${r.artist} — ${r.title}`).join("\n");
}

export function downloadTextFile(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8",
): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function openSearchLinkPage(rows: AcquisitionExportRow[], limit = 25): void {
  const slice = rows.slice(0, limit);
  const items = slice
    .map(
      (r, i) =>
        `<li><a href="${r.youtubeSearch}" target="_blank" rel="noopener noreferrer">${i + 1}. ${escapeHtml(r.artist)} — ${escapeHtml(r.title)}</a></li>`,
    )
    .join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Top ${slice.length} YouTube searches</title><style>body{font-family:system-ui,sans-serif;padding:1rem;background:#0b1012;color:#eee} a{color:#46c2ff} ol{line-height:1.8}</style></head><body><h1>Top ${slice.length} YouTube searches</h1><p>Click each link — acquisition intelligence only.</p><ol>${items}</ol></body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
