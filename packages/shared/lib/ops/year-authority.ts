/**
 * CHART YEAR AUTHORITY (ops reconciliation)
 *
 * Billboard / Retroverse chart chronology defines:
 * - chart year, historical placement, year-completion universe
 *
 * VDJ metadata (year_text, folder decades) is advisory only:
 * - local playback organization, tagging convenience
 *
 * VDJ must overlay Retroverse. VDJ must NEVER redefine chart chronology.
 */

export const CHART_YEAR_SOURCE = "billboard_chart_date" as const;

/** Parse VDJ `year_text` or folder path decade — advisory metadata only. */
export function parseVdjMetadataYear(
  yearText: string | null | undefined,
  sourcePath?: string | null,
): number | null {
  const fromText = parseYearDigits(yearText);
  if (fromText != null) return fromText;

  const path = sourcePath?.trim();
  if (!path) return null;

  const decade = path.match(/\/(\d{4})['']?s(?:\/|$)/i);
  if (decade) {
    const y = Number(decade[1]);
    if (isPlausibleYear(y)) return y;
  }

  const segment = path.match(/\/(\d{4})\//);
  if (segment) {
    const y = Number(segment[1]);
    if (isPlausibleYear(y)) return y;
  }

  return null;
}

function parseYearDigits(value: string | null | undefined): number | null {
  if (!value?.trim()) return null;
  const y = Number(value.trim().slice(0, 4));
  return isPlausibleYear(y) ? y : null;
}

function isPlausibleYear(y: number): boolean {
  return Number.isFinite(y) && y > 1900 && y < 2100;
}

/** Ops loaders: chart universe year comes only from Billboard chart_date filtering. */
export function chartYearFromBillboardFilter(year: number): number {
  return year;
}
