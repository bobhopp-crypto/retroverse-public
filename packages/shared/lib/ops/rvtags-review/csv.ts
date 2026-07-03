/** Minimal CSV parse/serialize for RV tag review files. */

export type RvTagsCsvRow = {
  filePath: string;
  artist: string;
  title: string;
  year: number;
  rvTags: string;
  reviewedAt?: string;
  suggestedRvTags?: string;
  currentUser2?: string;
};

function parseCsvLine(line: string): string[] {
  const parts: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQ && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else inQ = !inQ;
    } else if (c === "," && !inQ) {
      parts.push(cur);
      cur = "";
    } else cur += c;
  }
  parts.push(cur);
  return parts;
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function parseRvTagsCsv(text: string): RvTagsCsvRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]!);
  const idx = (name: string) => header.indexOf(name);

  const iPath = idx("FilePath");
  const iArtist = idx("Artist");
  const iTitle = idx("Title");
  const iYear = idx("Year");
  const iTags = idx("RVTags");
  const iReviewed = idx("ReviewedAt");
  const iSuggested = idx("SuggestedRVTags");
  const iUser2 = idx("CurrentUser2");

  if (iPath < 0 || iTags < 0) return [];

  const rows: RvTagsCsvRow[] = [];
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    if (!line.trim()) continue;
    const p = parseCsvLine(line);
    rows.push({
      filePath: p[iPath] ?? "",
      artist: iArtist >= 0 ? (p[iArtist] ?? "") : "",
      title: iTitle >= 0 ? (p[iTitle] ?? "") : "",
      year: iYear >= 0 ? Number(p[iYear]) || 0 : 0,
      rvTags: p[iTags] ?? "",
      reviewedAt: iReviewed >= 0 ? p[iReviewed] : undefined,
      suggestedRvTags: iSuggested >= 0 ? p[iSuggested] : undefined,
      currentUser2: iUser2 >= 0 ? p[iUser2] : undefined,
    });
  }
  return rows;
}

export function serializeRvTagsCsv(rows: RvTagsCsvRow[]): string {
  const header =
    "FilePath,Artist,Title,Year,RVTags,ReviewedAt,SuggestedRVTags,CurrentUser2";
  const body = rows.map((r) =>
    [
      escapeCsv(r.filePath),
      escapeCsv(r.artist),
      escapeCsv(r.title),
      String(r.year),
      escapeCsv(r.rvTags),
      escapeCsv(r.reviewedAt ?? ""),
      escapeCsv(r.suggestedRvTags ?? ""),
      escapeCsv(r.currentUser2 ?? ""),
    ].join(","),
  );
  return `${header}\n${body.join("\n")}\n`;
}
